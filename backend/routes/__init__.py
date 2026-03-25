"""
routes/__init__.py
"""
from .auth import router as auth_router
from .products import router as products_router
from .analytics import router as analytics_router
from .upload import router as upload_router

__all__ = ["auth_router", "products_router", "analytics_router", "upload_router"]
