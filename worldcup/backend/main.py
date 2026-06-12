import asyncio
import logging
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import engine, Base, AsyncSessionLocal
from app.models import user, worldcup  # noqa: register models
from app.api import auth, matches, predictions, leaderboard, admin

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
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(matches.router, prefix="/api/v1")
app.include_router(predictions.router, prefix="/api/v1")
app.include_router(leaderboard.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "app": "World Cup 2026 Predictor"}
