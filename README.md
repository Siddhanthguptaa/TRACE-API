# TRACE API

> Graph-aware trust scoring for A2A agent marketplaces.

TRACE is a middleware API that any A2A/x402 agent marketplace drops in front of their routing layer to get adversarial-resistant trust scores per agent. Think Stripe Radar, but for autonomous agent fraud.

## Key Results (from the paper)

| Metric | Value |
|--------|-------|
| EigenTrust malicious routing rate | **81.7%** (routes 4 in 5 jobs to Sybils) |
| TRACE fraud reduction vs behavioral | **86%** on collusion ring attacks |
| TRACE collusion fraud at N=5000 | **14× lower** than EigenTrust |

## Quick Start

```bash
# Start API + Demo
docker-compose up -d

# API at http://localhost:8000
# Demo at http://localhost:3000
# API docs at http://localhost:8000/docs
```

## Score a Provider

```bash
curl -X POST http://localhost:8000/v1/score \
  -H "Content-Type: application/json" \
  -d '{
    "provider_id": "0xtest",
    "job": {"capability": "summarize", "price_usdc": 0.05}
  }'
```

Response:
```json
{
  "provider_id": "0xtest",
  "score": 0.71,
  "routing_decision": "ROUTE",
  "components": {
    "lcb": 0.842,
    "default_risk": 0.0,
    "cost_norm": 0.0,
    "trust_net": 0.31,
    "cap_match": 0.0,
    "sybil_risk": 0.047,
    "clique_penalty": 0.0
  },
  "flags": [],
  "explanation": "High LCB (0.84) from strong completion history. Moderate trust network proximity.",
  "latency_ms": 4.2,
  "version": "1.0.0"
}
```

## Run a Benchmark

```bash
curl -X POST http://localhost:8000/v1/benchmark \
  -H "Content-Type: application/json" \
  -d '{"scenario": "collusion_ring", "n_agents": 100, "adversary_ratio": 0.30}'
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/score` | Score a single provider |
| `POST` | `/v1/score/batch` | Score up to 100 providers (returns sorted) |
| `POST` | `/v1/events` | Report a completed job to update the global trust graph |
| `POST` | `/v1/benchmark` | Run attack simulation comparison |
| `GET` | `/health` | Health check |
| `GET` | `/docs` | Interactive API documentation (Swagger) |

## The TRACE Score

```
u = α·s_trace − β·d_risk − γ·c_norm + δ·t_net + ε·m_cap − λ·p_sybil − μ·p_clique

weights: (α, β, γ, δ, ε, λ, μ) = (0.40, 0.30, 0.15, 0.10, 0.10, 0.35, 0.25)
```

| Component | Signal | Source |
|-----------|--------|--------|
| `s_trace` (LCB) | Bayesian lower confidence bound on completion rate | Beta(1,3) prior, 95% LCB |
| `d_risk` | Default risk with CUSUM change-point detection | EMA + Page's CUSUM |
| `c_norm` | Price anomaly relative to cohort | Penalizes >2× or <0.3× median |
| `t_net` | Trust network proximity to honest seeds | Personalized PageRank |
| `m_cap` | Capability match | Metadata check |
| `p_sybil` | Sybil risk | Edge-to-job ratio |
| `p_clique` | Collusion ring penalty | Clustering coefficient + contamination |

## Why Not Thompson Sampling?

The paper proves (Section 4.2) that Thompson sampling is net-negative under adversarial load on sparse graphs — 56–86% higher fraud. TRACE always uses **greedy argmax** selection, not Thompson sampling.

## SDK / Middleware

Drop-in x402 trust gating for Python and TypeScript:

```python
from sdk.x402_middleware import TRACEMiddleware

trace = TRACEMiddleware(api_key="sk_trace_...")

@app.post("/agent/summarize")
async def handle(request: Request):
    wallet = request.headers.get("X-Payment-Sender")
    await trace.check(wallet, "summarize", 0.05)  # raises 402 if untrusted
    # proceed ...
```

See [`sdk/README.md`](sdk/README.md) for full documentation.

## Architecture

- **Stateful Trust Ledger**: maintains a global, in-memory trust graph (`nx.DiGraph`) built dynamically from `/v1/events`
- **No LLM calls**: explanations are programmatic, p99 latency < 50ms
- **Centralized Oracle**: acts as the single source of truth for agent reputation across protocols
- **Payment rail**: x402 + USDC on Base

## Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run API locally
uvicorn api.main:app --reload

# Run tests
pytest tests/ -v

# Generate demo data
python scripts/generate_demo_data.py
```


## Used By

*Design partners — coming soon.*

---

Built for agent marketplaces that refuse to be farmed.
