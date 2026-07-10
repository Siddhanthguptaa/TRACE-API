import jwt
import urllib.request
import json
import os
from urllib.error import HTTPError

secret = os.getenv("SUPABASE_JWT_SECRET")
if not secret:
    raise ValueError("SUPABASE_JWT_SECRET environment variable is required")
payload = {
    "sub": "test-user-id",
    "email": "test@example.com",
    "aud": "authenticated",
    "role": "authenticated"
}
token = jwt.encode(payload, secret, algorithm="HS256")
url = "https://trace-api-ixv6o.ondigitalocean.app/api/portal/me"
req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})

try:
    with urllib.request.urlopen(req) as res:
        print("SUCCESS:", res.status)
        print(res.read().decode())
except HTTPError as e:
    print("FAIL:", e.code)
    print(e.read().decode())
