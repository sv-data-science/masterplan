import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, Integer, case
from sqlalchemy.orm import selectinload
from typing import Optional
from datetime import datetime, timezone

from app.database import get_db
from app.models.league import LeagueMatch, LeaguePrediction
from app.models.user import User
from app.auth import get_current_user
from app.schemas.league import (
    LeagueMatchOut, LeaguePredictionOut, LeaguePredictionCreate,
    LeagueMatchCreate, LeagueScoreUpdate, LeagueLeaderboardEntry,
)
from app.services.scoring import calculate_points

router = APIRouter(prefix="/league", tags=["league"])
admin_router = APIRouter(prefix="/admin/league", tags=["league-admin"])


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin only")
    return current_user


def _attach_prediction(match: LeagueMatch, preds_by_match: dict) -> LeagueMatchOut:
    out = LeagueMatchOut.model_validate(match)
    pred = preds_by_match.get(match.id)
    if pred:
        out.my_prediction = LeaguePredictionOut.model_validate(pred)
    return out


# ─── Public endpoints ────────────────────────────────────────────────────────

@router.get("/matches", response_model=list[LeagueMatchOut])
async def list_matches(
    competition: Optional[str] = None,
    matchweek: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    """Return all league matches without requiring auth."""
    return await _list_matches_authed(competition, matchweek, db, None)


@router.get("/matches/authed", response_model=list[LeagueMatchOut])
async def list_matches_authed(
    competition: Optional[str] = None,
    matchweek: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return matches with the current user's predictions attached."""
    return await _list_matches_authed(competition, matchweek, db, current_user)


async def _list_matches_authed(
    competition: Optional[str],
    matchweek: Optional[int],
    db: AsyncSession,
    current_user: Optional[User],
) -> list[LeagueMatchOut]:
    q = select(LeagueMatch)
    if competition:
        q = q.where(LeagueMatch.competition == competition)
    if matchweek is not None:
        q = q.where(LeagueMatch.matchweek == matchweek)
    q = q.order_by(LeagueMatch.kickoff_utc.asc().nulls_last(), LeagueMatch.created_at)
    matches = (await db.execute(q)).scalars().all()

    preds_by_match: dict = {}
    if current_user:
        match_ids = [m.id for m in matches]
        if match_ids:
            preds = (await db.execute(
                select(LeaguePrediction).where(
                    LeaguePrediction.user_id == current_user.id,
                    LeaguePrediction.match_id.in_(match_ids),
                )
            )).scalars().all()
            preds_by_match = {p.match_id: p for p in preds}

    return [_attach_prediction(m, preds_by_match) for m in matches]


@router.post("/predictions", response_model=LeaguePredictionOut, status_code=201)
async def upsert_prediction(
    body: LeaguePredictionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    match = (await db.execute(
        select(LeagueMatch).where(LeagueMatch.id == body.match_id)
    )).scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.status != "scheduled":
        raise HTTPException(status_code=400, detail="Predictions are locked once the match starts")
    if match.kickoff_utc and match.kickoff_utc <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Predictions are locked — kickoff has passed")

    pred = (await db.execute(
        select(LeaguePrediction).where(
            LeaguePrediction.match_id == body.match_id,
            LeaguePrediction.user_id == current_user.id,
        )
    )).scalar_one_or_none()

    if pred:
        pred.pred_home = body.pred_home
        pred.pred_away = body.pred_away
    else:
        pred = LeaguePrediction(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            match_id=body.match_id,
            pred_home=body.pred_home,
            pred_away=body.pred_away,
        )
        db.add(pred)

    await db.flush()
    return LeaguePredictionOut.model_validate(pred)


@router.get("/predictions/my", response_model=list[LeaguePredictionOut])
async def my_predictions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    preds = (await db.execute(
        select(LeaguePrediction).where(LeaguePrediction.user_id == current_user.id)
    )).scalars().all()
    return [LeaguePredictionOut.model_validate(p) for p in preds]


@router.get("/leaderboard", response_model=list[LeagueLeaderboardEntry])
async def leaderboard(
    competition: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    match_q = select(LeagueMatch.id)
    if competition:
        match_q = match_q.where(LeagueMatch.competition == competition)
    match_ids = (await db.execute(match_q)).scalars().all()

    if not match_ids:
        return []

    pred_q = (
        select(
            LeaguePrediction.user_id,
            func.sum(LeaguePrediction.points_earned).label("total_points"),
            func.count(LeaguePrediction.id).label("predictions_made"),
            func.sum(
                case((LeaguePrediction.points_earned == 3, 1), else_=0)
            ).label("exact_scores"),
            func.sum(
                case((LeaguePrediction.points_earned >= 1, 1), else_=0)
            ).label("correct_outcomes"),
        )
        .where(
            LeaguePrediction.match_id.in_(match_ids),
            LeaguePrediction.points_earned.is_not(None),
        )
        .group_by(LeaguePrediction.user_id)
    )
    rows = (await db.execute(pred_q)).all()

    user_ids = [r.user_id for r in rows]
    users = {
        u.id: u
        for u in (await db.execute(select(User).where(User.id.in_(user_ids)))).scalars().all()
    }

    entries = []
    for r in rows:
        u = users.get(r.user_id)
        if not u:
            continue
        entries.append(LeagueLeaderboardEntry(
            rank=0,
            user_id=r.user_id,
            username=u.username,
            display_name=u.display_name,
            total_points=r.total_points or 0,
            exact_scores=r.exact_scores or 0,
            correct_outcomes=r.correct_outcomes or 0,
            predictions_made=r.predictions_made or 0,
        ))

    entries.sort(key=lambda e: (-e.total_points, -e.exact_scores, -e.correct_outcomes))
    for i, e in enumerate(entries):
        e.rank = i + 1

    return entries


@router.get("/competitions")
async def list_competitions(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(
        select(LeagueMatch.competition, func.max(LeagueMatch.matchweek).label("max_week"))
        .group_by(LeagueMatch.competition)
    )).all()
    return [{"competition": r.competition, "max_matchweek": r.max_week} for r in rows]


# ─── Admin endpoints ─────────────────────────────────────────────────────────

@admin_router.post("/matches", response_model=LeagueMatchOut, status_code=201)
async def create_match(
    body: LeagueMatchCreate,
    admin: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    match = LeagueMatch(
        id=str(uuid.uuid4()),
        competition=body.competition,
        matchweek=body.matchweek,
        home_team=body.home_team,
        away_team=body.away_team,
        home_flag=body.home_flag,
        away_flag=body.away_flag,
        kickoff_utc=body.kickoff_utc,
    )
    db.add(match)
    await db.flush()
    return LeagueMatchOut.model_validate(match)


@admin_router.patch("/matches/{match_id}", response_model=LeagueMatchOut)
async def update_match(
    match_id: str,
    body: LeagueMatchCreate,
    admin: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    match = (await db.execute(
        select(LeagueMatch).where(LeagueMatch.id == match_id)
    )).scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    match.competition = body.competition
    match.matchweek = body.matchweek
    match.home_team = body.home_team
    match.away_team = body.away_team
    match.home_flag = body.home_flag
    match.away_flag = body.away_flag
    if body.kickoff_utc is not None:
        match.kickoff_utc = body.kickoff_utc

    await db.flush()
    return LeagueMatchOut.model_validate(match)


@admin_router.post("/matches/{match_id}/score")
async def set_score(
    match_id: str,
    body: LeagueScoreUpdate,
    admin: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    match = (await db.execute(
        select(LeagueMatch)
        .options(selectinload(LeagueMatch.predictions))
        .where(LeagueMatch.id == match_id)
    )).scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    match.home_score = body.home_score
    match.away_score = body.away_score
    match.status = body.status

    for pred in match.predictions:
        pred.points_earned = calculate_points(
            pred.pred_home, pred.pred_away, body.home_score, body.away_score
        )

    await db.flush()
    return {
        "status": "ok",
        "match_id": match_id,
        "home_score": body.home_score,
        "away_score": body.away_score,
        "predictions_updated": len(match.predictions),
    }


@admin_router.delete("/matches/{match_id}")
async def delete_match(
    match_id: str,
    admin: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    match = (await db.execute(
        select(LeagueMatch).where(LeagueMatch.id == match_id)
    )).scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    await db.delete(match)
    await db.flush()
    return {"status": "deleted", "match_id": match_id}


@admin_router.get("/matches", response_model=list[LeagueMatchOut])
async def admin_list_matches(
    competition: Optional[str] = None,
    matchweek: Optional[int] = None,
    admin: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    q = select(LeagueMatch)
    if competition:
        q = q.where(LeagueMatch.competition == competition)
    if matchweek is not None:
        q = q.where(LeagueMatch.matchweek == matchweek)
    q = q.order_by(LeagueMatch.kickoff_utc.asc().nulls_last(), LeagueMatch.created_at)
    matches = (await db.execute(q)).scalars().all()
    return [LeagueMatchOut.model_validate(m) for m in matches]
