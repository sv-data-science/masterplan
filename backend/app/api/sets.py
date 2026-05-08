from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional, List
from app.database import get_db
from app.models.set import LegoSet, Minifigure
from app.schemas.set import LegoSetOut, PaginatedSets, MinifigureOut

router = APIRouter(prefix="/sets", tags=["sets"])

@router.get("", response_model=PaginatedSets)
async def list_sets(
    q: Optional[str] = None,
    theme: Optional[str] = None,
    year: Optional[int] = None,
    availability: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(24, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(LegoSet)
    if q:
        query = query.where(or_(
            LegoSet.name.ilike(f"%{q}%"),
            LegoSet.set_number.ilike(f"%{q}%"),
        ))
    if theme:
        query = query.where(LegoSet.theme == theme)
    if year:
        query = query.where(LegoSet.year == year)
    if availability:
        query = query.where(LegoSet.availability == availability)

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar()

    query = query.order_by(LegoSet.year.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()

    return PaginatedSets(items=items, total=total, page=page, size=size, pages=-(-total // size))

@router.get("/themes", response_model=List[str])
async def list_themes(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LegoSet.theme).distinct().order_by(LegoSet.theme))
    return [row[0] for row in result.all()]

@router.get("/{set_id}", response_model=LegoSetOut)
async def get_set(set_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LegoSet).where(LegoSet.id == set_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Set not found")
    return s

@router.get("/minifigs/search", response_model=List[MinifigureOut])
async def search_minifigs(
    q: Optional[str] = None,
    theme: Optional[str] = None,
    is_cmf: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Minifigure)
    if q:
        query = query.where(or_(Minifigure.name.ilike(f"%{q}%"), Minifigure.fig_number.ilike(f"%{q}%")))
    if theme:
        query = query.where(Minifigure.theme == theme)
    if is_cmf is not None:
        query = query.where(Minifigure.is_cmf == is_cmf)
    query = query.limit(50)
    result = await db.execute(query)
    return result.scalars().all()
