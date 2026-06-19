"""
Seed FIFA World Cup 2026 group stage teams and fixtures.
Explicit per-match schedule based on official FIFA calendar.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import select, func, delete
from app.database import AsyncSessionLocal
from app.models.worldcup import Team, Match, Prediction

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


def _dt(date_str: str, hour: int, minute: int = 0) -> datetime:
    y, m, d = map(int, date_str.split("-"))
    return datetime(y, m, d, hour, minute, 0, tzinfo=timezone.utc)


# Official FIFA WC 2026 group stage — all 72 matches with UTC kickoff times and venues
# (match_number, group, matchday, home_name, away_name, kickoff_utc, venue, city)
FIXTURES: list[tuple] = [
    # ── MATCHDAY 1 ────────────────────────────────────────────────────────────
    # Thu Jun 11
    (1,  "A", 1, "Mexico",              "South Africa",       _dt("2026-06-11", 19),      "Estadio Azteca",           "Mexico City, Mexico"),
    (2,  "A", 1, "South Korea",         "Czechia",            _dt("2026-06-12",  2),      "Estadio Akron",            "Guadalajara, Mexico"),
    # Fri Jun 12
    (3,  "B", 1, "Canada",              "Bosnia-Herzegovina", _dt("2026-06-12", 19),      "BMO Field",                "Toronto, Canada"),
    (4,  "D", 1, "United States",       "Paraguay",           _dt("2026-06-13",  1),      "SoFi Stadium",             "Inglewood, USA"),
    # Sat Jun 13
    (5,  "B", 1, "Qatar",               "Switzerland",        _dt("2026-06-13", 19),      "Levi's Stadium",           "Santa Clara, USA"),
    (6,  "C", 1, "Brazil",              "Morocco",            _dt("2026-06-13", 22),      "MetLife Stadium",          "East Rutherford, USA"),
    (7,  "D", 1, "Australia",           "Türkiye",            _dt("2026-06-14",  1),      "BC Place",                 "Vancouver, Canada"),
    (8,  "C", 1, "Haiti",               "Scotland",           _dt("2026-06-14",  1),      "Gillette Stadium",         "Foxborough, USA"),
    # Sun Jun 14
    (9,  "E", 1, "Germany",             "Curaçao",            _dt("2026-06-14", 17),      "NRG Stadium",              "Houston, USA"),
    (10, "F", 1, "Netherlands",         "Japan",              _dt("2026-06-14", 20),      "AT&T Stadium",             "Arlington, USA"),
    (11, "E", 1, "Ivory Coast",         "Ecuador",            _dt("2026-06-14", 23),      "Lincoln Financial Field",  "Philadelphia, USA"),
    (12, "F", 1, "Sweden",              "Tunisia",            _dt("2026-06-15",  2),      "Estadio BBVA",             "Monterrey, Mexico"),
    # Mon Jun 15
    (13, "H", 1, "Spain",               "Cape Verde",         _dt("2026-06-15", 16),      "Mercedes-Benz Stadium",    "Atlanta, USA"),
    (14, "G", 1, "Belgium",             "Egypt",              _dt("2026-06-15", 19),      "Lumen Field",              "Seattle, USA"),
    (15, "H", 1, "Saudi Arabia",        "Uruguay",            _dt("2026-06-15", 22),      "Hard Rock Stadium",        "Miami Gardens, USA"),
    (16, "G", 1, "Iran",                "New Zealand",        _dt("2026-06-16",  1),      "SoFi Stadium",             "Inglewood, USA"),
    # Tue Jun 16
    (17, "I", 1, "France",              "Senegal",            _dt("2026-06-16", 19),      "MetLife Stadium",          "East Rutherford, USA"),
    (18, "I", 1, "Iraq",                "Norway",             _dt("2026-06-16", 22),      "Gillette Stadium",         "Foxborough, USA"),
    (19, "J", 1, "Argentina",           "Algeria",            _dt("2026-06-17",  1),      "Arrowhead Stadium",        "Kansas City, USA"),
    (20, "J", 1, "Austria",             "Jordan",             _dt("2026-06-17",  4),      "Levi's Stadium",           "Santa Clara, USA"),
    # Wed Jun 17
    (21, "K", 1, "Portugal",            "Congo DR",           _dt("2026-06-17", 17),      "NRG Stadium",              "Houston, USA"),
    (22, "L", 1, "England",             "Croatia",            _dt("2026-06-17", 20),      "AT&T Stadium",             "Arlington, USA"),
    (23, "L", 1, "Ghana",               "Panama",             _dt("2026-06-17", 23),      "BMO Field",                "Toronto, Canada"),
    (24, "K", 1, "Uzbekistan",          "Colombia",           _dt("2026-06-18",  2),      "Estadio Azteca",           "Mexico City, Mexico"),
    # ── MATCHDAY 2 ────────────────────────────────────────────────────────────
    # Thu Jun 18
    (25, "A", 2, "Czechia",             "South Africa",       _dt("2026-06-18", 16),      "Mercedes-Benz Stadium",    "Atlanta, USA"),
    (26, "B", 2, "Switzerland",         "Bosnia-Herzegovina", _dt("2026-06-18", 19),      "SoFi Stadium",             "Inglewood, USA"),
    (27, "B", 2, "Canada",              "Qatar",              _dt("2026-06-18", 22),      "BC Place",                 "Vancouver, Canada"),
    (28, "A", 2, "Mexico",              "South Korea",        _dt("2026-06-19",  1),      "Estadio Akron",            "Guadalajara, Mexico"),
    # Fri Jun 19
    (29, "D", 2, "United States",       "Australia",          _dt("2026-06-19", 19),      "Lumen Field",              "Seattle, USA"),
    (30, "C", 2, "Scotland",            "Morocco",            _dt("2026-06-19", 22),      "Gillette Stadium",         "Foxborough, USA"),
    (31, "C", 2, "Brazil",              "Haiti",              _dt("2026-06-20",  1),      "Lincoln Financial Field",  "Philadelphia, USA"),
    (32, "D", 2, "Türkiye",             "Paraguay",           _dt("2026-06-20",  3),      "Levi's Stadium",           "Santa Clara, USA"),
    # Sat Jun 20
    (33, "F", 2, "Netherlands",         "Sweden",             _dt("2026-06-20", 17),      "NRG Stadium",              "Houston, USA"),
    (34, "E", 2, "Germany",             "Ivory Coast",        _dt("2026-06-20", 20),      "BMO Field",                "Toronto, Canada"),
    (35, "E", 2, "Ecuador",             "Curaçao",            _dt("2026-06-21",  0),      "Arrowhead Stadium",        "Kansas City, USA"),
    (36, "F", 2, "Tunisia",             "Japan",              _dt("2026-06-21",  4),      "Estadio BBVA",             "Monterrey, Mexico"),
    # Sun Jun 21
    (37, "H", 2, "Spain",               "Saudi Arabia",       _dt("2026-06-21", 16),      "Mercedes-Benz Stadium",    "Atlanta, USA"),
    (38, "G", 2, "Belgium",             "Iran",               _dt("2026-06-21", 19),      "SoFi Stadium",             "Inglewood, USA"),
    (39, "H", 2, "Uruguay",             "Cape Verde",         _dt("2026-06-21", 22),      "Hard Rock Stadium",        "Miami Gardens, USA"),
    (40, "G", 2, "New Zealand",         "Egypt",              _dt("2026-06-22",  1),      "BC Place",                 "Vancouver, Canada"),
    # Mon Jun 22
    (41, "J", 2, "Argentina",           "Austria",            _dt("2026-06-22", 17),      "AT&T Stadium",             "Arlington, USA"),
    (42, "I", 2, "France",              "Iraq",               _dt("2026-06-22", 21),      "Lincoln Financial Field",  "Philadelphia, USA"),
    (43, "I", 2, "Norway",              "Senegal",            _dt("2026-06-23",  0),      "MetLife Stadium",          "East Rutherford, USA"),
    (44, "J", 2, "Jordan",              "Algeria",            _dt("2026-06-23",  3),      "Levi's Stadium",           "Santa Clara, USA"),
    # Tue Jun 23
    (45, "K", 2, "Portugal",            "Uzbekistan",         _dt("2026-06-23", 17),      "NRG Stadium",              "Houston, USA"),
    (46, "L", 2, "England",             "Ghana",              _dt("2026-06-23", 20),      "Gillette Stadium",         "Foxborough, USA"),
    (47, "L", 2, "Panama",              "Croatia",            _dt("2026-06-23", 23),      "BMO Field",                "Toronto, Canada"),
    (48, "K", 2, "Colombia",            "Congo DR",           _dt("2026-06-24",  2),      "Estadio Akron",            "Guadalajara, Mexico"),
    # ── MATCHDAY 3 (simultaneous per group) ──────────────────────────────────
    # Wed Jun 24
    (49, "B", 3, "Switzerland",         "Canada",             _dt("2026-06-24", 19),      "BC Place",                 "Vancouver, Canada"),
    (50, "B", 3, "Bosnia-Herzegovina",  "Qatar",              _dt("2026-06-24", 19),      "Lumen Field",              "Seattle, USA"),
    (51, "C", 3, "Scotland",            "Brazil",             _dt("2026-06-24", 22),      "Hard Rock Stadium",        "Miami Gardens, USA"),
    (52, "C", 3, "Morocco",             "Haiti",              _dt("2026-06-24", 22),      "Mercedes-Benz Stadium",    "Atlanta, USA"),
    (53, "A", 3, "Czechia",             "Mexico",             _dt("2026-06-25",  1),      "Estadio Azteca",           "Mexico City, Mexico"),
    (54, "A", 3, "South Africa",        "South Korea",        _dt("2026-06-25",  1),      "Estadio BBVA",             "Monterrey, Mexico"),
    # Thu Jun 25
    (55, "E", 3, "Ecuador",             "Germany",            _dt("2026-06-25", 20),      "MetLife Stadium",          "East Rutherford, USA"),
    (56, "E", 3, "Curaçao",             "Ivory Coast",        _dt("2026-06-25", 20),      "Lincoln Financial Field",  "Philadelphia, USA"),
    (57, "F", 3, "Japan",               "Sweden",             _dt("2026-06-25", 23),      "AT&T Stadium",             "Arlington, USA"),
    (58, "F", 3, "Tunisia",             "Netherlands",        _dt("2026-06-25", 23),      "Arrowhead Stadium",        "Kansas City, USA"),
    (59, "D", 3, "Türkiye",             "United States",      _dt("2026-06-26",  2),      "SoFi Stadium",             "Inglewood, USA"),
    (60, "D", 3, "Paraguay",            "Australia",          _dt("2026-06-26",  2),      "Levi's Stadium",           "Santa Clara, USA"),
    # Fri Jun 26
    (61, "I", 3, "Norway",              "France",             _dt("2026-06-26", 19),      "Gillette Stadium",         "Foxborough, USA"),
    (62, "I", 3, "Senegal",             "Iraq",               _dt("2026-06-26", 19),      "BMO Field",                "Toronto, Canada"),
    (63, "H", 3, "Cape Verde",          "Saudi Arabia",       _dt("2026-06-27",  0),      "NRG Stadium",              "Houston, USA"),
    (64, "H", 3, "Uruguay",             "Spain",              _dt("2026-06-27",  0),      "Estadio Akron",            "Guadalajara, Mexico"),
    (65, "G", 3, "Egypt",               "Iran",               _dt("2026-06-27",  3),      "Lumen Field",              "Seattle, USA"),
    (66, "G", 3, "New Zealand",         "Belgium",            _dt("2026-06-27",  3),      "BC Place",                 "Vancouver, Canada"),
    # Sat Jun 27
    (67, "L", 3, "Panama",              "England",            _dt("2026-06-27", 21),      "MetLife Stadium",          "East Rutherford, USA"),
    (68, "L", 3, "Croatia",             "Ghana",              _dt("2026-06-27", 21),      "Lincoln Financial Field",  "Philadelphia, USA"),
    (69, "K", 3, "Colombia",            "Portugal",           _dt("2026-06-27", 23, 30),  "Hard Rock Stadium",        "Miami Gardens, USA"),
    (70, "K", 3, "Congo DR",            "Uzbekistan",         _dt("2026-06-27", 23, 30),  "Mercedes-Benz Stadium",    "Atlanta, USA"),
    (71, "J", 3, "Algeria",             "Austria",            _dt("2026-06-28",  2),      "Arrowhead Stadium",        "Kansas City, USA"),
    (72, "J", 3, "Jordan",              "Argentina",          _dt("2026-06-28",  2),      "AT&T Stadium",             "Arlington, USA"),
]


async def seed():
    """Create teams and matches if the DB is empty."""
    async with AsyncSessionLocal() as db:
        count = (await db.execute(select(func.count()).select_from(Team))).scalar_one()
        if count > 0:
            m_count = (await db.execute(select(func.count()).select_from(Match))).scalar_one()
            return {"status": "already_seeded", "teams": count, "matches": m_count}

        team_map: dict[str, str] = {}
        for group, members in GROUPS.items():
            for name, code, flag in members:
                team = Team(id=str(uuid.uuid4()), name=name, code=code, group_letter=group, flag=flag)
                db.add(team)
                team_map[name] = team.id

        await db.flush()

        for match_num, group, matchday, home_name, away_name, kickoff_utc, venue, city in FIXTURES:
            db.add(Match(
                id=str(uuid.uuid4()),
                match_number=match_num,
                group_letter=group,
                matchday=matchday,
                home_team_id=team_map[home_name],
                away_team_id=team_map[away_name],
                kickoff_utc=kickoff_utc,
                venue=venue,
                city=city,
                status="scheduled",
            ))

        await db.commit()
        print(f"Seeded {len(team_map)} teams and {len(FIXTURES)} matches")
        return {"status": "seeded", "teams": len(team_map), "matches": len(FIXTURES)}


async def reseed():
    """Keep teams, delete and recreate all matches (and their predictions)."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Team))
        teams = result.scalars().all()

        if not teams:
            return await seed()

        team_map: dict[str, str] = {t.name: t.id for t in teams}

        # Delete predictions before matches (FK constraint, no DB-level cascade)
        await db.execute(delete(Prediction))
        await db.execute(delete(Match))
        await db.flush()

        created = 0
        missing: list[str] = []
        for match_num, group, matchday, home_name, away_name, kickoff_utc, venue, city in FIXTURES:
            home_id = team_map.get(home_name)
            away_id = team_map.get(away_name)
            if not home_id or not away_id:
                missing.append(f"#{match_num} {home_name} vs {away_name}")
                continue
            db.add(Match(
                id=str(uuid.uuid4()),
                match_number=match_num,
                group_letter=group,
                matchday=matchday,
                home_team_id=home_id,
                away_team_id=away_id,
                kickoff_utc=kickoff_utc,
                venue=venue,
                city=city,
                status="scheduled",
            ))
            created += 1

        await db.commit()
        if missing:
            print(f"WARNING — teams not found: {missing}")
        print(f"Reseeded {created} matches")
        return {"status": "reseeded", "matches": created, "missing": missing}


async def patch_schedule():
    """
    Non-destructive schedule fix: updates match_number, matchday, kickoff_utc, venue, city
    by matching existing matches on their team pair (frozenset). Preserves scores, status,
    and all predictions. If home/away order changed, swaps pred_home/pred_away too.
    Only creates new records for team pairs not yet in the DB.
    """
    async with AsyncSessionLocal() as db:
        teams = (await db.execute(select(Team))).scalars().all()
        if not teams:
            return await seed()

        team_map: dict[str, str] = {t.name: t.id for t in teams}

        existing_matches = (await db.execute(select(Match))).scalars().all()
        pair_to_match: dict[frozenset, Match] = {
            frozenset({m.home_team_id, m.away_team_id}): m for m in existing_matches
        }

        # Shift all match_numbers into a safe range (1001-1072) to avoid unique conflicts
        # when we reassign them below. PostgreSQL enforces uniqueness per-statement.
        for m in existing_matches:
            m.match_number = m.match_number + 1000
        await db.flush()

        updated = 0
        swapped = 0
        created = 0
        missing: list[str] = []

        for match_num, group, matchday, home_name, away_name, kickoff_utc, venue, city in FIXTURES:
            home_id = team_map.get(home_name)
            away_id = team_map.get(away_name)
            if not home_id or not away_id:
                missing.append(f"#{match_num} {home_name} vs {away_name}")
                continue

            pair = frozenset({home_id, away_id})
            existing = pair_to_match.get(pair)

            if existing is None:
                db.add(Match(
                    id=str(uuid.uuid4()),
                    match_number=match_num,
                    group_letter=group,
                    matchday=matchday,
                    home_team_id=home_id,
                    away_team_id=away_id,
                    kickoff_utc=kickoff_utc,
                    venue=venue,
                    city=city,
                    status="scheduled",
                ))
                created += 1
            else:
                if existing.home_team_id != home_id:
                    existing.home_team_id = home_id
                    existing.away_team_id = away_id
                    preds = (await db.execute(
                        select(Prediction).where(Prediction.match_id == existing.id)
                    )).scalars().all()
                    for p in preds:
                        p.pred_home, p.pred_away = p.pred_away, p.pred_home
                    swapped += 1

                existing.match_number = match_num
                existing.group_letter = group
                existing.matchday = matchday
                existing.kickoff_utc = kickoff_utc
                existing.venue = venue
                existing.city = city
                updated += 1

        await db.commit()
        if missing:
            print(f"WARNING — teams not found: {missing}")
        print(f"Patched {updated} matches ({swapped} home/away swapped), created {created} new")
        return {
            "status": "patched",
            "updated": updated,
            "swapped": swapped,
            "created": created,
            "missing": missing,
        }


if __name__ == "__main__":
    import asyncio
    asyncio.run(seed())
