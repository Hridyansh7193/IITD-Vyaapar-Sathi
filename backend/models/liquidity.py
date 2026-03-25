from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, func, ForeignKey
from sqlalchemy.orm import relationship
import uuid
from database import Base

class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, unique=True, index=True) # Linked to User
    starting_capital = Column(Float, default=0.0)
    current_cash_balance = Column(Float, default=0.0) # For manual overrides/resets
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True)
    name = Column(String, nullable=False) # e.g. "Office Rent"
    amount = Column(Float, nullable=False)
    category = Column(String, nullable=False) # Rent, Salary, Electricity, Misc
    is_recurring = Column(Boolean, default=False)
    recurring_day = Column(Integer, nullable=True) # 1-31
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_processed_at = Column(DateTime(timezone=True), nullable=True) # For auto-deduction logic
