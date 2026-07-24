from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, func, UniqueConstraint
from sqlalchemy.orm import relationship
import uuid
from app.database import Base


class LeagueMatch(Base):
    __tablename__ = "league_matches"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    competition = Column(String(30), nullable=False, index=True)  # liga_mx | champions_league | la_liga | premier_league
    matchweek = Column(Integer, nullable=False, index=True)
    home_team = Column(String(100), nullable=False)
    away_team = Column(String(100), nullable=False)
    home_flag = Column(String(10), nullable=False, default="🏳️")
    away_flag = Column(String(10), nullable=False, default="🏳️")
    kickoff_utc = Column(DateTime(timezone=True), nullable=True)
    home_score = Column(Integer, nullable=True)
    away_score = Column(Integer, nullable=True)
    status = Column(String(20), nullable=False, default="scheduled")  # scheduled | live | completed
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    predictions = relationship("LeaguePrediction", back_populates="match", cascade="all, delete-orphan")


class LeaguePrediction(Base):
    __tablename__ = "league_predictions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    match_id = Column(String, ForeignKey("league_matches.id"), nullable=False)
    pred_home = Column(Integer, nullable=False)
    pred_away = Column(Integer, nullable=False)
    points_earned = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User")
    match = relationship("LeagueMatch", back_populates="predictions")

    __table_args__ = (UniqueConstraint("user_id", "match_id", name="uq_league_pred_user_match"),)
