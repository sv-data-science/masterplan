from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TeamOut(BaseModel):
    id: str
    name: str
    code: str
    group_letter: str
    flag: str
    model_config = {"from_attributes": True}


class PredictionOut(BaseModel):
    id: str
    user_id: str
    match_id: str
    pred_home: int
    pred_away: int
    points_earned: Optional[int] = None
    model_config = {"from_attributes": True}


class MatchOut(BaseModel):
    id: str
    match_number: int
    group_letter: str
    matchday: int
    home_team: TeamOut
    away_team: TeamOut
    kickoff_utc: Optional[datetime] = None
    venue: Optional[str] = None
    city: Optional[str] = None
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    status: str
    my_prediction: Optional[PredictionOut] = None
    model_config = {"from_attributes": True}


class PredictionCreate(BaseModel):
    match_id: str
    pred_home: int
    pred_away: int


class ScoreUpdate(BaseModel):
    home_score: int
    away_score: int
    status: str = "completed"


class MatchPredictionEntry(BaseModel):
    user_id: str
    username: str
    display_name: str
    pred_home: int
    pred_away: int
    points_earned: Optional[int] = None


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    username: str
    display_name: str
    total_points: int
    exact_scores: int
    correct_outcomes: int
    predictions_made: int
