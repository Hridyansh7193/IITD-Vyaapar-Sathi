"""
services/__init__.py
"""
from .auth_service import register_user, authenticate_user, create_access_token
from .product_service import list_products, create_product, get_product, update_product, delete_product
from .analytics_service import get_analytics_summary, get_analytics_trends

__all__ = [
    "register_user", "authenticate_user", "create_access_token",
    "list_products", "create_product", "get_product", "update_product", "delete_product",
    "get_analytics_summary", "get_analytics_trends",
]
