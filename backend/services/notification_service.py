import os
import datetime
import uuid
from twilio.rest import Client
from sqlalchemy.orm import Session
from sqlalchemy import func
from starlette.concurrency import run_in_threadpool
from models.product import Product
from models.liquidity import Wallet
from profit_engine.models import InventoryLog
from database import SessionLocal

async def send_sms(message: str, to: str | None = None):
    """General purpose async SMS sender via Twilio."""
    from config.settings import get_settings
    settings = get_settings()
    
    account_sid = settings.TWILIO_ACCOUNT_SID
    auth_token = settings.TWILIO_AUTH_TOKEN
    from_number = settings.TWILIO_FROM_NUMBER
    admin_phone = to or settings.ADMIN_PHONE

    if not account_sid or not auth_token or not from_number or not admin_phone:
        print(f"DEBUG: Twilio not configured. SID={account_sid}, FROM={from_number}, TO={admin_phone}")
        return

    try:
        def sync_send():
            client = Client(account_sid, auth_token)
            return client.messages.create(
                body=message,
                from_=from_number,
                to=admin_phone
            )

        # Run synchronous Twilio call in threadpool
        await run_in_threadpool(sync_send)
        print(f"DEBUG: SMS Sent successfully to {admin_phone}")
    except Exception as e:
        print(f"CRITICAL: Failed to send SMS: {e}")

# --- 1. Instant Alerts ---

async def alert_low_stock(product_name: str, quantity: int):
    msg = f"🛑 Low Stock Alert: '{product_name}' is critically low (only {quantity} left)."
    await send_sms(msg)

async def alert_low_liquidity(balance: float):
    msg = f"🚨 Liquidity Warning: Your capital balance is critically low at ₹{balance:.2f}!"
    await send_sms(msg)

async def alert_pricing_anomaly(product_name: str, loss: float):
    msg = f"⚠️ Margin Warning: You just sold '{product_name}' at a loss of ₹{loss:.2f}. Please verify your price."
    await send_sms(msg)

# --- 2. Scheduled/Analyzed Alerts ---

async def send_daily_snapshot():
    """Runs at 9:00 PM - Daily Sales, Top Item, Critical Stock, Wallet."""
    db = SessionLocal()
    try:
        today_start = datetime.datetime.combine(datetime.date.today(), datetime.time.min).isoformat()
        
        # 1. Revenue & Profit (WAC System)
        # Note: We'd ideally query the sales_data table from Supabase or our logs
        # For this hackathon, we assume Sales data is in Supabase 'sales_data'
        # But we can also use our own InventoryLog to get today's additions vs calculated sales
        
        # For simplicity, we'll try to get today's sales from our DB logs if we had a SalesLog
        # But since we use Supabase 'sales_data', we'll simulate the snapshot content 
        # based on existing inventory state
        
        total_revenue = 0.0 # This would be fetched from Supabase
        total_profit = 0.0
        
        # 2. Critical Stock count
        low_items_count = db.query(Product).filter(Product.quantity <= Product.reorder_level).count()
        
        # 3. Wallet Balance
        wallet = db.query(Wallet).one_or_none()
        balance = wallet.starting_capital if wallet else 0.0
        
        msg = (
            f"📊 Vyaapar-Sathi Daily Snapshot ({datetime.date.today().strftime('%b %d')}):\n"
            f"💰 Revenue Check: Visit dashboard for details.\n"
            f"⚠️ Critical Alerts: {low_items_count} products are below Reorder Level!\n"
            f"💸 Wallet: ₹{balance:,.2f} available capital."
        )
        await send_sms(msg)
        
    finally:
        db.close()

async def check_missed_sales(user_id: str = "dc61cce3-a074-45bf-82e3-d4d1fb2212be"):
    """Verify if user uploaded any sales today via Supabase."""
    try:
        from config.clients import supabase
        today = datetime.date.today().isoformat()
        
        # Query Supabase for today's sales for this user
        result = supabase.table("sales_data") \
            .select("id") \
            .eq("user_id", user_id) \
            .gte("date", today) \
            .execute()
        
        if len(result.data) == 0:
            msg = "⚠️ Vyaapar-Sathi Reminder: No sales were uploaded today! Keep your dashboard active for accurate analytics."
            await send_sms(msg)
            print(f"DEBUG: Missed Sales SMS triggered for {user_id}")
            
    except Exception as e:
        print(f"ERROR: Failed to check missed sales: {e}")

async def alert_dead_stock():
    """Scan for items with 0 sales in 90 days. Run Weekly."""
    # Logic goes here...
    pass
