from fastapi import APIRouter, Depends, HTTPException
from app.auth import get_current_user
from app.models.user import User
from app.services.sync import sync_scores, last_sync_result
from app.config import settings

router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin only")
    return current_user


@router.post("/sync")
async def trigger_sync(admin: User = Depends(require_admin)):
    return await sync_scores()


@router.get("/sync/status")
async def sync_status(admin: User = Depends(require_admin)):
    return {
        **last_sync_result,
        "api_key_configured": bool(settings.FOOTBALL_DATA_API_KEY),
        "auto_sync_interval_minutes": settings.SYNC_INTERVAL_MINUTES,
    }
