import asyncio
import logging
import time
import networkx as nx
from typing import List, Dict

from .state import state_manager
from .graph import is_honest_seed

logger = logging.getLogger(__name__)

# Global variable to track worker heartbeat
_worker_last_run = 0.0
_worker_status = "starting"


async def compute_honest_seeds() -> List[str]:
    providers = await state_manager.get_all_providers()
    seeds = []
    for pid, p in providers.items():
        if is_honest_seed(pid, p.completed_jobs, p.failed_jobs):
            seeds.append(pid)
    return seeds


def get_worker_heartbeat() -> dict:
    """Get worker heartbeat status."""
    now = time.time()
    return {
        "last_run": _worker_last_run,
        "seconds_ago": round(now - _worker_last_run, 2) if _worker_last_run > 0 else None,
        "status": _worker_status,
        "healthy": (now - _worker_last_run) < 30 if _worker_last_run > 0 else False,  # Healthy if run within 30s
    }


async def background_graph_computation():
    global _worker_last_run, _worker_status
    logger.info("Starting background graph computation worker...")
    _worker_status = "running"
    while True:
        start_time = time.perf_counter()
        try:
            graph = await state_manager.get_graph_snapshot()
            honest_seeds = await compute_honest_seeds()
            
            if len(graph.nodes) > 0:
                # In a real enterprise system with millions of nodes, this would run in a separate
                # process or Celery worker using run_in_executor to avoid blocking the event loop.
                # For this MVP upgrade, we compute it directly in the background coroutine.
                
                personalization = {}
                if honest_seeds:
                    valid_seeds = [s for s in honest_seeds if s in graph.nodes()]
                    if valid_seeds:
                        personalization = {seed: 1.0 / len(valid_seeds) for seed in valid_seeds}
                
                if personalization:
                    try:
                        pageranks = nx.pagerank(graph, alpha=0.85, personalization=personalization, max_iter=100)
                    except Exception as e:
                        logger.error(f"PageRank error: {e}")
                        pageranks = {}
                else:
                    pageranks = {}
                
                try:
                    undirected = graph.to_undirected()
                    clusterings = nx.clustering(undirected)
                except Exception as e:
                    logger.error(f"Clustering error: {e}")
                    clusterings = {}
                
                scores: Dict[str, Dict[str, float]] = {}
                for node in graph.nodes():
                    scores[node] = {
                        "pagerank": pageranks.get(node, 0.0),
                        "clustering": clusterings.get(node, 0.0)
                    }
                
                await state_manager.update_cache(scores, honest_seeds)
                
            _worker_status = "running"
            
        except Exception as e:
            logger.error(f"Error in background worker: {e}")
            _worker_status = "error"
        
        _worker_last_run = time.time()
        
        # Record metrics
        duration = time.perf_counter() - start_time
        try:
            from .metrics import record_worker_run
            record_worker_run(_worker_status, duration)
        except Exception:
            pass  # Metrics optional
        
        # Recalculate every 5 seconds (can be tuned for production)
        await asyncio.sleep(5)