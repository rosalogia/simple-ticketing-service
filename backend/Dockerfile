FROM python:3.13-slim

WORKDIR /app

# Install uv for fast dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Install dependencies
COPY pyproject.toml .
RUN uv pip install --system ".[postgres]"

# Copy application code
COPY alembic.ini .
COPY alembic/ alembic/
COPY app/ app/

# Migrations run automatically on app startup (main.py lifespan)
# Railway sets $PORT; fall back to 8000 for local Docker
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
