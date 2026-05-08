from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class LegoSetBase(BaseModel):
    set_number: str
    name: str
    theme: str
    subtheme: Optional[str] = None
    year: int
    pieces: Optional[int] = None
    minifigs: int = 0
    msrp: Optional[float] = None
    currency: str = "USD"
    image_url: Optional[str] = None
    availability: str = "available"
    is_retired: bool = False
    retiring_soon: bool = False
    estimated_value: Optional[float] = None
    description: Optional[str] = None

class LegoSetOut(LegoSetBase):
    id: str
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}

class MinifigureOut(BaseModel):
    id: str
    fig_number: str
    name: str
    character_name: Optional[str] = None
    theme: str
    year: int
    image_url: Optional[str] = None
    is_cmf: bool
    cmf_series: Optional[str] = None
    estimated_value: Optional[float] = None
    rarity: str
    model_config = {"from_attributes": True}

class PaginatedSets(BaseModel):
    items: List[LegoSetOut]
    total: int
    page: int
    size: int
    pages: int
