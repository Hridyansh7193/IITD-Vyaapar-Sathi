from sqlalchemy import Column, String, Float, Integer, DateTime, func
import uuid
from database import Base

class InventoryLog(Base):
    """
    Separate ledger for tracking every instance of inventory added.
    This helps in tracking exact cost price (CP) and selling price (SP)
    for exact profit margin calculations, decoupled from the main Product table.
    """
    __tablename__ = "inventory_logs_v2"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    barcode = Column(String, nullable=False, index=True)
    cost_price = Column(Float, nullable=False, default=0.0)
    selling_price = Column(Float, nullable=False, default=0.0)
    quantity_added = Column(Integer, nullable=False, default=1)
    date_added = Column(DateTime(timezone=True), server_default=func.now())
