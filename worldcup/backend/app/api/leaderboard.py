from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional
import json
from app.database import AsyncSessionLocal
from app.models.worldcup import Prediction, Match
from app.models.user import User
from app.auth import get_current_user

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


@router.get("")
async def leaderboard(
    stage: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if stage:
        # Join through Match to filter by stage; keep users with zero predictions for this stage
        q = (
            select(
                User.id,
                User.display_name,
                User.username,
                func.max(User.kit).label("kit"),
                func.count(Prediction.id).label("predictions"),
                func.coalesce(func.sum(Prediction.points_earned), 0).label("total_points"),
            )
            .join(Prediction, Prediction.user_id == User.id, isouter=True)
            .join(Match, Match.id == Prediction.match_id, isouter=True)
            .where(or_(Match.stage == stage, Prediction.id.is_(None)))
            .group_by(User.id, User.display_name, User.username)
            .order_by(func.coalesce(func.sum(Prediction.points_earned), 0).desc())
        )
    else:
        q = (
            select(
                User.id,
                User.display_name,
                User.username,
                func.max(User.kit).label("kit"),
                func.count(Prediction.id).label("predictions"),
                func.coalesce(func.sum(Prediction.points_earned), 0).label("total_points"),
            )
            .join(Prediction, Prediction.user_id == User.id, isouter=True)
            .group_by(User.id, User.display_name, User.username)
            .order_by(func.coalesce(func.sum(Prediction.points_earned), 0).desc())
        )

    rows = (await db.execute(q)).all()

    result = []
    for i, r in enumerate(rows):
        pts = int(r.total_points or 0)
        if i == 0:
            rank = 1
        elif pts == result[-1]["total_points"]:
            rank = result[-1]["rank"]
        else:
            rank = i + 1
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
