import asyncio
import networkx as nx
from typing import Dict, List, Optional
from .models import ProviderHistory

class TraceState:
    def __init__(self):
        self.providers: Dict[str, ProviderHistory] = {}
        self.trust_graph: nx.DiGraph = nx.DiGraph()
        self.honest_seeds: List[str] = []
        self.cached_scores: Dict[str, Dict[str, float]] = {}  # provider_id -> {"pagerank": float, "clustering": float}
        self.lock = asyncio.Lock()

    async def get_provider(self, provider_id: str) -> ProviderHistory:
        async with self.lock:
            # Return a copy to avoid mutation outside lock
            if provider_id not in self.providers:
                self.providers[provider_id] = ProviderHistory()
            return self.providers[provider_id].copy()

    async def update_provider(self, provider_id: str, success: bool, cusum_state: float, ema_rate: float):
        async with self.lock:
            if provider_id not in self.providers:
                self.providers[provider_id] = ProviderHistory()
            p = self.providers[provider_id]
            p.total_jobs += 1
            if success:
                p.completed_jobs += 1
                p.default_sequence.append(0)
            else:
                p.failed_jobs += 1
                p.default_sequence.append(1)
            p.cusum_state = cusum_state
            p.ema_default_rate = ema_rate

    async def add_trust_edge(self, buyer_id: str, provider_id: str):
        async with self.lock:
            if not self.trust_graph.has_node(buyer_id):
                self.trust_graph.add_node(buyer_id)
            if not self.trust_graph.has_node(provider_id):
                self.trust_graph.add_node(provider_id)
            self.trust_graph.add_edge(buyer_id, provider_id)

    async def get_graph_snapshot(self) -> nx.DiGraph:
        async with self.lock:
            return self.trust_graph.copy()

    async def get_honest_seeds_snapshot(self) -> List[str]:
        async with self.lock:
            return list(self.honest_seeds)

    async def update_cache(self, scores: Dict[str, Dict[str, float]], seeds: List[str]):
        async with self.lock:
            self.cached_scores = scores
            self.honest_seeds = seeds

    async def get_cached_scores(self, provider_id: str) -> Dict[str, float]:
        async with self.lock:
            return self.cached_scores.get(provider_id, {"pagerank": 0.0, "clustering": 0.0})
            
    async def get_provider_edges(self, provider_id: str) -> List[str]:
        async with self.lock:
            if provider_id not in self.trust_graph:
                return []
            # Returns list of buyers (predecessors) who trust this provider
            return list(self.trust_graph.predecessors(provider_id))
            
    async def get_flagged_neighbors(self, provider_id: str) -> List[str]:
        async with self.lock:
            if provider_id not in self.trust_graph:
                return []
            neighbors = set(self.trust_graph.predecessors(provider_id)) | set(self.trust_graph.successors(provider_id))
            flagged = []
            for nid in neighbors:
                if nid in self.providers:
                    p = self.providers[nid]
                    e2j = len(list(self.trust_graph.predecessors(nid))) / max(1, p.completed_jobs)
                    cusum_fired = p.cusum_state >= 4.0 # Using CUSUM_H = 4.0 from detection.py
                    if cusum_fired or e2j > 3.0:
                        flagged.append(nid)
            return flagged
            
    async def get_all_providers(self) -> Dict[str, ProviderHistory]:
        async with self.lock:
            return {k: v.copy() for k, v in self.providers.items()}

# Global singleton
state_manager = TraceState()
