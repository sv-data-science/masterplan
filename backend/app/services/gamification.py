"""
Gamification engine.

- award_xp: adds XP to a user, levels them up if they cross a threshold.
- check_achievements: evaluates all achievement rules for a user, unlocks
  newly-earned ones, awards their XP, and returns the list of new unlocks.
- recompute_archetype: assigns a collector archetype based on the
  composition of their owned collection.

All functions take an open AsyncSession and don't commit — the caller
controls the transaction.
"""
from __future__ import annotations
import uuid
import math
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.achievement import Achievement, UserAchievement
from app.models.collection import CollectionItem
from app.models.set import LegoSet, Minifigure
from app.models.moc import MOC


def xp_for_next_level(level: int) -> int:
    """XP threshold to reach the start of the next level. Matches frontend utils."""
    return int(100 * math.pow(1.5, level))


async def award_xp(session: AsyncSession, user: User, amount: int) -> dict:
    """Add XP to a user, leveling them up as needed. Returns {xp, level, leveled_up}."""
    if amount <= 0:
        return {"xp": user.xp, "level": user.level, "leveled_up": False}

    user.xp = (user.xp or 0) + amount
    leveled_up = False
    while user.xp >= xp_for_next_level(user.level):
        user.level += 1
        leveled_up = True

    await session.flush()
    return {"xp": user.xp, "level": user.level, "leveled_up": leveled_up}


# ─── Achievement rule evaluators ──────────────────────────────────────────
# Each rule is (achievement_key, async function -> int progress).
# When progress >= achievement.target the unlock is granted.

async def _count_owned_sets(session: AsyncSession, user_id: str) -> int:
    r = await session.execute(
        select(func.count()).where(
            CollectionItem.user_id == user_id,
            CollectionItem.status == "owned",
            CollectionItem.set_id.isnot(None),
        )
    )
    return r.scalar() or 0


async def _count_owned_retired(session: AsyncSession, user_id: str) -> int:
    r = await session.execute(
        select(func.count())
        .select_from(CollectionItem)
        .join(LegoSet, CollectionItem.set_id == LegoSet.id)
        .where(
            CollectionItem.user_id == user_id,
            CollectionItem.status == "owned",
            LegoSet.is_retired == True,  # noqa: E712
        )
    )
    return r.scalar() or 0


async def _count_owned_theme(session: AsyncSession, user_id: str, theme: str) -> int:
    r = await session.execute(
        select(func.count())
        .select_from(CollectionItem)
        .join(LegoSet, CollectionItem.set_id == LegoSet.id)
        .where(
            CollectionItem.user_id == user_id,
            CollectionItem.status == "owned",
            LegoSet.theme == theme,
        )
    )
    return r.scalar() or 0


async def _count_owned_cmf(session: AsyncSession, user_id: str) -> int:
    r = await session.execute(
        select(func.count())
        .select_from(CollectionItem)
        .join(Minifigure, CollectionItem.minifig_id == Minifigure.id)
        .where(
            CollectionItem.user_id == user_id,
            CollectionItem.status == "owned",
            Minifigure.is_cmf == True,  # noqa: E712
        )
    )
    return r.scalar() or 0


async def _count_wishlist(session: AsyncSession, user_id: str) -> int:
    r = await session.execute(
        select(func.count()).where(
            CollectionItem.user_id == user_id,
            CollectionItem.status == "wishlist",
        )
    )
    return r.scalar() or 0


async def _count_mocs(session: AsyncSession, user_id: str) -> int:
    r = await session.execute(select(func.count()).where(MOC.user_id == user_id))
    return r.scalar() or 0


PROGRESS_FNS = {
    "first_set": _count_owned_sets,
    "ten_sets": _count_owned_sets,
    "fifty_sets": _count_owned_sets,
    "hundred_sets": _count_owned_sets,
    "first_retired": _count_owned_retired,
    "ten_retired": _count_owned_retired,
    "first_moc": _count_mocs,
    "wishlist_ten": _count_wishlist,
    "star_wars_fan": lambda s, uid: _count_owned_theme(s, uid, "Star Wars"),
    "cmf_collector": _count_owned_cmf,
}


async def check_achievements(session: AsyncSession, user: User) -> list[dict]:
    """Evaluate all known achievement keys for the user; unlock and award XP for any newly-earned ones."""
    # Already-unlocked keys
    unlocked_q = await session.execute(
        select(Achievement.key)
        .join(UserAchievement, UserAchievement.achievement_id == Achievement.id)
        .where(UserAchievement.user_id == user.id)
    )
    already = {row[0] for row in unlocked_q.all()}

    # Known achievements
    achievements_q = await session.execute(select(Achievement))
    achievements = achievements_q.scalars().all()

    new_unlocks: list[dict] = []
    for ach in achievements:
        if ach.key in already:
            continue
        fn = PROGRESS_FNS.get(ach.key)
        if not fn:
            continue
        progress = await fn(session, user.id)
        target = ach.target or 1
        if progress >= target:
            unlock = UserAchievement(
                id=str(uuid.uuid4()),
                user_id=user.id,
                achievement_id=ach.id,
                progress=progress,
            )
            session.add(unlock)
            await award_xp(session, user, ach.xp_reward or 0)
            new_unlocks.append({
                "key": ach.key,
                "name": ach.name,
                "icon": ach.icon,
                "rarity": ach.rarity,
                "xp_reward": ach.xp_reward,
            })

    return new_unlocks


# ─── Archetype assignment ──────────────────────────────────────────────────
ARCHETYPE_RULES = [
    ("Star Wars Fanatic", "Star Wars", 5),
    ("Marvel Champion", "Marvel", 5),
    ("Castle Master", "Castle", 3),
    ("Modular Architect", "Creator Expert", 3),
    ("Technic Engineer", "Technic", 5),
    ("Wizarding Collector", "Harry Potter", 5),
    ("Architecture Enthusiast", "Architecture", 3),
    ("Ninjago Sensei", "Ninjago", 5),
]


async def recompute_archetype(session: AsyncSession, user: User) -> Optional[str]:
    """Pick the strongest theme presence and assign as archetype."""
    # CMF check first
    cmf_count = await _count_owned_cmf(session, user.id)
    if cmf_count >= 10:
        user.collector_archetype = "Minifigure Hunter"
        await session.flush()
        return user.collector_archetype

    best_label = None
    best_count = 0
    for label, theme, threshold in ARCHETYPE_RULES:
        c = await _count_owned_theme(session, user.id, theme)
        if c >= threshold and c > best_count:
            best_label = label
            best_count = c

    if best_label:
        user.collector_archetype = best_label
        await session.flush()
        return best_label

    # Default for users with any collection
    total = await _count_owned_sets(session, user.id)
    if total >= 1 and not user.collector_archetype:
        user.collector_archetype = "Brick Enthusiast"
        await session.flush()
        return user.collector_archetype

    return user.collector_archetype
