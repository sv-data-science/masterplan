from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, func, Text, UniqueConstraint
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
    # Penalty shootout scores — set only when match went to pens (not used for prediction scoring)
    home_score_pens = Column(Integer, nullable=True)
    away_score_pens = Column(Integer, nullable=True)
    # scheduled | live | completed
    status = Column(String(20), nullable=False, default="scheduled")
    # group | r32 | r16 | qf | sf | 3rd | final
    stage = Column(String(10), nullable=True)
    external_id = Column(Integer, nullable=True, unique=True, index=True)  # football-data.org match id
    score_locked = Column(Boolean, nullable=False, default=False)  # admin override — sync skips this match

    home_team = relationship("Team", foreign_keys=[home_team_id], back_populates="home_matches")
    away_team = relationship("Team", foreign_keys=[away_team_id], back_populates="away_matches")
    predictions = relationship("Prediction", back_populates="match", cascade="all, delete-orphan")
    goals = relationship("GoalEvent", back_populates="match", cascade="all, delete-orphan")


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


class GoalEvent(Base):
    __tablename__ = "goal_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    match_id = Column(String, ForeignKey("matches.id", ondelete="CASCADE"), nullable=False, index=True)
    # team_id = the player's own team (for OG, it's the team that conceded, not the beneficiary)
    team_id = Column(String, ForeignKey("teams.id"), nullable=False)
    player_name = Column(String(100), nullable=False)
    minute = Column(Integer, nullable=True)
    is_own_goal = Column(Boolean, nullable=False, default=False)
    is_penalty = Column(Boolean, nullable=False, default=False)

    match = relationship("Match", back_populates="goals")
    team = relationship("Team")


class ScoreAuditLog(Base):
    __tablename__ = "score_audit_log"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    match_id = Column(String, ForeignKey("matches.id"), nullable=False, index=True)
    changed_by_user_id = Column(String, ForeignKey("users.id"), nullable=False)
    changed_at = Column(DateTime(timezone=True), server_default=func.now())
    # Scores before the change (null = not set yet)
    old_home_score = Column(Integer, nullable=True)
    old_away_score = Column(Integer, nullable=True)
    old_status = Column(String(20), nullable=True)
    old_home_score_pens = Column(Integer, nullable=True)
    old_away_score_pens = Column(Integer, nullable=True)
    # Scores after the change
    new_home_score = Column(Integer, nullable=False)
    new_away_score = Column(Integer, nullable=False)
    new_status = Column(String(20), nullable=False)
    new_home_score_pens = Column(Integer, nullable=True)
    new_away_score_pens = Column(Integer, nullable=True)

    match = relationship("Match")
    changed_by = relationship("User", foreign_keys=[changed_by_user_id])


class TriviaLiveScore(Base):
    """One row per user — upserted after each answer so landing page shows live accuracy."""
    __tablename__ = "trivia_live_scores"

    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    score = Column(Integer, nullable=False, default=0)
    total = Column(Integer, nullable=False, default=0)

    user = relationship("User")


class TriviaScore(Base):
    __tablename__ = "trivia_scores"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    score = Column(Integer, nullable=False)
    total = Column(Integer, nullable=False)
    played_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")


class Meme(Base):
    __tablename__ = "memes"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    image_data = Column(Text, nullable=False)   # base64 data URL (compressed JPEG)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user = relationship("User")
    reactions = relationship("MemeReaction", back_populates="meme", cascade="all, delete-orphan")


class MemeReaction(Base):
    __tablename__ = "meme_reactions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    meme_id = Column(String, ForeignKey("memes.id", ondelete="CASCADE"), nullable=False, index=True)
    emoji = Column(String(10), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user = relationship("User")
    meme = relationship("Meme", back_populates="reactions")
    __table_args__ = (UniqueConstraint("user_id", "meme_id", "emoji", name="uq_user_meme_emoji"),)
