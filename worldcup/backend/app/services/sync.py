"""
Sync match scores and goal scorers from football-data.org free API.

Endpoint: GET https://api.football-data.org/v4/competitions/WC/matches
Auth:     X-Auth-Token header
Rate:     10 req/min on free tier (one call fetches all group-stage matches)
"""
import logging
import uuid
from datetime import datetime, timezone
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

# Map football-data.org team names → our DB team names where they differ
TEAM_NAME_MAP: dict[str, str] = {
    "Bosnia and Herzegovina": "Bosnia-Herzegovina",
    "Côte d'Ivoire": "Ivory Coast",
    "Cote d'Ivoire": "Ivory Coast",
    "Turkey": "Türkiye",
    "DR Congo": "Congo DR",
    "Republic of Congo": "Congo DR",
    "Korea Republic": "South Korea",
    "USA": "United States",
    "United States": "United States",
    "Czechia": "Czechia",
    "Czech Republic": "Czechia",
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


def _canonical(name: str) -> str:
    return TEAM_NAME_MAP.get(name, name)


async def _sync_goals(db: AsyncSession, match: Match, api_goals: list, team_by_name: dict) -> None:
    """Replace goal_events for a completed match with the latest API data."""
    await db.execute(delete(GoalEvent).where(GoalEvent.match_id == match.id))
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


async def sync_scores() -> dict:
    global last_sync_result

    if not settings.FOOTBALL_DATA_API_KEY:
        return {"error": "FOOTBALL_DATA_API_KEY not set", "updated": 0}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                API_URL,
                headers={"X-Auth-Token": settings.FOOTBALL_DATA_API_KEY},
                params={"stage": "GROUP_STAGE"},
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

            hs = (api_m.get("score") or {}).get("fullTime", {}).get("home")
            as_ = (api_m.get("score") or {}).get("fullTime", {}).get("away")

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

                # Sync goal scorers — always refresh so corrections propagate
                api_goals = api_m.get("goals")
                if api_goals is not None:
                    await _sync_goals(db, match, api_goals, team_by_name)

            if changed:
                updated += 1

        await db.commit()

    result_data = {
        "synced_at": datetime.now(timezone.utc).isoformat(),
        "updated": updated,
        "total_api_matches": len(api_matches),
        "error": None,
    }
    last_sync_result = result_data
    log.info("Sync complete: %d matches updated", updated)
    return result_data
