from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.schemas.set import LegoSetOut, MinifigureOut

class CollectionItemCreate(BaseModel):
    set_id: Optional[str] = None
    minifig_id: Optional[str] = None
    status: str = "owned"
    quantity: int = 1
    condition: Optional[str] = None
    is_sealed: Optional[bool] = False
    is_complete: Optional[bool] = True
    notes: Optional[str] = None
    purchase_price: Optional[float] = None
    date_acquired: Optional[datetime] = None

class CollectionItemUpdate(BaseModel):
    status: Optional[str] = None
    quantity: Optional[int] = None
    condition: Optional[str] = None
    is_sealed: Optional[bool] = None
    is_complete: Optional[bool] = None
    notes: Optional[str] = None
    purchase_price: Optional[float] = None

class CollectionItemOut(BaseModel):
    id: str
    user_id: str
    set_id: Optional[str] = None
    minifig_id: Optional[str] = None
    set: Optional[LegoSetOut] = None
    minifig: Optional[MinifigureOut] = None
    status: str
    quantity: int
    condition: Optional[str] = None
    is_complete: bool
    is_sealed: Optional[bool] = None
    notes: Optional[str] = None
    purchase_price: Optional[float] = None
    date_acquired: Optional[datetime] = None
    added_at: datetime
    model_config = {"from_attributes": True}

class CollectionStats(BaseModel):
    total_sets: int
    total_minifigs: int
    total_value: float
    wishlist_count: int
    collection_complete_pct: float
    rare_items: int
    retired_owned: int
    mocs_count: int
