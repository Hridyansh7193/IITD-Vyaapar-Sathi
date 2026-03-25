import httpx
print(httpx.get("https://qhubykgnavfpyyrlazud.supabase.co/rest/v1/sales_data?select=*", headers={"apikey": "sb_publishable_EI6cPw0IoSqf9fTUzziTww_-Y0ft7-8", "Authorization": "Bearer sb_publishable_EI6cPw0IoSqf9fTUzziTww_-Y0ft7-8"}).text)
