"""
Query the production Supabase database to check developer records
and compare with Supabase auth users.
"""
import asyncio
import asyncpg
import json

DATABASE_URL = "postgresql://postgres.uvdtorvdcphslzgraktm:Nikunj%401315@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"

async def main():
    conn = await asyncpg.connect(DATABASE_URL)
    
    print("=" * 60)
    print("1. Supabase Auth Users (auth.users)")
    print("=" * 60)
    try:
        users = await conn.fetch("SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 10")
        for u in users:
            print(f"  id={u['id']}, email={u['email']}, created={u['created_at']}")
    except Exception as e:
        print(f"  Cannot access auth.users: {e}")
    
    print()
    print("=" * 60)
    print("2. Developers table (public.developers)")
    print("=" * 60)
    devs = await conn.fetch("SELECT id, email, balance_usdc FROM developers ORDER BY email")
    if devs:
        for d in devs:
            print(f"  id={d['id']}, email={d['email']}, balance={d['balance_usdc']}")
    else:
        print("  NO developer records found!")
    
    print()
    print("=" * 60)
    print("3. ID Matching Check")
    print("=" * 60)
    try:
        # Check if any developer IDs match auth user IDs
        matches = await conn.fetch("""
            SELECT d.id as dev_id, d.email as dev_email, d.balance_usdc,
                   u.id as auth_id, u.email as auth_email
            FROM developers d
            FULL OUTER JOIN auth.users u ON d.id::text = u.id::text
            ORDER BY d.email, u.email
        """)
        for m in matches:
            dev_id = str(m['dev_id'])[:8] if m['dev_id'] else 'NULL'
            auth_id = str(m['auth_id'])[:8] if m['auth_id'] else 'NULL'
            status = "MATCH" if m['dev_id'] and m['auth_id'] and str(m['dev_id']) == str(m['auth_id']) else "MISMATCH"
            print(f"  [{status}] dev_id={dev_id}... dev_email={m['dev_email']}, auth_id={auth_id}... auth_email={m['auth_email']}, balance={m['balance_usdc']}")
    except Exception as e:
        print(f"  Cannot perform join: {e}")
    
    await conn.close()

asyncio.run(main())
