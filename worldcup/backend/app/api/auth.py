from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import uuid
import json
from pydantic import BaseModel
from typing import Any, Optional
from app.database import get_db, AsyncSessionLocal
from app.models.user import User
from app.models.worldcup import Prediction, TriviaScore, TriviaLiveScore
from app.schemas.user import UserCreate, UserPublic, Token, LoginRequest
from app.auth import hash_password, verify_password, create_access_token, get_current_user
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(body: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where((User.email == body.email) | (User.username == body.username))
    )
    existing = result.scalar_one_or_none()
    if existing:
        detail = "Email already registered" if existing.email == body.email else "Username already taken"
        raise HTTPException(status_code=400, detail=detail)

    # First registered user becomes admin
    count_result = await db.execute(select(User))
    is_first = count_result.first() is None

    user = User(
        id=str(uuid.uuid4()),
        username=body.username,
        email=body.email,
        display_name=body.display_name,
        hashed_password=hash_password(body.password),
        is_admin=is_first,
    )
    db.add(user)
    await db.flush()
    token = create_access_token({"sub": user.id})
    return Token(access_token=token, user=UserPublic.model_validate(user))


@router.post("/login", response_model=Token)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    token = create_access_token({"sub": user.id})
    return Token(access_token=token, user=UserPublic.model_validate(user))


@router.get("/me", response_model=UserPublic)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


class KitUpdate(BaseModel):
    jersey: dict[str, Any]
    shorts: dict[str, Any]
    socks: dict[str, Any]


@router.put("/kit", response_model=UserPublic)
async def update_kit(
    body: KitUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.kit = json.dumps(body.model_dump())
    await db.flush()
    return current_user


@router.get("/profile/{username}")
async def get_public_profile(username: str):
    """Public profile — no auth required."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(func.lower(User.username) == username.lower()))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Leaderboard rank
        rows = (await db.execute(
            select(
                User.id,
                func.coalesce(func.sum(Prediction.points_earned), 0).label("total_points"),
                func.count(Prediction.id).label("predictions"),
            )
            .join(Prediction, Prediction.user_id == User.id, isouter=True)
            .group_by(User.id)
            .order_by(func.coalesce(func.sum(Prediction.points_earned), 0).desc())
        )).all()

        rank: Optional[int] = None
        total_points = 0
        predictions_made = 0
        prev_pts = None
        prev_rank = 0
        for i, r in enumerate(rows):
            pts = int(r.total_points or 0)
            cur_rank = prev_rank if pts == prev_pts else i + 1
            prev_pts = pts
            prev_rank = cur_rank
            if r.id == user.id:
                rank = cur_rank
                total_points = pts
                predictions_made = int(r.predictions or 0)
                break

        # Trivia stats
        best_row = (await db.execute(
            select(TriviaScore)
            .where(TriviaScore.user_id == user.id, TriviaScore.total > 0)
            .order_by(TriviaScore.score.desc())
            .limit(1)
        )).scalar_one_or_none()

        games_played = (await db.execute(
            select(func.count(TriviaScore.id)).where(TriviaScore.user_id == user.id)
        )).scalar() or 0

        live = (await db.execute(
            select(TriviaLiveScore).where(TriviaLiveScore.user_id == user.id)
        )).scalar_one_or_none()

        kit = None
        if user.kit:
            try:
                kit = json.loads(user.kit)
            except Exception:
                pass

        return {
            "username": user.username,
            "display_name": user.display_name,
            "kit": kit,
            "rank": rank,
            "total_points": total_points,
            "predictions_made": predictions_made,
            "best_score": best_row.score if best_row else None,
            "best_total": best_row.total if best_row else None,
            "games_played": int(games_played),
            "live_score": live.score if live else None,
            "live_total": live.total if live else None,
        }


@router.post("/make-admin/{user_id}", response_model=UserPublic)
async def make_admin(
    user_id: str,
    x_admin_secret: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    if x_admin_secret != settings.ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin secret")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_admin = True
    await db.flush()
    return user
