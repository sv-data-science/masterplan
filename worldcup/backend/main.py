from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import engine, Base, AsyncSessionLocal
from app.models import user, worldcup  # noqa: register models
from app.api import auth, matches, predictions, leaderboard


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        from sqlalchemy import select, func
        from app.models.worldcup import Team
        async with AsyncSessionLocal() as s:
            count = (await s.execute(select(func.count()).select_from(Team))).scalar() or 0
        if count == 0:
            from scripts.seed_worldcup import seed
            await seed()
            print("✅ World Cup 2026 data seeded")
    except Exception as e:
        print(f"Seed skipped: {e}")

    yield


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


@app.get("/health")
async def health():
    return {"status": "ok", "app": "World Cup 2026 Predictor"}
