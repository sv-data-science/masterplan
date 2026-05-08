from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import relationship
import uuid
from app.database import Base

class MOC(Base):
    __tablename__ = "mocs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    theme = Column(String(100), nullable=True)
    tags = Column(String, nullable=True)  # JSON array stored as string
    images = Column(Text, nullable=True)  # JSON array stored as string
    instructions_url = Column(String, nullable=True)
    piece_count = Column(Integer, nullable=True)
    likes = Column(Integer, default=0)
    is_published = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="mocs")
    moc_likes = relationship("MOCLike", back_populates="moc", cascade="all, delete-orphan")

class MOCLike(Base):
    __tablename__ = "moc_likes"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    moc_id = Column(String, ForeignKey("mocs.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    moc = relationship("MOC", back_populates="moc_likes")
