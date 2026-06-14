import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.worldcup import GoalEvent, Match, Team
from app.models.user import User
from app.schemas.worldcup import GoalEventOut, GoalEventCreate
from app.auth import get_current_user

router = APIRouter(tags=["goals"])


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin only")
    return current_user


@router.get("/matches/{match_id}/goals", response_model=list[GoalEventOut])
async def list_goals(match_id: str, db: AsyncSession = Depends(get_db)):
    goals = (await db.execute(
        select(GoalEvent)
        .where(GoalEvent.match_id == match_id)
        .order_by(GoalEvent.minute.is_(None), GoalEvent.minute)
    )).scalars().all()
    return goals


@router.post("/matches/{match_id}/goals", response_model=GoalEventOut, status_code=201)
async def add_goal(
    match_id: str,
    body: GoalEventCreate,
    admin: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    match = (await db.execute(select(Match).where(Match.id == match_id))).scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    goal = GoalEvent(
        id=str(uuid.uuid4()),
        match_id=match_id,
        team_id=body.team_id,
        player_name=body.player_name.strip(),
        minute=body.minute,
        is_own_goal=body.is_own_goal,
        is_penalty=body.is_penalty,
    )
    db.add(goal)
    await db.flush()
    return goal


@router.delete("/goals/{goal_id}", status_code=204)
async def delete_goal(
    goal_id: str,
    admin: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    goal = (await db.execute(select(GoalEvent).where(GoalEvent.id == goal_id))).scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    await db.delete(goal)


@router.get("/stats/top-scorers")
async def top_scorers(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(
        select(
            GoalEvent.player_name,
            GoalEvent.team_id,
            Team.code,
            Team.flag,
            Team.name,
            Team.group_letter,
            func.count(GoalEvent.id).label("goals"),
        )
        .join(Team, GoalEvent.team_id == Team.id)
        .where(GoalEvent.is_own_goal == False)  # noqa: E712
        .group_by(
            GoalEvent.player_name, GoalEvent.team_id,
            Team.code, Team.flag, Team.name, Team.group_letter,
        )
        .order_by(func.count(GoalEvent.id).desc(), GoalEvent.player_name)
    )).all()
    return [
        {
            "player_name": r.player_name,
            "team_id": r.team_id,
            "team_code": r.code,
            "team_flag": r.flag,
            "team_name": r.name,
            "group_letter": r.group_letter,
            "goals": int(r.goals),
        }
        for r in rows
    ]
