"""
TRACE API — Python x402 middleware

Drop-in for any FastAPI or Flask x402 server.
Checks agent trust score before processing payment.
"""

import httpx
from fastapi import Request, HTTPException

TRACE_API_URL = "https://api.trace.dev"  # or self-hosted


class TRACEMiddleware:
    """
    x402-compatible trust gate for AI agent marketplaces.

    Usage:
        trace = TRACEMiddleware(api_key="sk_trace_...")

        @app.post("/your-agent-endpoint")
        async def handle_job(request: Request):
            agent_wallet = request.headers.get("X-Payment-Sender")
            score = await trace.check(agent_wallet, "summarize", 0.05)
            # proceed with job ...
    """

    def __init__(
        self,
        api_key: str,
        min_score: float = 0.35,
        api_url: str = TRACE_API_URL,
    ):
        self.api_key = api_key
        self.min_score = min_score
        self.api_url = api_url

    async def check(
        self,
        agent_wallet: str,
        job_capability: str,
        price_usdc: float,
    ) -> dict:
        """
        Call before processing x402 payment.
        Returns score dict or raises HTTPException(402) if agent is untrusted.
        """
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.api_url}/v1/score",
                json={
                    "provider_id": agent_wallet,
                    "job": {
                        "capability": job_capability,
                        "price_usdc": price_usdc,
                    },
                },
                headers={"X-API-Key": self.api_key},
                timeout=5.0,
            )

        result = resp.json()

        if result["routing_decision"] in ("HOLD", "INVESTIGATE"):
            raise HTTPException(
                status_code=402,
                detail={
                    "error": "agent_untrusted",
                    "score": result["score"],
                    "flags": result["flags"],
                    "message": (
                        f"Agent trust score {result['score']:.2f} "
                        f"below threshold {self.min_score}"
                    ),
                },
            )

        return result

    async def report_event(
        self,
        agent_wallet: str,
        success: bool,
        buyer_wallet: str = None,
        job_capability: str = None,
        price_usdc: float = None,
    ):
        """
        Report the outcome of a job back to TRACE to update the agent's trust score.
        """
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{self.api_url}/v1/events",
                json={
                    "provider_id": agent_wallet,
                    "buyer_id": buyer_wallet,
                    "success": success,
                    "capability": job_capability,
                    "price_usdc": price_usdc,
                },
                headers={"X-API-Key": self.api_key},
                timeout=5.0,
            )
