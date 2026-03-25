from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.liquidity import Wallet, Expense
from pydantic import BaseModel
from typing import Optional, List
from .service import calculate_liquidity_status

router = APIRouter(prefix="/liquidity", tags=["Liquidity Tracker"])

# Pydantic Schemas
class WalletInit(BaseModel):
    user_id: str
    starting_capital: float

class ExpenseCreate(BaseModel):
    user_id: str
    name: str
    amount: float
    category: str # Rent, Salary, Electricity, Misc
    is_recurring: bool = False
    recurring_day: Optional[int] = None

class ExpenseUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    is_recurring: Optional[bool] = None
    recurring_day: Optional[int] = None

@router.post("/initialize")
def initialize_wallet(data: WalletInit, db: Session = Depends(get_db)):
    wallet = db.query(Wallet).filter(Wallet.user_id == data.user_id).first()
    if wallet:
        wallet.starting_capital = data.starting_capital
    else:
        wallet = Wallet(user_id=data.user_id, starting_capital=data.starting_capital)
        db.add(wallet)
    
    db.commit()
    return {"status": "success", "message": "Starting capital updated."}

@router.post("/expense")
def add_expense(data: ExpenseCreate, db: Session = Depends(get_db)):
    expense = Expense(
        user_id=data.user_id,
        name=data.name,
        amount=data.amount,
        category=data.category,
        is_recurring=data.is_recurring,
        recurring_day=data.recurring_day
    )
    db.add(expense)
    db.commit()
    return {"status": "success", "message": f"{data.category} expense added."}

@router.put("/expense/{expense_id}")
def update_expense(expense_id: str, data: ExpenseUpdate, db: Session = Depends(get_db)):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    if data.name is not None: expense.name = data.name
    if data.amount is not None: expense.amount = data.amount
    if data.category is not None: expense.category = data.category
    if data.is_recurring is not None: expense.is_recurring = data.is_recurring
    if data.recurring_day is not None: expense.recurring_day = data.recurring_day
    
    db.commit()
    return {"status": "success", "message": "Expense updated."}

@router.delete("/expense/{expense_id}")
def delete_expense(expense_id: str, db: Session = Depends(get_db)):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    db.delete(expense)
    db.commit()
    return {"status": "success", "message": "Expense deleted."}

@router.get("/status/{user_id}")
def get_liquidity_status(user_id: str, db: Session = Depends(get_db)):
    status = calculate_liquidity_status(db, user_id)
    if "error" in status:
        raise HTTPException(status_code=400, detail=status["error"])
    return status

@router.get("/expenses/{user_id}")
def list_expenses(user_id: str, db: Session = Depends(get_db)):
    expenses = db.query(Expense).filter(Expense.user_id == user_id).all()
    return expenses
