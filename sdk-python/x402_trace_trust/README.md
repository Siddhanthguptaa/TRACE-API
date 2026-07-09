# x402-trace-trust

TRACE trust scoring extension for [x402](https://github.com/x402-foundation/x402) payment middleware.

## Overview

This package provides a drop-in x402 extension that integrates with the [TRACE API](https://traceapi.dev) to evaluate agent trust scores before processing payments. Untrusted agents (score below threshold, active flags) are rejected with HTTP 402 before any payment is settled.

## Installation

```bash
pip install x402-trace-trust
```

## Quick Start

```python
from x402.extensions.trace_trust import TraceTrustExtension
from x402.server import x402_server

# Create the TRACE trust extension
trace_ext = TraceTrustExtension(
    api_key="sk_trace_...",      # Your TRACE API key
    min_score=0.35,              # Minimum trust score (0.0-1.0)
    fail_closed=True,            # Reject on API failure
)

# Add to your x402 server
app = x402_server(
    extensions=[trace_ext],
    # ... other x402 config
)
```

## How It Works

1. **Payment verified** → x402 calls `on_after_verify` hook
2. **TRACE API called** → `POST /v1/score` with payer's wallet address
3. **Decision made** → If `routing_decision` is `HOLD`/`INVESTIGATE` or score < `min_score` → HTTP 402
4. **Payment proceeds** → If `ROUTE` or `ROUTE_WITH_CAUTION`

## Routing Decisions

| Decision | Score Range | Action |
|----------|------------|--------|
| `ROUTE` | ≥ 0.65 | Process payment |
| `ROUTE_WITH_CAUTION` | 0.35 – 0.65 | Process with monitoring |
| `HOLD` | < 0.35 | Reject (402) |
| `INVESTIGATE` | Any + flags | Reject (402) |

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `api_key` | Required | Your TRACE API key |
| `min_score` | `0.35` | Minimum score to allow routing |
| `fail_closed` | `True` | Reject on API failure |
| `api_url` | `https://trace-api-ixv6o.ondigitalocean.app/api/v1/score` | TRACE API endpoint |

## Fail-Closed vs Fail-Open

- **fail_closed=True** (default): If TRACE API is unreachable, payment is rejected. Safer for high-value transactions.
- **fail_closed=False**: If TRACE API is unreachable, payment is allowed. Use for non-critical flows.

## Architecture

```
┌─────────────┐     x402 flow      ┌──────────────┐
│   Client    │ ─────────────────► │  x402 Server │
└─────────────┘                    │              │
                                   │  on_after_   │
                                   │   verify     │
                                   └──────┬───────┘
                                          │
                                          ▼
                              ┌─────────────────────┐
                              │  TRACE Trust Ext.   │
                              │  (this package)     │
                              └──────────┬──────────┘
                                         │
                                         ▼
                              ┌─────────────────────┐
                              │    TRACE API        │
                              │  POST /v1/score     │
                              └─────────────────────┘
```

## Development

```bash
# Install in development mode
pip install -e ".[dev]"

# Run tests
pytest tests/

# Lint
ruff check .

# Format
ruff format .
```

## License

MIT License - see LICENSE file for details.