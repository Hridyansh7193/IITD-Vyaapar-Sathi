import os
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase = create_client(url, key)

try:
    res = supabase.table("sales_data").select("*", count="exact").limit(5).execute()
    print(f"Total rows in DB: {getattr(res, 'count', len(res.data))}")
    if res.data:
        print("Sample data:")
        df = pd.DataFrame(res.data)
        print(df.head())
    else:
        print("DB is empty.")
except Exception as e:
    print(f"Error: {e}")
