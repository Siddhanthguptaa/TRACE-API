from fastapi import APIRouter

from ..models import BenchmarkRequest, BenchmarkResponse, BenchmarkResult
from ..simulation import run_simulation


router = APIRouter()


@router.post("/benchmark", response_model=BenchmarkResponse)
async def run_benchmark(request: BenchmarkRequest):
    result = run_simulation(
        scenario=request.scenario,
        n_agents=request.n_agents,
        adversary_ratio=request.adversary_ratio,
        n_rounds=request.n_rounds,
        n_jobs_per_round=request.n_jobs_per_round,
        seed=request.seed,
    )

    return BenchmarkResponse(
        scenario=result["scenario"],
        results={
            k: BenchmarkResult(
                mean_fraud_usdc=v["mean_fraud_usdc"],
                malicious_routing_rate=v["malicious_routing_rate"],
                seeds=v["seeds"],
            )
            for k, v in result["results"].items()
        },
        fraud_reduction_vs_behavioral=result["fraud_reduction_vs_behavioral"],
        fraud_reduction_vs_eigentrust=result["fraud_reduction_vs_eigentrust"],
    )
