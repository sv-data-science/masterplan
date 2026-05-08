from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base

class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(String, primary_key=True)
    key = Column(String(100), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    icon = Column(String(10), nullable=False)
    rarity = Column(String(20), default="bronze")  # bronze, silver, gold, platinum
    xp_reward = Column(Integer, default=100)
    target = Column(Integer, nullable=True)
    category = Column(String(50), default="collection")

class UserAchievement(Base):
    __tablename__ = "user_achievements"

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    achievement_id = Column(String, ForeignKey("achievements.id"), nullable=False)
    unlocked_at = Column(DateTime(timezone=True), server_default=func.now())
    progress = Column(Integer, default=0)

    user = relationship("User", back_populates="user_achievements")
    achievement = relationship("Achievement")
