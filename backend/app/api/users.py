from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.user import User
from app.models.collection import CollectionItem
from app.models.moc import MOC
from app.models.achievement import Achievement, UserAchievement
from app.schemas.user import UserPublic, UserUpdate, UserStats
from app.auth import get_current_user

router = APIRouter(prefix="/users", tags=["users"])

async def compute_stats(user_id: str, db: AsyncSession) -> UserStats:
    sets_r = await db.execute(select(func.count()).where(CollectionItem.user_id == user_id, CollectionItem.status == "owned", CollectionItem.set_id.isnot(None)))
    figs_r = await db.execute(select(func.count()).where(CollectionItem.user_id == user_id, CollectionItem.status == "owned", CollectionItem.minifig_id.isnot(None)))
    wish_r = await db.execute(select(func.count()).where(CollectionItem.user_id == user_id, CollectionItem.status == "wishlist"))
    moc_r = await db.execute(select(func.count()).where(MOC.user_id == user_id))
    return UserStats(
        total_sets=sets_r.scalar() or 0,
        total_minifigs=figs_r.scalar() or 0,
        wishlist_count=wish_r.scalar() or 0,
        mocs_count=moc_r.scalar() or 0,
    )

@router.get("/me", response_model=UserPublic)
async def get_me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stats = await compute_stats(current_user.id, db)
    user_dict = {c.name: getattr(current_user, c.name) for c in current_user.__table__.columns}
    user_dict["stats"] = stats
    return UserPublic(**user_dict)

@router.put("/me", response_model=UserPublic)
async def update_me(body: UserUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    await db.flush()
    stats = await compute_stats(current_user.id, db)
    user_dict = {c.name: getattr(current_user, c.name) for c in current_user.__table__.columns}
    user_dict["stats"] = stats
    return UserPublic(**user_dict)

@router.get("/{username}", response_model=UserPublic)
async def get_user(username: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == username, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_public:
        raise HTTPException(status_code=403, detail="This profile is private")
    stats = await compute_stats(user.id, db)
    user_dict = {c.name: getattr(user, c.name) for c in user.__table__.columns}
    user_dict["stats"] = stats
    return UserPublic(**user_dict)


@router.get("/me/achievements")
async def my_achievements(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # All achievements
    all_q = await db.execute(select(Achievement).order_by(Achievement.rarity, Achievement.name))
    all_ach = all_q.scalars().all()

    # User's unlocks
    unlocked_q = await db.execute(
        select(UserAchievement).where(UserAchievement.user_id == current_user.id)
    )
    unlocks = {u.achievement_id: u for u in unlocked_q.scalars().all()}

    return [
        {
            "id": a.id,
            "key": a.key,
            "name": a.name,
            "description": a.description,
            "icon": a.icon,
            "rarity": a.rarity,
            "xp_reward": a.xp_reward,
            "target": a.target,
            "unlocked": a.id in unlocks,
            "unlocked_at": unlocks[a.id].unlocked_at.isoformat() if a.id in unlocks and unlocks[a.id].unlocked_at else None,
            "progress": unlocks[a.id].progress if a.id in unlocks else 0,
        }
        for a in all_ach
    ]
