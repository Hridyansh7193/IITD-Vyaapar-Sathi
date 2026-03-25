import sys, os
# Add backend to path
sys.path.append(os.path.dirname(__file__))

from config import supabase
from analytics import compute_analytics

def test_sb():
    print(f"URL: {supabase.supabase_url}")
    try:
        res = supabase.table("sales_data").select("*").limit(1).execute()
        print(f"Data: {res.data}")
    except Exception as e:
        print(f"Supabase Error: {e}")

if __name__ == "__main__":
    test_sb()
