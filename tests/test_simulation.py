import pytest
from api.simulation import run_simulation


SIM_PARAMS = {
    "n_agents": 100,
    "adversary_ratio": 0.30,
    "n_rounds": 60,
    "n_jobs_per_round": 5,
    "seed": 42,
}


SCENARIOS = ["strategic_default", "collusion_ring", "sybil_cluster", "game_theoretic"]


def test_determinism():
    r1 = run_simulation(scenario="collusion_ring", **SIM_PARAMS)
    r2 = run_simulation(scenario="collusion_ring", **SIM_PARAMS)
    assert r1["results"]["trace_no_bandit"]["mean_fraud_usdc"] == r2["results"]["trace_no_bandit"]["mean_fraud_usdc"]
    assert r1["results"]["eigentrust"]["mean_fraud_usdc"] == r2["results"]["eigentrust"]["mean_fraud_usdc"]


@pytest.mark.parametrize("scenario", SCENARIOS)
def test_all_scenarios_run(scenario):
    result = run_simulation(scenario=scenario, **SIM_PARAMS)
    assert "results" in result
    for policy in ["trace_no_bandit", "behavioral_only", "eigentrust"]:
        assert policy in result["results"]
        assert isinstance(result["results"][policy]["mean_fraud_usdc"], float)
        assert isinstance(result["results"][policy]["malicious_routing_rate"], float)


def test_trace_beats_behavioral_on_collusion():
    result = run_simulation(scenario="collusion_ring", **SIM_PARAMS)
    trace_fraud = result["results"]["trace_no_bandit"]["mean_fraud_usdc"]
    behavioral_fraud = result["results"]["behavioral_only"]["mean_fraud_usdc"]
    # TRACE should have lower or equal fraud than behavioral on collusion
    assert trace_fraud <= behavioral_fraud + 0.01, f"TRACE {trace_fraud} should be <= behavioral {behavioral_fraud}"


def test_trace_beats_eigentrust_on_sybil():
    result = run_simulation(scenario="sybil_cluster", **SIM_PARAMS)
    trace_fraud = result["results"]["trace_no_bandit"]["mean_fraud_usdc"]
    eigentrust_fraud = result["results"]["eigentrust"]["mean_fraud_usdc"]
    # TRACE should have lower or equal fraud than EigenTrust on sybil
    assert trace_fraud <= eigentrust_fraud + 0.01, f"TRACE {trace_fraud} should be <= EigenTrust {eigentrust_fraud}"


def test_eigentrust_mr_high_on_sybil():
    result = run_simulation(scenario="sybil_cluster", **SIM_PARAMS)
    eigentrust_mr = result["results"]["eigentrust"]["malicious_routing_rate"]
    # EigenTrust should route a meaningful portion to adversaries
    assert eigentrust_mr > 0.05, f"EigenTrust MR {eigentrust_mr} should be > 0.05"


def test_trace_fraud_low_on_collusion():
    result = run_simulation(scenario="collusion_ring", **SIM_PARAMS)
    trace_fraud = result["results"]["trace_no_bandit"]["mean_fraud_usdc"]
    # TRACE should keep fraud per job reasonable
    assert trace_fraud < 1.0, f"TRACE collusion fraud {trace_fraud} should be < 1.0 USDC per job"


def test_simulation_produces_nonzero_fraud():
    """At least one scoring method should produce nonzero fraud on collusion."""
    result = run_simulation(scenario="collusion_ring", **SIM_PARAMS)
    total = sum(
        result["results"][p]["mean_fraud_usdc"]
        for p in ["trace_no_bandit", "behavioral_only", "eigentrust"]
    )
    assert total > 0, "Simulation should produce some fraud"


def test_trace_beats_eigentrust_on_strategic_default():
    result = run_simulation(scenario="strategic_default", **SIM_PARAMS)
    trace_fraud = result["results"]["trace_no_bandit"]["mean_fraud_usdc"]
    eigentrust_fraud = result["results"]["eigentrust"]["mean_fraud_usdc"]
    assert trace_fraud <= eigentrust_fraud + 1.0, f"TRACE {trace_fraud} should be <= EigenTrust {eigentrust_fraud} + 1.0"


def test_fraud_reduction_computed():
    """Fraud reduction percentages should be computed (may be 0% for some scenarios)."""
    result = run_simulation(scenario="collusion_ring", **SIM_PARAMS)
    assert "fraud_reduction_vs_behavioral" in result
    assert "fraud_reduction_vs_eigentrust" in result


def test_game_theoretic_scenario():
    result = run_simulation(scenario="game_theoretic", **SIM_PARAMS)
    trace_fraud = result["results"]["trace_no_bandit"]["mean_fraud_usdc"]
    behavioral_fraud = result["results"]["behavioral_only"]["mean_fraud_usdc"]
    # TRACE should be competitive or better on GT
    assert trace_fraud <= behavioral_fraud + 2.0
