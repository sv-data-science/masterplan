import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from app.auth import get_current_user, get_optional_current_user
from app.database import get_db
from app.models.user import User
from app.models.worldcup import Meme, MemeReaction

router = APIRouter(prefix="/memes", tags=["memes"])

ALLOWED_EMOJIS = {"❤️", "😂", "🔥", "🙈", "😮"}


class MemeCreate(BaseModel):
    image_data: str   # base64 data URL, max ~2MB


class ReactionToggle(BaseModel):
    emoji: str


class MemeOut(BaseModel):
    id: str
    user_id: str
    username: str
    display_name: str
    image_data: str
    created_at: str
    reactions: dict   # {"❤️": 3, "😂": 1}
    my_reactions: list  # emojis the current user has reacted with

    class Config:
        from_attributes = True


def _build_out(meme: Meme, current_user_id: str | None) -> MemeOut:
    counts: dict = {}
    mine: list = []
    for r in meme.reactions:
        counts[r.emoji] = counts.get(r.emoji, 0) + 1
        if current_user_id and r.user_id == current_user_id:
            mine.append(r.emoji)
    return MemeOut(
        id=meme.id,
        user_id=meme.user_id,
        username=meme.user.username,
        display_name=meme.user.display_name,
        image_data=meme.image_data,
        created_at=meme.created_at.isoformat(),
        reactions=counts,
        my_reactions=mine,
    )


@router.get("", response_model=list[MemeOut])
async def list_memes(
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    result = await db.execute(
        select(Meme)
        .options(selectinload(Meme.user), selectinload(Meme.reactions))
        .order_by(Meme.created_at.desc())
    )
    memes = result.scalars().all()
    uid = current_user.id if current_user else None
    return [_build_out(m, uid) for m in memes]


@router.post("", response_model=MemeOut, status_code=201)
async def upload_meme(
    body: MemeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Rough size guard: base64 for 2MB binary ≈ 2.8MB text
    if len(body.image_data) > 3_000_000:
        raise HTTPException(status_code=413, detail="Image too large (max ~2 MB)")
    if not body.image_data.startswith("data:image/"):
        raise HTTPException(status_code=400, detail="Must be a data URL (data:image/...)")
    meme = Meme(id=str(uuid.uuid4()), user_id=current_user.id, image_data=body.image_data)
    db.add(meme)
    await db.flush()
    # Reload with relationships via explicit select (avoids async lazy-load issues)
    loaded = (await db.execute(
        select(Meme).where(Meme.id == meme.id)
        .options(selectinload(Meme.user), selectinload(Meme.reactions))
    )).scalar_one()
    return _build_out(loaded, current_user.id)


@router.post("/{meme_id}/react", response_model=MemeOut)
async def toggle_reaction(
    meme_id: str,
    body: ReactionToggle,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.emoji not in ALLOWED_EMOJIS:
        raise HTTPException(status_code=400, detail=f"Emoji not allowed. Use: {ALLOWED_EMOJIS}")
    meme_row = (await db.execute(
        select(Meme).where(Meme.id == meme_id)
        .options(selectinload(Meme.user), selectinload(Meme.reactions))
    )).scalar_one_or_none()
    if not meme_row:
        raise HTTPException(status_code=404, detail="Meme not found")

    existing = (await db.execute(
        select(MemeReaction).where(
            MemeReaction.meme_id == meme_id,
            MemeReaction.user_id == current_user.id,
            MemeReaction.emoji == body.emoji,
        )
    )).scalar_one_or_none()

    if existing:
        await db.delete(existing)
    else:
        db.add(MemeReaction(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            meme_id=meme_id,
            emoji=body.emoji,
        ))
    await db.flush()
    await db.refresh(meme_row, ["reactions"])
    return _build_out(meme_row, current_user.id)


@router.delete("/{meme_id}", status_code=204)
async def delete_meme(
    meme_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    meme_row = (await db.execute(select(Meme).where(Meme.id == meme_id))).scalar_one_or_none()
    if not meme_row:
        raise HTTPException(status_code=404, detail="Meme not found")
    if meme_row.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not your meme")
    await db.delete(meme_row)
