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
    # Best single game by accuracy ratio, ties broken by more questions answered
    best_row = (await db.execute(
        select(TriviaScore)
        .where(TriviaScore.user_id == current_user.id, TriviaScore.total > 0)
        .order_by((cast(TriviaScore.score, Float) / TriviaScore.total).desc(), TriviaScore.total.desc())
        .limit(1)
    )).scalar_one_or_none()

    # Cumulative running total across ALL saved games
    cum = (await db.execute(
        select(func.sum(TriviaScore.score), func.sum(TriviaScore.total))
        .where(TriviaScore.user_id == current_user.id, TriviaScore.total > 0)
    )).one()
    cum_score, cum_total = (int(cum[0]) if cum[0] else None), (int(cum[1]) if cum[1] else None)

    games_played = (await db.execute(
        select(func.count(TriviaScore.id)).where(TriviaScore.user_id == current_user.id)
    )).scalar() or 0

    return {
        "best_score": best_row.score if best_row else None,
        "best_total": best_row.total if best_row else None,
        "games_played": int(games_played),
        "live_score": cum_score,
        "live_total": cum_total,
    }


@router.get("/leaderboard")
async def trivia_leaderboard(db: AsyncSession = Depends(get_db)):
    # Cumulative accuracy per user: SUM(score) / SUM(total) across all games
    subq = (
        select(
            TriviaScore.user_id,
            func.sum(TriviaScore.score).label("cum_score"),
            func.sum(TriviaScore.total).label("cum_total"),
            func.count(TriviaScore.id).label("games_played"),
        )
        .where(TriviaScore.total > 0)
        .group_by(TriviaScore.user_id)
        .subquery()
    )

    rows = (
        await db.execute(
            select(
                User.display_name,
                User.username,
                subq.c.cum_score,
                subq.c.cum_total,
                subq.c.games_played,
            )
            .join(subq, subq.c.user_id == User.id)
            .order_by(
                (cast(subq.c.cum_score, Float) / subq.c.cum_total).desc(),
                subq.c.cum_total.desc(),
            )
        )
    ).all()

    result = []
    for i, r in enumerate(rows):
        prev_pct = result[-1]["_pct"] if result else None
        cur_pct = round(r.cum_score / r.cum_total * 100, 2) if r.cum_total else 0
        if i == 0:
            rank = 1
        elif cur_pct == prev_pct:
            rank = result[-1]["rank"]
        else:
            rank = i + 1
        result.append({
            "rank": rank,
            "display_name": r.display_name,
            "username": r.username,
            "best_score": int(r.cum_score),
            "best_total": int(r.cum_total),
            "games_played": int(r.games_played),
            "_pct": cur_pct,
        })
    # strip internal field
    for r in result:
        r.pop("_pct", None)
    return result
