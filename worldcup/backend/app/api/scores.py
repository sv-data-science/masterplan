from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.worldcup import Match, Prediction
from app.models.user import User
from app.auth import get_current_user
from app.services.scoring import UNSCORED_MATCH_NUMBERS

router = APIRouter(prefix="/scores", tags=["scores"])


@router.get("/matrix")
async def scores_matrix(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all match × user points in one call for the score matrix page."""

    # Only include users who have made at least one prediction
    user_ids_q = select(Prediction.user_id).distinct()
    users = (await db.execute(
        select(User)
        .where(User.id.in_(user_ids_q))
        .order_by(User.display_name)
    )).scalars().all()

    matches = (await db.execute(
        select(Match)
        .options(selectinload(Match.home_team), selectinload(Match.away_team))
        .order_by(Match.kickoff_utc, Match.match_number)
    )).scalars().all()

    preds = (await db.execute(select(Prediction))).scalars().all()

    cells: dict = {}
    for p in preds:
        cells.setdefault(p.match_id, {})[p.user_id] = {
            "pts": p.points_earned,
            "h": p.pred_home,
            "a": p.pred_away,
        }

    return {
        "users": [
            {"id": u.id, "username": u.username, "display_name": u.display_name}
            for u in users
        ],
        "matches": [
            {
                "id": m.id,
                "num": m.match_number,
                "stage": m.stage if m.stage else ("group" if m.group_letter and m.group_letter not in ("", "?") else None),
                "group": m.group_letter,
                "status": m.status,
                "home_code": m.home_team.code if m.home_team else "?",
                "away_code": m.away_team.code if m.away_team else "?",
                "home_score": m.home_score,
                "away_score": m.away_score,
                "kickoff_utc": m.kickoff_utc.isoformat() if m.kickoff_utc else None,
                "scored": m.match_number not in UNSCORED_MATCH_NUMBERS,
            }
            for m in matches
        ],
        "cells": cells,
    }
