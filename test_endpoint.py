import urllib.request
from urllib.error import HTTPError, URLError

url = "https://trace-api-ixv6o.ondigitalocean.app/api/portal/me"
print(f"Testing {url}")
req = urllib.request.Request(url, method="GET")
try:
    with urllib.request.urlopen(req, timeout=10) as response:
        print("Status:", response.status)
        print("Body:", response.read().decode())
except HTTPError as e:
    print("HTTPError Status:", e.code)
    print("HTTPError Body:", e.read().decode())
except URLError as e:
    print("URLError:", e.reason)
except Exception as e:
    print("Error:", e)
