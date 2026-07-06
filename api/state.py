import logging
from typing import Dict, List, Optional
from sqlalchemy.future import select
from sqlalchemy import update as sql_update

from .models import ProviderHistory
from .database import AsyncSessionLocal, ProviderRecord, TrustEdge, GraphScore

logger = logging.getLogger(__name__)


class TraceState:
    """
    Stateless data access layer.
    All state is stored in PostgreSQL to ensure horizontal scalability.
    """

    async def get_provider(self, provider_id: str) -> ProviderHistory:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(ProviderRecord).filter(ProviderRecord.provider_id == provider_id)
            )
            rec = result.scalars().first()
            if rec:
                return ProviderHistory(
                    completed_jobs=rec.completed_jobs,
                    failed_jobs=rec.failed_jobs,
                    total_jobs=rec.total_jobs,
                    cusum_state=rec.cusum_state,
                    ema_default_rate=rec.ema_default_rate,
                )
            return ProviderHistory()

    async def update_provider(self, provider_id: str, success: bool, cusum_state: float, ema_rate: float):
        try:
            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(ProviderRecord).filter(ProviderRecord.provider_id == provider_id)
                )
                record = result.scalars().first()

                if record:
                    record.total_jobs += 1
                    if success:
                        record.completed_jobs += 1
                    else:
                        record.failed_jobs += 1
                    record.cusum_state = cusum_state
                    record.ema_default_rate = ema_rate
                else:
                    record = ProviderRecord(
                        provider_id=provider_id,
                        completed_jobs=1 if success else 0,
                        failed_jobs=0 if success else 1,
                        total_jobs=1,
                        cusum_state=cusum_state,
                        ema_default_rate=ema_rate,
                    )
                    session.add(record)

                await session.commit()
        except Exception as e:
            logger.error(f"Failed to persist provider {provider_id}: {e}")

    async def add_trust_edge(self, buyer_id: str, provider_id: str):
        try:
            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(TrustEdge).filter(
                        TrustEdge.source_id == buyer_id,
                        TrustEdge.target_id == provider_id,
                    )
                )
                edge = result.scalars().first()

                if edge:
                    edge.weight += 1
                else:
                    edge = TrustEdge(source_id=buyer_id, target_id=provider_id, weight=1)
                    session.add(edge)

                await session.commit()
        except Exception as e:
            logger.error(f"Failed to persist trust edge {buyer_id} -> {provider_id}: {e}")

    async def get_cached_scores(self, provider_id: str) -> Dict[str, float]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(GraphScore).filter(GraphScore.provider_id == provider_id)
            )
            score = result.scalars().first()
            if score:
                return {"pagerank": score.pagerank, "clustering": score.clustering}
            return {"pagerank": 0.0, "clustering": 0.0}

    async def get_provider_edges(self, provider_id: str) -> List[str]:
        """Returns list of buyers who trust this provider."""
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(TrustEdge.source_id).filter(TrustEdge.target_id == provider_id)
            )
            return list(result.scalars().all())

    async def get_flagged_neighbors(self, provider_id: str) -> List[str]:
        """Check the 1-hop neighborhood for flagged agents (Sybil/CUSUM)."""
        async with AsyncSessionLocal() as session:
            # 1. Get neighbors (both inbound and outbound)
            in_res = await session.execute(select(TrustEdge.source_id).filter(TrustEdge.target_id == provider_id))
            out_res = await session.execute(select(TrustEdge.target_id).filter(TrustEdge.source_id == provider_id))
            
            neighbors = set(in_res.scalars().all()) | set(out_res.scalars().all())
            if not neighbors:
                return []
            
            # 2. Get their records to check for flags
            result = await session.execute(
                select(ProviderRecord).filter(ProviderRecord.provider_id.in_(neighbors))
            )
            flagged = []
            for p in result.scalars().all():
                # We do a simplified Edge-to-Job check. In the real system the background worker
                # would compute E2J for every node, but here we approximate it for neighbors.
                e2j = len(neighbors) / max(1, p.completed_jobs) # approx
                if p.cusum_state >= 4.0 or e2j > 3.0:
                    flagged.append(p.provider_id)
                    
            return flagged

    async def get_stats(self) -> dict:
        """Return state statistics for health checks."""
        async with AsyncSessionLocal() as session:
            from sqlalchemy import func
            p_count = await session.execute(select(func.count(ProviderRecord.id)))
            e_count = await session.execute(select(func.count(TrustEdge.id)))
            return {
                "providers": p_count.scalar() or 0,
                "trust_edges": e_count.scalar() or 0,
                "warm_started": True,
            }


# Global singleton for stateless access
state_manager = TraceState()
