from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
import datetime
import uuid

from profit_engine.models import InventoryLog
from config.clients import supabase
from database import get_db
from models.product import Product

router = APIRouter()

class ReorderUpdate(BaseModel):
    sku: str
    user_id: str
    reorder_level: int

@router.post("/inventory/update-reorder")
def update_reorder(data: ReorderUpdate, db: Session = Depends(get_db)):
    try:
        product = db.query(Product).filter(Product.sku == data.sku, Product.user_id == data.user_id).first()
        if product:
            product.reorder_level = data.reorder_level
            db.commit()
            return {"message": "Success"}
        raise HTTPException(status_code=404, detail="Not found")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

class ProductInput(BaseModel):
    barcode: str
    user_id: str
    name: str = ""
    category: str = "General"
    price: float = 0.0
    stock_quantity: int = 0

class TransactionInput(BaseModel):
    barcode: str
    user_id: str
    quantity: int

@router.get("/products/{user_id}/{barcode}")
def get_product(user_id: str, barcode: str, db: Session = Depends(get_db)):
    try:
        product = db.query(Product).filter(Product.sku == barcode, Product.user_id == user_id).first()
        if not product:
            return {"exists": False}
        
        return {
            "exists": True, 
            "product": {
                "name": product.name,
                "category": product.category,
                "price": product.price,
                "stock_quantity": product.quantity,
                "barcode": product.sku
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/inventory/add")
def add_inventory(data: ProductInput, db: Session = Depends(get_db)):
    try:
        product = db.query(Product).filter(Product.sku == data.barcode, Product.user_id == data.user_id).first()
        if not product:
            new_prod = Product(
                id=str(uuid.uuid4()),
                user_id=data.user_id,
                name=data.name,
                category=data.category,
                price=data.price,
                quantity=data.stock_quantity,
                sku=data.barcode
            )
            db.add(new_prod)
            db.commit()
            return {"message": "New product and inventory logged successfully!"}
        else:
            product.quantity += data.stock_quantity
            if data.price > 0: product.price = data.price
            if data.name: product.name = data.name
            db.commit()
            return {"message": f"Inventory updated! New Stock: {product.quantity}"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sales/checkout")
def process_checkout(data: TransactionInput, db: Session = Depends(get_db)):
    try:
        product = db.query(Product).filter(Product.sku == data.barcode, Product.user_id == data.user_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found. Please add it to inventory first.")
        
        if product.quantity < data.quantity:
             raise HTTPException(status_code=400, detail=f"Not enough stock! Current stock: {product.quantity}")
             
        product.quantity -= data.quantity
        db.commit()
        
        revenue = product.price * data.quantity
        sale_payload = {
            "user_id": data.user_id,
            "product": product.name,
            "category": product.category,
            "price": product.price,
            "quantity": data.quantity,
            "revenue": revenue,
            "date": datetime.datetime.now().isoformat()
        }
        supabase.table("sales_data").insert(sale_payload).execute()
        
        return {"message": f"Sale logged! Deducted {data.quantity} units.", "revenue": revenue}
    except HTTPException:
        raise
    except Exception as e:
         db.rollback()
         raise HTTPException(status_code=500, detail=str(e))

@router.get("/inventory/list/{user_id}")
def get_inventory_list(user_id: str, db: Session = Depends(get_db)):
    try:
        products = db.query(Product).filter(Product.user_id == user_id).all()
        mapped = []
        now_dt = datetime.datetime.now(datetime.timezone.utc)
        
        for p in products:
            days_inactive = 0
            wac = p.price
            
            all_logs = db.query(InventoryLog).filter(InventoryLog.barcode == p.sku, InventoryLog.user_id == user_id).all()
            if all_logs:
                total_cost = sum(log.cost_price * log.quantity_added for log in all_logs)
                total_qty = sum(log.quantity_added for log in all_logs)
                if total_qty > 0:
                    wac = total_cost / total_qty
                    
                latest_log = max(all_logs, key=lambda l: l.date_added)
                if latest_log.date_added:
                    log_date = latest_log.date_added
                    if log_date.tzinfo is None:
                        log_date = log_date.replace(tzinfo=datetime.timezone.utc)
                    days_inactive = (now_dt - log_date).days

            mapped.append({
                "name": p.name,
                "category": p.category,
                "price": p.price,
                "avg_cost": round(wac, 2),
                "stock_quantity": p.quantity,
                "sku": p.sku,
                "reorder_level": p.reorder_level if hasattr(p, 'reorder_level') and p.reorder_level is not None else 5,
                "days_inactive": days_inactive
            })
        return mapped
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
