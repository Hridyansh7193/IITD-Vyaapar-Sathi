"""
middleware/error_handler.py
============================
Global exception handler middleware.
Catches unhandled exceptions and returns a consistent API response
so the mobile app never receives an HTML error page.
"""

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import logging
import traceback

logger = logging.getLogger("vyaapar.errors")


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        try:
            return await call_next(request)
        except Exception as exc:
            # Log full traceback server-side
            logger.error(
                "Unhandled exception on %s %s:\n%s",
                request.method,
                request.url.path,
                traceback.format_exc(),
            )
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "data": None,
                    "message": "An internal server error occurred. Please try again.",
                },
            )
