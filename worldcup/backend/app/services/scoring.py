from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.worldcup import Match, Prediction

# Match numbers excluded from scoring — not all players had joined yet.
UNSCORED_MATCH_NUMBERS = {1, 2, 3, 4}


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
    if match.match_number in UNSCORED_MATCH_NUMBERS:
        return
    result = await db.execute(
        select(Prediction).where(Prediction.match_id == match.id)
    )
    predictions = result.scalars().all()
    for pred in predictions:
        pred.points_earned = calculate_points(
            pred.pred_home, pred.pred_away, match.home_score, match.away_score
        )
