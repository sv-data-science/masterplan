"""
Sync match scores from football-data.org and goal scorers from ESPN's public API.

football-data.org: scores/status only (free tier excludes goal events)
ESPN: goal scorer data via public scoreboard + summary endpoints (no key needed)
"""
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.models.worldcup import Match, Team, GoalEvent
from app.services.scoring import recalculate_match_points
from app.database import AsyncSessionLocal
from app.config import settings

log = logging.getLogger(__name__)

API_URL = "https://api.football-data.org/v4/competitions/WC/matches"
ESPN_SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard"
ESPN_SUMMARY_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary"

# Map football-data.org / ESPN team names → our DB team names where they differ
TEAM_NAME_MAP: dict[str, str] = {
    "Bosnia and Herzegovina": "Bosnia-Herzegovina",
    "Côte d'Ivoire": "Ivory Coast",
    "Cote d'Ivoire": "Ivory Coast",
    "Ivory Coast": "Ivory Coast",
    "Turkey": "Türkiye",
    "DR Congo": "Congo DR",
    "Republic of Congo": "Congo DR",
    "Congo": "Congo DR",
    "Korea Republic": "South Korea",
    "Republic of Korea": "South Korea",
    "USA": "United States",
    "United States": "United States",
    "Czechia": "Czechia",
    "Czech Republic": "Czechia",
    "Cabo Verde": "Cape Verde",          # football-data.org uses Cabo Verde
    "Cape Verde Islands": "Cape Verde",
    "Curacao": "Curaçao",               # without accent
    "IR Iran": "Iran",
    "Islamic Republic of Iran": "Iran",
    "Saudi Arabia": "Saudi Arabia",
    "Uzbekistan": "Uzbekistan",
}

STATUS_MAP = {
    "SCHEDULED": "scheduled",
    "TIMED": "scheduled",
    "IN_PLAY": "live",
    "PAUSED": "live",
    "HALF_TIME": "live",
    "EXTRA_TIME": "live",
    "PENALTY_SHOOTOUT": "live",
    "FINISHED": "completed",
    "AWARDED": "completed",
    "CANCELLED": "scheduled",
    "POSTPONED": "scheduled",
    "SUSPENDED": "scheduled",
}

last_sync_result: dict = {"synced_at": None, "updated": 0, "error": None}

# Extra ESPN-specific name variants not covered by TEAM_NAME_MAP
ESPN_EXTRA: dict[str, str] = {
    "Bosnia & Herzegovina": "Bosnia-Herzegovina",
    "Bosnia and Herzegovina": "Bosnia-Herzegovina",
    "Congo, DR": "Congo DR",
    "Korea Republic": "South Korea",
    "Korea, Republic of": "South Korea",
    "Cote d'Ivoire": "Ivory Coast",
    "Côte d'Ivoire": "Ivory Coast",
    "Czech Republic": "Czechia",
    "Cabo Verde": "Cape Verde",
    "Cape Verde Islands": "Cape Verde",
    "IR Iran": "Iran",
    "USA": "United States",
    "Curacao": "Curaçao",
    "Turkey": "Türkiye",
    "DR Congo": "Congo DR",
}


def _canonical(name: str) -> str:
    return TEAM_NAME_MAP.get(name, name)


def _espn_canonical(name: str) -> str:
    return ESPN_EXTRA.get(name, TEAM_NAME_MAP.get(name, name))


def _parse_espn_minute(display: str) -> Optional[int]:
    """Parse '23'' or '45'+2'' into an integer minute."""
    if not display:
        return None
    s = display.rstrip("'").strip()
    if "+" in s:
        parts = s.split("+", 1)
        try:
            return int(parts[0].strip()) + int(parts[1].strip())
        except (ValueError, IndexError):
            return None
    try:
        return int(s)
    except ValueError:
        return None


async def _sync_goals(db: AsyncSession, match: Match, api_goals: list, team_by_name: dict) -> int:
    """Replace goal_events for a completed match with the latest API data. Returns goals inserted."""
    await db.execute(delete(GoalEvent).where(GoalEvent.match_id == match.id))
    inserted = 0
    for g in api_goals:
        scorer = (g.get("scorer") or {}).get("name", "").strip()
        team_name = _canonical((g.get("team") or {}).get("name", "").strip())
        goal_type = g.get("type", "REGULAR")  # REGULAR | OWN | PENALTY
        minute = g.get("minute")
        injury = g.get("injuryTime") or 0

        if not scorer or not team_name:
            continue
        team_id = team_by_name.get(team_name)
        if not team_id:
            log.warning("Goal sync — team not found: %s", team_name)
            continue

        db.add(GoalEvent(
            id=str(uuid.uuid4()),
            match_id=match.id,
            team_id=team_id,
            player_name=scorer,
            minute=(minute + injury) if minute is not None else None,
            is_own_goal=(goal_type == "OWN"),
            is_penalty=(goal_type == "PENALTY"),
        ))
        inserted += 1
    return inserted


async def sync_scores() -> dict:
    global last_sync_result

    if not settings.FOOTBALL_DATA_API_KEY:
        return {"error": "FOOTBALL_DATA_API_KEY not set", "updated": 0}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                API_URL,
                headers={"X-Auth-Token": settings.FOOTBALL_DATA_API_KEY},
            )
        if resp.status_code == 429:
            return {"error": "Rate limited by football-data.org (10 req/min)", "updated": 0}
        if resp.status_code != 200:
            return {"error": f"API returned HTTP {resp.status_code}", "updated": 0}

        api_matches = resp.json().get("matches", [])
    except Exception as e:
        err = f"API request failed: {e}"
        log.error(err)
        last_sync_result = {"synced_at": datetime.now(timezone.utc).isoformat(), "updated": 0, "error": err}
        return last_sync_result

    updated = 0
    goals_synced = 0
    matches_with_goals_in_api = 0
    async with AsyncSessionLocal() as db:
        # Build team name → id lookup
        teams_result = await db.execute(select(Team))
        team_by_name = {t.name: t.id for t in teams_result.scalars().all()}

        for api_m in api_matches:
            ext_id = api_m["id"]
            new_status = STATUS_MAP.get(api_m.get("status", ""), "scheduled")

            # Only process finished or live matches — skip if still scheduled
            if new_status == "scheduled":
                continue

            score_block = api_m.get("score") or {}
            duration = score_block.get("duration", "REGULAR")
            ft   = score_block.get("fullTime")   or {}
            et   = score_block.get("extraTime")  or {}
            pens = score_block.get("penalties")  or {}

            # football-data.org WC2026 score encoding per duration:
            #   REGULAR:           fullTime = 90-min final score
            #   EXTRA_TIME:        fullTime = 90-min score, extraTime = goals in ET period only (additive)
            #   PENALTY_SHOOTOUT:  fullTime = tied 90+ET result, extraTime = pen shootout goal counts
            # The 90+ET result (used for prediction scoring) is what we store in home_score/away_score.
            # Penalty counts go into home_score_pens/away_score_pens (display only, never used for points).
            if duration == "PENALTY_SHOOTOUT":
                hs      = ft.get("home")
                as_     = ft.get("away")
                hs_pens = et.get("home")   # extraTime holds pen goals on PENALTY_SHOOTOUT matches
                as_pens = et.get("away")
            elif duration == "EXTRA_TIME" and ft.get("home") is not None:
                hs      = (ft.get("home") or 0) + (et.get("home") or 0)
                as_     = (ft.get("away") or 0) + (et.get("away") or 0)
                hs_pens = None
                as_pens = None
            else:
                hs      = ft.get("home")
                as_     = ft.get("away")
                hs_pens = None
                as_pens = None

            # Try to find our match by external_id first
            result = await db.execute(select(Match).where(Match.external_id == ext_id))
            match: Optional[Match] = result.scalar_one_or_none()

            # Fall back to matching by team names if external_id not yet linked
            if not match:
                home_name = _canonical(api_m.get("homeTeam", {}).get("name", ""))
                away_name = _canonical(api_m.get("awayTeam", {}).get("name", ""))
                home_id = team_by_name.get(home_name)
                away_id = team_by_name.get(away_name)
                if not home_id or not away_id:
                    log.warning("Unmatched teams: %s vs %s", home_name, away_name)
                    continue
                result = await db.execute(
                    select(Match).where(
                        Match.home_team_id == home_id,
                        Match.away_team_id == away_id,
                    )
                )
                match = result.scalar_one_or_none()

            if not match:
                continue

            changed = False
            if match.external_id != ext_id:
                match.external_id = ext_id
                changed = True

            if match.status != new_status:
                match.status = new_status
                changed = True

            if new_status == "completed" and hs is not None and as_ is not None:
                if match.home_score != hs or match.away_score != as_:
                    match.home_score = hs
                    match.away_score = as_
                    await recalculate_match_points(match, db)
                    changed = True
                # Sync penalty shootout scores into dedicated fields (not used for prediction scoring)
                if match.home_score_pens != hs_pens or match.away_score_pens != as_pens:
                    match.home_score_pens = hs_pens
                    match.away_score_pens = as_pens
                    changed = True

                # Sync goal scorers — always refresh so corrections propagate
                api_goals = api_m.get("goals")
                if api_goals is not None:
                    matches_with_goals_in_api += 1
                    n = await _sync_goals(db, match, api_goals, team_by_name)
                    goals_synced += n
                    log.info("Goals sync: match %s — API returned %d goals, inserted %d", match.id, len(api_goals), n)

            if changed:
                updated += 1

        await db.commit()

    result_data = {
        "synced_at": datetime.now(timezone.utc).isoformat(),
        "updated": updated,
        "total_api_matches": len(api_matches),
        "goals_synced": goals_synced,
        "matches_with_goals_in_api": matches_with_goals_in_api,
        "error": None,
    }
    last_sync_result = result_data
    log.info("Sync complete: %d matches updated", updated)
    return result_data


_ESPN_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.espn.com/soccer/",
    "Origin": "https://www.espn.com",
}


async def sync_goals_espn() -> dict:
    """Sync goal scorers from ESPN's public API (no key required).

    Queries our DB for completed match dates, fetches the ESPN scoreboard
    for each unique date, then pulls a scoring summary per match to get goals.
    """
    # Collect unique kickoff dates for completed matches
    async with AsyncSessionLocal() as db:
        completed_matches = (await db.execute(
            select(Match).where(Match.status == "completed")
        )).scalars().all()

    if not completed_matches:
        return {"error": None, "goals_synced": 0, "matches_updated": 0,
                "message": "No completed matches in DB — sync scores first"}

    unique_dates: set[str] = set()
    for m in completed_matches:
        if m.kickoff_utc:
            # Add the kickoff date and the day after (UTC midnight edge cases)
            d = m.kickoff_utc
            unique_dates.add(d.strftime("%Y%m%d"))
            unique_dates.add((d + timedelta(days=1)).strftime("%Y%m%d"))

    log.info("ESPN sync: fetching scoreboard for %d dates", len(unique_dates))

    # Fetch ESPN scoreboard for each date (single-date param is reliable)
    all_events: list[dict] = []
    failed_dates: list[str] = []
    async with httpx.AsyncClient(timeout=20, headers=_ESPN_HEADERS) as client:
        for date_str in sorted(unique_dates):
            try:
                resp = await client.get(ESPN_SCOREBOARD_URL, params={"dates": date_str})
                if resp.status_code == 200:
                    all_events.extend(resp.json().get("events", []))
                else:
                    failed_dates.append(f"{date_str}:{resp.status_code}")
                    log.warning("ESPN scoreboard %s → HTTP %d", date_str, resp.status_code)
            except Exception as exc:
                failed_dates.append(f"{date_str}:err")
                log.warning("ESPN scoreboard %s failed: %s", date_str, exc)

    if not all_events and failed_dates:
        return {
            "error": f"ESPN blocked all requests ({', '.join(failed_dates[:3])}). "
                     "ESPN may be rate-limiting Railway's IP — try again in a few minutes.",
            "goals_synced": 0,
        }

    # De-duplicate events by id
    seen: set[str] = set()
    events: list[dict] = []
    for ev in all_events:
        eid = ev.get("id")
        if eid and eid not in seen:
            seen.add(eid)
            events.append(ev)

    ESPN_FINAL_STATUSES = {"STATUS_FINAL", "STATUS_FULL_TIME", "STATUS_FULL_PEN"}
    completed_events = [
        ev for ev in events
        if (ev.get("status") or {}).get("type", {}).get("name") in ESPN_FINAL_STATUSES
    ]
    log.info("ESPN: %d unique events, %d completed", len(events), len(completed_events))

    goals_synced = 0
    matches_updated = 0
    skipped: list[str] = []

    async with AsyncSessionLocal() as db:
        teams_result = await db.execute(select(Team))
        team_by_name = {t.name: t.id for t in teams_result.scalars().all()}

        async with httpx.AsyncClient(timeout=20, headers=_ESPN_HEADERS) as client:
            for ev in completed_events:
                event_id = ev.get("id")
                competitors = (ev.get("competitions") or [{}])[0].get("competitors", [])
                home_comp = next((c for c in competitors if c.get("homeAway") == "home"), None)
                away_comp = next((c for c in competitors if c.get("homeAway") == "away"), None)
                if not home_comp or not away_comp or not event_id:
                    continue

                home_name = _espn_canonical((home_comp.get("team") or {}).get("displayName", ""))
                away_name = _espn_canonical((away_comp.get("team") or {}).get("displayName", ""))
                home_id = team_by_name.get(home_name)
                away_id = team_by_name.get(away_name)

                if not home_id or not away_id:
                    skipped.append(f"{home_name} vs {away_name}")
                    log.warning("ESPN — unmatched teams: %s vs %s", home_name, away_name)
                    continue

                # Try home/away then flipped (ESPN home/away may differ from ours)
                match_res = await db.execute(
                    select(Match).where(Match.home_team_id == home_id, Match.away_team_id == away_id)
                )
                match: Optional[Match] = match_res.scalar_one_or_none()
                if not match:
                    match_res = await db.execute(
                        select(Match).where(Match.home_team_id == away_id, Match.away_team_id == home_id)
                    )
                    match = match_res.scalar_one_or_none()
                if not match or match.status != "completed":
                    continue

                try:
                    summary_resp = await client.get(ESPN_SUMMARY_URL, params={"event": event_id})
                    if summary_resp.status_code != 200:
                        log.warning("ESPN summary %s → HTTP %d", event_id, summary_resp.status_code)
                        continue
                    summary_data = summary_resp.json()
                    # Goals are in keyEvents (scoringSummary is absent in ESPN WC responses)
                    key_events = summary_data.get("keyEvents") or []
                    scoring_summary = [
                        ev for ev in key_events
                        if "goal" in ((ev.get("type") or {}).get("text") or "").lower()
                    ]
                except Exception as exc:
                    log.warning("ESPN summary fetch failed for event %s: %s", event_id, exc)
                    continue

                if not scoring_summary:
                    log.info("ESPN: no goal keyEvents for %s vs %s (event %s)", home_name, away_name, event_id)
                    continue

                await db.execute(delete(GoalEvent).where(GoalEvent.match_id == match.id))
                inserted = 0
                for play in scoring_summary:
                    type_text = ((play.get("type") or {}).get("text") or "Goal").lower()
                    is_own_goal = "own" in type_text
                    is_penalty = "penalty" in type_text

                    # ESPN keyEvents uses "participants" with type.text == "scorer"
                    participants = play.get("participants") or []
                    scorer_name = ""
                    for p in participants:
                        p_type = ((p.get("type") or {}).get("text") or "").lower()
                        if "scorer" in p_type or not p_type:
                            scorer_name = ((p.get("athlete") or {}).get("displayName") or "").strip()
                            if scorer_name:
                                break
                    # Fallback: athletesInvolved (older ESPN structure)
                    if not scorer_name:
                        athletes = play.get("athletesInvolved") or []
                        if athletes:
                            scorer_name = (athletes[0].get("displayName") or "").strip()
                    if not scorer_name:
                        continue

                    team_name = _espn_canonical((play.get("team") or {}).get("displayName", ""))
                    team_id = team_by_name.get(team_name)
                    if not team_id:
                        log.warning("ESPN goal — team not found: %s", team_name)
                        continue

                    minute = _parse_espn_minute((play.get("clock") or {}).get("displayValue", ""))
                    db.add(GoalEvent(
                        id=str(uuid.uuid4()),
                        match_id=match.id,
                        team_id=team_id,
                        player_name=scorer_name,
                        minute=minute,
                        is_own_goal=is_own_goal,
                        is_penalty=is_penalty,
                    ))
                    inserted += 1

                goals_synced += inserted
                matches_updated += 1
                log.info("ESPN goals: %s vs %s — %d inserted", home_name, away_name, inserted)

        await db.commit()

    return {
        "source": "ESPN",
        "dates_fetched": len(unique_dates),
        "completed_matches_found": len(completed_events),
        "matches_updated": matches_updated,
        "goals_synced": goals_synced,
        "skipped_teams": skipped,
        "failed_dates": failed_dates,
        "error": None,
    }
