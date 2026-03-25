import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

print(f"URL: {url}")
print(f"Key: {key[:10]}...")

try:
    supabase = create_client(url, key)
    res = supabase.table("sales_data").select("*").limit(1).execute()
    print("Success!")
    print(res)
except Exception as e:
    print(f"Failed standard init: {e}")
    # Try the hack
    try:
        fake_jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.signature"
        supabase = create_client(url, fake_jwt)
        supabase.postgrest.session.headers.update({"apikey": key, "Authorization": f"Bearer {key}"})
        res = supabase.table("sales_data").select("*").limit(1).execute()
        print("Success with hack!")
        print(res)
    except Exception as e2:
        print(f"Failed with hack: {e2}")
