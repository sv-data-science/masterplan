import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.auth import get_current_user, hash_password
from app.database import get_db
from app.models.user import User
from app.models.worldcup import Prediction, Match, ScoreAuditLog
from app.schemas.user import UserCreate, UserPublic
from app.schemas.worldcup import PredictionOut
from app.services.scoring import calculate_points
from app.services.sync import sync_scores, sync_goals_espn, last_sync_result
from app.config import settings

router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin only")
    return current_user


@router.post("/seed")
async def trigger_seed(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """Seed teams and matches if not already present."""
    from sqlalchemy import select, func
    from app.models.worldcup import Team
    count = (await db.execute(select(func.count()).select_from(Team))).scalar() or 0
    if count > 0:
        return {"status": "already_seeded", "teams": count}
    from scripts.seed_worldcup import seed
    await seed()
    count_after = (await db.execute(select(func.count()).select_from(Team))).scalar() or 0
    return {"status": "seeded", "teams": count_after}


@router.post("/patch-schedule")
async def trigger_patch_schedule(admin: User = Depends(require_admin)):
    """Non-destructive: fix kickoff times/venues/matchdays while keeping scores and predictions."""
    try:
        from scripts.seed_worldcup import patch_schedule
        result = await patch_schedule()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reseed")
async def trigger_reseed(admin: User = Depends(require_admin)):
    """Keep teams, wipe matches + predictions, recreate with correct official schedule."""
    try:
        from scripts.seed_worldcup import reseed
        result = await reseed()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync")
async def trigger_sync(admin: User = Depends(require_admin)):
    return await sync_scores()


@router.post("/recalculate-points")
async def recalculate_all_points(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """Re-run points calculation for every completed match. Use after manually correcting a score."""
    from app.models.worldcup import Match as MatchModel
    from app.services.scoring import recalculate_match_points
    from sqlalchemy.orm import selectinload

    from app.services.scoring import UNSCORED_MATCH_NUMBERS

    matches = (await db.execute(
        select(MatchModel)
        .options(selectinload(MatchModel.predictions))
        .where(
            MatchModel.status == 'completed',
            MatchModel.home_score.is_not(None),
            MatchModel.match_number.not_in(UNSCORED_MATCH_NUMBERS),
        )
    )).scalars().all()

    recalculated = 0
    for m in matches:
        await recalculate_match_points(m, db)
        recalculated += 1

    await db.flush()
    return {"status": "ok", "matches_recalculated": recalculated}


@router.post("/sync-goals")
async def trigger_sync_goals(admin: User = Depends(require_admin)):
    """Sync goal scorers from ESPN's public API (no key required)."""
    return await sync_goals_espn()


@router.get("/debug-espn")
async def debug_espn(admin: User = Depends(require_admin)):
    """Hit ESPN for June 11 and return raw response structure for diagnosis."""
    import httpx
    from app.services.sync import ESPN_SCOREBOARD_URL, ESPN_SUMMARY_URL, _ESPN_HEADERS
    result: dict = {}
    async with httpx.AsyncClient(timeout=15, headers=_ESPN_HEADERS) as client:
        try:
            r = await client.get(ESPN_SCOREBOARD_URL, params={"dates": "20260611"})
            result["scoreboard_status"] = r.status_code
            if r.status_code == 200:
                data = r.json()
                events = data.get("events", [])
                result["events_count"] = len(events)
                result["top_level_keys"] = list(data.keys())
                if events:
                    ev = events[0]
                    result["first_event_keys"] = list(ev.keys())
                    result["first_event_status"] = ev.get("status", {}).get("type", {}).get("name")
                    comps = (ev.get("competitions") or [{}])[0]
                    result["first_event_competitors"] = [
                        {"displayName": c.get("team", {}).get("displayName"), "homeAway": c.get("homeAway")}
                        for c in comps.get("competitors", [])
                    ]
                    # Try fetching summary for this event
                    eid = ev.get("id")
                    if eid:
                        r2 = await client.get(ESPN_SUMMARY_URL, params={"event": eid})
                        result["summary_status"] = r2.status_code
                        if r2.status_code == 200:
                            d2 = r2.json()
                            result["summary_top_level_keys"] = list(d2.keys())
                            for k in ["scoringSummary", "scoringPlays", "scoring", "plays", "gamepackageJSON"]:
                                v = d2.get(k)
                                result[f"summary_{k}"] = f"{type(v).__name__}, len={len(v) if isinstance(v, list) else 'n/a'}"
                            # keyEvents — show count and first goal event structure
                            key_events = d2.get("keyEvents") or []
                            goal_events = [ev for ev in key_events if "goal" in ((ev.get("type") or {}).get("text") or "").lower()]
                            result["summary_keyEvents_count"] = len(key_events)
                            result["summary_keyEvents_goal_count"] = len(goal_events)
                            if goal_events:
                                first_goal = goal_events[0]
                                result["first_goal_event_keys"] = list(first_goal.keys())
                                result["first_goal_type"] = first_goal.get("type")
                                result["first_goal_team"] = first_goal.get("team")
                                result["first_goal_clock"] = first_goal.get("clock")
                                result["first_goal_participants"] = first_goal.get("participants")
                                result["first_goal_athletesInvolved"] = first_goal.get("athletesInvolved")
        except Exception as e:
            result["error"] = str(e)
    return result


@router.get("/debug-api-scores")
async def debug_api_scores(admin: User = Depends(require_admin)):
    """Fetch raw score blocks from football-data.org for all ET/pen matches — confirms field encoding."""
    import httpx
    if not settings.FOOTBALL_DATA_API_KEY:
        raise HTTPException(status_code=503, detail="FOOTBALL_DATA_API_KEY not set")

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            "https://api.football-data.org/v4/competitions/WC/matches",
            headers={"X-Auth-Token": settings.FOOTBALL_DATA_API_KEY},
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"API returned {resp.status_code}")

    results = []
    for m in resp.json().get("matches", []):
        score = m.get("score") or {}
        duration = score.get("duration", "REGULAR")
        if duration in ("PENALTY_SHOOTOUT", "EXTRA_TIME") or m.get("status") in ("FINISHED", "AWARDED"):
            ft   = score.get("fullTime") or {}
            et   = score.get("extraTime") or {}
            pens = score.get("penalties") or {}
            ht   = score.get("halfTime") or {}
            if duration in ("PENALTY_SHOOTOUT", "EXTRA_TIME") or (ft.get("home") is not None):
                results.append({
                    "id": m["id"],
                    "home": (m.get("homeTeam") or {}).get("shortName", (m.get("homeTeam") or {}).get("name")),
                    "away": (m.get("awayTeam") or {}).get("shortName", (m.get("awayTeam") or {}).get("name")),
                    "status": m.get("status"),
                    "duration": duration,
                    "halfTime": ht,
                    "fullTime": ft,
                    "extraTime": et,
                    "penalties": pens,
                })
    return {"count": len(results), "matches": results}


class ForceScoreBody(BaseModel):
    match_number: int
    home_score: int
    away_score: int
    home_score_pens: int | None = None
    away_score_pens: int | None = None
    lock: bool = True


@router.post("/force-score")
async def force_match_score(
    body: ForceScoreBody,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Manually set a match score, bypassing sync. Optionally locks the score so sync won't overwrite."""
    from sqlalchemy.orm import selectinload
    from app.services.scoring import recalculate_match_points

    match = (await db.execute(
        select(Match)
        .options(selectinload(Match.predictions))
        .where(Match.match_number == body.match_number)
    )).scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail=f"Match {body.match_number} not found")

    match.home_score = body.home_score
    match.away_score = body.away_score
    match.home_score_pens = body.home_score_pens
    match.away_score_pens = body.away_score_pens
    match.status = "completed"
    match.score_locked = body.lock

    await recalculate_match_points(match, db)
    await db.flush()

    return {
        "status": "ok",
        "match_number": body.match_number,
        "home_score": body.home_score,
        "away_score": body.away_score,
        "home_score_pens": body.home_score_pens,
        "away_score_pens": body.away_score_pens,
        "locked": body.lock,
    }


@router.post("/unlock-score")
async def unlock_match_score(
    match_number: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Remove admin lock from a match so sync can update it again."""
    match = (await db.execute(
        select(Match).where(Match.match_number == match_number)
    )).scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail=f"Match {match_number} not found")
    match.score_locked = False
    await db.flush()
    return {"status": "ok", "match_number": match_number, "locked": False}


@router.get("/sync/status")
async def sync_status(admin: User = Depends(require_admin)):
    return {
        **last_sync_result,
        "api_key_configured": bool(settings.FOOTBALL_DATA_API_KEY),
        "auto_sync_interval_minutes": settings.SYNC_INTERVAL_MINUTES,
    }


@router.post("/users", response_model=UserPublic, status_code=201)
async def create_user(
    body: UserCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    existing = (await db.execute(
        select(User).where((User.email == body.email) | (User.username == body.username))
    )).scalar_one_or_none()
    if existing:
        detail = "Email already registered" if existing.email == body.email else "Username already taken"
        raise HTTPException(status_code=400, detail=detail)

    user = User(
        id=str(uuid.uuid4()),
        username=body.username,
        email=body.email,
        display_name=body.display_name,
        hashed_password=hash_password(body.password),
        is_admin=False,
    )
    db.add(user)
    await db.flush()
    return user


@router.get("/users", response_model=list[UserPublic])
async def list_users(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    users = (await db.execute(select(User).order_by(User.created_at))).scalars().all()
    return users


class AdminPredictionSet(BaseModel):
    username: str
    match_id: str
    pred_home: int
    pred_away: int


@router.get("/score-audit")
async def score_audit_log(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Return recent score changes with who made them."""
    from sqlalchemy.orm import selectinload
    rows = (await db.execute(
        select(ScoreAuditLog)
        .options(
            selectinload(ScoreAuditLog.match).selectinload(Match.home_team),
            selectinload(ScoreAuditLog.match).selectinload(Match.away_team),
            selectinload(ScoreAuditLog.changed_by),
        )
        .order_by(ScoreAuditLog.changed_at.desc())
        .limit(100)
    )).scalars().all()

    return [
        {
            "id": r.id,
            "changed_at": r.changed_at.isoformat() if r.changed_at else None,
            "changed_by": r.changed_by.display_name,
            "changed_by_username": r.changed_by.username,
            "match_number": r.match.match_number,
            "home_team_code": r.match.home_team.code,
            "home_team_flag": r.match.home_team.flag,
            "away_team_code": r.match.away_team.code,
            "away_team_flag": r.match.away_team.flag,
            "old_home_score": r.old_home_score,
            "old_away_score": r.old_away_score,
            "old_status": r.old_status,
            "old_home_score_pens": r.old_home_score_pens,
            "old_away_score_pens": r.old_away_score_pens,
            "new_home_score": r.new_home_score,
            "new_away_score": r.new_away_score,
            "new_status": r.new_status,
            "new_home_score_pens": r.new_home_score_pens,
            "new_away_score_pens": r.new_away_score_pens,
        }
        for r in rows
    ]


@router.post("/patch-r32-schedule")
async def patch_r32_schedule(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """Update kickoff times for R32 matches to match the official FIFA schedule."""
    from app.models.worldcup import Match as MatchModel
    from datetime import datetime

    schedule = {
        73: datetime.fromisoformat('2026-06-28T19:00:00+00:00'),
        74: datetime.fromisoformat('2026-06-29T20:30:00+00:00'),
        75: datetime.fromisoformat('2026-06-30T01:00:00+00:00'),
        76: datetime.fromisoformat('2026-06-29T17:00:00+00:00'),
        77: datetime.fromisoformat('2026-06-30T21:00:00+00:00'),
        78: datetime.fromisoformat('2026-06-30T17:00:00+00:00'),
        79: datetime.fromisoformat('2026-06-30T23:00:00+00:00'),
        80: datetime.fromisoformat('2026-07-01T16:00:00+00:00'),
        81: datetime.fromisoformat('2026-07-02T00:00:00+00:00'),
        82: datetime.fromisoformat('2026-07-01T20:00:00+00:00'),
        83: datetime.fromisoformat('2026-07-02T23:00:00+00:00'),
        84: datetime.fromisoformat('2026-07-02T19:00:00+00:00'),
        85: datetime.fromisoformat('2026-07-03T03:00:00+00:00'),
        86: datetime.fromisoformat('2026-07-03T22:00:00+00:00'),
        87: datetime.fromisoformat('2026-07-03T18:00:00+00:00'),
        88: datetime.fromisoformat('2026-07-04T01:30:00+00:00'),
    }

    r32_matches = (await db.execute(
        select(MatchModel).where(MatchModel.stage == 'r32')
    )).scalars().all()

    updated = 0
    for m in r32_matches:
        if m.match_number in schedule:
            m.kickoff_utc = schedule[m.match_number]
            updated += 1

    await db.flush()
    return {"status": "ok", "updated": updated}


@router.post("/assign-r32-official")
async def assign_r32_official(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """Assign R32 teams from the official FIFA bracket (hardcoded confirmed matchups).
    Falls back to standings-based resolution for the matches not yet visible in the published bracket."""
    from sqlalchemy.orm import selectinload
    from app.models.worldcup import Team, Match as MatchModel

    # All 16 confirmed matchups from the official FIFA bracket
    # (match_number, home_code, away_code)
    OFFICIAL = [
        (73, 'RSA', 'CAN'),  # South Africa vs Canada        Jun 28 15:00 ET  Los Angeles
        (74, 'GER', 'PAR'),  # Germany vs Paraguay           Jun 29 16:30 ET  Boston
        (75, 'NED', 'MAR'),  # Netherlands vs Morocco        Jun 29 21:00 ET  Monterrey
        (76, 'BRA', 'JPN'),  # Brazil vs Japan               Jun 29 13:00 ET  Houston
        (77, 'FRA', 'SWE'),  # France vs Sweden              Jun 30 17:00 ET  New York/NJ
        (78, 'CIV', 'NOR'),  # Ivory Coast vs Norway         Jun 30 13:00 ET  Dallas
        (79, 'MEX', 'ECU'),  # Mexico vs Ecuador             Jun 30 19:00 ET  Mexico City
        (80, 'ENG', 'COD'),  # England vs DR Congo           Jul 1  12:00 ET  Atlanta
        (81, 'USA', 'BIH'),  # USA vs Bosnia-Herzegovina     Jul 1  20:00 ET  San Francisco
        (82, 'BEL', 'SEN'),  # Belgium vs Senegal            Jul 1  16:00 ET  Seattle
        (83, 'POR', 'CRO'),  # Portugal vs Croatia           Jul 2  19:00 ET  Toronto
        (84, 'ESP', 'AUT'),  # Spain vs Austria              Jul 2  15:00 ET  Los Angeles
        (85, 'SUI', 'ALG'),  # Switzerland vs Algeria        Jul 2  23:00 ET  Vancouver
        (86, 'ARG', 'CPV'),  # Argentina vs Cape Verde       Jul 3  18:00 ET  Miami
        (87, 'AUS', 'EGY'),  # Australia vs Egypt            Jul 3  14:00 ET  Dallas
        (88, 'COL', 'GHA'),  # Colombia vs Ghana             Jul 3  21:30 ET  Kansas City
    ]

    # Load all teams and R32 matches
    teams_by_code = {t.code: t for t in (await db.execute(select(Team))).scalars().all()}
    r32_db = {m.match_number: m for m in (await db.execute(
        select(MatchModel).where(MatchModel.stage == 'r32')
    )).scalars().all()}

    updated, missing = 0, []
    for match_num, home_code, away_code in OFFICIAL:
        m = r32_db.get(match_num)
        if not m:
            missing.append(f"M{match_num} not in DB")
            continue
        ht = teams_by_code.get(home_code)
        at = teams_by_code.get(away_code)
        if not ht: missing.append(f"Team {home_code} not found")
        if not at: missing.append(f"Team {away_code} not found")
        if ht: m.home_team_id = ht.id
        if at: m.away_team_id = at.id
        if ht or at:
            updated += 1

    await db.flush()
    return {"status": "ok", "updated": updated, "missing": missing,
            "note": f"Matches {[r[0] for r in OFFICIAL]} set from official bracket. Remaining matches (M79/M80/M85/M86/M87/M88) still need assignment."}


@router.post("/resolve-r32-teams")
async def resolve_r32_teams(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """Auto-assign qualified teams to R32 matches based on completed group stage standings.
    Safe to re-run — overwrites previous assignments."""
    from sqlalchemy.orm import selectinload
    from app.models.worldcup import Team, Match as MatchModel

    # Load all group stage matches (match numbers 1–72)
    gs = (await db.execute(
        select(MatchModel)
        .options(selectinload(MatchModel.home_team), selectinload(MatchModel.away_team))
        .where(MatchModel.match_number <= 72)
    )).scalars().all()

    by_group: dict = {}
    for m in gs:
        by_group.setdefault(m.group_letter, []).append(m)

    def group_standings(matches):
        s: dict = {}
        for m in matches:
            for t in [m.home_team, m.away_team]:
                s.setdefault(t.id, {'team': t, 'pts': 0, 'gf': 0, 'ga': 0})
            if m.status == 'completed' and m.home_score is not None:
                h, a = s[m.home_team.id], s[m.away_team.id]
                h['gf'] += m.home_score; h['ga'] += m.away_score
                a['gf'] += m.away_score; a['ga'] += m.home_score
                if m.home_score > m.away_score:   h['pts'] += 3
                elif m.home_score < m.away_score: a['pts'] += 3
                else: h['pts'] += 1; a['pts'] += 1
        return sorted(s.values(), key=lambda x: (-x['pts'], -(x['gf'] - x['ga']), -x['gf']))

    standings_map = {g: group_standings(ms) for g, ms in by_group.items()}

    # Best 8 of 12 third-place teams (sorted by pts → GD → GF)
    thirds = [standings_map[g][2] for g in sorted(standings_map) if len(standings_map[g]) >= 3]
    thirds.sort(key=lambda x: (-x['pts'], -(x['gf'] - x['ga']), -x['gf']))
    best8 = [t['team'] for t in thirds[:8]]

    # R32 slot definitions — (match_number, home_slot, away_slot)
    # slot = ('f', pos, group) for fixed, or ('b3',) for best 3rd
    R32_SLOTS = [
        (73, ('f',2,'A'), ('f',2,'B')),   # South Africa (2A) vs Canada (2B)
        (74, ('f',1,'E'), ('b3',)),       # Germany (1E) vs Paraguay (best3rd D)
        (75, ('f',1,'F'), ('f',2,'C')),   # Netherlands (1F) vs Morocco (2C)
        (76, ('f',1,'C'), ('f',2,'F')),   # Brazil (1C) vs Japan (2F)
        (77, ('f',1,'I'), ('b3',)),       # France (1I) vs Sweden (best3rd F)
        (78, ('f',2,'E'), ('f',2,'I')),   # Ivory Coast (2E) vs Norway (2I)
        (79, ('f',1,'A'), ('b3',)),       # Mexico (1A) vs Ecuador (best3rd E)
        (80, ('f',1,'L'), ('b3',)),       # England (1L) vs DR Congo (best3rd K)
        (81, ('f',1,'D'), ('b3',)),       # USA (1D) vs Bosnia (best3rd B)
        (82, ('f',1,'G'), ('b3',)),       # Belgium (1G) vs Senegal (best3rd I)
        (83, ('f',2,'K'), ('f',2,'L')),   # Portugal (2K) vs Croatia (2L)
        (84, ('f',1,'H'), ('f',2,'J')),   # Spain (1H) vs Austria (2J)
        (85, ('f',1,'B'), ('b3',)),       # Switzerland (1B) vs Algeria (best3rd J)
        (86, ('f',1,'J'), ('f',2,'H')),   # Argentina (1J) vs Cape Verde (2H)
        (87, ('f',2,'D'), ('f',2,'G')),   # Australia (2D) vs Egypt (2G)
        (88, ('f',1,'K'), ('b3',)),       # Colombia (1K) vs Ghana (best3rd L)
    ]

    def resolve(slot, b3i):
        if slot[0] == 'f':
            pos, grp = slot[1], slot[2]
            st = standings_map.get(grp, [])
            return (st[pos - 1]['team'] if len(st) >= pos else None), b3i
        return (best8[b3i] if b3i < len(best8) else None), b3i + 1

    r32_db = {m.match_number: m for m in (await db.execute(
        select(MatchModel).where(MatchModel.stage == 'r32')
    )).scalars().all()}

    updated, b3i, unresolved = 0, 0, []
    for match_num, home_slot, away_slot in R32_SLOTS:
        m = r32_db.get(match_num)
        if not m:
            unresolved.append(f"M{match_num} not in DB")
            continue
        ht, b3i = resolve(home_slot, b3i)
        at, b3i = resolve(away_slot, b3i)
        if ht: m.home_team_id = ht.id
        if at: m.away_team_id = at.id
        if ht or at:
            updated += 1
        if not ht or not at:
            unresolved.append(f"M{match_num} partial (home={'ok' if ht else 'TBD'}, away={'ok' if at else 'TBD'})")

    await db.flush()
    return {"status": "ok", "updated": updated, "best3rd_assigned": min(b3i, len(best8)), "unresolved": unresolved}


@router.post("/seed-r32")
async def seed_r32_matches(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """Create TBD placeholder team + 16 R32 match records if not already present."""
    from sqlalchemy import func
    from app.models.worldcup import Team, Match
    from datetime import datetime

    r32_count = (await db.execute(
        select(func.count()).select_from(Match).where(Match.stage == 'r32')
    )).scalar() or 0
    if r32_count >= 16:
        return {"status": "already_exists", "matches": r32_count}

    tbd_team = (await db.execute(select(Team).where(Team.code == 'TBD'))).scalar_one_or_none()
    if not tbd_team:
        tbd_team = Team(id=str(uuid.uuid4()), name='TBD', code='TBD', group_letter='?', flag='🏳️')
        db.add(tbd_team)
        await db.flush()

    r32_data = [
        (73, '2026-06-28T19:00:00+00:00', 'Rose Bowl Stadium',        'Pasadena, USA'),        # Jun 28, 3PM ET
        (76, '2026-06-29T17:00:00+00:00', 'NRG Stadium',              'Houston, USA'),          # Jun 29, 1PM ET
        (74, '2026-06-29T20:30:00+00:00', 'Gillette Stadium',         'Foxborough, USA'),       # Jun 29, 4:30PM ET
        (75, '2026-06-30T01:00:00+00:00', 'Estadio BBVA',             'Monterrey, Mexico'),     # Jun 29, 9PM ET
        (78, '2026-06-30T17:00:00+00:00', 'AT&T Stadium',             'Arlington, USA'),        # Jun 30, 1PM ET
        (77, '2026-06-30T21:00:00+00:00', 'MetLife Stadium',          'East Rutherford, USA'),  # Jun 30, 5PM ET
        (79, '2026-06-30T23:00:00+00:00', 'Estadio Azteca',           'Mexico City, Mexico'),
        (80, '2026-07-01T16:00:00+00:00', 'Mercedes-Benz Stadium',    'Atlanta, USA'),
        (82, '2026-07-01T20:00:00+00:00', 'Lumen Field',              'Seattle, USA'),
        (81, '2026-07-02T00:00:00+00:00', "Levi's Stadium",           'Santa Clara, USA'),
        (85, '2026-07-03T03:00:00+00:00', 'BC Place',                 'Vancouver, Canada'),
        (84, '2026-07-02T19:00:00+00:00', 'SoFi Stadium',             'Inglewood, USA'),
        (83, '2026-07-02T23:00:00+00:00', 'BMO Field',                'Toronto, Canada'),
        (86, '2026-07-03T22:00:00+00:00', 'Hard Rock Stadium',        'Miami Gardens, USA'),
        (87, '2026-07-03T18:00:00+00:00', 'AT&T Stadium',             'Arlington, USA'),
        (88, '2026-07-04T01:30:00+00:00', 'Arrowhead Stadium',        'Kansas City, USA'),
    ]

    created = 0
    for match_number, kickoff_str, venue, city in r32_data:
        existing = (await db.execute(
            select(Match).where(Match.match_number == match_number)
        )).scalar_one_or_none()
        if not existing:
            m = Match(
                id=str(uuid.uuid4()),
                match_number=match_number,
                group_letter='?',
                matchday=4,
                home_team_id=tbd_team.id,
                away_team_id=tbd_team.id,
                kickoff_utc=datetime.fromisoformat(kickoff_str),
                venue=venue,
                city=city,
                status='scheduled',
                stage='r32',
            )
            db.add(m)
            created += 1

    await db.flush()
    return {"status": "seeded", "created": created}


class R32TeamOverride(BaseModel):
    match_number: int
    home_team_code: str | None = None
    away_team_code: str | None = None


@router.post("/set-r32-teams")
async def set_r32_teams(body: R32TeamOverride, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """Manually set home/away team for a specific R32 match by team code. Pass None to leave unchanged."""
    from app.models.worldcup import Team, Match as MatchModel

    match = (await db.execute(
        select(MatchModel).where(MatchModel.match_number == body.match_number, MatchModel.stage == 'r32')
    )).scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail=f"R32 match {body.match_number} not found")

    if body.home_team_code:
        team = (await db.execute(select(Team).where(Team.code == body.home_team_code))).scalar_one_or_none()
        if not team:
            raise HTTPException(status_code=404, detail=f"Team '{body.home_team_code}' not found")
        match.home_team_id = team.id

    if body.away_team_code:
        team = (await db.execute(select(Team).where(Team.code == body.away_team_code))).scalar_one_or_none()
        if not team:
            raise HTTPException(status_code=404, detail=f"Team '{body.away_team_code}' not found")
        match.away_team_id = team.id

    await db.flush()
    return {"status": "ok", "match_number": body.match_number,
            "home_team_code": body.home_team_code, "away_team_code": body.away_team_code}


@router.get("/r32-assignments")
async def get_r32_assignments(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """Return current team assignments for all R32 matches."""
    from sqlalchemy.orm import selectinload
    from app.models.worldcup import Match as MatchModel

    matches = (await db.execute(
        select(MatchModel)
        .options(selectinload(MatchModel.home_team), selectinload(MatchModel.away_team))
        .where(MatchModel.stage == 'r32')
        .order_by(MatchModel.match_number)
    )).scalars().all()

    return [
        {
            "match_number": m.match_number,
            "home": f"{m.home_team.flag} {m.home_team.code} ({m.home_team.name})",
            "away": f"{m.away_team.flag} {m.away_team.code} ({m.away_team.name})",
            "kickoff_utc": m.kickoff_utc.isoformat() if m.kickoff_utc else None,
        }
        for m in matches
    ]


@router.post("/wipe-pre-cutoff-points")
async def wipe_pre_cutoff_points(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """Set points_earned = NULL for M1, M2, M3 — these are permanently excluded from scoring."""
    from sqlalchemy import update
    from app.services.scoring import UNSCORED_MATCH_NUMBERS
    from app.models.worldcup import Match as MatchModel

    early_match_ids = (await db.execute(
        select(MatchModel.id).where(MatchModel.match_number.in_(UNSCORED_MATCH_NUMBERS))
    )).scalars().all()

    if not early_match_ids:
        return {"status": "ok", "predictions_wiped": 0, "message": "No excluded matches found"}

    result = await db.execute(
        update(Prediction)
        .where(Prediction.match_id.in_(early_match_ids))
        .values(points_earned=None)
    )
    await db.flush()
    return {"status": "ok", "predictions_wiped": result.rowcount, "matches_excluded": len(early_match_ids)}


@router.post("/recalculate-r32-points")
async def recalculate_r32_points(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """Recalculate points for completed R32 matches only. Group stage totals are never touched.
    Scoring basis: home_score / away_score = 90+ET result (ties count as ties; penalties ignored)."""
    from sqlalchemy.orm import selectinload
    from app.services.scoring import recalculate_match_points
    from app.models.worldcup import Match as MatchModel

    matches = (await db.execute(
        select(MatchModel)
        .options(selectinload(MatchModel.predictions))
        .where(
            MatchModel.stage == 'r32',
            MatchModel.status == 'completed',
            MatchModel.home_score.is_not(None),
        )
    )).scalars().all()

    recalculated = 0
    details = []
    for m in matches:
        await recalculate_match_points(m, db)
        recalculated += 1
        details.append({
            "match_number": m.match_number,
            "home": m.home_team_id,
            "away": m.away_team_id,
            "score": f"{m.home_score}-{m.away_score}",
            "pens": f"{m.home_score_pens}-{m.away_score_pens}" if m.home_score_pens is not None else None,
            "locked": getattr(m, "score_locked", False),
        })

    await db.flush()
    return {"status": "ok", "matches_recalculated": recalculated, "matches": details}


@router.post("/wipe-r32-points")
async def wipe_r32_points(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """Set points_earned = NULL for all R32 predictions. Scores stay intact. Use to reset until R32 scoring is verified."""
    from sqlalchemy import update, and_
    from app.models.worldcup import Match as MatchModel

    r32_match_ids = (await db.execute(
        select(MatchModel.id).where(MatchModel.stage == 'r32')
    )).scalars().all()

    if not r32_match_ids:
        return {"status": "ok", "predictions_wiped": 0, "message": "No R32 matches found"}

    result = await db.execute(
        update(Prediction)
        .where(Prediction.match_id.in_(r32_match_ids))
        .values(points_earned=None)
    )
    await db.flush()
    return {"status": "ok", "predictions_wiped": result.rowcount, "r32_matches": len(r32_match_ids)}


# ─── R16 ─────────────────────────────────────────────────────────────────────

_R16_SEED_DATA = [
    (89, '2026-07-05T17:00:00+00:00', 'MetLife Stadium',       'East Rutherford, USA'),
    (90, '2026-07-05T21:00:00+00:00', 'SoFi Stadium',          'Inglewood, USA'),
    (91, '2026-07-06T17:00:00+00:00', 'AT&T Stadium',          'Arlington, USA'),
    (92, '2026-07-06T21:00:00+00:00', 'NRG Stadium',           'Houston, USA'),
    (93, '2026-07-07T17:00:00+00:00', 'Lumen Field',           'Seattle, USA'),
    (94, '2026-07-07T21:00:00+00:00', 'Rose Bowl Stadium',     'Pasadena, USA'),
    (95, '2026-07-08T17:00:00+00:00', 'Hard Rock Stadium',     'Miami Gardens, USA'),
    (96, '2026-07-08T21:00:00+00:00', 'Mercedes-Benz Stadium', 'Atlanta, USA'),
]

# (r16_match_num, r32_home_parent, r32_away_parent)
_R16_PAIRS = [
    (89, 74, 77),
    (90, 73, 75),
    (91, 76, 78),
    (92, 79, 80),
    (93, 82, 81),
    (94, 83, 84),
    (95, 85, 87),
    (96, 86, 88),
]


@router.post("/seed-r16")
async def seed_r16_matches(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """Create 8 R16 match records (M89–M96) if not already present."""
    from sqlalchemy import func
    from app.models.worldcup import Team, Match
    from datetime import datetime

    r16_count = (await db.execute(
        select(func.count()).select_from(Match).where(Match.stage == 'r16')
    )).scalar() or 0
    if r16_count >= 8:
        return {"status": "already_exists", "matches": r16_count}

    tbd_team = (await db.execute(select(Team).where(Team.code == 'TBD'))).scalar_one_or_none()
    if not tbd_team:
        tbd_team = Team(id=str(uuid.uuid4()), name='TBD', code='TBD', group_letter='?', flag='🏳️')
        db.add(tbd_team)
        await db.flush()

    created = 0
    for match_number, kickoff_str, venue, city in _R16_SEED_DATA:
        existing = (await db.execute(
            select(Match).where(Match.match_number == match_number)
        )).scalar_one_or_none()
        if not existing:
            m = Match(
                id=str(uuid.uuid4()),
                match_number=match_number,
                group_letter='?',
                matchday=5,
                home_team_id=tbd_team.id,
                away_team_id=tbd_team.id,
                kickoff_utc=datetime.fromisoformat(kickoff_str),
                venue=venue,
                city=city,
                status='scheduled',
                stage='r16',
            )
            db.add(m)
            created += 1

    await db.flush()
    return {"status": "seeded", "created": created}


@router.post("/assign-r16-winners")
async def assign_r16_winners(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """Auto-assign R16 teams from completed R32 results. Winner = team with higher score (90+ET);
    on draw, uses penalty scores if recorded."""
    from app.models.worldcup import Match as MatchModel
    from sqlalchemy.orm import selectinload

    r32_by_num = {
        m.match_number: m
        for m in (await db.execute(
            select(MatchModel)
            .options(selectinload(MatchModel.home_team), selectinload(MatchModel.away_team))
            .where(MatchModel.stage == 'r32')
        )).scalars().all()
    }
    r16_by_num = {
        m.match_number: m
        for m in (await db.execute(
            select(MatchModel).where(MatchModel.stage == 'r16')
        )).scalars().all()
    }

    def winner_team(m: MatchModel):
        if m.status != 'completed' or m.home_score is None:
            return None
        if m.home_score > m.away_score:
            return m.home_team
        if m.away_score > m.home_score:
            return m.away_team
        if m.home_score_pens is not None and m.away_score_pens is not None:
            if m.home_score_pens > m.away_score_pens:
                return m.home_team
            if m.away_score_pens > m.home_score_pens:
                return m.away_team
        return None

    updated, unresolved = 0, []
    for r16_num, r32_home_num, r32_away_num in _R16_PAIRS:
        r16m = r16_by_num.get(r16_num)
        if not r16m:
            unresolved.append(f"M{r16_num} not in DB — run seed-r16 first")
            continue
        r32h = r32_by_num.get(r32_home_num)
        r32a = r32_by_num.get(r32_away_num)
        hw = winner_team(r32h) if r32h else None
        aw = winner_team(r32a) if r32a else None
        if hw:
            r16m.home_team_id = hw.id
        else:
            unresolved.append(f"M{r16_num} home slot: M{r32_home_num} not resolved yet")
        if aw:
            r16m.away_team_id = aw.id
        else:
            unresolved.append(f"M{r16_num} away slot: M{r32_away_num} not resolved yet")
        if hw or aw:
            updated += 1

    await db.flush()
    return {"status": "ok", "updated": updated, "unresolved": unresolved}


@router.post("/patch-r16-schedule")
async def patch_r16_schedule(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """Update R16 kickoff times/venues to official FIFA schedule."""
    from app.models.worldcup import Match as MatchModel
    from datetime import datetime

    r16_db = {m.match_number: m for m in (await db.execute(
        select(MatchModel).where(MatchModel.stage == 'r16')
    )).scalars().all()}

    updated = 0
    for match_number, kickoff_str, venue, city in _R16_SEED_DATA:
        m = r16_db.get(match_number)
        if m:
            m.kickoff_utc = datetime.fromisoformat(kickoff_str)
            m.venue = venue
            m.city = city
            updated += 1

    await db.flush()
    return {"status": "ok", "updated": updated}


@router.get("/user-audit/{username}")
async def user_audit(username: str, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """Show all predictions for a user with points earned, grouped by stage. Useful for auditing totals."""
    from sqlalchemy.orm import selectinload

    user = (await db.execute(select(User).where(User.username == username))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail=f"User '{username}' not found")

    preds = (await db.execute(
        select(Prediction)
        .options(
            selectinload(Prediction.match).selectinload(Match.home_team),
            selectinload(Prediction.match).selectinload(Match.away_team),
        )
        .where(Prediction.user_id == user.id)
        .order_by(Prediction.match_id)
    )).scalars().all()

    rows = []
    total = 0
    group_total = 0
    r32_total = 0
    for p in preds:
        m = p.match
        pts = p.points_earned
        stage = m.stage or "group"
        rows.append({
            "match_number": m.match_number,
            "stage": stage,
            "home": m.home_team.code,
            "away": m.away_team.code,
            "actual": f"{m.home_score}-{m.away_score}" if m.home_score is not None else "TBD",
            "pred": f"{p.pred_home}-{p.pred_away}",
            "pts": pts,
            "status": m.status,
            "score_locked": getattr(m, "score_locked", False),
        })
        if pts is not None:
            total += pts
            if stage == "group":
                group_total += pts
            else:
                r32_total += pts

    return {
        "username": username,
        "display_name": user.display_name,
        "total_points": total,
        "group_stage_points": group_total,
        "r32_points": r32_total,
        "predictions": rows,
    }


@router.post("/predictions", response_model=PredictionOut, status_code=201)
async def admin_set_prediction(
    body: AdminPredictionSet,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create or overwrite any user's prediction, bypassing the lock. Points are auto-calculated when the match is already completed."""
    user = (await db.execute(
        select(User).where(User.username == body.username)
    )).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail=f"User '{body.username}' not found")

    match = (await db.execute(
        select(Match).where(Match.id == body.match_id)
    )).scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    pred = (await db.execute(
        select(Prediction).where(
            Prediction.match_id == body.match_id,
            Prediction.user_id == user.id,
        )
    )).scalar_one_or_none()

    if pred:
        pred.pred_home = body.pred_home
        pred.pred_away = body.pred_away
    else:
        pred = Prediction(
            id=str(uuid.uuid4()),
            user_id=user.id,
            match_id=body.match_id,
            pred_home=body.pred_home,
            pred_away=body.pred_away,
        )
        db.add(pred)

    if match.status == "completed" and match.home_score is not None and match.away_score is not None:
        pred.points_earned = calculate_points(
            body.pred_home, body.pred_away, match.home_score, match.away_score
        )

    await db.flush()
    return PredictionOut.model_validate(pred)
