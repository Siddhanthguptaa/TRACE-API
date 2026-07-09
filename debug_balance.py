"""
Debug: Check if the deployed API returns the correct balance.
1. Query the DB directly to confirm balance
2. Hit the live API with a valid JWT to see what it returns
"""
import asyncio
import asyncpg
import jwt
import json
import urllib.request
from urllib.error import HTTPError

DATABASE_URL = "postgresql://postgres.uvdtorvdcphslzgraktm:Nikunj%401315@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"
SUPABASE_JWT_SECRET = "ZiGJf6iJ0Rh0xQMFCRiurlve/X4LrehwDDl+RRX+iZaCqCm1082ovWe2w6Gt0PwOj1Duj5k6McNO17WIAHZQPA=="

async def main():
    conn = await asyncpg.connect(DATABASE_URL)
    
    print("=" * 60)
    print("1. Current developer records in DB")
    print("=" * 60)
    devs = await conn.fetch("SELECT id, email, balance_usdc FROM developers ORDER BY email")
    for d in devs:
        print(f"  id={d['id']}, email={d['email']}, balance={d['balance_usdc']}")
    
    # Find the real user
    nikunj = None
    for d in devs:
        if d['email'] == 'nikunjkaushik28@gmail.com':
            nikunj = d
            break
    
    if nikunj:
        print(f"\nTarget user: id={nikunj['id']}, balance={nikunj['balance_usdc']}")
        
        # Create a JWT that matches this user
        token = jwt.encode({
            "aud": "authenticated",
            "exp": 9999999999,
            "sub": str(nikunj['id']),
            "email": nikunj['email'],
            "role": "authenticated",
        }, SUPABASE_JWT_SECRET, algorithm="HS256")
        
        print("\n" + "=" * 60)
        print("2. Hitting deployed API with JWT for this user")
        print("=" * 60)
        
        api_url = "https://trace-api-ixv6o.ondigitalocean.app/api/portal/me"
        req = urllib.request.Request(api_url, headers={"Authorization": f"Bearer {token}"})
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                body = json.loads(resp.read().decode())
                print(f"Status: {resp.status}")
                print(f"Response: {json.dumps(body, indent=2)}")
                print(f"\nAPI email: {body.get('email')}")
                print(f"API balance: {body.get('balance_usdc')}")
                print(f"DB  balance: {nikunj['balance_usdc']}")
                if body.get('balance_usdc') != nikunj['balance_usdc']:
                    print("\n*** MISMATCH! API returns different balance than DB! ***")
                else:
                    print("\nBalances match.")
        except HTTPError as e:
            print(f"HTTP Error: {e.code}")
            print(f"Body: {e.read().decode()}")
    
    await conn.close()

asyncio.run(main())
