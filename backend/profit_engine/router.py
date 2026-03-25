import io
import pandas as pd
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
import datetime
import uuid

from config.clients import supabase
from database import get_db
from models.product import Product
from profit_engine.models import InventoryLog
from profit_engine.schemas import AdvancedProductInput, AdvancedTransactionInput

router = APIRouter()



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
        
    added = 0
    errors = 0
    for _, row in df.iterrows():
        try:
            product_name = str(row.get("Product", "")).strip()
            if not product_name or product_name.lower() == "nan":
                raise ValueError("Product missing")

            date_str = str(row.get("Date", "")).strip()
            if not date_str or date_str.lower() == "nan":
                raise ValueError("Date missing")
            parsed_date = pd.to_datetime(date_str, format="mixed", dayfirst=True).to_pydatetime()

            cp_raw = row.get("CostPrice") if "CostPrice" in row else row.get("Cost Price")
            if pd.isna(cp_raw) or str(cp_raw).strip() == "":
                raise ValueError("CostPrice missing")
            cost_price = float(cp_raw)

            qty_raw = row.get("Quantity")
            if pd.isna(qty_raw) or str(qty_raw).strip() == "":
                raise ValueError("Quantity missing")
            qty = int(qty_raw)

            category = str(row.get("Category", "Uncategorized"))
            if category.lower() == "nan":
                category = "Uncategorized"

            product = db.query(Product).filter(Product.name == product_name, Product.user_id == user_id).first()
            if product:
                barcode = product.sku
            else:
                barcode = f"SKU-{str(uuid.uuid4())[:8].upper()}"

            if not product:
                new_prod = Product(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    name=product_name,
                    category=category,
                    price=0.0,  # Initially 0, updated during checkout
                    quantity=qty,
                    sku=barcode
                )
                db.add(new_prod)
            else:
                product.quantity += qty
                
            new_log = InventoryLog(
                user_id=user_id,
                barcode=barcode,
                cost_price=cost_price,
                selling_price=0.0,
                quantity_added=qty
            )
            if parsed_date:
                new_log.date_added = parsed_date
            db.add(new_log)
            added += 1
        except Exception as e:
            errors += 1
            print(f"Error processing row: {e}")
            continue
            
    db.commit()
    # Normalize numpy types for JSON serialization
    preview = df.head(10).fillna("").to_dict(orient="records")
    return {"message": "Success", "details": f"Received {added} items. Errors: {errors}", "preview": preview}

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

