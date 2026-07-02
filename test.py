import asyncio
import httpx
import random

TRACE_URL = "http://localhost:8000/v1/score"

async def stress_test():
    limits = httpx.Limits(max_connections=1000, max_keepalive_connections=100)
    async with httpx.AsyncClient(limits=limits, timeout=15.0) as client:
        tasks = []
        for _ in range(500):  # Fire 500 concurrent requests
            wallet = f"0x{random.randint(1000, 9999)}...abcd"
            payload = {
                "provider_id": wallet,
                "job": {"capability": "summarize", "price_usdc": 0.05}
            }
            # Add to asyncio task list
            tasks.append(client.post(TRACE_URL, json=payload))
        
        print("Firing 500 requests to TRACE...")
        responses = await asyncio.gather(*tasks)
        
        successes = sum(1 for r in responses if r.status_code == 200)
        print(f"Test complete! {successes}/500 requests succeeded.")

if __name__ == "__main__":
    asyncio.run(stress_test())
