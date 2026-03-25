"""
routes/products.py
==================
Product CRUD endpoints (all protected by JWT):
  GET    /api/v1/products          → List user's products
  POST   /api/v1/products          → Create product
  PUT    /api/v1/products/{id}     → Update product
  DELETE /api/v1/products/{id}     → Soft-delete product
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models.user import User
from schemas.product import ProductCreate, ProductUpdate, ProductResponse
from schemas.response import success_response
from services import product_service

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", summary="List all products for the authenticated user")
def get_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns paginated list of active products owned by the authenticated user.
    - Use `skip` and `limit` for pagination.
    """
    products = product_service.list_products(db, current_user.id, skip, limit)
    return success_response(
        data=[ProductResponse.model_validate(p).model_dump() for p in products],
        message=f"{len(products)} product(s) found",
    )


@router.post("", summary="Create a new product", status_code=201)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Creates a new product in the catalog for the authenticated user."""
    product = product_service.create_product(db, current_user.id, payload)
    return success_response(
        data=ProductResponse.model_validate(product).model_dump(),
        message="Product created successfully",
    )


@router.put("/{product_id}", summary="Update an existing product")
def update_product(
    product_id: str,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Partially updates a product. Only fields provided in the body are changed.
    Returns 404 if the product doesn't exist or doesn't belong to the current user.
    """
    product = product_service.update_product(db, product_id, current_user.id, payload)
    return success_response(
        data=ProductResponse.model_validate(product).model_dump(),
        message="Product updated successfully",
    )


@router.delete("/{product_id}", summary="Delete a product (soft delete)")
def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Soft-deletes a product by marking it inactive.
    Returns 404 if not found or not owned by the current user.
    """
    product_service.delete_product(db, product_id, current_user.id)
    return success_response(message="Product deleted successfully")
