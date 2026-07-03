from fastapi import APIRouter
from sqlalchemy import text

from ..models import HealthResponse
from ..state import state_manager
from ..database import AsyncSessionLocal
from ..worker import get_worker_heartbeat


router = APIRouter()


@router.get("/health", response_model=None)
async def health_check():
    # Check database connectivity
    db_ok = False
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
            db_ok = True
    except Exception:
        pass

    # Get trust graph stats
    try:
        stats = await state_manager.get_stats()
    except Exception:
        stats = {}

    # Check background worker heartbeat
    worker_heartbeat = get_worker_heartbeat()
    worker_healthy = worker_heartbeat.get("healthy", False)

    # Overall status: ok if DB is healthy (worker might not have run yet in tests)
    # We consider "ok" if DB is connected, worker status is informational
    status = "ok" if db_ok else "degraded"

    return {
        "status": status,
        "version": "1.0.0",
        "database": "connected" if db_ok else "unreachable",
        "trust_graph": stats,
        "background_worker": worker_heartbeat,
    }