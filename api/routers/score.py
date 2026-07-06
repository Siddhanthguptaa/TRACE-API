import logging
from fastapi import APIRouter, HTTPException, Depends, Request

from ..models import ScoringRequest, TraceScoreResponse, RoutingDecision, ScoringComponents
from ..scorer import compute_trace_score
from ..auth import verify_api_key, Developer
from ..metrics import record_score_request

logger = logging.getLogger("trace.api")

router = APIRouter()


@router.post("/score", response_model=TraceScoreResponse)
async def score_provider(request: Request, scoring_req: ScoringRequest, dev: Developer = Depends(verify_api_key)):
    try:
        result = await compute_trace_score(
            provider_id=scoring_req.provider_id,
            job_capability=scoring_req.job.capability,
            price_usdc=scoring_req.job.price_usdc,
            cohort_median_price=scoring_req.cohort_median_price,
            provider_capabilities=scoring_req.provider_capabilities,
        )

        # Record metrics
        components_dict = {
            "lcb": result.components.lcb,
            "default_risk": result.components.default_risk,
            "cost_norm": result.components.cost_norm,
            "trust_net": result.components.trust_net,
            "cap_match": result.components.cap_match,
            "sybil_risk": result.components.sybil_risk,
            "clique_penalty": result.components.clique_penalty,
        }
        record_score_request(
            provider_id=scoring_req.provider_id,
            routing_decision=result.routing_decision,
            score=result.score,
            components=components_dict,
            latency=result.latency_ms / 1000.0,  # Convert to seconds
        )

        return TraceScoreResponse(
            provider_id=scoring_req.provider_id,
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
            refresh_hint=result.refresh_hint,
            evidence_source_count=result.evidence_source_count,
            anchor_commitment=result.anchor_commitment,
            flags=result.flags,
            explanation=result.explanation,
            latency_ms=result.latency_ms,
            version="1.0.0",
        )
    except Exception as e:
        logger.error(f"Score computation failed for provider {scoring_req.provider_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal scoring error")
