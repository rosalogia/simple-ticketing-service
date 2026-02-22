#!/usr/bin/env bash
set -euo pipefail

DB_NAME="sts_e2e"
BACKEND_PORT="${BACKEND_PORT:-8001}"
BACKEND_DIR="$(cd "$(dirname "$0")/../../backend" && pwd)"

# Kill any stale backend server from a previous interrupted run.
# Without this, Playwright's reuseExistingServer would reuse a backend
# whose DB connections are broken after we drop/recreate the database.
if command -v lsof &>/dev/null; then
  STALE_PID=$(lsof -ti :"$BACKEND_PORT" 2>/dev/null || true)
  if [ -n "$STALE_PID" ]; then
    echo "Killing stale backend on port $BACKEND_PORT (PID $STALE_PID)..."
    kill "$STALE_PID" 2>/dev/null || true
    sleep 0.5
  fi
fi

# CI environment: port 5432, user/password auth
if [ "${CI:-}" = "true" ]; then
  export PGHOST="${PGHOST:-localhost}"
  export PGPORT="${PGPORT:-5432}"
  export PGUSER="${PGUSER:-sts}"
  export PGPASSWORD="${PGPASSWORD:-test}"
else
  # Local nix devshell: port 5435, peer auth
  export PGHOST="${PGHOST:-localhost}"
  export PGPORT="${PGPORT:-5435}"
fi

PG_USER_PART=""
if [ -n "${PGPASSWORD:-}" ]; then
  PG_USER_PART="${PGUSER}:${PGPASSWORD}@"
elif [ -n "${PGUSER:-}" ]; then
  PG_USER_PART="${PGUSER}@"
fi

export DATABASE_URL="postgresql://${PG_USER_PART}${PGHOST}:${PGPORT}/${DB_NAME}"

echo "Resetting database $DB_NAME on port $PGPORT..."

# Terminate any active connections before dropping
psql -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" > /dev/null 2>&1 || true

dropdb --if-exists "$DB_NAME"
createdb "$DB_NAME"

echo "Database $DB_NAME created. Running migrations and seed..."

# Run alembic migrations and seed data so the backend starts ready
cd "$BACKEND_DIR"
uv run python -m alembic upgrade head
uv run python -m app.seed

echo "Database $DB_NAME fully seeded and ready."
