import re
import json
from typing import Optional
from pydantic import BaseModel, field_validator
from datetime import datetime

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class UserPublic(BaseModel):
    id: str
    username: str
    display_name: str
    is_admin: bool
    created_at: datetime
    kit: Optional[dict] = None

    @field_validator("kit", mode="before")
    @classmethod
    def parse_kit(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return None
        return v

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    username: str
    email: str
    display_name: str
    password: str

    @field_validator("email")
    @classmethod
    def email_valid(cls, v: str) -> str:
        v = v.strip().lower()
        if not _EMAIL_RE.match(v):
            raise ValueError("Invalid email address")
        return v

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username must be alphanumeric (underscores and hyphens allowed)")
        if len(v) < 3 or len(v) > 30:
            raise ValueError("Username must be between 3 and 30 characters")
        return v.lower()

    @field_validator("password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        if len(v.encode()) > 72:
            raise ValueError("Password is too long (max 72 characters)")
        return v


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def email_normalise(cls, v: str) -> str:
        return v.strip().lower()
