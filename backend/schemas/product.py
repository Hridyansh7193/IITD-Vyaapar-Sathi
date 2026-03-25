"""
schemas/product.py
==================
Pydantic schemas for product CRUD validation.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    category: Optional[str] = Field(None, max_length=100)
    price: float = Field(0.0, ge=0)
    quantity: int = Field(0, ge=0)
    sku: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=1000)

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Masala Dosa",
                "category": "Food",
                "price": 80.0,
                "quantity": 100,
                "sku": "FOOD-001",
                "description": "South Indian crispy dosa"
            }
        }


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    category: Optional[str] = Field(None, max_length=100)
    price: Optional[float] = Field(None, ge=0)
    quantity: Optional[int] = Field(None, ge=0)
    sku: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=1000)
    is_active: Optional[bool] = None


class ProductResponse(BaseModel):
    id: str
    user_id: str
    name: str
    category: Optional[str]
    price: float
    quantity: int
    sku: Optional[str]
    description: Optional[str]
    is_active: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
