"""Example: x402 server with TRACE trust extension."""

import os
from x402.server import x402_server
from x402_trace_trust import TraceTrustExtension

# Create TRACE trust extension
trace_ext = TraceTrustExtension(
    api_key=os.getenv("TRACE_API_KEY", "your_api_key_here"),
    min_score=0.35,
    fail_closed=True,
)

# Create x402 server with TRACE extension
app = x402_server(
    # Your facilitator config
    facilitator_url="https://x402.org/facilitator",
    # Add TRACE trust extension
    extensions=[trace_ext],
    # Protected routes
    protected_routes={
        "/agent/*": {
            "accepts": ["usdc"],
            "price": "0.01",
            "capability": "general",
        }
    },
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)