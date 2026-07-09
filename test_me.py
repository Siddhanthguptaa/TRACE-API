import asyncio
import jwt
import time
from httpx import AsyncClient
import os
from dotenv import load_dotenv

load_dotenv()
SECRET = os.getenv("SUPABASE_JWT_SECRET")

# Create a mock JWT for teamtraceai@gmail.com
payload = {
    "sub": "4c9fb116-0a27-4091-bcaa-6003e3d03d7a",
    "email": "teamtraceai@gmail.com",
    "aud": "authenticated",
    "role": "authenticated",
    "iat": int(time.time()),
    "exp": int(time.time()) + 3600
}

token = jwt.encode(payload, SECRET, algorithm="HS256")

async def test_api():
    async with AsyncClient() as client:
        print("Sending request to http://localhost:8000/portal/me")
        response = await client.get(
            "http://localhost:8000/portal/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        print("Status:", response.status_code)
        print("Body:", response.text)

if __name__ == "__main__":
    asyncio.run(test_api())
