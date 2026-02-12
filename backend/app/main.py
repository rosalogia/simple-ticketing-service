import logging
import subprocess
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from .config import ALLOWED_ORIGINS, DEBUG
from .database import SessionLocal, engine
from .models import User
from .ratelimit import limiter
from .routers import auth, categories, comments, queues, tickets, users

logger = logging.getLogger(__name__)

BACKEND_DIR = str(Path(__file__).resolve().parent.parent)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run pending migrations on startup
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        capture_output=True, text=True, cwd=BACKEND_DIR,
    )
    if result.returncode != 0:
        logger.error("Alembic migration failed:\n%s", result.stderr)
    else:
        logger.info("Database migrations applied")

    # Reset connection pool so it picks up newly created tables
    engine.dispose()

    # Auto-seed in debug mode if DB is empty
    if DEBUG:
        db = SessionLocal()
        try:
            if db.query(User).count() == 0:
                logger.info("Debug mode: seeding default data...")
                db.close()
                from .seed import insert_sample_data
                insert_sample_data()
            else:
                db.close()
        except Exception as exc:
            logger.error("Auto-seed failed: %s", exc)
            db.close()

    yield


app = FastAPI(
    title="STS - Collaborative Ticketing System",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/api/docs" if DEBUG else None,
    redoc_url="/api/redoc" if DEBUG else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-User-Id"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(queues.router, prefix="/api/queues", tags=["queues"])
app.include_router(tickets.router, prefix="/api/tickets", tags=["tickets"])
app.include_router(comments.router, prefix="/api/tickets", tags=["comments"])
app.include_router(categories.router, prefix="/api/categories", tags=["categories"])


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.get("/api/health")
def health():
    return {"status": "ok"}
