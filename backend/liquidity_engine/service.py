from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.liquidity import Wallet, Expense
from models.product import Product # If needed or direct query
# We might need access to sales data from Supabase or existing SQLite tables
from config import supabase # To fetch sales_profit data

def calculate_liquidity_status(db: Session, user_id: str):
    wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
    if not wallet:
        # Auto-initialize with zero capital instead of returning error
        wallet = Wallet(user_id=user_id, starting_capital=0.0)
        db.add(wallet)
        db.commit()
        db.refresh(wallet)

    # 1. Total Starting Pot
    current_cash = wallet.starting_capital

    # 2. Add Net Profit from Sales
    # Note: Fetching from Supabase table 'sales_data' where profit needs calculation
    # For now, let's look for cost_price vs selling_price
    # If the user has a profit_engine module, use that
    # For this implementation, we'll sum profit: (revenue - cost_price*quantity)
    # We fetch all sales for this user_id
    sales_res = supabase.table("sales_data").select("*").eq("user_id", user_id).execute()
    total_profit = 0.0
    daily_profits = {} # {date: profit}
    
    for sale in (getattr(sales_res, 'data', [])):
        # Calculate individual profit: revenue - (cost_price * qty)
        revenue = float(sale.get("revenue", 0))
        # Need cost data. If not in sale, we might need to join it or fallback
        profit = float(sale.get("profit", revenue * 0.15)) # 15% fallback margin
        total_profit += profit
        
        # Track daily for trend predictions (runway calculations)
        date_str = sale.get("date", "").split("T")[0]
        if date_str:
            daily_profits[date_str] = daily_profits.get(date_str, 0) + profit

    # Removed: current_cash += total_profit (Because Profit_Engine now modifies starting_capital directly)

    # 3. Handle Expenses
    expenses = db.query(Expense).filter(Expense.user_id == user_id).all()
    total_expenses_deducted = 0.0
    fixed_monthly_burn = 0.0
    
    now = datetime.now(timezone.utc)
    
    for exp in expenses:
        if exp.is_recurring:
            # Calculate months passed since exp.created_at
            created_at = exp.created_at.replace(tzinfo=timezone.utc)
            months_passed = (now.year - created_at.year) * 12 + (now.month - created_at.month)
            # If current day is >= recurring_day, add 1 month
            if now.day >= (exp.recurring_day or 1):
                months_passed += 1
            
            total_expenses_deducted += (exp.amount * max(1, months_passed))
            fixed_monthly_burn += exp.amount
        else:
            # Misc/One-time
            total_expenses_deducted += exp.amount

    current_cash -= total_expenses_deducted

    # 4. Prediction Logic (Runway)
    # Avg Daily Profit (last 30 days)
    # Average daily burn
    daily_burn = fixed_monthly_burn / 30.0
    # Average daily profit calculation
    avg_daily_profit = 0
    if daily_profits:
        profit_list = list(daily_profits.values())[-30:] # Last 30 days
        avg_daily_profit = sum(profit_list) / len(profit_list) if profit_list else 0

    net_daily_flow = avg_daily_profit - daily_burn
    
    days_remaining = 999 # Safe
    if net_daily_flow < 0:
        days_remaining = int(current_cash / abs(net_daily_flow))
    
    status_token = "SAFE"
    if days_remaining < 7: status_token = "CRITICAL"
    elif days_remaining < 15: status_token = "WARNING"
    elif days_remaining < 30: status_token = "CAUTION"

    return {
        "current_liquidity": round(current_cash, 2),
        "total_profit": round(total_profit, 2),
        "total_expenses": round(total_expenses_deducted, 2),
        "monthly_burn": round(fixed_monthly_burn, 2),
        "avg_daily_profit": round(avg_daily_profit, 2),
        "days_remaining": days_remaining,
        "status_token": status_token
    }
