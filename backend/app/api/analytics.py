from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.business import User
from backend.app.schemas.analytics import DashboardSummaryResponse
from backend.app.services.analytics_service import analytics_service

router = APIRouter(prefix="/analytics", tags=["Analytics & BI"])

@router.get("/dashboard", response_model=DashboardSummaryResponse)
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    summary = await analytics_service.get_dashboard_summary(db, current_user.business_id)
    return summary
