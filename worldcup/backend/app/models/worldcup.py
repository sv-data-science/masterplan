from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import relationship
import uuid
from app.database import Base


class Team(Base):
    __tablename__ = "teams"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    code = Column(String(3), nullable=False, unique=True)
    group_letter = Column(String(1), nullable=False, index=True)
    flag = Column(String(10), nullable=False, default="🏳️")

    home_matches = relationship("Match", foreign_keys="Match.home_team_id", back_populates="home_team")
    away_matches = relationship("Match", foreign_keys="Match.away_team_id", back_populates="away_team")


class Match(Base):
    __tablename__ = "matches"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    match_number = Column(Integer, nullable=False, unique=True)
    group_letter = Column(String(1), nullable=False, index=True)
    matchday = Column(Integer, nullable=False)  # 1, 2, or 3
    home_team_id = Column(String, ForeignKey("teams.id"), nullable=False)
    away_team_id = Column(String, ForeignKey("teams.id"), nullable=False)
    kickoff_utc = Column(DateTime(timezone=True), nullable=True)
    venue = Column(String(200), nullable=True)
    city = Column(String(100), nullable=True)
    home_score = Column(Integer, nullable=True)
    away_score = Column(Integer, nullable=True)
    # scheduled | live | completed
    status = Column(String(20), nullable=False, default="scheduled")
    external_id = Column(Integer, nullable=True, unique=True, index=True)  # football-data.org match id

    home_team = relationship("Team", foreign_keys=[home_team_id], back_populates="home_matches")
    away_team = relationship("Team", foreign_keys=[away_team_id], back_populates="away_matches")
    predictions = relationship("Prediction", back_populates="match", cascade="all, delete-orphan")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    match_id = Column(String, ForeignKey("matches.id"), nullable=False)
    pred_home = Column(Integer, nullable=False)
    pred_away = Column(Integer, nullable=False)
    points_earned = Column(Integer, nullable=True)  # null until match is completed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="predictions")
    match = relationship("Match", back_populates="predictions")
