import logging
import subprocess
import sys
import time as _time
from contextlib import asynccontextmanager
from pathlib import Path

from .logging_config import configure_logging

configure_logging()

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text

from .config import ALLOWED_ORIGINS, COMMIT_SHA, DEBUG, DISCORD_BOT_TOKEN, FCM_ENABLED
from .database import SessionLocal, collect_pool_metrics, engine
from .fcm import _initialized as fcm_initialized
from .fcm import init_fcm
from .middleware import InstrumentationMiddleware
from .models import Queue, User
from .ratelimit import limiter
from .routers import api_keys, auth, categories, comments, devices, invites, notifications, queues, settings, tickets, users
from .scheduler import scheduler, start_scheduler, stop_scheduler

logger = logging.getLogger(__name__)

BACKEND_DIR = str(Path(__file__).resolve().parent.parent)

_startup_time: float | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _startup_time

    # Run pending migrations on startup
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        capture_output=True, text=True, cwd=BACKEND_DIR,
    )
    if result.returncode != 0:
        logger.error("Alembic migration failed:\n%s", result.stderr)
        sys.exit(1)
    else:
        logger.info("Database migrations applied")

    # Reset connection pool so it picks up newly created tables
    engine.dispose()

    # Auto-seed in debug mode if DB is empty
    if DEBUG:
        db = SessionLocal()
        try:
            if db.query(Queue).count() == 0:
                logger.info("Debug mode: seeding default data...")
                db.close()
                from .seed import insert_sample_data
                insert_sample_data()
            else:
                db.close()
        except Exception as exc:
            logger.error("Auto-seed failed: %s", exc)
            db.close()

    # Initialize FCM
    if FCM_ENABLED:
        init_fcm()

    start_scheduler()

    if DISCORD_BOT_TOKEN:
        from .discord_bot import start_bot

        await start_bot()

    _startup_time = _time.monotonic()

    yield

    if DISCORD_BOT_TOKEN:
        from .discord_bot import stop_bot

        await stop_bot()

    # Shutdown scheduler
    stop_scheduler()


app = FastAPI(
    title="STS - Collaborative Ticketing System",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-User-Id", "X-Api-Key"],
)

app.add_middleware(InstrumentationMiddleware)

app.include_router(api_keys.router, prefix="/api/api-keys", tags=["api-keys"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(queues.router, prefix="/api/queues", tags=["queues"])
app.include_router(tickets.router, prefix="/api/tickets", tags=["tickets"])
app.include_router(comments.router, prefix="/api/tickets", tags=["comments"])
app.include_router(categories.router, prefix="/api/categories", tags=["categories"])
app.include_router(devices.router, prefix="/api/devices", tags=["devices"])
app.include_router(settings.router, prefix="/api/queues", tags=["settings"])
app.include_router(invites.router, prefix="/api", tags=["invites"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.get("/metrics")
def metrics(request: Request):
    if not DEBUG and not request.headers.get("host", "").endswith(".railway.internal"):
        raise HTTPException(status_code=404)
    collect_pool_metrics()
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/api/health")
def health():
    checks: dict[str, str] = {}

    # DB check
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        checks["db"] = "ok"
    except Exception:
        checks["db"] = "error"

    # Scheduler check
    checks["scheduler"] = "ok" if scheduler.running else "error"

    # FCM check
    from .fcm import _initialized as _fcm_init

    checks["fcm"] = "ok" if _fcm_init else "not_initialized"

    status = "ok" if checks["db"] == "ok" and checks["scheduler"] == "ok" else "degraded"

    uptime_seconds = round(_time.monotonic() - _startup_time, 1) if _startup_time else 0

    return {
        "status": status,
        "commit": COMMIT_SHA,
        "uptime_seconds": uptime_seconds,
        "checks": checks,
    }
