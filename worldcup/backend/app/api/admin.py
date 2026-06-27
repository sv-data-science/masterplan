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
        (74, '2026-06-29T01:30:00+00:00', 'Gillette Stadium',       'Foxborough, USA'),
        (73, '2026-06-29T03:00:00+00:00', 'Rose Bowl Stadium',       'Pasadena, USA'),
        (76, '2026-06-29T23:00:00+00:00', 'NRG Stadium',             'Houston, USA'),
        (75, '2026-06-30T02:00:00+00:00', 'Estadio BBVA',            'Monterrey, Mexico'),
        (78, '2026-06-30T18:00:00+00:00', 'AT&T Stadium',            'Arlington, USA'),
        (77, '2026-06-30T21:00:00+00:00', 'MetLife Stadium',         'East Rutherford, USA'),
        (79, '2026-07-01T02:00:00+00:00', 'Estadio Azteca',          'Mexico City, Mexico'),
        (80, '2026-07-01T16:00:00+00:00', 'Mercedes-Benz Stadium',   'Atlanta, USA'),
        (82, '2026-07-02T04:00:00+00:00', 'Lumen Field',             'Seattle, USA'),
        (84, '2026-07-02T22:00:00+00:00', 'SoFi Stadium',            'Inglewood, USA'),
        (83, '2026-07-02T23:00:00+00:00', 'BMO Field',               'Toronto, Canada'),
        (81, '2026-07-03T03:00:00+00:00', "Levi's Stadium",          'Santa Clara, USA'),
        (85, '2026-07-03T03:00:00+00:00', 'BC Place',                'Vancouver, Canada'),
        (88, '2026-07-03T18:00:00+00:00', 'AT&T Stadium',            'Arlington, USA'),
        (86, '2026-07-03T22:00:00+00:00', 'Hard Rock Stadium',       'Miami Gardens, USA'),
        (87, '2026-07-04T02:30:00+00:00', 'Arrowhead Stadium',       'Kansas City, USA'),
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
