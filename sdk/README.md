# TRACE SDK — x402 Middleware

Drop-in trust gating for AI agent marketplaces using the x402 payment protocol.

## Overview

The TRACE middleware checks an agent's trust score before processing x402 USDC payments. Untrusted agents (score below threshold, active flags) are rejected with HTTP 402 before any payment is processed.

## Python (FastAPI / Flask)

```python
from sdk.x402_middleware import TRACEMiddleware
from fastapi import FastAPI, Request

app = FastAPI()
trace = TRACEMiddleware(api_key="sk_trace_...")

@app.post("/agent/summarize")
async def handle_summarize(request: Request):
    agent_wallet = request.headers.get("X-Payment-Sender")
    
    # Raises HTTPException(402) if untrusted
    score = await trace.check(agent_wallet, "summarize", 0.05)
    
    # Agent passed trust check — proceed
    return {"result": "..."}
```

### Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `api_key` | Required | Your TRACE API key |
| `min_score` | `0.35` | Minimum score to allow routing |
| `api_url` | `https://api.trace.dev` | API endpoint (or self-hosted) |

## TypeScript (Express / Hono)

### Class-based

```typescript
import { TRACEMiddleware } from "./x402_middleware";

const trace = new TRACEMiddleware({ apiKey: "sk_trace_..." });

app.post("/agent/summarize", async (req, res) => {
  const wallet = req.headers["x-payment-sender"] as string;
  
  try {
    const score = await trace.check(wallet, "summarize", 0.05);
    // Proceed with job
    res.json({ result: "..." });
  } catch (err) {
    // err.status === 402, err.details has score + flags
    res.status(402).json(err.details);
  }
});
```

### Express Middleware

```typescript
import { traceGate } from "./x402_middleware";

// Apply to all /agent routes
app.use("/agent", traceGate({ apiKey: "sk_trace_..." }));
```

The middleware automatically reads `X-Payment-Sender` from headers and attaches the trust score to `req.traceScore`.

## How It Works

1. Agent sends x402 payment request to your server
2. TRACE middleware intercepts and calls `POST /v1/score`
3. If `routing_decision` is `HOLD` or `INVESTIGATE` → HTTP 402 rejection
4. If `ROUTE` or `ROUTE_WITH_CAUTION` → request proceeds

## Routing Decisions

| Decision | Score Range | Action |
|----------|------------|--------|
| `ROUTE` | ≥ 0.65 | Process payment |
| `ROUTE_WITH_CAUTION` | 0.35 – 0.65 | Process with monitoring |
| `HOLD` | < 0.35 | Reject (402) |
| `INVESTIGATE` | Any + flags | Reject (402) |
