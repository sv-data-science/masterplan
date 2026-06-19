import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from app.database import AsyncSessionLocal
from app.models.worldcup import TriviaScore
from app.models.user import User
from app.auth import get_current_user

router = APIRouter(prefix="/trivia", tags=["trivia"])


class ScoreSubmit(BaseModel):
    score: int
    total: int


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


@router.post("/score")
async def submit_score(
    body: ScoreSubmit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    record = TriviaScore(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        score=body.score,
        total=body.total,
    )
    db.add(record)
    await db.commit()
    return {"status": "ok", "score": body.score, "total": body.total}


@router.get("/leaderboard")
async def trivia_leaderboard(db: AsyncSession = Depends(get_db)):
    subq = (
        select(
            TriviaScore.user_id,
            func.max(TriviaScore.score).label("best_score"),
            func.max(TriviaScore.total).label("best_total"),
            func.count(TriviaScore.id).label("games_played"),
        )
        .group_by(TriviaScore.user_id)
        .subquery()
    )

    rows = (
        await db.execute(
            select(
                User.display_name,
                User.username,
                subq.c.best_score,
                subq.c.best_total,
                subq.c.games_played,
            )
            .join(subq, subq.c.user_id == User.id)
            .order_by(subq.c.best_score.desc(), subq.c.best_total.asc())
        )
    ).all()

    result = []
    for i, r in enumerate(rows):
        if i == 0:
            rank = 1
        elif r.best_score == result[-1]["best_score"]:
            rank = result[-1]["rank"]
        else:
            rank = i + 1
        result.append({
            "rank": rank,
            "display_name": r.display_name,
            "username": r.username,
            "best_score": int(r.best_score),
            "best_total": int(r.best_total),
            "games_played": int(r.games_played),
        })
    return result
