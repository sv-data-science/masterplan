"""
Seed FIFA World Cup 2026 group stage teams and fixtures.
Groups A-L, 48 teams, 72 matches.
"""
import uuid
from datetime import datetime, timezone
from app.database import AsyncSessionLocal
from app.models.worldcup import Team, Match

# Groups A-L: [name, code, flag_emoji]
GROUPS: dict[str, list[tuple[str, str, str]]] = {
    "A": [
        ("Mexico", "MEX", "🇲🇽"),
        ("South Africa", "RSA", "🇿🇦"),
        ("South Korea", "KOR", "🇰🇷"),
        ("Czechia", "CZE", "🇨🇿"),
    ],
    "B": [
        ("Canada", "CAN", "🇨🇦"),
        ("Bosnia-Herzegovina", "BIH", "🇧🇦"),
        ("Qatar", "QAT", "🇶🇦"),
        ("Switzerland", "SUI", "🇨🇭"),
    ],
    "C": [
        ("Brazil", "BRA", "🇧🇷"),
        ("Morocco", "MAR", "🇲🇦"),
        ("Haiti", "HAI", "🇭🇹"),
        ("Scotland", "SCO", "🏴󠁧󠁢󠁳󠁣󠁴󠁿"),
    ],
    "D": [
        ("United States", "USA", "🇺🇸"),
        ("Paraguay", "PAR", "🇵🇾"),
        ("Australia", "AUS", "🇦🇺"),
        ("Türkiye", "TUR", "🇹🇷"),
    ],
    "E": [
        ("Germany", "GER", "🇩🇪"),
        ("Ivory Coast", "CIV", "🇨🇮"),
        ("Ecuador", "ECU", "🇪🇨"),
        ("Curaçao", "CUW", "🇨🇼"),
    ],
    "F": [
        ("Netherlands", "NED", "🇳🇱"),
        ("Japan", "JPN", "🇯🇵"),
        ("Sweden", "SWE", "🇸🇪"),
        ("Tunisia", "TUN", "🇹🇳"),
    ],
    "G": [
        ("Belgium", "BEL", "🇧🇪"),
        ("Egypt", "EGY", "🇪🇬"),
        ("Iran", "IRN", "🇮🇷"),
        ("New Zealand", "NZL", "🇳🇿"),
    ],
    "H": [
        ("Spain", "ESP", "🇪🇸"),
        ("Uruguay", "URU", "🇺🇾"),
        ("Saudi Arabia", "KSA", "🇸🇦"),
        ("Cape Verde", "CPV", "🇨🇻"),
    ],
    "I": [
        ("France", "FRA", "🇫🇷"),
        ("Senegal", "SEN", "🇸🇳"),
        ("Norway", "NOR", "🇳🇴"),
        ("Iraq", "IRQ", "🇮🇶"),
    ],
    "J": [
        ("Argentina", "ARG", "🇦🇷"),
        ("Algeria", "ALG", "🇩🇿"),
        ("Austria", "AUT", "🇦🇹"),
        ("Jordan", "JOR", "🇯🇴"),
    ],
    "K": [
        ("Portugal", "POR", "🇵🇹"),
        ("Colombia", "COL", "🇨🇴"),
        ("Congo DR", "COD", "🇨🇩"),
        ("Uzbekistan", "UZB", "🇺🇿"),
    ],
    "L": [
        ("England", "ENG", "🏴󠁧󠁢󠁥󠁮󠁧󠁿"),
        ("Croatia", "CRO", "🇭🇷"),
        ("Ghana", "GHA", "🇬🇭"),
        ("Panama", "PAN", "🇵🇦"),
    ],
}

# Approximate kickoff dates per group per matchday (UTC noon)
# Matchday 1: June 11-17  |  Matchday 2: June 18-22  |  Matchday 3: June 23-27
SCHEDULE: dict[str, dict[int, tuple[str, str]]] = {
    #         MD1 game1        MD1 game2        MD2 game1        MD2 game2        MD3 (both same day)
    "A": {1: ("2026-06-11", "2026-06-12"), 2: ("2026-06-18", "2026-06-19"), 3: ("2026-06-23", "2026-06-23")},
    "B": {1: ("2026-06-12", "2026-06-13"), 2: ("2026-06-18", "2026-06-19"), 3: ("2026-06-23", "2026-06-23")},
    "C": {1: ("2026-06-13", "2026-06-14"), 2: ("2026-06-19", "2026-06-20"), 3: ("2026-06-24", "2026-06-24")},
    "D": {1: ("2026-06-12", "2026-06-14"), 2: ("2026-06-19", "2026-06-20"), 3: ("2026-06-24", "2026-06-24")},
    "E": {1: ("2026-06-14", "2026-06-15"), 2: ("2026-06-20", "2026-06-21"), 3: ("2026-06-24", "2026-06-24")},
    "F": {1: ("2026-06-15", "2026-06-16"), 2: ("2026-06-20", "2026-06-21"), 3: ("2026-06-25", "2026-06-25")},
    "G": {1: ("2026-06-15", "2026-06-16"), 2: ("2026-06-21", "2026-06-21"), 3: ("2026-06-25", "2026-06-25")},
    "H": {1: ("2026-06-16", "2026-06-17"), 2: ("2026-06-21", "2026-06-22"), 3: ("2026-06-25", "2026-06-25")},
    "I": {1: ("2026-06-17", "2026-06-17"), 2: ("2026-06-22", "2026-06-22"), 3: ("2026-06-26", "2026-06-26")},
    "J": {1: ("2026-06-17", "2026-06-17"), 2: ("2026-06-22", "2026-06-22"), 3: ("2026-06-26", "2026-06-26")},
    "K": {1: ("2026-06-13", "2026-06-16"), 2: ("2026-06-19", "2026-06-22"), 3: ("2026-06-26", "2026-06-26")},
    "L": {1: ("2026-06-16", "2026-06-17"), 2: ("2026-06-21", "2026-06-22"), 3: ("2026-06-27", "2026-06-27")},
}

# Standard FIFA group stage matchups within a group of 4 teams (indices 0-3):
# Matchday 1: T0 vs T1,  T2 vs T3
# Matchday 2: T0 vs T2,  T1 vs T3
# Matchday 3: T3 vs T0,  T1 vs T2
MATCHUPS = [
    (1, 0, 1),  # MD1 game1
    (1, 2, 3),  # MD1 game2
    (2, 0, 2),  # MD2 game1
    (2, 1, 3),  # MD2 game2
    (3, 3, 0),  # MD3 game1
    (3, 1, 2),  # MD3 game2
]


def _dt(date_str: str, hour: int = 18) -> datetime:
    y, m, d = map(int, date_str.split("-"))
    return datetime(y, m, d, hour, 0, 0, tzinfo=timezone.utc)


async def seed():
    async with AsyncSessionLocal() as db:
        # Create teams
        team_ids: dict[str, list[str]] = {}
        for group, members in GROUPS.items():
            team_ids[group] = []
            for name, code, flag in members:
                team = Team(
                    id=str(uuid.uuid4()),
                    name=name,
                    code=code,
                    group_letter=group,
                    flag=flag,
                )
                db.add(team)
                team_ids[group].append(team.id)

        await db.flush()

        # Create matches
        match_number = 1
        # Process groups in alphabetical order
        for group in sorted(GROUPS.keys()):
            ids = team_ids[group]
            sched = SCHEDULE[group]
            game_idx = [0, 0]  # index into the 2 dates per matchday

            for matchday, home_idx, away_idx in MATCHUPS:
                # Which game within this matchday (0 or 1)?
                if matchday == 1:
                    slot = 0 if (home_idx == 0) else 1
                elif matchday == 2:
                    slot = 0 if (home_idx == 0) else 1
                else:  # matchday 3
                    slot = 0 if (home_idx == 3) else 1

                date_str = sched[matchday][slot]
                # Stagger kick-off hours: game 1 at 15:00, game 2 at 18:00 UTC
                hour = 15 if slot == 0 else 18

                match = Match(
                    id=str(uuid.uuid4()),
                    match_number=match_number,
                    group_letter=group,
                    matchday=matchday,
                    home_team_id=ids[home_idx],
                    away_team_id=ids[away_idx],
                    kickoff_utc=_dt(date_str, hour),
                    status="scheduled",
                )
                db.add(match)
                match_number += 1

        await db.commit()
        print(f"Seeded {len(GROUPS) * 4} teams and {match_number - 1} matches")


if __name__ == "__main__":
    import asyncio
    asyncio.run(seed())
