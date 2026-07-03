import asyncio
import logging
import networkx as nx
from typing import Dict, List, Optional
from .models import ProviderHistory
from .database import AsyncSessionLocal, ProviderRecord, TrustEdge

logger = logging.getLogger(__name__)


class TraceState:
    """
    In-memory trust state with database persistence.
    
    Hot path reads hit the in-memory cache (O(1)).
    Writes go to both in-memory state AND the database.
    On startup, warm_start() loads the full state from DB.
    """

    def __init__(self):
        self.providers: Dict[str, ProviderHistory] = {}
        self.trust_graph: nx.DiGraph = nx.DiGraph()
        self.honest_seeds: List[str] = []
        self.cached_scores: Dict[str, Dict[str, float]] = {}  # provider_id -> {"pagerank": float, "clustering": float}
        self.lock = asyncio.Lock()
        self._warm_started = False

    async def warm_start(self):
        """Load all provider records and trust edges from the database on startup."""
        try:
            async with AsyncSessionLocal() as session:
                from sqlalchemy.future import select

                # Load providers
                result = await session.execute(select(ProviderRecord))
                records = result.scalars().all()
                for rec in records:
                    self.providers[rec.provider_id] = ProviderHistory(
                        completed_jobs=rec.completed_jobs,
                        failed_jobs=rec.failed_jobs,
                        total_jobs=rec.total_jobs,
                        cusum_state=rec.cusum_state,
                        ema_default_rate=rec.ema_default_rate,
                    )

                # Load trust edges
                edge_result = await session.execute(select(TrustEdge))
                edges = edge_result.scalars().all()
                for edge in edges:
                    self.trust_graph.add_edge(edge.source_id, edge.target_id)

            self._warm_started = True
            logger.info(
                f"Warm start complete: {len(self.providers)} providers, "
                f"{self.trust_graph.number_of_edges()} trust edges loaded from DB"
            )
        except Exception as e:
            logger.error(f"Warm start failed: {e}")
            self._warm_started = False

    async def get_provider(self, provider_id: str) -> ProviderHistory:
        async with self.lock:
            # Return a copy to avoid mutation outside lock
            if provider_id not in self.providers:
                self.providers[provider_id] = ProviderHistory()
            return self.providers[provider_id].model_copy()

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

        # Persist to database (outside lock to reduce contention)
        await self._persist_provider(provider_id)

    async def _persist_provider(self, provider_id: str):
        """Write provider state to database."""
        try:
            async with self.lock:
                p = self.providers.get(provider_id)
                if not p:
                    return
                # Snapshot values under lock
                completed = p.completed_jobs
                failed = p.failed_jobs
                total = p.total_jobs
                cusum = p.cusum_state
                ema = p.ema_default_rate

            async with AsyncSessionLocal() as session:
                from sqlalchemy.future import select
                from sqlalchemy import update as sql_update

                result = await session.execute(
                    select(ProviderRecord).filter(ProviderRecord.provider_id == provider_id)
                )
                record = result.scalars().first()

                if record:
                    record.completed_jobs = completed
                    record.failed_jobs = failed
                    record.total_jobs = total
                    record.cusum_state = cusum
                    record.ema_default_rate = ema
                else:
                    record = ProviderRecord(
                        provider_id=provider_id,
                        completed_jobs=completed,
                        failed_jobs=failed,
                        total_jobs=total,
                        cusum_state=cusum,
                        ema_default_rate=ema,
                    )
                    session.add(record)

                await session.commit()
        except Exception as e:
            logger.error(f"Failed to persist provider {provider_id}: {e}")

    async def add_trust_edge(self, buyer_id: str, provider_id: str):
        async with self.lock:
            if not self.trust_graph.has_node(buyer_id):
                self.trust_graph.add_node(buyer_id)
            if not self.trust_graph.has_node(provider_id):
                self.trust_graph.add_node(provider_id)
            self.trust_graph.add_edge(buyer_id, provider_id)

        # Persist to database
        await self._persist_trust_edge(buyer_id, provider_id)

    async def _persist_trust_edge(self, source_id: str, target_id: str):
        """Write trust edge to database (upsert — increment weight if exists)."""
        try:
            async with AsyncSessionLocal() as session:
                from sqlalchemy.future import select

                result = await session.execute(
                    select(TrustEdge).filter(
                        TrustEdge.source_id == source_id,
                        TrustEdge.target_id == target_id,
                    )
                )
                edge = result.scalars().first()

                if edge:
                    edge.weight += 1
                else:
                    edge = TrustEdge(source_id=source_id, target_id=target_id, weight=1)
                    session.add(edge)

                await session.commit()
        except Exception as e:
            logger.error(f"Failed to persist trust edge {source_id} -> {target_id}: {e}")

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
            return {k: v.model_copy() for k, v in self.providers.items()}

    async def get_stats(self) -> dict:
        """Return state statistics for health checks."""
        async with self.lock:
            return {
                "providers": len(self.providers),
                "trust_edges": self.trust_graph.number_of_edges(),
                "trust_nodes": self.trust_graph.number_of_nodes(),
                "honest_seeds": len(self.honest_seeds),
                "warm_started": self._warm_started,
            }


# Global singleton
state_manager = TraceState()
