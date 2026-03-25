from supabase import create_client, Client
import traceback

url = "https://qhubykgnavfpyyrlazud.supabase.co"
real_key = "sb_publishable_EI6cPw0IoSqf9fTUzziTww_-Y0ft7-8"
fake_jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.signature"

try:
    client = create_client(url, fake_jwt)
    # The client uses postgrest for DB calls, we override exactly what we need
    client.postgrest.session.headers.update({"apikey": real_key, "Authorization": f"Bearer {real_key}"})
    
    res = client.table("sales_data").select("*").limit(1).execute()
    print("SUCCESS DATA:", res.data)
except Exception as e:
    traceback.print_exc()
