from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import engine, Base
from app.models import user, set, collection, achievement, moc  # noqa: register models
from app.api import auth, sets, collection as collection_router, users, mocs, leaderboard

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (use Alembic in production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(
    title="BrickVault API",
    description="LEGO Collection Companion – Unofficial Fan App. Not affiliated with the LEGO Group.",
    version="0.1.0",
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
app.include_router(sets.router, prefix="/api/v1")
app.include_router(collection_router.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(mocs.router, prefix="/api/v1")
app.include_router(leaderboard.router, prefix="/api/v1")

@app.get("/health")
async def health():
    return {"status": "ok", "app": "BrickVault", "disclaimer": "Unofficial LEGO fan app. Not affiliated with the LEGO Group."}
