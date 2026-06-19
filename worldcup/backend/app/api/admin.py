import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.auth import get_current_user, hash_password
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserPublic
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
