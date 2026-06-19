from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import json
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
                User.kit,
                func.count(Prediction.id).label("predictions"),
                func.coalesce(func.sum(Prediction.points_earned), 0).label("total_points"),
            )
            .join(Prediction, Prediction.user_id == User.id, isouter=True)
            .group_by(User.id, User.display_name, User.username, User.kit)
            .order_by(func.coalesce(func.sum(Prediction.points_earned), 0).desc())
        )
    ).all()

    result = []
    for i, r in enumerate(rows):
        pts = int(r.total_points or 0)
        if i == 0:
            rank = 1
        elif pts == result[-1]["total_points"]:
            rank = result[-1]["rank"]  # tied: same rank
        else:
            rank = i + 1  # skip ranks equal to count of higher-ranked entries
        kit = None
        if r.kit:
            try:
                kit = json.loads(r.kit)
            except Exception:
                pass
        result.append({
            "rank": rank,
            "user_id": r.id,
            "display_name": r.display_name,
            "username": r.username,
            "total_points": pts,
            "predictions": int(r.predictions or 0),
            "kit": kit,
        })
    return result
