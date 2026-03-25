"""
middleware/rate_limiter.py
==========================
Simple in-memory rate limiter middleware.
Limits each IP to RATE_LIMIT_PER_MINUTE requests per minute.
For production, replace with Redis-backed SlowAPI or similar.
"""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict
from datetime import datetime, timedelta
import asyncio
from config.settings import get_settings

settings = get_settings()

# { ip_address: [timestamp1, timestamp2, ...] }
_request_log: dict[str, list] = defaultdict(list)
_lock = asyncio.Lock()


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """
    Sliding window rate limiter.
    Returns HTTP 429 when a client exceeds RATE_LIMIT_PER_MINUTE requests/min.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip rate limiting on docs and health check
        if request.url.path in ("/", "/docs", "/redoc", "/openapi.json"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = datetime.utcnow()
        window_start = now - timedelta(minutes=1)

        async with _lock:
            # Remove timestamps outside the 1-minute window
            _request_log[client_ip] = [
                ts for ts in _request_log[client_ip] if ts > window_start
            ]

            if len(_request_log[client_ip]) >= settings.RATE_LIMIT_PER_MINUTE:
                return Response(
                    content='{"success":false,"data":null,"message":"Rate limit exceeded. Try again in a minute."}',
                    status_code=429,
                    media_type="application/json",
                )

            _request_log[client_ip].append(now)

        return await call_next(request)
