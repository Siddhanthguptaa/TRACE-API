"""
Generate pre-baked simulation data for the TRACE demo.

Outputs demo/simulation_data.json with:
  - All 4 attack scenario results
  - Round-by-round collusion ring fraud exposure (for animated chart)
  - Seed-level EigenTrust collapse data (for Figure 2 reproduction)
"""

import json
import os
import sys
import random
import numpy as np

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from api.simulation import (
    run_simulation,
    create_agents,
    run_policy_simulation,
    init_provider_state,
    get_initial_edges,
    get_honest_seeds,
    compute_trace_score_for_simulation,
    behavioral_score,
    eigentrust_scores,
    determine_outcome,
    update_ema_default_rate,
    update_cusum,
    JOB_PRICE_USDC,
    BUYER_IDS,
)


def generate_round_by_round_collusion(seed: int = 42) -> dict:
    """Generate round-by-round fraud exposure for collusion ring scenario."""
    n_agents = 100
    adversary_ratio = 0.30
    n_rounds = 60
    n_jobs_per_round = 5

    results = {}

    for policy in ["trace", "behavioral"]:
        random.seed(seed)
        np.random.seed(seed)
        agents = create_agents("collusion_ring", n_agents, adversary_ratio, seed)

        random.seed(seed + hash(policy) % 10000)
        np.random.seed(seed + hash(policy) % 10000)

        state = init_provider_state(agents)
        graph_edges = list(get_initial_edges(agents))
        all_ids = [a.id for a in agents] + BUYER_IDS

        round_fraud = []
        cumulative_fraud = 0.0

        for round_num in range(n_rounds):
            honest_seeds = get_honest_seeds(state, agents)
            policy_scores = {}

            if policy == "trace":
                for a in agents:
                    policy_scores[a.id] = compute_trace_score_for_simulation(
                        a, state, agents, graph_edges, honest_seeds
                    )
            else:
                for a in agents:
                    ps = state[a.id]
                    policy_scores[a.id] = behavioral_score(
                        ps["completed_jobs"], ps["total_jobs"]
                    )

            round_fraud_count = 0
            for _ in range(n_jobs_per_round):
                selected = max(agents, key=lambda a: policy_scores[a.id])
                is_malicious = determine_outcome(selected, round_num)

                if is_malicious:
                    cumulative_fraud += JOB_PRICE_USDC
                    round_fraud_count += 1

                ps = state[selected.id]
                ps["total_jobs"] += 1
                if is_malicious:
                    ps["failed_jobs"] += 1
                    ps["default_sequence"].append(1)
                else:
                    ps["completed_jobs"] += 1
                    ps["default_sequence"].append(0)
                    buyer = random.choice(BUYER_IDS)
                    graph_edges.append([buyer, selected.id])

                ps["ema_default_rate"] = update_ema_default_rate(
                    1 if is_malicious else 0, ps["ema_default_rate"]
                )
                cusum_res = update_cusum(
                    1 if is_malicious else 0, ps["cusum_state"]
                )
                ps["cusum_state"] = cusum_res.state
                if cusum_res.fired:
                    ps["cusum_fired"] = True

            round_fraud.append(round(cumulative_fraud, 4))

        results[policy] = round_fraud

    return {
        "trace": results["trace"],
        "behavioral": results["behavioral"],
        "rounds": list(range(1, n_rounds + 1)),
    }


def generate_eigentrust_collapse_data(n_seeds: int = 10) -> dict:
    """Generate per-seed EigenTrust vs TRACE malicious routing rates."""
    trace_rates = []
    eigentrust_rates = []
    behavioral_rates = []

    for seed in range(n_seeds):
        result = run_simulation(
            scenario="sybil_cluster",
            n_agents=100,
            adversary_ratio=0.30,
            n_rounds=60,
            n_jobs_per_round=5,
            seed=seed,
        )

        trace_rates.append(
            round(result["results"]["trace_no_bandit"]["malicious_routing_rate"] * 100, 1)
        )
        eigentrust_rates.append(
            round(result["results"]["eigentrust"]["malicious_routing_rate"] * 100, 1)
        )
        behavioral_rates.append(
            round(result["results"]["behavioral_only"]["malicious_routing_rate"] * 100, 1)
        )

    return {
        "seeds": list(range(n_seeds)),
        "trace": trace_rates,
        "eigentrust": eigentrust_rates,
        "behavioral": behavioral_rates,
    }


def generate_all_scenarios() -> dict:
    """Run all 4 attack scenarios with default parameters."""
    scenarios = {}
    for scenario in [
        "collusion_ring",
        "sybil_cluster",
        "strategic_default",
        "game_theoretic",
    ]:
        result = run_simulation(
            scenario=scenario,
            n_agents=100,
            adversary_ratio=0.30,
            n_rounds=60,
            n_jobs_per_round=5,
            seed=42,
        )
        scenarios[scenario] = result

    return scenarios


def main():
    print("Generating TRACE demo data...")

    print("  [1/3] Running all 4 attack scenarios...")
    scenarios = generate_all_scenarios()

    print("  [2/3] Generating round-by-round collusion data...")
    collusion_rounds = generate_round_by_round_collusion()

    print("  [3/3] Generating EigenTrust collapse data (10 seeds)...")
    eigentrust_collapse = generate_eigentrust_collapse_data()

    data = {
        "scenarios": scenarios,
        "collusion_rounds": collusion_rounds,
        "eigentrust_collapse": eigentrust_collapse,
        "paper_reference_numbers": {
            "collusion_behavioral_fraud_sats": 46.5,
            "collusion_trace_fraud_sats": 6.4,
            "eigentrust_mr_pct": 81.7,
            "trace_mr_pct": 24.0,
            "behavioral_mr_pct": 29.0,
            "fraud_reduction_trace_vs_behavioral": 86,
            "collusion_fraud_reduction_14x": 14,
        },
    }

    output_path = os.path.join(os.path.dirname(__file__), "..", "demo", "simulation_data.json")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, "w") as f:
        json.dump(data, f, indent=2)

    print(f"  [OK] Written to {os.path.abspath(output_path)}")
    print("Done.")


if __name__ == "__main__":
    main()
