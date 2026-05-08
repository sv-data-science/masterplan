from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime

class UserStats(BaseModel):
    total_sets: int = 0
    total_minifigs: int = 0
    total_value: float = 0.0
    wishlist_count: int = 0
    collection_complete_pct: float = 0.0
    rare_items: int = 0
    retired_owned: int = 0
    mocs_count: int = 0

class UserPublic(BaseModel):
    id: str
    username: str
    display_name: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    collector_archetype: Optional[str] = None
    xp: int
    level: int
    is_public: bool
    created_at: datetime
    stats: Optional[UserStats] = None
    model_config = {"from_attributes": True}

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    display_name: str
    password: str

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username must be alphanumeric (underscores and hyphens allowed)")
        if len(v) < 3 or len(v) > 30:
            raise ValueError("Username must be between 3 and 30 characters")
        return v.lower()

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    is_public: Optional[bool] = None

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
