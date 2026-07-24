from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class LeaguePredictionOut(BaseModel):
    id: str
    user_id: str
    match_id: str
    pred_home: int
    pred_away: int
    points_earned: Optional[int] = None
    model_config = {"from_attributes": True}


class LeagueMatchOut(BaseModel):
    id: str
    competition: str
    matchweek: int
    home_team: str
    away_team: str
    home_flag: str
    away_flag: str
    kickoff_utc: Optional[datetime] = None
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    status: str
    my_prediction: Optional[LeaguePredictionOut] = None
    model_config = {"from_attributes": True}


class LeaguePredictionCreate(BaseModel):
    match_id: str
    pred_home: int
    pred_away: int


class LeagueMatchCreate(BaseModel):
    competition: str
    matchweek: int
    home_team: str
    away_team: str
    home_flag: str = "🏳️"
    away_flag: str = "🏳️"
    kickoff_utc: Optional[datetime] = None


class LeagueScoreUpdate(BaseModel):
    home_score: int
    away_score: int
    status: str = "completed"


class LeagueLeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    username: str
    display_name: str
    total_points: int
    exact_scores: int
    correct_outcomes: int
    predictions_made: int
