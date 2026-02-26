#!/usr/bin/env bash
set -euo pipefail

BACKEND_PORT="${BACKEND_PORT:-8001}"
DETOX_CONFIG="${DETOX_CONFIG:-android.emu.debug}"
BACKEND_DIR="$(cd "$(dirname "$0")/../../backend" && pwd)"
MOBILE_DIR="$(cd "$(dirname "$0")/.." && pwd)"

DB_NAME="sts_e2e"

# Build DATABASE_URL the same way as reset-test-db.sh
if [ "${CI:-}" = "true" ]; then
  PGHOST="${PGHOST:-localhost}"
  PGPORT="${PGPORT:-5432}"
  PGUSER="${PGUSER:-sts}"
  PGPASSWORD="${PGPASSWORD:-test}"
else
  PGHOST="${PGHOST:-localhost}"
  PGPORT="${PGPORT:-5435}"
fi

PG_USER_PART=""
if [ -n "${PGPASSWORD:-}" ]; then
  PG_USER_PART="${PGUSER}:${PGPASSWORD}@"
elif [ -n "${PGUSER:-}" ]; then
  PG_USER_PART="${PGUSER}@"
fi

export DATABASE_URL="postgresql://${PG_USER_PART}${PGHOST}:${PGPORT}/${DB_NAME}"
export DEBUG="true"

BACKEND_PID=""

cleanup() {
  echo "Cleaning up..."
  if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
  adb reverse --remove tcp:8000 2>/dev/null || true
}
trap cleanup EXIT

# Start backend on port 8001
echo "Starting backend on port $BACKEND_PORT..."
cd "$BACKEND_DIR"
uv run uvicorn app.main:app --host 0.0.0.0 --port "$BACKEND_PORT" &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend health check..."
for i in $(seq 1 30); do
  if curl -sf "http://localhost:${BACKEND_PORT}/api/health" > /dev/null 2>&1; then
    echo "Backend is ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "Backend failed to start within 30 seconds."
    exit 1
  fi
  sleep 1
done

# Forward emulator port 8000 -> host port 8001
echo "Setting up adb reverse: emulator:8000 -> host:$BACKEND_PORT"
adb reverse tcp:8000 "tcp:$BACKEND_PORT"

# Run Detox tests
cd "$MOBILE_DIR"
npx detox test --configuration "$DETOX_CONFIG" "$@"
