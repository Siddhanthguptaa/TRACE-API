from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio

from .routers import score, batch, benchmark, health, events, portal
from .worker import background_graph_computation
from .database import init_db


from fastapi.staticfiles import StaticFiles

app = FastAPI(
    title="TRACE API",
    description="Trust Routing with Adversarial Coordination Evidence — a graph-aware trust scoring API for A2A agent marketplaces.",
    version="1.0.0",
)

# Serve the static frontend files
app.mount("/demo", StaticFiles(directory="demo"), name="demo")

@app.on_event("startup")
async def startup_event():
    await init_db()
    asyncio.create_task(background_graph_computation())

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(score.router, prefix="/v1")
app.include_router(batch.router, prefix="/v1")
app.include_router(benchmark.router, prefix="/v1")
app.include_router(events.router, prefix="/v1")
app.include_router(portal.router, prefix="/portal", tags=["Portal"])
app.include_router(health.router, prefix="")
