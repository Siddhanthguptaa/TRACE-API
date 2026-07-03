from pydantic import BaseModel, Field, validator
from typing import List, Optional, Literal
from enum import Enum


class RoutingDecision(str, Enum):
    ROUTE = "ROUTE"
    ROUTE_WITH_CAUTION = "ROUTE_WITH_CAUTION"
    HOLD = "HOLD"
    INVESTIGATE = "INVESTIGATE"
    QUARANTINE = "QUARANTINE"
    DENY = "DENY"
    REFER = "REFER"


class JobContext(BaseModel):
    capability: str
    price_usdc: float
    job_id: Optional[str] = None


class ProviderHistory(BaseModel):
    completed_jobs: int = 0
    failed_jobs: int = 0
    total_jobs: int = 0
    default_sequence: List[int] = Field(default_factory=list)
    cusum_state: float = 0.0
    ema_default_rate: float = 0.0


class GraphContext(BaseModel):
    trust_edges: List[str] = Field(default_factory=list)
    trust_graph_edges: List[List[str]] = Field(default_factory=list)
    flagged_neighbors: List[str] = Field(default_factory=list)
    honest_seeds: List[str] = Field(default_factory=list)


class ScoringRequest(BaseModel):
    provider_id: str
    job: JobContext
    provider_capabilities: List[str] = Field(default_factory=list)
    cohort_median_price: Optional[float] = None


class EventReport(BaseModel):
    provider_id: str
    buyer_id: Optional[str] = None
    job_id: Optional[str] = None
    capability: Optional[str] = None
    price_usdc: Optional[float] = None
    success: bool


class EventReportResponse(BaseModel):
    status: str
    processed_at: str

class BatchScoringRequest(BaseModel):
    providers: List[ScoringRequest] = Field(default_factory=list)

    @validator('providers')
    def max_providers(cls, v):
        if len(v) > 100:
            raise ValueError('Maximum 100 providers per batch request')
        return v


class ScoringComponents(BaseModel):
    lcb: float
    default_risk: float
    cost_norm: float
    trust_net: float
    cap_match: float
    sybil_risk: float
    clique_penalty: float


class RefreshHint(BaseModel):
    strategy: str = "volume_decay"
    temporal_soft_ttl: int
    temporal_hard_floor: int
    evaluated_job_count: int
    evaluated_edge_density: float
    evaluated_record_refs: List[str] = Field(default_factory=list)


class AnchorCommitment(BaseModel):
    mechanism: str = "anchoring-precedence-ref-v1"
    timestamp: str
    root_hash: str
    proof: str
    chain_locator: str


class TraceScoreResponse(BaseModel):
    provider_id: str
    score: float
    routing_decision: RoutingDecision
    components: ScoringComponents
    refresh_hint: Optional[RefreshHint] = None
    evidence_source_count: Optional[int] = None
    anchor_commitment: Optional[AnchorCommitment] = None
    flags: List[str]
    explanation: str
    latency_ms: float
    version: str = "1.0.0"


class BatchScoreResponse(BaseModel):
    results: List[TraceScoreResponse]


class BenchmarkRequest(BaseModel):
    scenario: Literal["collusion_ring", "sybil_cluster", "strategic_default", "game_theoretic"]
    n_agents: int = Field(default=100, ge=10, le=500)
    adversary_ratio: float = Field(default=0.30, ge=0.10, le=0.50)
    n_rounds: int = Field(default=60, ge=10, le=200)
    n_jobs_per_round: int = Field(default=5, ge=1, le=20)
    seed: int = 42


class BenchmarkResult(BaseModel):
    mean_fraud_usdc: float
    malicious_routing_rate: float
    seeds: List[dict]


class BenchmarkResponse(BaseModel):
    scenario: str
    results: dict
    fraud_reduction_vs_behavioral: str
    fraud_reduction_vs_eigentrust: str


class HealthResponse(BaseModel):
    status: str
    version: str = "1.0.0"