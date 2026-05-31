from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

# Strip sslmode from URL — asyncpg uses ssl= connect_args instead
def _build_engine():
    url = settings.DATABASE_URL
    if "sslmode=require" in url:
        url = url.replace("?sslmode=require", "").replace("&sslmode=require", "")
        return create_async_engine(url, echo=False, pool_size=10, max_overflow=20,
                                   connect_args={"ssl": True})
    return create_async_engine(url, echo=False, pool_size=10, max_overflow=20)

engine = _build_engine()
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
