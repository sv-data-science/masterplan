from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import AsyncSessionLocal
from app.models.worldcup import Prediction
from app.models.user import User
from app.auth import get_current_user

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


@router.get("")
async def leaderboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = (
        await db.execute(
            select(
                User.id,
                User.display_name,
                User.username,
                func.count(Prediction.id).label("predictions"),
                func.coalesce(func.sum(Prediction.points_earned), 0).label("total_points"),
            )
            .join(Prediction, Prediction.user_id == User.id, isouter=True)
            .group_by(User.id, User.display_name, User.username)
            .order_by(func.coalesce(func.sum(Prediction.points_earned), 0).desc())
        )
    ).all()

    return [
        {
            "rank": i + 1,
            "user_id": r.id,
            "display_name": r.display_name,
            "username": r.username,
            "total_points": int(r.total_points or 0),
            "predictions": int(r.predictions or 0),
        }
        for i, r in enumerate(rows)
    ]
