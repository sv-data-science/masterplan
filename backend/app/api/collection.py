from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
import uuid
from app.database import get_db
from app.models.collection import CollectionItem
from app.models.set import LegoSet, Minifigure
from app.models.moc import MOC
from app.schemas.collection import CollectionItemCreate, CollectionItemUpdate, CollectionItemOut, CollectionStats
from app.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/collection", tags=["collection"])

@router.get("", response_model=list[CollectionItemOut])
async def get_collection(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(24, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(CollectionItem).where(CollectionItem.user_id == current_user.id)
    if status:
        query = query.where(CollectionItem.status == status)
    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/stats", response_model=CollectionStats)
async def get_stats(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Count owned sets
    sets_result = await db.execute(
        select(func.count()).where(CollectionItem.user_id == current_user.id, CollectionItem.status == "owned", CollectionItem.set_id.isnot(None))
    )
    total_sets = sets_result.scalar() or 0

    # Count owned minifigs
    figs_result = await db.execute(
        select(func.count()).where(CollectionItem.user_id == current_user.id, CollectionItem.status == "owned", CollectionItem.minifig_id.isnot(None))
    )
    total_minifigs = figs_result.scalar() or 0

    # Wishlist count
    wish_result = await db.execute(
        select(func.count()).where(CollectionItem.user_id == current_user.id, CollectionItem.status == "wishlist")
    )
    wishlist_count = wish_result.scalar() or 0

    # MOCs count
    moc_result = await db.execute(select(func.count()).where(MOC.user_id == current_user.id))
    mocs_count = moc_result.scalar() or 0

    # Retired owned
    retired_result = await db.execute(
        select(func.count()).select_from(CollectionItem).join(LegoSet, CollectionItem.set_id == LegoSet.id)
        .where(CollectionItem.user_id == current_user.id, CollectionItem.status == "owned", LegoSet.is_retired == True)
    )
    retired_owned = retired_result.scalar() or 0

    # Estimated value (sum of set values * quantity)
    value_result = await db.execute(
        select(func.sum(LegoSet.estimated_value * CollectionItem.quantity))
        .select_from(CollectionItem).join(LegoSet, CollectionItem.set_id == LegoSet.id)
        .where(CollectionItem.user_id == current_user.id, CollectionItem.status == "owned")
    )
    total_value = value_result.scalar() or 0.0

    # Complete percentage
    complete_result = await db.execute(
        select(func.count()).where(CollectionItem.user_id == current_user.id, CollectionItem.status == "owned", CollectionItem.is_complete == True)
    )
    complete_count = complete_result.scalar() or 0
    collection_complete_pct = (complete_count / total_sets * 100) if total_sets > 0 else 0

    return CollectionStats(
        total_sets=total_sets,
        total_minifigs=total_minifigs,
        total_value=total_value,
        wishlist_count=wishlist_count,
        collection_complete_pct=collection_complete_pct,
        rare_items=0,
        retired_owned=retired_owned,
        mocs_count=mocs_count,
    )

@router.post("", response_model=CollectionItemOut, status_code=201)
async def add_to_collection(
    body: CollectionItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not body.set_id and not body.minifig_id:
        raise HTTPException(status_code=400, detail="Either set_id or minifig_id is required")

    # Check for duplicate
    query = select(CollectionItem).where(
        CollectionItem.user_id == current_user.id,
        CollectionItem.status == body.status,
    )
    if body.set_id:
        query = query.where(CollectionItem.set_id == body.set_id)
    if body.minifig_id:
        query = query.where(CollectionItem.minifig_id == body.minifig_id)
    existing = (await db.execute(query)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Item already in collection with this status")

    item = CollectionItem(id=str(uuid.uuid4()), user_id=current_user.id, **body.model_dump())
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item

@router.put("/{item_id}", response_model=CollectionItemOut)
async def update_collection_item(
    item_id: str,
    body: CollectionItemUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CollectionItem).where(CollectionItem.id == item_id, CollectionItem.user_id == current_user.id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(item, field, value)
    await db.flush()
    return item

@router.delete("/{item_id}", status_code=204)
async def remove_from_collection(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CollectionItem).where(CollectionItem.id == item_id, CollectionItem.user_id == current_user.id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    await db.delete(item)
