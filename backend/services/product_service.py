"""
services/product_service.py
============================
CRUD logic for the products table.
All methods accept a db session and user_id to ensure multi-tenant isolation.
"""

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from models.product import Product
from schemas.product import ProductCreate, ProductUpdate


def list_products(db: Session, user_id: str, skip: int = 0, limit: int = 50) -> list[Product]:
    """Returns all active products belonging to a specific user."""
    return (
        db.query(Product)
        .filter(Product.user_id == user_id, Product.is_active == True)
        .offset(skip)
        .limit(limit)
        .all()
    )


def create_product(db: Session, user_id: str, payload: ProductCreate) -> Product:
    """Creates a new product owned by user_id."""
    product = Product(user_id=user_id, **payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def get_product(db: Session, product_id: str, user_id: str) -> Product:
    """Returns a single product. Raises 404 if not found or not owned by user."""
    product = (
        db.query(Product)
        .filter(Product.id == product_id, Product.user_id == user_id)
        .first()
    )
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product '{product_id}' not found",
        )
    return product


def update_product(db: Session, product_id: str, user_id: str, payload: ProductUpdate) -> Product:
    """Partially updates a product. Only provided fields are changed."""
    product = get_product(db, product_id, user_id)
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


def delete_product(db: Session, product_id: str, user_id: str) -> bool:
    """Soft-deletes a product by setting is_active = False."""
    product = get_product(db, product_id, user_id)
    product.is_active = False
    db.commit()
    return True
