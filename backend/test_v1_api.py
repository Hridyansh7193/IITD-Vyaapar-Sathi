import requests
import json
import time
import os

BASE_URL = "http://localhost:8000"
API_V1 = f"{BASE_URL}/api/v1"

def test_health():
    print("Testing /api/v1/health...")
    resp = requests.get(f"{API_V1}/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    print(f"Health Response: {data['data']}")

def test_auth_cycle():
    print("Testing Auth Cycle (Signup -> Login -> Me)...")
    email = f"test_{int(time.time())}@shop.com"
    payload = {
        "email": email,
        "password": "testpassword123",
        "name": "Test Runner"
    }
    
    # 1. Signup
    signup_resp = requests.post(f"{API_V1}/auth/signup", json=payload)
    assert signup_resp.status_code == 200
    signup_data = signup_resp.json()
    assert signup_data["success"] is True
    print("Signup Success")

    # 2. Login
    login_resp = requests.post(f"{API_V1}/auth/login", json={
        "email": email,
        "password": "testpassword123"
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["data"]["access_token"]
    user_id = login_resp.json()["data"]["user"]["id"]
    print(f"Login Success. User ID: {user_id}")

    # 3. Protected /me route
    headers = {"Authorization": f"Bearer {token}"}
    me_resp = requests.get(f"{API_V1}/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["data"]["email"] == email
    print("Protected /me route working.")
    return token, user_id

def test_csv_upload(token):
    print("Testing CSV Upload (v1/upload/csv)...")
    headers = {"Authorization": f"Bearer {token}"}
    files = {'file': ('test_sales.csv', open('test_sales.csv', 'rb'), 'text/csv')}
    
    resp = requests.post(f"{API_V1}/upload/csv", headers=headers, files=files)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "stats" in data["data"]
    print(f"CSV Upload Success. Rows processed: {data['data']['metadata']['rows_processed']}")

def test_legacy_endpoints(user_id):
    print("Testing Legacy /analytics endpoint...")
    # This endpoint doesn't use JWT, uses user_id query param
    resp = requests.get(f"{BASE_URL}/analytics", params={"user_id": user_id})
    assert resp.status_code == 200
    assert "stats" in resp.json()
    print("Legacy Analytics endpoint working.")

def main():
    try:
        test_health()
        token, user_id = test_auth_cycle()
        test_csv_upload(token)
        test_legacy_endpoints(user_id)
        print("\n✅ PRODUCTION ARCHITECTURE VERIFIED & PASSING")
    except Exception as e:
        print(f"\n❌ VERIFICATION FAILED: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
