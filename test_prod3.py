import jwt
import urllib.request
import json
from urllib.error import HTTPError

secret = "ZiGJf6iJ0Rh0xQMFCRiurlve/X4LrehwDDl+RRX+iZaCqCm1082ovWe2w6Gt0PwOj1Duj5k6McNO17WIAHZQPA=="
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
