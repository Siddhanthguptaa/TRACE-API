import pytest
import httpx
from api.main import app


# httpx 0.28+ requires ASGITransport + AsyncClient
transport = httpx.ASGITransport(app=app)


@pytest.fixture
def client():
    """Provide an async client for testing."""
    return httpx.AsyncClient(transport=transport, base_url="http://test")


@pytest.mark.anyio
async def test_health(client):
    async with client:
        response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["version"] == "1.0.0"


@pytest.mark.anyio
async def test_score_endpoint(client):
    payload = {
        "provider_id": "0xtest",
        "job": {"capability": "summarize", "price_usdc": 0.05},
        "cohort_median_price": 0.04,
    }
    async with client:
        response = await client.post("/v1/score", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["provider_id"] == "0xtest"
    assert data["score"] > 0.0
    assert data["routing_decision"] in ("ROUTE", "ROUTE_WITH_CAUTION", "HOLD", "INVESTIGATE")
    assert "components" in data
    assert "explanation" in data
    assert "latency_ms" in data


def test_score_cold_start():
    """Sync wrapper for cold start test since anyio may not be installed."""
    import asyncio

    async def _test():
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            payload = {
                "provider_id": "0xcold",
                "job": {"capability": "summarize", "price_usdc": 0.05},
                "cohort_median_price": 0.04,
            }
            response = await c.post("/v1/score", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["score"] < 0.25
        assert "COLD_START" in data["flags"]

    asyncio.run(_test())


def test_batch_endpoint():
    import asyncio

    async def _test():
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            payload = {
                "providers": [
                    {
                        "provider_id": "0xgood",
                        "job": {"capability": "summarize", "price_usdc": 0.05},
                        "cohort_median_price": 0.04,
                    },
                    {
                        "provider_id": "0xcold",
                        "job": {"capability": "summarize", "price_usdc": 0.05},
                        "cohort_median_price": 0.04,
                    },
                ]
            }
            response = await c.post("/v1/score/batch", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2
        # Should be sorted by score descending
        assert data[0]["score"] >= data[1]["score"]

    asyncio.run(_test())


def test_benchmark_endpoint():
    import asyncio

    async def _test():
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            payload = {
                "scenario": "collusion_ring",
                "n_agents": 50,
                "adversary_ratio": 0.30,
                "n_rounds": 30,
                "n_jobs_per_round": 3,
                "seed": 42,
            }
            response = await c.post("/v1/benchmark", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["scenario"] == "collusion_ring"
        assert "trace_no_bandit" in data["results"]
        assert "behavioral_only" in data["results"]
        assert "eigentrust" in data["results"]
        assert "fraud_reduction_vs_behavioral" in data
        assert "fraud_reduction_vs_eigentrust" in data

    asyncio.run(_test())


def test_full_flow():
    import asyncio

    async def _test():
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            # Health
            r1 = await c.get("/health")
            assert r1.status_code == 200

            # Score single
            score_payload = {
                "provider_id": "0xtest",
                "job": {"capability": "summarize", "price_usdc": 0.05},
                "cohort_median_price": 0.04,
            }
            r2 = await c.post("/v1/score", json=score_payload)
            assert r2.status_code == 200

            # Batch
            batch_payload = {"providers": [score_payload]}
            r3 = await c.post("/v1/score/batch", json=batch_payload)
            assert r3.status_code == 200

            # Benchmark
            benchmark_payload = {
                "scenario": "strategic_default",
                "n_agents": 50,
                "adversary_ratio": 0.30,
                "n_rounds": 20,
                "n_jobs_per_round": 3,
                "seed": 42,
            }
            r4 = await c.post("/v1/benchmark", json=benchmark_payload)
            assert r4.status_code == 200

    asyncio.run(_test())
