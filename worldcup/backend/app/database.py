from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import settings


class Base(DeclarativeBase):
    pass


def _build_engine():
    url = settings.async_database_url.strip()
    if not url or not url.startswith(("postgresql", "postgres")):
        raise RuntimeError(
            f"DATABASE_URL is not set or invalid. "
            f"Set it to your PostgreSQL connection string in Railway Variables. "
            f"Got: {url!r:.80}"
        )
    if "sslmode=require" in url:
        url = url.replace("?sslmode=require", "").replace("&sslmode=require", "")
        return create_async_engine(url, echo=False, pool_size=10, max_overflow=20,
                                   connect_args={"ssl": True})
    return create_async_engine(url, echo=False, pool_size=10, max_overflow=20)


_engine = None
_session_factory = None


def get_engine():
    global _engine
    if _engine is None:
        _engine = _build_engine()
    return _engine


def get_session_factory():
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(get_engine(), expire_on_commit=False)
    return _session_factory


# Keep module-level names for compatibility — resolved lazily on first access
class _LazyEngine:
    def __getattr__(self, name):
        return getattr(get_engine(), name)

    def begin(self):
        return get_engine().begin()


class _LazySessionLocal:
    def __call__(self, *args, **kwargs):
        return get_session_factory()(*args, **kwargs)


engine = _LazyEngine()
AsyncSessionLocal = _LazySessionLocal()


async def get_db() -> AsyncSession:
    async with get_session_factory()() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
