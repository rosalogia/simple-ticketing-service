"""HTTP instrumentation middleware.

Records Prometheus metrics and emits a structured log line per request.
"""

from __future__ import annotations

import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from .metrics import HTTP_REQUEST_DURATION, HTTP_REQUESTS_TOTAL

logger = logging.getLogger(__name__)


class InstrumentationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        start = time.perf_counter()
        response = await call_next(request)
        duration = time.perf_counter() - start

        # Use the route pattern to avoid cardinality explosion on path params
        route = getattr(request.scope.get("route"), "path", "unmatched")
        method = request.method
        status_code = str(response.status_code)

        HTTP_REQUESTS_TOTAL.labels(method=method, route=route, status_code=status_code).inc()
        HTTP_REQUEST_DURATION.labels(method=method, route=route, status_code=status_code).observe(duration)

        user_id = getattr(request.state, "user_id", None)

        logger.info(
            "HTTP %s %s %s",
            method,
            request.url.path,
            status_code,
            extra={
                "request_id": request_id,
                "method": method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round(duration * 1000, 2),
                "user_id": user_id,
            },
        )

        return response
