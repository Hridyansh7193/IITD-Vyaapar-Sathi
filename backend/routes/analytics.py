"""
routes/analytics.py
====================
Analytics endpoints (JWT-protected):
  GET /api/v1/analytics/summary  → Full analytics for current user
  GET /api/v1/analytics/trends   → Lighter trend-only payload for mobile
"""

from fastapi import APIRouter, Depends
from dependencies import get_current_user
from models.user import User
from schemas.response import success_response
from services.analytics_service import get_analytics_summary, get_analytics_trends

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/summary", summary="Full analytics summary from user's sales data")
def analytics_summary(current_user: User = Depends(get_current_user)):
    """
    Runs complete analytics on the user's uploaded sales data.
    Includes: KPI stats, revenue trends, top products, category breakdown,
    GST estimate, AI recommendations.

    **Requires:** Upload CSV via POST /api/v1/upload/csv first.
    """
    data = get_analytics_summary(current_user.id)
    return success_response(data=data, message="Analytics computed successfully")


@router.get("/trends", summary="Revenue trends and forecast (lightweight)")
def analytics_trends(current_user: User = Depends(get_current_user)):
    """
    Returns only trend-related data — ideal for mobile chart rendering.
    Lighter payload than /summary.
    """
    data = get_analytics_trends(current_user.id)
    return success_response(data=data, message="Trends retrieved")
