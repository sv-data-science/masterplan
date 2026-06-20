from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, func
from sqlalchemy.orm import relationship
import uuid
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    display_name = Column(String(100), nullable=False)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    kit = Column(Text, nullable=True)             # JSON-encoded KitConfig
    fav_wc_year = Column(Integer, nullable=True)  # e.g. 1970
    fav_national_team = Column(String(80), nullable=True)  # e.g. "Brazil 🇧🇷"
    fav_player = Column(String(100), nullable=True)        # e.g. "Pelé"

    predictions = relationship("Prediction", back_populates="user", cascade="all, delete-orphan")
