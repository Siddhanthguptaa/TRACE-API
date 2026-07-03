"""
TRACE API — Rate Limiting

Protects against:
- Login brute-force (10/min)
- Event spam / trust graph poisoning (120/min)
- Benchmark CPU DoS (5/min)
- General API abuse (60/min default)
"""

import os
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse


limiter = Limiter(key_func=get_remote_address)


# Rate limit strings — override via environment
RATE_LIMIT_DEFAULT = os.getenv("RATE_LIMIT_DEFAULT", "60/minute")
RATE_LIMIT_AUTH = os.getenv("RATE_LIMIT_AUTH", "10/minute")
RATE_LIMIT_EVENTS = os.getenv("RATE_LIMIT_EVENTS", "120/minute")
RATE_LIMIT_BENCHMARK = os.getenv("RATE_LIMIT_BENCHMARK", "5/minute")


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "detail": f"Rate limit exceeded: {exc.detail}",
            "retry_after": str(exc.detail),
        },
    )
