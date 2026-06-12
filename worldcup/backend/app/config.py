from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/worldcup"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days
    CORS_ORIGINS: List[str] = ["http://localhost:3001", "http://localhost:3000"]
    ADMIN_SECRET: str = "change-this-admin-secret"

    class Config:
        env_file = ".env"


settings = Settings()
