import os
import sys
from sqlalchemy import create_engine, func
from sqlalchemy.orm import Session

# Add backend to path
sys.path.append(os.getcwd())
from database import Base, SessionLocal
from models.product import Product

def cleanup():
    db = SessionLocal()
    try:
        # Get all users who have products
        user_ids_query = db.query(Product.user_id).distinct().all()
        user_ids = [r[0] for r in user_ids_query]
        
        for u_id in user_ids:
            if not u_id: continue
            print(f"Cleaning duplicates for user: {u_id}")
            
            # Find all product names for this user that have more than 1 entry (case-insensitive)
            # Actually, let's just use exact match for internal cleanup
            duplicates = db.query(Product.name).filter(Product.user_id == u_id).group_by(Product.name).having(func.count(Product.id) > 1).all()
            
            for (p_name,) in duplicates:
                if not p_name: continue
                print(f"  Merging duplicates for: '{p_name}'")
                
                # Get all records for this name
                records = db.query(Product).filter(Product.name == p_name, Product.user_id == u_id).order_by(Product.created_at.asc()).all()
                
                # Keep the first, merge others
                main_record = records[0]
                other_records = records[1:]
                
                total_qty = main_record.quantity or 0
                for r in other_records:
                    total_qty += (r.quantity or 0)
                    db.delete(r)
                
                main_record.quantity = total_qty
                print(f"    Merged {len(other_records) + 1} rows. New total quantity: {total_qty}")
        
        db.commit()
        print("Cleanup successful!")
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        print(f"Cleanup failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    cleanup()
