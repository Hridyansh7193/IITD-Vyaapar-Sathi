import io
import pandas as pd
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
import datetime
import uuid

from config.clients import supabase
from database import get_db
from models.product import Product
from models.liquidity import Wallet
from profit_engine.models import InventoryLog
from profit_engine.schemas import AdvancedProductInput, AdvancedTransactionInput
from liquidity_engine.service import calculate_liquidity_status
from services import notification_service

router = APIRouter()

@router.post("/v2/notify/daily-report")
async def trigger_daily_report(user_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """On-demand: Send a full day's sales analysis SMS to the user right now."""
    try:
        import datetime
        from sqlalchemy import func as sqlfunc

        today_str = datetime.date.today().isoformat()
        
        # 1. Get today's sales from Supabase - select all to handle schema variations
        result = supabase.table("sales_data") \
            .select("*") \
            .eq("user_id", user_id) \
            .gte("date", today_str) \
            .execute()
        
        sales = result.data or []
        
        total_revenue = sum(float(s.get("revenue", 0) or 0) for s in sales)
        total_profit = sum(float(s.get("true_profit", 0) or s.get("profit", 0) or 0) for s in sales)
        total_items_sold = sum(int(s.get("quantity", 0) or 0) for s in sales)

        # 2. Find top seller
        product_totals: dict = {}
        for s in sales:
            pname = s.get("product", "Unknown")
            product_totals[pname] = product_totals.get(pname, 0) + (s.get("quantity", 0) or 0)
        
        top_product = max(product_totals, key=product_totals.get) if product_totals else "N/A"
        top_qty = product_totals.get(top_product, 0)

        # 3. Check critical low stock
        low_stock_count = db.query(Product).filter(
            Product.user_id == user_id,
            Product.quantity <= (Product.reorder_level or 5)
        ).count()

        # 4. Check wallet
        wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
        balance = wallet.starting_capital if wallet else 0.0

        # 5. Build the SMS
        today_display = datetime.date.today().strftime("%b %d, %Y")
        
        if len(sales) == 0:
            msg = (
                f"📊 Vyaapar-Sathi Report ({today_display}):\n"
                f"⚠️ No sales recorded today yet.\n"
                f"💸 Wallet Balance: ₹{balance:,.2f}\n"
                f"⚠️ Critical Stock: {low_stock_count} products low on inventory."
            )
        else:
            msg = (
                f"📊 Vyaapar-Sathi Snapshot ({today_display}):\n"
                f"💰 Revenue: ₹{total_revenue:,.2f} | Profit: ₹{total_profit:,.2f}\n"
                f"🛒 Total Sold: {total_items_sold} units\n"
                f"⭐ Top Item: {top_product} ({top_qty} sold)\n"
                f"⚠️ Low Stock: {low_stock_count} products need reorder\n"
                f"💸 Wallet: ₹{balance:,.2f}"
            )

        background_tasks.add_task(notification_service.send_sms, msg)
        return {"message": "SMS report has been queued!", "preview": msg}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/v2/products/{user_id}/{barcode}")
def get_product_v2(user_id: str, barcode: str, db: Session = Depends(get_db)):
    """Lookup product with explicit cost awareness."""
    try:
        product = db.query(Product).filter(Product.sku == barcode, Product.user_id == user_id).first()
        if not product:
            return {"exists": False}
        
        # Calculate Average Cost from logs
        all_logs = db.query(InventoryLog).filter(InventoryLog.barcode == barcode, InventoryLog.user_id == user_id).all()
        avg_cost = 0.0
        if all_logs:
            total_cost = sum(log.cost_price * log.quantity_added for log in all_logs)
            total_qty = sum(log.quantity_added for log in all_logs)
            avg_cost = total_cost / total_qty if total_qty > 0 else 0.0

        return {
            "exists": True, 
            "product": {
                "name": product.name,
                "category": product.category,
                "selling_price": product.price,
                "cost_price": round(avg_cost, 2),
                "stock_quantity": product.quantity,
                "barcode": product.sku
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/v2/inventory/add")
def add_inventory_v2(data: AdvancedProductInput, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    try:
        from sqlalchemy import func
        clean_name = data.name.strip() if data.name else ""
        clean_barcode = data.barcode.strip() if data.barcode else ""

        # Check Liquidity before allowing purchase (Incoming Repo Change)
        total_cost = data.cost_price * data.stock_quantity
        liquidity = calculate_liquidity_status(db, data.user_id)
        current_liq = liquidity.get("current_liquidity", 0) if "error" not in liquidity else 0
        if total_cost > current_liq:
            raise HTTPException(status_code=400, detail=f"Insufficient liquidity! Required: ₹{total_cost}, Available: ₹{current_liq}")

        print(f"DEBUG: Processing AI entry for user {data.user_id}. Name: '{clean_name}', SKU: '{clean_barcode}'")

        # 1. Try finding by barcode (exact match)
        product = None
        if clean_barcode:
            product = db.query(Product).filter(
                Product.sku == clean_barcode, 
                Product.user_id == data.user_id
            ).first()
            if product: print(f"DEBUG: Match found via Barcode: {product.sku}")
        
        # 2. Fallback to name-matching (case-insensitive + trimmed) if no barcode match
        if not product and clean_name:
            # Query all products for this user and do a clean match in Python first if SQL complex
            # Or use robust SQL lower and trim
            product = db.query(Product).filter(
                func.trim(func.lower(Product.name)) == func.trim(func.lower(clean_name)),
                Product.user_id == data.user_id
            ).first()
            
            if product:
                print(f"DEBUG: Match found via Name: '{product.name}' (ID: {product.id})")
                if not clean_barcode:
                     clean_barcode = product.sku
            else:
                print(f"DEBUG: No product found with name '{clean_name}'. Searching alternative...")
                # One more try: case-insensitive partial match? No, that's risky. 
                # Let's just trust the trimmed lower match.

        if not product:
            print(f"DEBUG: Creating NEW product for '{clean_name}'")
            # Create new if still not found
            batch_sku = clean_barcode or f"SKU-{str(uuid.uuid4())[:8].upper()}"
            product = Product(
                user_id=data.user_id,
                name=clean_name,
                category=data.category,
                price=data.selling_price,
                quantity=data.stock_quantity,
                sku=batch_sku
            )
            db.add(product)
            clean_barcode = batch_sku
        else:
            product.quantity += data.stock_quantity
            if data.selling_price > 0: product.price = data.selling_price
            if data.name: product.name = data.name

        # Always log the specific batch cost
        new_log = InventoryLog(
            user_id=data.user_id,
            barcode=data.barcode,
            cost_price=data.cost_price,
            selling_price=data.selling_price,
            quantity_added=data.stock_quantity
        )
        db.add(new_log)
        
        # Deduct Cost Price from Liquidity Wallet
        total_cost = data.cost_price * data.stock_quantity
        wallet = db.query(Wallet).filter(Wallet.user_id == data.user_id).first()
        if wallet and total_cost > 0:
             wallet.starting_capital -= total_cost
             
        # Check Liquidity Alert
        if wallet and wallet.starting_capital < 5000:
             background_tasks.add_task(notification_service.alert_low_liquidity, wallet.starting_capital)

        db.commit()
        return {"message": "Inventory batch logged successfully", "new_total": product.quantity}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/v2/sales/checkout")
def process_checkout_v2(data: AdvancedTransactionInput, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Deduct stock and log sale to Supabase with TRUE profit calculation."""
    try:
        product = db.query(Product).filter(Product.sku == data.barcode, Product.user_id == data.user_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found in inventory.")
        
        if product.quantity < data.quantity:
             raise HTTPException(status_code=400, detail=f"Insufficient stock! Available: {product.quantity}")
             
        # 1. Deduct Stock
        product.quantity -= data.quantity
        if data.selling_price > 0:
            product.price = data.selling_price
        
        # 2. Calculate average cost for THIS sale
        all_logs = db.query(InventoryLog).filter(InventoryLog.barcode == product.sku, InventoryLog.user_id == data.user_id).all()
        if all_logs:
            total_avg_cost = sum(log.cost_price * log.quantity_added for log in all_logs) / sum(log.quantity_added for log in all_logs)
        else:
            total_avg_cost = 0.0

        revenue = data.selling_price * data.quantity
        profit = (data.selling_price - total_avg_cost) * data.quantity
        
        sale_payload = {
            "user_id": data.user_id,
            "product": product.name,
            "category": product.category,
            "price": data.selling_price,
            "quantity": data.quantity,
            "revenue": revenue,
            "cost_price": round(total_avg_cost, 2),
            "true_profit": round(profit, 2),
            "date": datetime.datetime.now().isoformat()
        }
        
        # 3. Log to Supabase for global analytics
        try:
            supabase.table("sales_data").insert(sale_payload).execute()
        except:
            # Fallback if custom columns missing
            supabase.table("sales_data").insert({k:v for k,v in sale_payload.items() if k not in ['cost_price', 'true_profit']}).execute()

        # Add Selling Price Revenue to Liquidity Wallet
        wallet = db.query(Wallet).filter(Wallet.user_id == data.user_id).first()
        if wallet and revenue > 0:
             wallet.starting_capital += revenue

        # Check Alerts AFTER commit/success
        if product.quantity <= (product.reorder_level or 5):
            background_tasks.add_task(notification_service.alert_low_stock, product.name, product.quantity)
        
        if data.selling_price < total_avg_cost:
            background_tasks.add_task(notification_service.alert_pricing_anomaly, product.name, (total_avg_cost - data.selling_price))

        db.commit()
        return {"message": "Sale completed", "revenue": revenue, "profit": profit}
    except Exception as e:
          db.rollback()
          raise HTTPException(status_code=500, detail=str(e))



@router.post("/v2/upload/receive")
async def bulk_receive_stock_v2(user_id: str = Form(...), file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Bulk receives stock from a CSV, creating products or adding logic with cost price.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Must be a .csv file")
        
    contents = await file.read()
    try:
        df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
    except Exception:
        df = pd.read_csv(io.StringIO(contents.decode("latin-1")))
        
    if df.empty:
        raise HTTPException(status_code=400, detail="Empty CSV")
        
    # Pre-fetch liquidity and wallet
    liquidity = calculate_liquidity_status(db, user_id)
    current_liq = liquidity.get("current_liquidity", 0) if "error" not in liquidity else 0
    wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
    # Standardize column mapping
    col_map = {}
    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "").str.replace("_", "")
    for c in df.columns:
        if c in ["product", "item", "productname", "itemname"]: col_map["product"] = c
        elif c in ["date", "sale_date", "received_date", "inventory_date"]: col_map["date"] = c
        elif c in ["costprice", "cost", "unitcost", "cp"]: col_map["cost"] = c
        elif c in ["quantity", "qty", "units"]: col_map["quantity"] = c
        elif c in ["category", "dept", "department"]: col_map["category"] = c

    added = 0
    errors = 0
    failed_items = []

    for idx, row in df.iterrows():
        try:
            item_name = str(row.get(col_map.get("product", ""), "")).strip()
            if not item_name or item_name.lower() == "nan":
                continue 

            date_str = str(row.get(col_map.get("date", ""), "")).strip()
            if not date_str or date_str.lower() == "nan":
                parsed_date = datetime.datetime.now()
            else:
                parsed_date = pd.to_datetime(date_str, format="mixed", dayfirst=True).to_pydatetime()

            cp_val = row.get(col_map.get("cost", ""), 0)
            cost_price = float(cp_val) if pd.notna(cp_val) else 0.0

            qty_val = row.get(col_map.get("quantity", ""), 0)
            qty = int(qty_val) if pd.notna(qty_val) else 0

            if qty <= 0: continue
            
            total_cost = cost_price * qty
            if wallet and total_cost > current_liq and wallet.starting_capital > 0:
                 raise ValueError(f"Insufficient liquidity (Cost: ₹{total_cost:,.2f})")
                
            current_liq -= total_cost

            category = str(row.get(col_map.get("category", ""), "General")).title()
            if category.lower() == "nan": category = "General"

            product = db.query(Product).filter(
                Product.user_id == user_id, 
                Product.name == item_name
            ).first()

            if not product:
                product = Product(
                    user_id=user_id,
                    name=item_name,
                    category=category,
                    price=cost_price * 1.25, # Default Selling Price
                    quantity=qty,
                    sku=f"SKU-{str(uuid.uuid4())[:8].upper()}"
                )
                db.add(product)
                added += 1
            else:
                product.quantity += qty
                # Update price if it was 0
                if product.price <= 0:
                    product.price = cost_price * 1.25
                
            new_log = InventoryLog(
                user_id=user_id,
                barcode=product.sku,
                cost_price=cost_price,
                selling_price=product.price,
                quantity_added=qty
            )
            if parsed_date:
                new_log.date_added = parsed_date
            db.add(new_log)
            
            if wallet:
                wallet.current_cash_balance -= total_cost
                
        except Exception as e:
            errors += 1
            failed_items.append(f"Row {idx+1}: {str(e)}")
            continue

    db.commit()
    
    return {
        "status": "success",
        "added": added,
        "errors": errors,
        "failed_items": failed_items[:10], # Show first 10 errors
        "message": f"Successfully processed {added} items." if errors == 0 else f"Processed with {errors} errors."
    }

@router.post("/v2/upload/checkout")
async def bulk_checkout_v2(user_id: str = Form(...), file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Bulk checkouts stock from a CSV, logging sales data to supabase with true profit.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Must be a .csv file")
        
    contents = await file.read()
    try:
        df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
    except Exception:
        df = pd.read_csv(io.StringIO(contents.decode("latin-1")))
        
    if df.empty:
        raise HTTPException(status_code=400, detail="Empty CSV")
        
    processed = 0
    errors = 0
    rol_alerts = 0
    failed_items = []
    
    # Pre-fetch wallet for performance
    wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
    
    for idx, row in df.iterrows():
        try:
            product_name = str(row.get("Product", "")).strip()
            if not product_name or product_name.lower() == "nan":
                failed_items.append(f"Row {idx+1}: Product missing")
                errors += 1
                continue
                
            date_str = str(row.get("Date", "")).strip()
            if not date_str or date_str.lower() == "nan":
                failed_items.append(f"Row {idx+1} ({product_name}): Date missing")
                errors += 1
                continue
            parsed_date_iso = pd.to_datetime(date_str, format="mixed", dayfirst=True).to_pydatetime().isoformat()
            
            price_raw = row.get("Price")
            if pd.isna(price_raw) or str(price_raw).strip() == "":
                failed_items.append(f"Row {idx+1} ({product_name}): Price missing")
                errors += 1
                continue
            selling_price = float(price_raw)
            
            qty_raw = row.get("Quantity")
            if pd.isna(qty_raw) or str(qty_raw).strip() == "":
                failed_items.append(f"Row {idx+1} ({product_name}): Quantity missing")
                errors += 1
                continue
            qty = int(qty_raw)

            product = db.query(Product).filter(Product.name == product_name, Product.user_id == user_id).first()
                
            if not product:
                failed_items.append(f"Row {idx+1}: '{product_name}' not found in inventory. Cannot checkout.")
                errors += 1
                continue
                
            if product.quantity < qty:
                failed_items.append(f"Row {idx+1}: '{product_name}' insufficient stock (Tried: {qty}, Available: {product.quantity}).")
                errors += 1
                continue
                
            product.quantity -= qty
            if selling_price > 0:
                product.price = selling_price
            
            all_logs = db.query(InventoryLog).filter(
                InventoryLog.barcode == product.sku, 
                InventoryLog.user_id == user_id
            ).all()

            if all_logs:
                total_cost = sum(log.cost_price * log.quantity_added for log in all_logs)
                total_qty = sum(log.quantity_added for log in all_logs)
                cost_price = total_cost / total_qty if total_qty > 0 else 0.0
            else:
                cost_price = 0.0
                
            rol = product.reorder_level if hasattr(product, 'reorder_level') and product.reorder_level is not None else 5
            if product.quantity < rol:
                rol_alerts += 1

            revenue = selling_price * qty
            profit = (selling_price - cost_price) * qty
            
            sale_payload = {
                "user_id": user_id,
                "product": product.name,
                "category": product.category,
                "price": selling_price,
                "quantity": qty,
                "revenue": revenue,
                "date": parsed_date_iso
            }
            full_payload = {**sale_payload, "cost_price": cost_price, "true_profit": profit}
            
            try:
                supabase.table("sales_data").insert(full_payload).execute()
            except Exception as filter_e:
                if "PGRST204" in str(filter_e):
                    supabase.table("sales_data").insert(sale_payload).execute()
                else:
                    raise filter_e
                    
            # Add Bulk Sale Revenue to Wallet
            if wallet:
                wallet.starting_capital += revenue
                    
            processed += 1
        except Exception as e:
            errors += 1
            product_name_str = row.get("Product", f"Row {idx+1}")
            failed_items.append(f"{product_name_str}: Failed to process ({str(e)})")
            continue
            
    db.commit()
    preview = df.head(10).fillna("").to_dict(orient="records")
    rol_msg = f" 🚨 {rol_alerts} items dropped below Reorder Level!" if rol_alerts > 0 else ""
    return {"message": "Success", "details": f"Processed {processed} sales. Errors: {errors}.{rol_msg}", "preview": preview, "failed_items": failed_items}

