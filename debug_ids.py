"""
Check what sub (user_id) is in the actual Supabase ES256 JWT vs the developer table.
We'll decode a real Supabase token WITHOUT verification to see its claims.
"""
import asyncio
import asyncpg
import jwt as pyjwt  # just decode without verify
import json
import urllib.request
import os

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

async def main():
    conn = await asyncpg.connect(DATABASE_URL)
    
    # Check auth.users to see what IDs Supabase assigns
    print("=" * 60)
    print("Supabase auth.users")
    print("=" * 60)
    users = await conn.fetch("SELECT id, email FROM auth.users ORDER BY email")
    for u in users:
        print(f"  auth.users id={u['id']}, email={u['email']}")
    
    print()
    print("=" * 60)
    print("developers table") 
    print("=" * 60)
    devs = await conn.fetch("SELECT id, email, balance_usdc FROM developers ORDER BY email")
    for d in devs:
        print(f"  developers id={d['id']}, email={d['email']}, balance={d['balance_usdc']}")
    
    print()
    print("=" * 60)
    print("Matching by email")
    print("=" * 60)
    for u in users:
        for d in devs:
            if u['email'] == d['email']:
                auth_id = str(u['id'])
                dev_id = str(d['id'])
                match = "MATCH" if auth_id == dev_id else "MISMATCH"
                print(f"  [{match}] {u['email']}: auth_id={auth_id}, dev_id={dev_id}, balance={d['balance_usdc']}")
    
    # Check if there are any new developer records (created by the auto-upsert)
    print()
    print("=" * 60)
    print("Total developer count and newest entries")
    print("=" * 60)
    count = await conn.fetchval("SELECT count(*) FROM developers")
    print(f"  Total developers: {count}")
    
    # Check if there are developers with UUID-style IDs that DON'T match auth.users
    auth_ids = {str(u['id']) for u in users}
    for d in devs:
        dev_id = str(d['id'])
        if len(dev_id) == 36 and '-' in dev_id:  # UUID format
            if dev_id not in auth_ids:
                print(f"  ORPHAN UUID developer: id={dev_id}, email={d['email']}, balance={d['balance_usdc']}")
    
    await conn.close()

asyncio.run(main())
