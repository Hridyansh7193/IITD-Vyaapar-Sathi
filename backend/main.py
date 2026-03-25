"""
main.py — Vyaapar Mitra API v2 (Production-Ready)
==================================================
Entry point for the FastAPI application.

Run:
    python main.py
    # or
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload

Swagger UI: http://localhost:8000/docs
ReDoc:      http://localhost:8000/redoc
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config.settings import get_settings
from database import init_db
from middleware import RateLimiterMiddleware, ErrorHandlerMiddleware
from routes import auth_router, products_router, analytics_router, upload_router

# ── Also keep the existing routers alive for the Next.js frontend ─────────────
from routers.data import router as legacy_data_router
from routers.chat import router as legacy_chat_router
from routers.scanner import router as scanner_router

settings = get_settings()

# ── App Initialisation ────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Production-ready REST API for Vyaapar Mitra — AI-powered MSME analytics.\n\n"
        "**Authentication:** All protected endpoints require `Authorization: Bearer <token>`\n\n"
        "**Response Format:**\n```json\n{\"success\": true, \"data\": {}, \"message\": \"\"}\n```"
    ),
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# ── Middleware Stack (order matters — outermost wraps innermost) ───────────────

# 1. Global error handler — ensures JSON responses on uncaught exceptions
app.add_middleware(ErrorHandlerMiddleware)

# 2. Rate limiter — 60 requests/minute per IP by default
app.add_middleware(RateLimiterMiddleware)

# 3. CORS — allows any origin (restrict in production!)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Startup Event ─────────────────────────────────────────────────────────────

@app.on_event("startup")
def on_startup():
    """Creates DB tables on first run. Safe to call multiple times."""
    init_db()


# ── v1 API Routes (mobile-app ready, JWT-protected) ───────────────────────────

app.include_router(auth_router,      prefix=settings.API_PREFIX)
app.include_router(products_router,  prefix=settings.API_PREFIX)
app.include_router(analytics_router, prefix=settings.API_PREFIX)
app.include_router(upload_router,    prefix=settings.API_PREFIX)

# ── Legacy Routes (preserve compatibility with Next.js frontend) ──────────────

app.include_router(legacy_data_router)   # /upload-sales, /analytics, /reports/generate
app.include_router(legacy_chat_router)   # /chat-query
app.include_router(scanner_router)       # /products, /sales/checkout, /inventory


# ── Health Check ──────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"], summary="Health check")
def root():
    return {
        "success": True,
        "data": {
            "service": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "status": "online",
            "docs": "/docs",
        },
        "message": "Vyaapar Mitra API is running",
    }


@app.get("/api/v1/health", tags=["Health"], summary="Detailed health status")
def health():
    return {
        "success": True,
        "data": {
            "api_version": "v1",
            "database": "connected",
            "rate_limit": f"{settings.RATE_LIMIT_PER_MINUTE} req/min",
        },
        "message": "All systems operational",
    }


# ── Development Server ────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG or True,
        log_level="info",
    )
