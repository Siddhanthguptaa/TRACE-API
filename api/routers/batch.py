from fastapi import APIRouter, HTTPException, Depends

from ..models import BatchScoringRequest, TraceScoreResponse, RoutingDecision, ScoringComponents
from ..scorer import compute_trace_score
from ..auth import verify_api_key, Developer


router = APIRouter()


@router.post("/score/batch", response_model=list[TraceScoreResponse])
async def score_batch(request: BatchScoringRequest, dev: Developer = Depends(verify_api_key)):
    results = []
    for req in request.providers:
        try:
            result = await compute_trace_score(
                provider_id=req.provider_id,
                job_capability=req.job.capability,
                price_usdc=req.job.price_usdc,
                cohort_median_price=req.cohort_median_price,
                provider_capabilities=req.provider_capabilities,
            )

            results.append(TraceScoreResponse(
                provider_id=req.provider_id,
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
            ))
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # Sort by score descending (routing recommendation)
    results.sort(key=lambda x: x.score, reverse=True)
    return results
