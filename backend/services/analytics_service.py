"""
services/analytics_service.py
==============================
Analytics service that uses the orchestration layer to solve requests.

Architecture: 
  Routes → Services → Orchestation → Execution
"""

import sys, os

# Setup sys.path for orchestration
ORCH_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "orchestration"))
if ORCH_DIR not in sys.path:
    sys.path.insert(0, ORCH_DIR)

from router import route_analytics_request


def get_analytics_summary(user_id: str) -> dict:
    """Uses orchestration router to fetch and compute analytics."""
    return route_analytics_request(user_id)


def get_analytics_trends(user_id: str) -> dict:
    """Returns only trend-related data."""
    full = route_analytics_request(user_id)
    return {
        "revenue_data": full.get("revenue_data", []),
        "revenue_forecast": full.get("revenue_forecast", []),
        "comparison_data": full.get("comparison_data", []),
        "category_trend": full.get("category_trend", []),
    }
