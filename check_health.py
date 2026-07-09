import urllib.request
import json

url = "https://trace-api-ixv6o.ondigitalocean.app/api/health"
try:
    with urllib.request.urlopen(url, timeout=15) as resp:
        body = json.loads(resp.read().decode())
        print(json.dumps(body, indent=2))
except Exception as e:
    print(f"Error: {e}")
