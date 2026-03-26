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

import warnings
# Silence google-generativeai deprecation warning early
warnings.filterwarnings("ignore", message="All support for the `google.generativeai` package has ended.*")

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from services import notification_service

from config.settings import get_settings
from database import init_db
from middleware import RateLimiterMiddleware, ErrorHandlerMiddleware
from routes import auth_router, products_router, analytics_router, upload_router

# ── Also keep the existing routers alive for the Next.js frontend ─────────────
from routers.data import router as legacy_data_router
from routers.chat import router as legacy_chat_router
from routers.scanner import router as scanner_router
from routers.ai_inventory import router as ai_inventory_router
from profit_engine.router import router as profit_router
from liquidity_engine.router import router as liquidity_router

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup Logic ---
    try:
        init_db()
        print("✅ Database initialized.")
    except Exception as e:
        print(f"⚠️  Database initialization failed: {e}")

    # Set up APScheduler for Daily Alerts
    scheduler = AsyncIOScheduler()
    
    # 1. Daily Snapshot at 9:00 PM
    scheduler.add_job(notification_service.send_daily_snapshot, 'cron', hour=21, minute=0)
    
    # 2. Check for Missed Sales at 10:00 PM
    scheduler.add_job(notification_service.check_missed_sales, 'cron', hour=22, minute=0)
    
    scheduler.start()
    print("⏰ Vyaapar-Sathi Scheduler Started.")

    yield
    
    # --- Shutdown Logic ---
    scheduler.shutdown()
    print("🛑 Scheduler shutdown.")

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
    lifespan=lifespan
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

# ── v1 API Routes (mobile-app ready, JWT-protected) ───────────────────────────

app.include_router(auth_router,      prefix=settings.API_PREFIX)
app.include_router(products_router,  prefix=settings.API_PREFIX)
app.include_router(analytics_router, prefix=settings.API_PREFIX)
app.include_router(upload_router,    prefix=settings.API_PREFIX)

# ── Legacy Routes (preserve compatibility with Next.js frontend) ──────────────

app.include_router(legacy_data_router)   # /upload-sales, /analytics, /reports/generate
app.include_router(legacy_chat_router)   # /chat-query
app.include_router(scanner_router)       # /products, /sales/checkout, /inventory
app.include_router(ai_inventory_router)  # /ai/parse-inventory
app.include_router(profit_router)        # /v2/products, /v2/sales/checkout, /v2/inventory/add
app.include_router(liquidity_router)     # /liquidity/initialize, /liquidity/status, /liquidity/expense


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
    import os
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info",
    )
