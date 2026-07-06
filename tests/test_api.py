import pytest
import httpx
import asyncio
import uuid
from api.main import app
from api.database import init_db, AsyncSessionLocal, Developer, APIKey
from api.auth import generate_api_key, hash_api_key


# httpx 0.28+ requires ASGITransport + AsyncClient
transport = httpx.ASGITransport(app=app)


async def _setup_test_developer():
    """Create a test developer with an API key and funded balance for integration tests."""
    await init_db()
    async with AsyncSessionLocal() as session:
        from sqlalchemy.future import select

        test_id = "test-dev-uuid-001"

        # Check if test dev already exists
        result = await session.execute(select(Developer).filter(Developer.id == test_id))
        dev = result.scalars().first()
        
        if not dev:
            dev = Developer(
                id=test_id,
                email="test@trace.dev",
                balance_usdc=100.0,  # Enough for many test calls
            )
            session.add(dev)
            await session.commit()
            await session.refresh(dev)
        else:
            # Reset balance for each test run
            dev.balance_usdc = 100.0
            await session.commit()

        # Create API key
        raw_key, hashed_key = generate_api_key()
        api_key = APIKey(
            developer_id=dev.id,
            key_prefix=raw_key[:12] + "...",
            hashed_key=hashed_key,
        )
        session.add(api_key)
        await session.commit()

    return raw_key


@pytest.fixture
def client():
    """Provide an async client for testing."""
    return httpx.AsyncClient(transport=transport, base_url="http://test")


@pytest.fixture
async def api_key():
    """Create a test developer with a funded API key."""
    return await _setup_test_developer()


def _auth_headers(api_key: str) -> dict:
    """Build auth headers with an API key."""
    return {"Authorization": f"Bearer {api_key}"}


@pytest.mark.anyio
async def test_health(client):
    async with client:
        response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["version"] == "1.0.0"
    assert "database" in data
    assert "trust_graph" in data


@pytest.mark.anyio
async def test_score_requires_auth(client):
    """Score endpoint should reject unauthenticated requests."""
    payload = {
        "provider_id": "0xtest",
        "job": {"capability": "summarize", "price_usdc": 0.05},
    }
    async with client:
        response = await client.post("/v1/score", json=payload)
    assert response.status_code == 401


@pytest.mark.anyio
async def test_score_endpoint(api_key):
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        payload = {
            "provider_id": "0xtest",
            "job": {"capability": "summarize", "price_usdc": 0.05},
            "cohort_median_price": 0.04,
        }
        response = await c.post("/v1/score", json=payload, headers=_auth_headers(api_key))
    assert response.status_code == 200
    data = response.json()
    assert data["provider_id"] == "0xtest"
    assert data["score"] >= 0.0
    assert data["routing_decision"] in ("ROUTE", "ROUTE_WITH_CAUTION", "HOLD", "INVESTIGATE", "REFER", "QUARANTINE", "DENY")
    assert "components" in data
    assert "explanation" in data
    assert "latency_ms" in data


@pytest.mark.anyio
async def test_score_cold_start(api_key):
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        payload = {
            "provider_id": "0xcold_auth",
            "job": {"capability": "summarize", "price_usdc": 0.05},
            "cohort_median_price": 0.04,
        }
        response = await c.post("/v1/score", json=payload, headers=_auth_headers(api_key))
    assert response.status_code == 200
    data = response.json()
    assert data["score"] < 0.25
    assert "COLD_START" in data["flags"]


@pytest.mark.anyio
async def test_batch_endpoint(api_key):
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        payload = {
            "providers": [
                {
                    "provider_id": "0xgood",
                    "job": {"capability": "summarize", "price_usdc": 0.05},
                    "cohort_median_price": 0.04,
                },
                {
                    "provider_id": "0xcold_batch",
                    "job": {"capability": "summarize", "price_usdc": 0.05},
                    "cohort_median_price": 0.04,
                },
            ]
        }
        response = await c.post("/v1/score/batch", json=payload, headers=_auth_headers(api_key))
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2
    # Should be sorted by score descending
    assert data[0]["score"] >= data[1]["score"]


@pytest.mark.anyio
async def test_benchmark_endpoint(api_key):
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        payload = {
            "scenario": "collusion_ring",
            "n_agents": 50,
            "adversary_ratio": 0.30,
            "n_rounds": 30,
            "n_jobs_per_round": 3,
            "seed": 42,
        }
        response = await c.post("/v1/benchmark", json=payload, headers=_auth_headers(api_key))
    assert response.status_code == 200
    data = response.json()
    assert data["scenario"] == "collusion_ring"
    assert "trace_no_bandit" in data["results"]
    assert "behavioral_only" in data["results"]
    assert "eigentrust" in data["results"]
    assert "fraud_reduction_vs_behavioral" in data
    assert "fraud_reduction_vs_eigentrust" in data


@pytest.mark.anyio
async def test_events_endpoint(api_key):
    """Test event reporting with authentication."""
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        payload = {
            "provider_id": "0xevent_test",
            "buyer_id": "test-dev-uuid-001",
            "job_id": f"job_event_{uuid.uuid4().hex[:8]}",
            "success": True,
            "capability": "summarize",
            "price_usdc": 0.05,
        }
        response = await c.post("/v1/events", json=payload, headers=_auth_headers(api_key))
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"


@pytest.mark.anyio
async def test_full_flow(api_key):
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        # Health
        r1 = await c.get("/health")
        assert r1.status_code == 200

        # Score single
        score_payload = {
            "provider_id": "0xflow_test",
            "job": {"capability": "summarize", "price_usdc": 0.05},
            "cohort_median_price": 0.04,
        }
        r2 = await c.post("/v1/score", json=score_payload, headers=_auth_headers(api_key))
        assert r2.status_code == 200

        # Batch
        batch_payload = {"providers": [score_payload]}
        r3 = await c.post("/v1/score/batch", json=batch_payload, headers=_auth_headers(api_key))
        assert r3.status_code == 200

        # Event
        event_payload = {
            "provider_id": "0xflow_test",
            "buyer_id": "test-dev-uuid-001",
            "job_id": f"job_flow_{uuid.uuid4().hex[:8]}",
            "success": True,
        }
        r4 = await c.post("/v1/events", json=event_payload, headers=_auth_headers(api_key))
        assert r4.status_code == 200
