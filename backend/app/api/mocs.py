from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
import uuid, json
from app.database import get_db
from app.models.moc import MOC, MOCLike
from app.auth import get_current_user, get_optional_user
from app.models.user import User
from app.services.gamification import award_xp, check_achievements
from pydantic import BaseModel

router = APIRouter(prefix="/mocs", tags=["mocs"])

class MOCCreate(BaseModel):
    title: str
    description: Optional[str] = None
    theme: Optional[str] = None
    tags: list[str] = []
    images: list[str] = []
    piece_count: Optional[int] = None

class MOCOut(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str]
    theme: Optional[str]
    tags: list[str]
    images: list[str]
    piece_count: Optional[int]
    likes: int
    liked_by_me: bool = False
    created_at: str
    model_config = {"from_attributes": True}

def serialize_moc(moc: MOC, user_id: Optional[str] = None) -> dict:
    liked_ids = [like.user_id for like in moc.moc_likes] if moc.moc_likes else []
    return {
        "id": moc.id,
        "user_id": moc.user_id,
        "title": moc.title,
        "description": moc.description,
        "theme": moc.theme,
        "tags": json.loads(moc.tags) if moc.tags else [],
        "images": json.loads(moc.images) if moc.images else [],
        "piece_count": moc.piece_count,
        "likes": moc.likes,
        "liked_by_me": user_id in liked_ids if user_id else False,
        "created_at": moc.created_at.isoformat() if moc.created_at else "",
    }

@router.get("")
async def list_mocs(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=50),
    theme: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    from sqlalchemy.orm import selectinload
    query = select(MOC).options(selectinload(MOC.moc_likes)).where(MOC.is_published == True)
    if theme:
        query = query.where(MOC.theme == theme)
    query = query.order_by(MOC.likes.desc(), MOC.created_at.desc()).offset((page-1)*size).limit(size)
    result = await db.execute(query)
    mocs = result.scalars().all()
    return [serialize_moc(m, current_user.id if current_user else None) for m in mocs]

@router.post("", status_code=201)
async def create_moc(body: MOCCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    moc = MOC(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        title=body.title,
        description=body.description,
        theme=body.theme,
        tags=json.dumps(body.tags),
        images=json.dumps(body.images),
        piece_count=body.piece_count,
    )
    db.add(moc)
    await db.flush()
    await db.refresh(moc)
    await award_xp(db, current_user, 25)
    await check_achievements(db, current_user)
    return serialize_moc(moc, current_user.id)

@router.post("/{moc_id}/like", status_code=201)
async def like_moc(moc_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MOC).where(MOC.id == moc_id))
    moc = result.scalar_one_or_none()
    if not moc:
        raise HTTPException(status_code=404, detail="MOC not found")
    existing = await db.execute(select(MOCLike).where(MOCLike.moc_id == moc_id, MOCLike.user_id == current_user.id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Already liked")
    like = MOCLike(id=str(uuid.uuid4()), moc_id=moc_id, user_id=current_user.id)
    db.add(like)
    moc.likes += 1
    await db.flush()
    return {"liked": True}

@router.delete("/{moc_id}/like", status_code=204)
async def unlike_moc(moc_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MOCLike).where(MOCLike.moc_id == moc_id, MOCLike.user_id == current_user.id))
    like = result.scalar_one_or_none()
    if not like:
        raise HTTPException(status_code=404, detail="Like not found")
    await db.delete(like)
    moc_result = await db.execute(select(MOC).where(MOC.id == moc_id))
    moc = moc_result.scalar_one_or_none()
    if moc and moc.likes > 0:
        moc.likes -= 1
