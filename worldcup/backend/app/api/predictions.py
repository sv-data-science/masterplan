from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid
from app.database import get_db
from app.models.worldcup import Prediction, Match
from app.models.user import User
from app.schemas.worldcup import PredictionCreate, PredictionOut
from app.auth import get_current_user

router = APIRouter(prefix="/predictions", tags=["predictions"])


@router.post("", response_model=PredictionOut, status_code=201)
async def upsert_prediction(
    body: PredictionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    match_result = await db.execute(select(Match).where(Match.id == body.match_id))
    match = match_result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    existing = await db.execute(
        select(Prediction).where(
            Prediction.match_id == body.match_id,
            Prediction.user_id == current_user.id,
        )
    )
    pred = existing.scalar_one_or_none()

    if pred:
        pred.pred_home = body.pred_home
        pred.pred_away = body.pred_away
    else:
        pred = Prediction(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            match_id=body.match_id,
            pred_home=body.pred_home,
            pred_away=body.pred_away,
        )
        db.add(pred)

    await db.flush()
    return PredictionOut.model_validate(pred)


@router.get("/my", response_model=List[PredictionOut])
async def my_predictions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Prediction).where(Prediction.user_id == current_user.id)
    )
    return [PredictionOut.model_validate(p) for p in result.scalars().all()]
