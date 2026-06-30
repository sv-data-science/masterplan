from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.worldcup import Match, Prediction

# Predictions for matches before this date are never scored.
# The first 3 matches (Jun 11) are excluded because not all players had joined yet.
SCORING_CUTOFF = datetime(2026, 6, 12, 0, 0, 0, tzinfo=timezone.utc)


def calculate_points(
    pred_home: int, pred_away: int, actual_home: int, actual_away: int
) -> int:
    if pred_home == actual_home and pred_away == actual_away:
        return 3  # exact score
    pred_outcome = (pred_home > pred_away) - (pred_home < pred_away)
    actual_outcome = (actual_home > actual_away) - (actual_home < actual_away)
    if pred_outcome != actual_outcome:
        return 0  # wrong outcome
    # correct outcome — check goal difference
    if (pred_home - pred_away) == (actual_home - actual_away):
        return 2  # correct outcome + same goal difference
    return 1  # correct outcome only


async def recalculate_match_points(match: Match, db: AsyncSession) -> None:
    # Skip matches before the scoring cutoff — those predictions never earn points
    if match.kickoff_utc and match.kickoff_utc.replace(tzinfo=timezone.utc if match.kickoff_utc.tzinfo is None else match.kickoff_utc.tzinfo) < SCORING_CUTOFF:
        return
    result = await db.execute(
        select(Prediction).where(Prediction.match_id == match.id)
    )
    predictions = result.scalars().all()
    for pred in predictions:
        pred.points_earned = calculate_points(
            pred.pred_home, pred.pred_away, match.home_score, match.away_score
        )
