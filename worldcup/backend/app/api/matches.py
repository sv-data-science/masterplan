from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Optional, List
from app.database import get_db
from app.models.worldcup import Match, Prediction, GoalEvent
from app.models.user import User
from app.schemas.worldcup import MatchOut, PredictionOut, ScoreUpdate, MatchPredictionEntry
from app.auth import get_current_user, get_optional_user
from app.services.scoring import calculate_points, recalculate_match_points

router = APIRouter(prefix="/matches", tags=["matches"])

_MATCH_OPTIONS = [
    selectinload(Match.home_team),
    selectinload(Match.away_team),
    selectinload(Match.goals),
]


@router.get("", response_model=List[MatchOut])
async def list_matches(
    group: Optional[str] = None,
    matchday: Optional[int] = None,
    stage: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    q = select(Match).options(*_MATCH_OPTIONS).order_by(Match.kickoff_utc, Match.match_number)
    if group:
        q = q.where(Match.group_letter == group.upper())
    if matchday:
        q = q.where(Match.matchday == matchday)
    if stage:
        q = q.where(Match.stage == stage)

    result = await db.execute(q)
    matches = result.scalars().all()

    out = []
    for m in matches:
        pred = None
        if current_user:
            p_result = await db.execute(
                select(Prediction).where(
                    Prediction.match_id == m.id,
                    Prediction.user_id == current_user.id,
                )
            )
            p = p_result.scalar_one_or_none()
            if p:
                pred = PredictionOut.model_validate(p)
        item = MatchOut.model_validate(m)
        item.my_prediction = pred
        out.append(item)
    return out


@router.get("/{match_id}", response_model=MatchOut)
async def get_match(
    match_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    result = await db.execute(select(Match).options(*_MATCH_OPTIONS).where(Match.id == match_id))
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    pred = None
    if current_user:
        p_result = await db.execute(
            select(Prediction).where(
                Prediction.match_id == match_id,
                Prediction.user_id == current_user.id,
            )
        )
        p = p_result.scalar_one_or_none()
        if p:
            pred = PredictionOut.model_validate(p)

    item = MatchOut.model_validate(match)
    item.my_prediction = pred
    return item


@router.get("/{match_id}/predictions", response_model=List[MatchPredictionEntry])
async def match_predictions(
    match_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all predictions for a match — only visible once the match has started."""
    result = await db.execute(select(Match).where(Match.id == match_id))
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.status == "scheduled":
        raise HTTPException(status_code=403, detail="Predictions hidden until match starts")

    preds = (await db.execute(
        select(Prediction, User)
        .join(User, Prediction.user_id == User.id)
        .where(Prediction.match_id == match_id)
        .order_by(Prediction.points_earned.desc().nulls_last(), User.display_name)
    )).all()

    return [
        MatchPredictionEntry(
            user_id=pred.user_id,
            username=user.username,
            display_name=user.display_name,
            pred_home=pred.pred_home,
            pred_away=pred.pred_away,
            points_earned=pred.points_earned,
        )
        for pred, user in preds
    ]


@router.put("/{match_id}/score", response_model=MatchOut)
async def update_score(
    match_id: str,
    body: ScoreUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin only")

    result = await db.execute(select(Match).options(*_MATCH_OPTIONS).where(Match.id == match_id))
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    match.home_score = body.home_score
    match.away_score = body.away_score
    match.status = body.status
    if body.kickoff_utc is not None:
        match.kickoff_utc = body.kickoff_utc
    if body.venue is not None:
        match.venue = body.venue
    if body.city is not None:
        match.city = body.city

    if body.status == "completed":
        await recalculate_match_points(match, db)

    await db.flush()
    item = MatchOut.model_validate(match)
    return item
