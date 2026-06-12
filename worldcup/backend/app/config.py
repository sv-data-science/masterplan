from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/worldcup"
    SECRET_KEY: str = "dev-secret-key-change-in-production"

    @property
    def async_database_url(self) -> str:
        # Railway provides postgresql:// — rewrite to asyncpg driver
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        return url
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days
    CORS_ORIGINS: List[str] = ["http://localhost:3001", "http://localhost:3000"]
    ADMIN_SECRET: str = "change-this-admin-secret"
    FOOTBALL_DATA_API_KEY: str = ""  # football-data.org free key
    SYNC_INTERVAL_MINUTES: int = 5   # 0 = disable auto-sync

    class Config:
        env_file = ".env"


settings = Settings()
