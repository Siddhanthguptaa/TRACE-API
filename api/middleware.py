"""
TRACE API — Structured Logging with Request IDs
"""

import logging
import uuid
import time
from contextvars import ContextVar
from typing import Optional

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# Context variable to store request ID across async calls
request_id_var: ContextVar[Optional[str]] = ContextVar("request_id", default=None)


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Middleware to add request ID to all requests and responses."""

    async def dispatch(self, request: Request, call_next):
        # Generate or extract request ID
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
        
        # Store in context variable for access in other parts of the code
        request_id_var.set(request_id)
        
        # Add to request state for access in route handlers
        request.state.request_id = request_id
        
        # Log request start
        logger = logging.getLogger("trace.api")
        logger.info(
            "Request started",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "client": request.client.host if request.client else None,
            }
        )
        
        start_time = time.perf_counter()
        
        try:
            response = await call_next(request)
            
            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id
            
            # Log request completion
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.info(
                "Request completed",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration_ms": round(duration_ms, 2),
                }
            )
            
            return response
            
        except Exception as e:
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.error(
                "Request failed",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "error": str(e),
                    "duration_ms": round(duration_ms, 2),
                },
                exc_info=True
            )
            raise


def get_request_id() -> Optional[str]:
    """Get the current request ID from context."""
    return request_id_var.get()


def setup_logging():
    """Configure structured logging for the application."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)-8s [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    
    # Reduce noise from third-party libraries
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.pool").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    
    # Set our app loggers to INFO
    logging.getLogger("trace.api").setLevel(logging.INFO)
    logging.getLogger("trace.state").setLevel(logging.INFO)
    logging.getLogger("trace.worker").setLevel(logging.INFO)
    logging.getLogger("trace.auth").setLevel(logging.INFO)