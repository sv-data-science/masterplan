from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from app.database import get_db
from app.models.user import User
from app.models.collection import CollectionItem
from app.models.set import LegoSet

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])

@router.get("")
async def get_leaderboard(
    category: str = Query("collection_size"),
    limit: int = Query(50, le=100),
    db: AsyncSession = Depends(get_db),
):
    if category == "collection_size":
        result = await db.execute(
            select(User, func.count(CollectionItem.id).label("score"))
            .join(CollectionItem, User.id == CollectionItem.user_id, isouter=True)
            .where(CollectionItem.status == "owned", User.is_public == True)
            .group_by(User.id)
            .order_by(func.count(CollectionItem.id).desc())
            .limit(limit)
        )
    elif category == "xp":
        result = await db.execute(
            select(User, User.xp.label("score"))
            .where(User.is_public == True)
            .order_by(User.xp.desc())
            .limit(limit)
        )
    else:
        result = await db.execute(
            select(User, User.xp.label("score"))
            .where(User.is_public == True)
            .order_by(User.xp.desc())
            .limit(limit)
        )

    rows = result.all()
    return [
        {
            "rank": i + 1,
            "user": {"id": u.id, "username": u.username, "display_name": u.display_name, "level": u.level, "xp": u.xp},
            "score": score,
            "category": category,
        }
        for i, (u, score) in enumerate(rows)
    ]
