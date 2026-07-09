import urllib.request
try:
    with urllib.request.urlopen("https://trace-api-ixv6o.ondigitalocean.app/api/v1/trust/.well-known/jwks.json") as response:
        print("Status:", response.status)
        print("Body:", response.read().decode())
except Exception as e:
    print("Error:", e)
