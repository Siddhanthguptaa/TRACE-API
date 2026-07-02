import pytest
import asyncio
from api.scorer import (
    compute_lcb,
    compute_cost_norm,
    compute_cap_match,
    compute_trace_score,
)
from api.detection import process_default_sequence, CUSUM_PENALTY
from api.graph import compute_sybil_risk, compute_clique_penalty, compute_edge_to_job_ratio
from api.state import state_manager

def test_cold_start_lcb():
    lcb = compute_lcb(0, 0)
    assert abs(lcb - 0.017) < 0.002

@pytest.mark.anyio
async def test_cold_start_score_low():
    result = await compute_trace_score(
        provider_id="0xcold",
        job_capability="summarize",
        price_usdc=0.05,
        cohort_median_price=0.05,
        provider_capabilities=["summarize"],
    )
    assert result.score < 0.25
    assert "COLD_START" in result.flags

@pytest.mark.anyio
async def test_proven_honest_route():
    provider_id = "0xgood2"
    for _ in range(47):
        await state_manager.update_provider(provider_id, True, 0.0, 0.0)
    for _ in range(3):
        await state_manager.update_provider(provider_id, False, 0.0, 0.0)
        
    result = await compute_trace_score(
        provider_id=provider_id,
        job_capability="summarize",
        price_usdc=0.05,
        cohort_median_price=0.05,
        provider_capabilities=["summarize"],
    )
    assert result.components.lcb > 0.80

def test_sybil_detection():
    e2j = compute_edge_to_job_ratio(["0x" + str(i) for i in range(30)], 5)
    sybil_risk = compute_sybil_risk(e2j)
    assert sybil_risk > 0.5

@pytest.mark.anyio
async def test_cusum_fires():
    provider_id = "0xshifty"
    for _ in range(40):
        await state_manager.update_provider(provider_id, True, 0.0, 0.0)
    
    await state_manager.update_provider(provider_id, False, 4.5, 0.0)

    result = await compute_trace_score(
        provider_id=provider_id,
        job_capability="summarize",
        price_usdc=0.05,
        cohort_median_price=0.05,
        provider_capabilities=["summarize"],
    )
    assert result.cusum_fired is True
    assert "CUSUM_FIRED" in result.flags

def test_capability_match_full():
    assert compute_cap_match(["summarize", "translate"], "summarize") == 1.0

def test_capability_match_partial():
    assert compute_cap_match(["text_summarize"], "summarize") == 0.5

def test_capability_match_none():
    assert compute_cap_match(["code"], "summarize") == 0.0

def test_cost_norm_above_threshold():
    assert compute_cost_norm(0.10, 0.04) > 0.0

def test_cost_norm_below_threshold():
    assert compute_cost_norm(0.01, 0.04) > 0.0

def test_cost_norm_normal():
    assert compute_cost_norm(0.04, 0.04) == 0.0
