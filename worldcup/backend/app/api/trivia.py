import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, Float, text
from pydantic import BaseModel
from app.database import AsyncSessionLocal
from app.models.worldcup import TriviaScore, TriviaLiveScore
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


@router.put("/live")
async def update_live_score(
    body: ScoreSubmit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upsert the user's in-progress score so the landing page shows live accuracy."""
    result = await db.execute(
        select(TriviaLiveScore).where(TriviaLiveScore.user_id == current_user.id)
    )
    live = result.scalar_one_or_none()
    if live:
        live.score = body.score
        live.total = body.total
    else:
        db.add(TriviaLiveScore(user_id=current_user.id, score=body.score, total=body.total))
    await db.commit()
    return {"ok": True}


@router.get("/my-stats")
async def my_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Best game by accuracy ratio (score/total), ties broken by more questions answered
    best_row = (await db.execute(
        select(TriviaScore)
        .where(TriviaScore.user_id == current_user.id, TriviaScore.total > 0)
        .order_by((cast(TriviaScore.score, Float) / TriviaScore.total).desc(), TriviaScore.total.desc())
        .limit(1)
    )).scalar_one_or_none()

    games_played = (await db.execute(
        select(func.count(TriviaScore.id)).where(TriviaScore.user_id == current_user.id)
    )).scalar() or 0

    live = (await db.execute(
        select(TriviaLiveScore).where(TriviaLiveScore.user_id == current_user.id)
    )).scalar_one_or_none()

    return {
        "best_score": best_row.score if best_row else None,
        "best_total": best_row.total if best_row else None,
        "games_played": int(games_played),
        "live_score": live.score if live else None,
        "live_total": live.total if live else None,
    }


@router.get("/leaderboard")
async def trivia_leaderboard(db: AsyncSession = Depends(get_db)):
    # Pick the best game per user by accuracy ratio using a window function,
    # then join to users for display names
    rows = (await db.execute(text("""
        WITH ranked AS (
            SELECT
                user_id,
                score,
                total,
                ROW_NUMBER() OVER (
                    PARTITION BY user_id
                    ORDER BY (score::float / total) DESC, total DESC
                ) AS rn,
                COUNT(*) OVER (PARTITION BY user_id) AS games_played
            FROM trivia_scores
            WHERE total > 0
        )
        SELECT
            u.display_name,
            u.username,
            r.score  AS best_score,
            r.total  AS best_total,
            r.games_played
        FROM ranked r
        JOIN users u ON u.id = r.user_id
        WHERE r.rn = 1
        ORDER BY (r.score::float / r.total) DESC, r.total DESC
    """))).mappings().all()

    result = []
    for i, r in enumerate(rows):
        if i == 0:
            rank = 1
        elif r["best_score"] == result[-1]["best_score"] and r["best_total"] == result[-1]["best_total"]:
            rank = result[-1]["rank"]
        else:
            rank = i + 1
        result.append({
            "rank": rank,
            "display_name": r["display_name"],
            "username": r["username"],
            "best_score": int(r["best_score"]),
            "best_total": int(r["best_total"]),
            "games_played": int(r["games_played"]),
        })
    return result
