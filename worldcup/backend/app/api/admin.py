import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.auth import get_current_user, hash_password
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserPublic
from app.services.sync import sync_scores, last_sync_result
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
