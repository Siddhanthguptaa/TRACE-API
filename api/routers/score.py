from fastapi import APIRouter, HTTPException, Depends
from typing import List

from ..models import ScoringRequest, TraceScoreResponse, RoutingDecision, ScoringComponents
from ..scorer import compute_trace_score
from ..auth import verify_api_key, Developer

router = APIRouter()

@router.post("/score", response_model=TraceScoreResponse)
async def score_provider(request: ScoringRequest, dev: Developer = Depends(verify_api_key)):
    try:
        result = await compute_trace_score(
            provider_id=request.provider_id,
            job_capability=request.job.capability,
            price_usdc=request.job.price_usdc,
            cohort_median_price=request.cohort_median_price,
            provider_capabilities=request.provider_capabilities,
        )

        return TraceScoreResponse(
            provider_id=request.provider_id,
            score=result.score,
            routing_decision=RoutingDecision(result.routing_decision),
            components=ScoringComponents(
                lcb=result.components.lcb,
                default_risk=result.components.default_risk,
                cost_norm=result.components.cost_norm,
                trust_net=result.components.trust_net,
                cap_match=result.components.cap_match,
                sybil_risk=result.components.sybil_risk,
                clique_penalty=result.components.clique_penalty,
            ),
            flags=result.flags,
            explanation=result.explanation,
            latency_ms=result.latency_ms,
            version="1.0.0",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
