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
from app.api import auth, matches, predictions, leaderboard, admin, goals, trivia

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
                    (89, '2026-07-05T17:00:00+00:00', 'MetLife Stadium',       'East Rutherford, USA'),
                    (90, '2026-07-05T21:00:00+00:00', 'SoFi Stadium',          'Inglewood, USA'),
                    (91, '2026-07-06T17:00:00+00:00', 'AT&T Stadium',          'Arlington, USA'),
                    (92, '2026-07-06T21:00:00+00:00', 'NRG Stadium',           'Houston, USA'),
                    (93, '2026-07-07T17:00:00+00:00', 'Lumen Field',           'Seattle, USA'),
                    (94, '2026-07-07T21:00:00+00:00', 'Rose Bowl Stadium',     'Pasadena, USA'),
                    (95, '2026-07-08T17:00:00+00:00', 'Hard Rock Stadium',     'Miami Gardens, USA'),
                    (96, '2026-07-08T21:00:00+00:00', 'Mercedes-Benz Stadium', 'Atlanta, USA'),
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

            # Auto-assign R32 winners to R16 slots where both R32 parents are complete
            _R16_PAIRS = [(89,74,77),(90,73,75),(91,76,78),(92,79,80),(93,82,81),(94,83,84),(95,85,87),(96,86,88)]
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

                assigned = 0
                for _r16n, _h32, _a32 in _R16_PAIRS:
                    _r16m = _r16.get(_r16n)
                    if not _r16m: continue
                    _hw = _winner(_r32.get(_h32))
                    _aw = _winner(_r32.get(_a32))
                    if _hw and _r16m.home_team.code == 'TBD':
                        _r16m.home_team_id = _hw.id; assigned += 1
                    if _aw and _r16m.away_team.code == 'TBD':
                        _r16m.away_team_id = _aw.id; assigned += 1
                if assigned:
                    await _s2.commit()
                    log.info("Auto-assigned %d R16 team slots from R32 results", assigned)
    except Exception as _e:
        log.warning("R16 auto-setup skipped: %s", _e)

    task = None
    if settings.FOOTBALL_DATA_API_KEY and settings.SYNC_INTERVAL_MINUTES > 0:
        task = asyncio.create_task(_auto_sync_loop())
        log.info("Auto-sync started (every %d min)", settings.SYNC_INTERVAL_MINUTES)

    yield

    if task:
        task.cancel()


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
