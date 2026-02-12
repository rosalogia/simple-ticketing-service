from __future__ import annotations

import os
import sys

from dotenv import load_dotenv

load_dotenv()

DEBUG = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")

DISCORD_CLIENT_ID = os.getenv("DISCORD_CLIENT_ID") or None
DISCORD_CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET") or None
DISCORD_REDIRECT_URI = os.getenv(
    "DISCORD_REDIRECT_URI", "http://localhost:5173/api/auth/callback"
)
SESSION_SECRET_KEY = os.getenv(
    "SESSION_SECRET_KEY", "dev-insecure-key-change-me"
)
DISCORD_BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN") or None
DISCORD_REDIRECT_URI_MOBILE = os.getenv(
    "DISCORD_REDIRECT_URI_MOBILE",
    "http://localhost:8000/api/auth/callback/mobile",
)
# Railway Postgres addon may provide postgres:// which SQLAlchemy doesn't accept
_raw_db_url = os.getenv("DATABASE_URL", "sqlite:///./sts.db")
DATABASE_URL = _raw_db_url.replace("postgres://", "postgresql://", 1) if _raw_db_url.startswith("postgres://") else _raw_db_url
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if o.strip()
]

# Validate required config in production
if not DEBUG:
    _missing = []
    if not DISCORD_CLIENT_ID:
        _missing.append("DISCORD_CLIENT_ID")
    if not DISCORD_CLIENT_SECRET:
        _missing.append("DISCORD_CLIENT_SECRET")
    if SESSION_SECRET_KEY == "dev-insecure-key-change-me":
        _missing.append("SESSION_SECRET_KEY (must not be default)")
    if _missing:
        print(
            f"FATAL: Missing required config for production: {', '.join(_missing)}\n"
            "Set DEBUG=true for local development.",
            file=sys.stderr,
        )
        sys.exit(1)


def is_dev_mode() -> bool:
    """Dev mode when DEBUG=true is explicitly set."""
    return DEBUG
