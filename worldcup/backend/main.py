import asyncio
import logging
import sys
import uuid
from fastapi import FastAPI, Request, APIRouter, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from app.config import settings
from app.database import engine, Base, AsyncSessionLocal, get_db
from app.models import user, worldcup  # noqa: register models
from app.models.user import User
from app.models.worldcup import Meme, MemeReaction
from app.auth import get_current_user, get_optional_current_user
from app.api import auth, matches, predictions, leaderboard, admin, goals, trivia, scores

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    stream=sys.stdout,
)
log = logging.getLogger(__name__)


async def _auto_sync_loop():
    interval = settings.SYNC_INTERVAL_MINUTES * 60
    while True:
        await asyncio.sleep(interval)
        try:
            from app.services.sync import sync_scores
            result = await sync_scores()
            if result.get("updated"):
                log.info("Auto-sync: %d matches updated", result["updated"])
        except Exception as e:
            log.error("Auto-sync error: %s", e)


async def _auto_sync_goals_loop():
    """Sync goal scorers from ESPN once per hour (runs in background, never blocks startup)."""
    await asyncio.sleep(60)  # brief delay so DB/seed is ready
    while True:
        try:
            from app.services.sync import sync_goals_espn
            result = await sync_goals_espn()
            log.info("Auto goal-sync: %d goals across %d matches", result.get("goals_synced", 0), result.get("matches_updated", 0))
        except Exception as e:
            log.error("Auto goal-sync error: %s", e)
        await asyncio.sleep(3600)  # hourly


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Starting up — DB URL scheme: %s", settings.async_database_url.split("@")[0].split("://")[0])

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        log.info("Database tables ready")
    except Exception as e:
        log.error("DB init failed: %s", e)
        log.error("DATABASE_URL configured: %s", bool(settings.DATABASE_URL))

    # Add columns / tables to existing deployments that predate them
    from sqlalchemy import text
    for col_sql in [
        "ALTER TABLE users ADD COLUMN kit TEXT",
        "ALTER TABLE users ADD COLUMN fav_wc_year INTEGER",
        "ALTER TABLE users ADD COLUMN fav_national_team TEXT",
        "ALTER TABLE users ADD COLUMN fav_player TEXT",
        "ALTER TABLE matches ADD COLUMN stage VARCHAR(10)",
        "ALTER TABLE matches ADD COLUMN home_score_pens INTEGER",
        "ALTER TABLE matches ADD COLUMN away_score_pens INTEGER",
        "ALTER TABLE matches ADD COLUMN score_locked BOOLEAN DEFAULT FALSE",
    ]:
        try:
            async with engine.begin() as conn:
                await conn.execute(text(col_sql))
        except Exception:
            pass  # column already exists

    # Create score audit log table if it doesn't exist yet
    for ddl in [
        """CREATE TABLE IF NOT EXISTS score_audit_log (
            id VARCHAR PRIMARY KEY,
            match_id VARCHAR NOT NULL REFERENCES matches(id),
            changed_by_user_id VARCHAR NOT NULL REFERENCES users(id),
            changed_at TIMESTAMPTZ DEFAULT now(),
            old_home_score INTEGER,
            old_away_score INTEGER,
            old_status VARCHAR(20),
            old_home_score_pens INTEGER,
            old_away_score_pens INTEGER,
            new_home_score INTEGER NOT NULL,
            new_away_score INTEGER NOT NULL,
            new_status VARCHAR(20) NOT NULL,
            new_home_score_pens INTEGER,
            new_away_score_pens INTEGER
        )"""
    ]:
        try:
            async with engine.begin() as conn:
                await conn.execute(text(ddl))
        except Exception:
            pass

    # Ensure memes tables exist (create_all may be skipped on existing DBs)
    for ddl in [
        """CREATE TABLE IF NOT EXISTS memes (
            id VARCHAR PRIMARY KEY,
            user_id VARCHAR NOT NULL REFERENCES users(id),
            image_data TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT now()
        )""",
        """CREATE TABLE IF NOT EXISTS meme_reactions (
            id VARCHAR PRIMARY KEY,
            user_id VARCHAR NOT NULL REFERENCES users(id),
            meme_id VARCHAR NOT NULL REFERENCES memes(id) ON DELETE CASCADE,
            emoji VARCHAR(10) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT now(),
            CONSTRAINT uq_user_meme_emoji UNIQUE (user_id, meme_id, emoji)
        )""",
        "CREATE INDEX IF NOT EXISTS ix_meme_reactions_meme_id ON meme_reactions(meme_id)",
    ]:
        try:
            async with engine.begin() as conn:
                await conn.execute(text(ddl))
        except Exception as e:
            log.warning("DDL skipped (%s): %s", ddl.split()[2], e)

    try:
        from sqlalchemy import select, func
        from app.models.worldcup import Team
        async with AsyncSessionLocal() as s:
            count = (await s.execute(select(func.count()).select_from(Team))).scalar() or 0
        if count == 0:
            from scripts.seed_worldcup import seed
            await seed()
            log.info("World Cup 2026 data seeded")
    except Exception as e:
        log.warning("Seed skipped: %s", e)

    # Auto-seed R16 matches and assign winners from completed R32 results
    try:
        from sqlalchemy import func, text as _text
        from app.models.worldcup import Match as _Match, Team as _Team
        from sqlalchemy.orm import selectinload as _sli
        import uuid as _uuid
        from datetime import datetime as _dt

        async with AsyncSessionLocal() as _s:
            r16_count = (await _s.execute(
                select(func.count()).select_from(_Match).where(_Match.stage == 'r16')
            )).scalar() or 0

            if r16_count < 8:
                _tbd = (await _s.execute(select(_Team).where(_Team.code == 'TBD'))).scalar_one_or_none()
                if not _tbd:
                    _tbd = _Team(id=str(_uuid.uuid4()), name='TBD', code='TBD', group_letter='?', flag='🏳️')
                    _s.add(_tbd)
                    await _s.flush()
                _R16_DATA = [
                    (89, '2026-07-04T21:00:00+00:00', 'Lincoln Financial Field', 'Philadelphia, USA'),
                    (90, '2026-07-04T17:00:00+00:00', 'NRG Stadium',             'Houston, USA'),
                    (91, '2026-07-05T20:00:00+00:00', 'MetLife Stadium',         'East Rutherford, USA'),
                    (92, '2026-07-06T00:00:00+00:00', 'Estadio Azteca',          'Mexico City, Mexico'),
                    (93, '2026-07-07T00:00:00+00:00', 'Lumen Field',             'Seattle, USA'),
                    (94, '2026-07-06T19:00:00+00:00', 'AT&T Stadium',            'Arlington, USA'),
                    (95, '2026-07-07T20:00:00+00:00', 'BC Place',                'Vancouver, Canada'),
                    (96, '2026-07-07T16:00:00+00:00', 'Mercedes-Benz Stadium',   'Atlanta, USA'),
                ]
                created = 0
                for _mn, _ks, _venue, _city in _R16_DATA:
                    if not (await _s.execute(select(_Match).where(_Match.match_number == _mn))).scalar_one_or_none():
                        _s.add(_Match(id=str(_uuid.uuid4()), match_number=_mn, group_letter='?',
                                      matchday=5, home_team_id=_tbd.id, away_team_id=_tbd.id,
                                      kickoff_utc=_dt.fromisoformat(_ks), venue=_venue, city=_city,
                                      status='scheduled', stage='r16'))
                        created += 1
                await _s.commit()
                if created:
                    log.info("Auto-seeded %d R16 matches", created)

            # Ensure all R32 matches have correct teams (hardcoded official FIFA bracket)
            _R32_OFFICIAL = [
                (73,'RSA','CAN'),(74,'GER','PAR'),(75,'NED','MAR'),(76,'BRA','JPN'),
                (77,'FRA','SWE'),(78,'CIV','NOR'),(79,'MEX','ECU'),(80,'ENG','COD'),
                (81,'USA','BIH'),(82,'BEL','SEN'),(83,'POR','CRO'),(84,'ESP','AUT'),
                (85,'SUI','ALG'),(86,'ARG','CPV'),(87,'AUS','EGY'),(88,'COL','GHA'),
            ]
            async with AsyncSessionLocal() as _sr:
                _tc = {t.code: t for t in (await _sr.execute(select(_Team))).scalars().all()}
                _r32m = {m.match_number: m for m in (await _sr.execute(
                    select(_Match).where(_Match.stage == 'r32')
                )).scalars().all()}
                _tbd3 = _tc.get('TBD')
                _tbd3_id = _tbd3.id if _tbd3 else None
                _r32_fixed = 0
                for _mn, _hc, _ac in _R32_OFFICIAL:
                    _m = _r32m.get(_mn)
                    if not _m: continue
                    _ht, _at = _tc.get(_hc), _tc.get(_ac)
                    _ch = False
                    if _ht and _m.home_team_id == _tbd3_id: _m.home_team_id = _ht.id; _ch = True
                    if _at and _m.away_team_id == _tbd3_id: _m.away_team_id = _at.id; _ch = True
                    if _ch: _r32_fixed += 1
                if _r32_fixed:
                    await _sr.commit()
                    log.info("Auto-assigned correct teams to %d R32 matches", _r32_fixed)

            # Sync scores from API so newly-assigned R32 matches get completed status
            try:
                from app.services.sync import sync_scores
                _sync_res = await sync_scores()
                if _sync_res.get("updated"):
                    log.info("Startup sync: %d matches updated", _sync_res["updated"])
            except Exception as _se:
                log.warning("Startup sync failed: %s", _se)

            # Auto-assign R32 winners to R16 slots where both R32 parents are complete
            _R16_PAIRS = [(89,74,77),(90,73,75),(91,76,78),(92,79,80),(93,82,81),(94,83,84),(95,85,88),(96,86,87)]
            async with AsyncSessionLocal() as _s2:
                _r32 = {m.match_number: m for m in (await _s2.execute(
                    select(_Match).options(_sli(_Match.home_team), _sli(_Match.away_team))
                    .where(_Match.stage == 'r32')
                )).scalars().all()}
                _r16 = {m.match_number: m for m in (await _s2.execute(
                    select(_Match).where(_Match.stage == 'r16')
                )).scalars().all()}

                def _winner(m):
                    if not m or m.status != 'completed' or m.home_score is None: return None
                    if m.home_score > m.away_score: return m.home_team
                    if m.away_score > m.home_score: return m.away_team
                    if m.home_score_pens is not None and m.away_score_pens is not None:
                        if m.home_score_pens > m.away_score_pens: return m.home_team
                        if m.away_score_pens > m.home_score_pens: return m.away_team
                    return None

                # Load TBD team id once to compare without lazy-loading relationships
                _tbd2 = (await _s2.execute(select(_Team).where(_Team.code == 'TBD'))).scalar_one_or_none()
                _tbd_id = _tbd2.id if _tbd2 else None

                assigned = 0
                for _r16n, _h32, _a32 in _R16_PAIRS:
                    _r16m = _r16.get(_r16n)
                    if not _r16m: continue
                    _hw = _winner(_r32.get(_h32))
                    _aw = _winner(_r32.get(_a32))
                    if _hw and _r16m.home_team_id == _tbd_id:
                        _r16m.home_team_id = _hw.id; assigned += 1
                    if _aw and _r16m.away_team_id == _tbd_id:
                        _r16m.away_team_id = _aw.id; assigned += 1
                if assigned:
                    await _s2.commit()
                    log.info("Auto-assigned %d R16 team slots from R32 results", assigned)

            # Always apply correct R16 kickoff times/venues on startup
            _CORRECT_SCHEDULE = [
                (89, '2026-07-04T21:00:00+00:00', 'Lincoln Financial Field', 'Philadelphia, USA'),
                (90, '2026-07-04T17:00:00+00:00', 'NRG Stadium',             'Houston, USA'),
                (91, '2026-07-05T20:00:00+00:00', 'MetLife Stadium',         'East Rutherford, USA'),
                (92, '2026-07-06T00:00:00+00:00', 'Estadio Azteca',          'Mexico City, Mexico'),
                (93, '2026-07-07T00:00:00+00:00', 'Lumen Field',             'Seattle, USA'),
                (94, '2026-07-06T19:00:00+00:00', 'AT&T Stadium',            'Arlington, USA'),
                (95, '2026-07-07T20:00:00+00:00', 'BC Place',                'Vancouver, Canada'),
                (96, '2026-07-07T16:00:00+00:00', 'Mercedes-Benz Stadium',   'Atlanta, USA'),
            ]
            async with AsyncSessionLocal() as _s3:
                _r16_by_num = {m.match_number: m for m in (await _s3.execute(
                    select(_Match).where(_Match.stage == 'r16')
                )).scalars().all()}
                _sched_fixed = 0
                for _mn, _ks, _venue, _city in _CORRECT_SCHEDULE:
                    _m = _r16_by_num.get(_mn)
                    if not _m:
                        continue
                    _correct_dt = _dt.fromisoformat(_ks)
                    if _m.kickoff_utc != _correct_dt or _m.venue != _venue or _m.city != _city:
                        _m.kickoff_utc = _correct_dt
                        _m.venue = _venue
                        _m.city = _city
                        _sched_fixed += 1
                if _sched_fixed:
                    await _s3.commit()
                    log.info("Auto-fixed %d R16 kickoff/venue records on startup", _sched_fixed)
    except Exception as _e:
        log.warning("R16 auto-setup skipped: %s", _e)

    # Auto-seed QF matches and assign winners from completed R16 results
    try:
        from sqlalchemy import func
        from app.models.worldcup import Match as _Match, Team as _Team
        from sqlalchemy.orm import selectinload as _sli
        import uuid as _uuid
        from datetime import datetime as _dt

        async with AsyncSessionLocal() as _qs:
            qf_count = (await _qs.execute(
                select(func.count()).select_from(_Match).where(_Match.stage == 'qf')
            )).scalar() or 0

            if qf_count < 4:
                _tbd = (await _qs.execute(select(_Team).where(_Team.code == 'TBD'))).scalar_one_or_none()
                if not _tbd:
                    _tbd = _Team(id=str(_uuid.uuid4()), name='TBD', code='TBD', group_letter='?', flag='🏳️')
                    _qs.add(_tbd)
                    await _qs.flush()
                _QF_DATA = [
                    (97,  '2026-07-10T00:00:00+00:00', 'MetLife Stadium',    'East Rutherford, USA'),
                    (98,  '2026-07-09T20:00:00+00:00', 'SoFi Stadium',       'Inglewood, USA'),
                    (99,  '2026-07-11T00:00:00+00:00', 'AT&T Stadium',       'Arlington, USA'),
                    (100, '2026-07-10T20:00:00+00:00', 'Arrowhead Stadium',  'Kansas City, USA'),
                ]
                created = 0
                for _mn, _ks, _venue, _city in _QF_DATA:
                    if not (await _qs.execute(select(_Match).where(_Match.match_number == _mn))).scalar_one_or_none():
                        _qs.add(_Match(id=str(_uuid.uuid4()), match_number=_mn, group_letter='?',
                                       matchday=6, home_team_id=_tbd.id, away_team_id=_tbd.id,
                                       kickoff_utc=_dt.fromisoformat(_ks), venue=_venue, city=_city,
                                       status='scheduled', stage='qf'))
                        created += 1
                await _qs.commit()
                if created:
                    log.info("Auto-seeded %d QF matches", created)

            # Auto-assign R16 winners to QF slots
            _QF_PAIRS = [(97, 89, 90), (98, 91, 92), (99, 93, 94), (100, 95, 96)]
            async with AsyncSessionLocal() as _qs2:
                _r16 = {m.match_number: m for m in (await _qs2.execute(
                    select(_Match).options(_sli(_Match.home_team), _sli(_Match.away_team))
                    .where(_Match.stage == 'r16')
                )).scalars().all()}
                _qf = {m.match_number: m for m in (await _qs2.execute(
                    select(_Match).where(_Match.stage == 'qf')
                )).scalars().all()}
                _tbd2 = (await _qs2.execute(select(_Team).where(_Team.code == 'TBD'))).scalar_one_or_none()
                _tbd_id = _tbd2.id if _tbd2 else None

                def _qf_winner(m):
                    if not m or m.status != 'completed' or m.home_score is None: return None
                    if m.home_score > m.away_score: return m.home_team
                    if m.away_score > m.home_score: return m.away_team
                    if m.home_score_pens is not None and m.away_score_pens is not None:
                        if m.home_score_pens > m.away_score_pens: return m.home_team
                        if m.away_score_pens > m.home_score_pens: return m.away_team
                    return None

                qf_assigned = 0
                for _qfn, _h16, _a16 in _QF_PAIRS:
                    _qfm = _qf.get(_qfn)
                    if not _qfm: continue
                    _hw = _qf_winner(_r16.get(_h16))
                    _aw = _qf_winner(_r16.get(_a16))
                    if _hw and _qfm.home_team_id == _tbd_id:
                        _qfm.home_team_id = _hw.id; qf_assigned += 1
                    if _aw and _qfm.away_team_id == _tbd_id:
                        _qfm.away_team_id = _aw.id; qf_assigned += 1
                if qf_assigned:
                    await _qs2.commit()
                    log.info("Auto-assigned %d QF team slots from R16 results", qf_assigned)

        # Always patch QF to correct schedule, venue, and teams
        _QF_CORRECT = [
            (97,  '2026-07-10T00:00:00+00:00', 'Gillette Stadium',   'Foxborough, USA',    'FRA', 'MAR'),
            (98,  '2026-07-11T00:00:00+00:00', 'SoFi Stadium',       'Inglewood, USA',     'ESP', 'BEL'),
            (99,  '2026-07-11T20:00:00+00:00', 'Hard Rock Stadium',  'Miami Gardens, USA', 'NOR', 'ENG'),
            (100, '2026-07-12T00:00:00+00:00', 'Arrowhead Stadium',  'Kansas City, USA',   'ARG', 'SUI'),
        ]
        async with AsyncSessionLocal() as _qs3:
            _tc3 = {t.code: t for t in (await _qs3.execute(select(_Team))).scalars().all()}
            _qf3 = {m.match_number: m for m in (await _qs3.execute(
                select(_Match).where(_Match.stage == 'qf')
            )).scalars().all()}
            _qf_fixed = 0
            for _mn, _ks, _venue, _city, _hc, _ac in _QF_CORRECT:
                _m = _qf3.get(_mn)
                if not _m: continue
                _correct_dt = _dt.fromisoformat(_ks)
                _ht = _tc3.get(_hc)
                _at = _tc3.get(_ac)
                if _m.kickoff_utc != _correct_dt or _m.venue != _venue or _m.city != _city:
                    _m.kickoff_utc = _correct_dt; _m.venue = _venue; _m.city = _city; _qf_fixed += 1
                if _ht and _m.home_team_id != _ht.id:
                    _m.home_team_id = _ht.id; _qf_fixed += 1
                if _at and _m.away_team_id != _at.id:
                    _m.away_team_id = _at.id; _qf_fixed += 1
            if _qf_fixed:
                await _qs3.commit()
                log.info("Patched QF schedule/teams (%d changes)", _qf_fixed)

    except Exception as _qe:
        log.warning("QF auto-setup skipped: %s", _qe)

    # Auto-seed SF matches and assign winners from completed QF results
    try:
        from sqlalchemy import func
        from app.models.worldcup import Match as _Match, Team as _Team
        from sqlalchemy.orm import selectinload as _sli
        import uuid as _uuid
        from datetime import datetime as _dt

        async with AsyncSessionLocal() as _ss:
            sf_count = (await _ss.execute(
                select(func.count()).select_from(_Match).where(_Match.stage == 'sf')
            )).scalar() or 0

            if sf_count < 2:
                _tbd = (await _ss.execute(select(_Team).where(_Team.code == 'TBD'))).scalar_one_or_none()
                if not _tbd:
                    _tbd = _Team(id=str(_uuid.uuid4()), name='TBD', code='TBD', group_letter='?', flag='🏳️')
                    _ss.add(_tbd)
                    await _ss.flush()
                _SF_DATA = [
                    (101, '2026-07-15T00:00:00+00:00', 'AT&T Stadium',          'Arlington, USA'),
                    (102, '2026-07-16T00:00:00+00:00', 'Mercedes-Benz Stadium', 'Atlanta, USA'),
                ]
                created = 0
                for _mn, _ks, _venue, _city in _SF_DATA:
                    if not (await _ss.execute(select(_Match).where(_Match.match_number == _mn))).scalar_one_or_none():
                        _ss.add(_Match(id=str(_uuid.uuid4()), match_number=_mn, group_letter='?',
                                       matchday=7, home_team_id=_tbd.id, away_team_id=_tbd.id,
                                       kickoff_utc=_dt.fromisoformat(_ks), venue=_venue, city=_city,
                                       status='scheduled', stage='sf'))
                        created += 1
                await _ss.commit()
                if created:
                    log.info("Auto-seeded %d SF matches", created)

            # Auto-assign QF winners to SF slots
            _SF_PAIRS = [(101, 97, 98), (102, 99, 100)]
            async with AsyncSessionLocal() as _ss2:
                _qf2 = {m.match_number: m for m in (await _ss2.execute(
                    select(_Match).options(_sli(_Match.home_team), _sli(_Match.away_team))
                    .where(_Match.stage == 'qf')
                )).scalars().all()}
                _sf2 = {m.match_number: m for m in (await _ss2.execute(
                    select(_Match).where(_Match.stage == 'sf')
                )).scalars().all()}
                _tbd2 = (await _ss2.execute(select(_Team).where(_Team.code == 'TBD'))).scalar_one_or_none()
                _tbd_id2 = _tbd2.id if _tbd2 else None

                def _sf_winner(m):
                    if not m or m.status != 'completed' or m.home_score is None: return None
                    if m.home_score > m.away_score: return m.home_team
                    if m.away_score > m.home_score: return m.away_team
                    if m.home_score_pens is not None and m.away_score_pens is not None:
                        if m.home_score_pens > m.away_score_pens: return m.home_team
                        if m.away_score_pens > m.home_score_pens: return m.away_team
                    return None

                sf_assigned = 0
                for _sfn, _hqf, _aqf in _SF_PAIRS:
                    _sfm = _sf2.get(_sfn)
                    if not _sfm: continue
                    _hw = _sf_winner(_qf2.get(_hqf))
                    _aw = _sf_winner(_qf2.get(_aqf))
                    if _hw and _sfm.home_team_id == _tbd_id2:
                        _sfm.home_team_id = _hw.id; sf_assigned += 1
                    if _aw and _sfm.away_team_id == _tbd_id2:
                        _sfm.away_team_id = _aw.id; sf_assigned += 1
                if sf_assigned:
                    await _ss2.commit()
                    log.info("Auto-assigned %d SF team slots from QF results", sf_assigned)

    except Exception as _se:
        log.warning("SF auto-setup skipped: %s", _se)

    # Auto-seed 3rd place (M103) and Final (M104), assign SF winners/losers once SFs complete
    try:
        from sqlalchemy import func as _func2
        from app.models.worldcup import Match as _Match2, Team as _Team2
        from sqlalchemy.orm import selectinload as _sli2
        import uuid as _uuid2
        from datetime import datetime as _dt2

        _ENDGAME_DATA = [
            (103, '3rd',   '2026-07-18T19:00:00+00:00', 'SoFi Stadium',    'Inglewood, USA'      ),
            (104, 'final', '2026-07-19T19:00:00+00:00', 'MetLife Stadium', 'East Rutherford, USA'),
        ]
        async with AsyncSessionLocal() as _es:
            _tbd3 = (await _es.execute(select(_Team2).where(_Team2.code == 'TBD'))).scalar_one_or_none()
            if not _tbd3:
                _tbd3 = _Team2(id=str(_uuid2.uuid4()), name='TBD', code='TBD', group_letter='?', flag='🏳️')
                _es.add(_tbd3)
                await _es.flush()
            eg_created = 0
            for _mn, _stage, _ks, _venue, _city in _ENDGAME_DATA:
                if not (await _es.execute(select(_Match2).where(_Match2.match_number == _mn))).scalar_one_or_none():
                    _es.add(_Match2(id=str(_uuid2.uuid4()), match_number=_mn, group_letter='?',
                                    matchday=8, home_team_id=_tbd3.id, away_team_id=_tbd3.id,
                                    kickoff_utc=_dt2.fromisoformat(_ks), venue=_venue, city=_city,
                                    status='scheduled', stage=_stage))
                    eg_created += 1
            await _es.commit()
            if eg_created:
                log.info("Auto-seeded %d endgame matches (3rd/Final)", eg_created)

        # Auto-assign SF winners → Final, SF losers → 3rd place
        # SF winner function defined in the block above reuses same logic
        async with AsyncSessionLocal() as _es2:
            _sf_all = {m.match_number: m for m in (await _es2.execute(
                select(_Match2).options(_sli2(_Match2.home_team), _sli2(_Match2.away_team))
                .where(_Match2.stage == 'sf')
            )).scalars().all()}
            _eg_all = {m.match_number: m for m in (await _es2.execute(
                select(_Match2).where(_Match2.stage.in_(['3rd', 'final']))
            )).scalars().all()}
            _tbd4 = (await _es2.execute(select(_Team2).where(_Team2.code == 'TBD'))).scalar_one_or_none()
            _tbd_id4 = _tbd4.id if _tbd4 else None

            def _endgame_winner(m):
                if not m or m.status != 'completed' or m.home_score is None: return None
                if m.home_score > m.away_score: return m.home_team
                if m.away_score > m.home_score: return m.away_team
                if m.home_score_pens is not None and m.away_score_pens is not None:
                    if m.home_score_pens > m.away_score_pens: return m.home_team
                    if m.away_score_pens > m.home_score_pens: return m.away_team
                return None

            def _endgame_loser(m):
                w = _endgame_winner(m)
                if not w or not m: return None
                return m.away_team if w.id == m.home_team_id else m.home_team

            sf101 = _sf_all.get(101)
            sf102 = _sf_all.get(102)
            final_m = _eg_all.get(104)
            third_m = _eg_all.get(103)
            eg_assigned = 0

            if final_m:
                w101 = _endgame_winner(sf101)
                w102 = _endgame_winner(sf102)
                if w101 and final_m.home_team_id == _tbd_id4:
                    final_m.home_team_id = w101.id; eg_assigned += 1
                if w102 and final_m.away_team_id == _tbd_id4:
                    final_m.away_team_id = w102.id; eg_assigned += 1

            if third_m:
                l101 = _endgame_loser(sf101)
                l102 = _endgame_loser(sf102)
                if l101 and third_m.home_team_id == _tbd_id4:
                    third_m.home_team_id = l101.id; eg_assigned += 1
                if l102 and third_m.away_team_id == _tbd_id4:
                    third_m.away_team_id = l102.id; eg_assigned += 1

            if eg_assigned:
                await _es2.commit()
                log.info("Auto-assigned %d team slots for Final/3rd from SF results", eg_assigned)

    except Exception as _ege:
        log.warning("Final/3rd auto-setup skipped: %s", _ege)

    task = None
    if settings.FOOTBALL_DATA_API_KEY and settings.SYNC_INTERVAL_MINUTES > 0:
        task = asyncio.create_task(_auto_sync_loop())
        log.info("Auto-sync started (every %d min)", settings.SYNC_INTERVAL_MINUTES)

    goals_task = asyncio.create_task(_auto_sync_goals_loop())
    log.info("Auto goal-sync started (hourly)")

    yield

    if task:
        task.cancel()
    goals_task.cancel()


app = FastAPI(
    title="World Cup 2026 Predictor",
    description="FIFA World Cup 2026 prediction game for friends",
    version="1.3.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(matches.router, prefix="/api/v1")
app.include_router(predictions.router, prefix="/api/v1")
app.include_router(leaderboard.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(goals.router, prefix="/api/v1")
app.include_router(trivia.router, prefix="/api/v1")
app.include_router(scores.router, prefix="/api/v1")

# ── Memes (inlined to avoid any module-import issues on Railway) ──────────────
_ALLOWED_EMOJIS = {"👍", "❤️", "😂", "🔥", "🙈", "😮", "👏", "😭", "🤣", "😡"}

class _MemeCreate(BaseModel):
    image_data: str

class _ReactionToggle(BaseModel):
    emoji: str

class _MemeOut(BaseModel):
    id: str; user_id: str; username: str; display_name: str
    image_data: str; created_at: str
    reactions: dict; my_reactions: list
    class Config: from_attributes = True

def _build_meme_out(meme: Meme, uid: str | None) -> _MemeOut:
    counts: dict = {}
    mine: list = []
    for r in meme.reactions:
        counts[r.emoji] = counts.get(r.emoji, 0) + 1
        if uid and r.user_id == uid:
            mine.append(r.emoji)
    return _MemeOut(id=meme.id, user_id=meme.user_id, username=meme.user.username,
                    display_name=meme.user.display_name, image_data=meme.image_data,
                    created_at=meme.created_at.isoformat(), reactions=counts, my_reactions=mine)

@app.get("/api/v1/memes", response_model=list[_MemeOut])
async def memes_list(db: AsyncSession = Depends(get_db),
                     current_user: User | None = Depends(get_optional_current_user)):
    rows = (await db.execute(
        select(Meme).options(selectinload(Meme.user), selectinload(Meme.reactions))
        .order_by(Meme.created_at.desc())
    )).scalars().all()
    uid = current_user.id if current_user else None
    return [_build_meme_out(m, uid) for m in rows]

@app.post("/api/v1/memes", response_model=_MemeOut, status_code=201)
async def memes_upload(body: _MemeCreate, current_user: User = Depends(get_current_user),
                       db: AsyncSession = Depends(get_db)):
    if len(body.image_data) > 600_000:
        raise HTTPException(status_code=413, detail="Image too large — try a smaller photo")
    if not body.image_data.startswith("data:image/"):
        raise HTTPException(status_code=400, detail="Must be a data URL (data:image/...)")
    meme = Meme(id=str(uuid.uuid4()), user_id=current_user.id, image_data=body.image_data)
    db.add(meme)
    await db.flush()
    loaded = (await db.execute(
        select(Meme).where(Meme.id == meme.id)
        .options(selectinload(Meme.user), selectinload(Meme.reactions))
    )).scalar_one()
    return _build_meme_out(loaded, current_user.id)

@app.post("/api/v1/memes/{meme_id}/react", response_model=_MemeOut)
async def memes_react(meme_id: str, body: _ReactionToggle,
                      current_user: User = Depends(get_current_user),
                      db: AsyncSession = Depends(get_db)):
    if body.emoji not in _ALLOWED_EMOJIS:
        raise HTTPException(status_code=400, detail=f"Emoji not allowed")
    meme_row = (await db.execute(
        select(Meme).where(Meme.id == meme_id)
        .options(selectinload(Meme.user), selectinload(Meme.reactions))
    )).scalar_one_or_none()
    if not meme_row:
        raise HTTPException(status_code=404, detail="Meme not found")
    existing = (await db.execute(
        select(MemeReaction).where(MemeReaction.meme_id == meme_id,
                                   MemeReaction.user_id == current_user.id,
                                   MemeReaction.emoji == body.emoji)
    )).scalar_one_or_none()
    if existing:
        await db.delete(existing)
    else:
        db.add(MemeReaction(id=str(uuid.uuid4()), user_id=current_user.id,
                            meme_id=meme_id, emoji=body.emoji))
    await db.flush()
    await db.refresh(meme_row, ["reactions"])
    return _build_meme_out(meme_row, current_user.id)

@app.delete("/api/v1/memes/{meme_id}", status_code=204)
async def memes_delete(meme_id: str, current_user: User = Depends(get_current_user),
                       db: AsyncSession = Depends(get_db)):
    meme_row = (await db.execute(select(Meme).where(Meme.id == meme_id))).scalar_one_or_none()
    if not meme_row:
        raise HTTPException(status_code=404, detail="Meme not found")
    if meme_row.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not your meme")
    await db.delete(meme_row)


@app.exception_handler(Exception)
async def _cors_safe_500(request: Request, exc: Exception):
    """Ensure CORS headers are present on 500s so the browser can read the error."""
    log.error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    origin = request.headers.get("origin", "")
    headers = {}
    if origin:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {type(exc).__name__}: {exc}"},
        headers=headers,
    )


@app.get("/health")
async def health():
    return {"status": "ok", "app": "World Cup 2026 Predictor"}


@app.get("/health/db")
async def health_db():
    """Check database connectivity — useful for diagnosing Railway DB issues."""
    try:
        from sqlalchemy import text
        async with AsyncSessionLocal() as s:
            await s.execute(text("SELECT 1"))
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        return JSONResponse(status_code=503, content={"status": "error", "db": str(e)})


@app.get("/health/routes")
async def health_routes():
    """List all registered API routes — helps verify which modules loaded successfully."""
    from fastapi.routing import APIRoute
    routes = [
        {"path": r.path, "methods": sorted(r.methods)}
        for r in app.routes
        if isinstance(r, APIRoute)
    ]
    return {"version": "1.3.0", "route_count": len(routes), "routes": sorted(routes, key=lambda r: r["path"])}
