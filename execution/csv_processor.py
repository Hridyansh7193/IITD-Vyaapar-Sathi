"""
execution/csv_processor.py
===========================
Deterministic CSV processing script.
Reads a pandas DataFrame, cleans it, normalises column names,
stores rows in Supabase, and returns the analytics result.

This module is intentionally free of FastAPI/web concerns — 
it can be called from any context (routes, CLI, tests).
"""

import pandas as pd
import os
import sys

# Allow importing analytics_engine from the same directory
sys.path.insert(0, os.path.dirname(__file__))

import traceback
from analytics_engine import compute_analytics


def _get_supabase():
    """Lazily initializes Supabase client from env."""
    from dotenv import load_dotenv
    import os

    # Robust path search for .env from the execution/ perspective
    # 1. Current dir, 2. Parent dir (root), 3. root/backend/.env
    search_paths = [
        ".env",
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", ".env")),
    ]
    for path in search_paths:
        if os.path.exists(path):
            load_dotenv(path)
            break

    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_KEY", "")
    if not url or not key:
        raise RuntimeError(f"SUPABASE_URL and SUPABASE_KEY must be set in .env. Checked: {search_paths}")

    from supabase import create_client
    return create_client(url, key)


def _build_db_payload(df: pd.DataFrame, user_id: str) -> list[dict]:
    """
    Converts a normalized DataFrame into the list of dicts
    matching the `sales_data` Supabase table schema.
    """
    df.columns = (
        df.columns.str.strip().str.lower()
        .str.replace(" ", "_").str.replace(".", "")
    )

    payload = []
    for _, row in df.iterrows():
        def pick(cols, default=None):
            for c in cols:
                if c in df.columns and pd.notna(row.get(c)):
                    return row[c]
            return default

        price = float(pick(["price","unit_price","selling_price","sale_price","amount"], 0) or 0)
        qty   = int(pick(["quantity","qty","units","units_sold","quantity_sold"], 1) or 1)
        rev   = float(pick(["revenue","total","total_revenue","sales_amount","net_amount"], None) or price * qty)

        record = {
            "user_id": user_id,
            "product": str(pick(["product","product_name","item","item_name","product_id"], "Unknown")),
            "category": str(pick(["category","product_category","department","type"], "General")),
            "price": price,
            "quantity": qty,
            "revenue": rev,
        }

        date_val = pick(["date","order_date","sale_date","transaction_date"])
        if date_val:
            try:
                record["date"] = pd.to_datetime(date_val).isoformat()
            except Exception:
                pass

        payload.append(record)

    return payload


def process_and_store(df: pd.DataFrame, user_id: str) -> dict:
    try:
        # Step 1: Compute analytics
        analytics = compute_analytics(df)

        # Step 2–3: Persist to Supabase
        supabase = _get_supabase()
        supabase.table("sales_data").delete().eq("user_id", user_id).execute()

        payload = _build_db_payload(df, user_id)

        CHUNK = 500
        for i in range(0, len(payload), CHUNK):
            supabase.table("sales_data").insert(payload[i : i + CHUNK]).execute()

        return analytics
    except Exception as e:
        print("!!! CSV PROCESSOR ERROR !!!")
        traceback.print_exc()
        raise e


# ── CLI Usage ─────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    """
    Usage:
        python execution/csv_processor.py <path_to_csv> <user_id>
    Example:
        python execution/csv_processor.py sample.csv user-uuid-here
    """
    import json

    if len(sys.argv) < 3:
        print("Usage: python csv_processor.py <csv_path> <user_id>")
        sys.exit(1)

    csv_path, uid = sys.argv[1], sys.argv[2]
    frame = pd.read_csv(csv_path)
    result = process_and_store(frame, uid)
    print(json.dumps(result, indent=2, default=str))
