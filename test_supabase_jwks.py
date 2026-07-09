import urllib.request
try:
    with urllib.request.urlopen("https://uvdtorvdcphslzgraktm.supabase.co/auth/v1/.well-known/jwks.json", timeout=10) as response:
        print("Status:", response.status)
        print("Body:", response.read().decode())
except Exception as e:
    print("Error:", e)
