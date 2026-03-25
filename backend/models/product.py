"""
models/product.py
=================
SQLAlchemy ORM model for the `products` table.
"""

from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
import uuid
from database import Base


from sqlalchemy.dialects.postgresql import UUID as PG_UUID
import uuid

class Product(Base):
    __tablename__ = "products"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=True)
    price = Column(Float, default=0.0)
    quantity = Column(Integer, default=0)
    sku = Column(String, nullable=True)
    description = Column(String, nullable=True)
    reorder_level = Column(Integer, default=5, server_default='5')
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="products")
