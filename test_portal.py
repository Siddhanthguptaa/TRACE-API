import asyncio
import httpx

async def test_portal():
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        print("Registering...")
        res = await client.post("/portal/register", json={"email": "test@trace.dev", "password": "password"})
        if res.status_code == 400:
            print("Already registered, logging in...")
            res = await client.post("/portal/login", json={"email": "test@trace.dev", "password": "password"})
            
        print(res.json())
        token = res.json()["access_token"]
        
        print("Generating Key...")
        res = await client.post("/portal/keys", headers={"Authorization": f"Bearer {token}"})
        print(res.json())
        api_key = res.json()["key"]
        
        print("Checking Dashboard...")
        res = await client.get("/portal/me", headers={"Authorization": f"Bearer {token}"})
        print(res.json())
        
        print("Scoring with 0 balance (should fail)...")
        res = await client.post("/v1/score", headers={"Authorization": f"Bearer {api_key}"}, json={
            "provider_id": "0x123",
            "job": {"capability": "summarize", "price_usdc": 0.05}
        })
        print(f"Score status: {res.status_code} - {res.text}")

if __name__ == "__main__":
    asyncio.run(test_portal())
