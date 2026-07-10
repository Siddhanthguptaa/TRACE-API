"""
Debug: Trace exactly what happens when the deployed API tries to verify a Supabase JWT.
We simulate the same flow as api/auth.py:get_current_developer()
"""
import jwt
from jwt import PyJWKClient
import base64
import json
import sys
import os

# Same config as the deployed app
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
if not SUPABASE_JWT_SECRET:
    raise ValueError("SUPABASE_JWT_SECRET environment variable is required")

SUPABASE_URL = os.getenv("SUPABASE_URL")
if not SUPABASE_URL:
    raise ValueError("SUPABASE_URL environment variable is required")
JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"

# 1. Fetch JWKS to see what algorithms Supabase uses
print("=" * 60)
print("1. JWKS Endpoint Check")
print("=" * 60)
import urllib.request
with urllib.request.urlopen(JWKS_URL, timeout=10) as resp:
    jwks_data = json.loads(resp.read().decode())
    print(f"JWKS URL: {JWKS_URL}")
    print(f"Keys found: {len(jwks_data.get('keys', []))}")
    for k in jwks_data.get("keys", []):
        print(f"  - kid={k.get('kid')}, alg={k.get('alg')}, kty={k.get('kty')}, use={k.get('use')}")

# 2. Check if we have a real token to test with
# We'll create a fake HS256 token that matches what Supabase would issue
print("\n" + "=" * 60)
print("2. HS256 Token Decode Test (simulates real Supabase JWT)")
print("=" * 60)

# Create a token exactly as Supabase HS256 would
test_payload = {
    "aud": "authenticated",
    "exp": 9999999999,
    "sub": "test-user-123",
    "email": "test@example.com",
    "role": "authenticated",
    "iss": f"{SUPABASE_URL}/auth/v1",
}

test_token = jwt.encode(test_payload, SUPABASE_JWT_SECRET, algorithm="HS256")
print(f"Generated token header: {json.loads(base64.b64decode(test_token.split('.')[0] + '=='))}")

# Now simulate what auth.py does:
header = jwt.get_unverified_header(test_token)
alg = header.get("alg", "HS256")
print(f"Detected algorithm: {alg}")

if alg != "HS256":
    print("-> Would use JWKS verification")
    jwks_client = PyJWKClient(JWKS_URL, cache_keys=True, lifespan=3600)
    signing_key = jwks_client.get_signing_key_from_jwt(test_token)
    decoded = jwt.decode(test_token, signing_key.key, algorithms=[alg], audience="authenticated")
else:
    print("-> Using HS256 secret verification")
    decoded = jwt.decode(test_token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")

print(f"Decoded payload: {json.dumps(decoded, indent=2)}")
print(f"sub: {decoded.get('sub')}")
print(f"email: {decoded.get('email')}")

# 3. Now test what happens when Supabase uses ES256 (which the JWKS shows)
print("\n" + "=" * 60)
print("3. Supabase JWKS Algorithm Check")  
print("=" * 60)
print(f"Supabase JWKS shows ES256 keys.")
print(f"But Supabase project JWTs typically use HS256 with the JWT secret.")
print(f"If user's Supabase project was recently migrated, it may issue ES256 tokens.")
print()

# Check if the JWT secret is base64-encoded (some Supabase projects use base64)
try:
    decoded_secret = base64.b64decode(SUPABASE_JWT_SECRET)
    print(f"JWT secret is valid base64, decoded length: {len(decoded_secret)} bytes")
    # Try decoding with the raw bytes
    try:
        decoded2 = jwt.decode(test_token, decoded_secret, algorithms=["HS256"], audience="authenticated")
        print(f"[OK] Also works with base64-decoded secret")
    except Exception as e:
        print(f"[FAIL] Does NOT work with base64-decoded secret: {e}")
except Exception:
    print(f"JWT secret is NOT base64-encoded")

print("\n" + "=" * 60)
print("4. Test against live deployed API")
print("=" * 60)

# Hit the deployed API with our test HS256 token
from urllib.error import HTTPError
api_url = "https://trace-api-ixv6o.ondigitalocean.app/api/portal/me"
req = urllib.request.Request(api_url, headers={"Authorization": f"Bearer {test_token}"})
try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        print(f"Status: {resp.status}")
        body = json.loads(resp.read().decode())
        print(f"Response: {json.dumps(body, indent=2)}")
except HTTPError as e:
    print(f"HTTP Error: {e.code}")
    body = e.read().decode()
    print(f"Response body: {body}")
except Exception as e:
    print(f"Error: {e}")
