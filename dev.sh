#!/usr/bin/env bash
set -uo pipefail

# ── Config ─────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$SCRIPT_DIR/.dev-logs"
PID_FILE="$SCRIPT_DIR/.dev-pids"
BACKEND_PORT=8000
FRONTEND_PORT=5173

# ── Helpers ────────────────────────────────────────────────────────────

ensure_log_dir() {
  mkdir -p "$LOG_DIR"
}

read_pid() {
  local name="$1"
  if [[ -f "$PID_FILE" ]]; then
    grep "^${name}=" "$PID_FILE" 2>/dev/null | cut -d= -f2
  fi
}

write_pid() {
  local name="$1" pid="$2"
  # Remove old entry if present, then append
  if [[ -f "$PID_FILE" ]]; then
    grep -v "^${name}=" "$PID_FILE" > "${PID_FILE}.tmp" 2>/dev/null || true
    mv "${PID_FILE}.tmp" "$PID_FILE"
  fi
  echo "${name}=${pid}" >> "$PID_FILE"
}

remove_pid() {
  local name="$1"
  if [[ -f "$PID_FILE" ]]; then
    grep -v "^${name}=" "$PID_FILE" > "${PID_FILE}.tmp" 2>/dev/null || true
    mv "${PID_FILE}.tmp" "$PID_FILE"
  fi
}

is_running() {
  local pid="$1"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

# ── Start ──────────────────────────────────────────────────────────────

start_backend() {
  local pid
  pid=$(read_pid backend)
  if is_running "$pid"; then
    echo "Backend is already running (PID $pid)"
    return
  fi

  ensure_log_dir
  echo "Starting backend on port $BACKEND_PORT..."
  (cd "$SCRIPT_DIR/backend" && exec uv run uvicorn app.main:app --reload --port "$BACKEND_PORT" \
    >> "$LOG_DIR/backend.log" 2>&1) &
  local new_pid=$!
  write_pid backend "$new_pid"
  echo "Backend started (PID $new_pid) — logs: .dev-logs/backend.log"
}

start_frontend() {
  local pid
  pid=$(read_pid frontend)
  if is_running "$pid"; then
    echo "Frontend is already running (PID $pid)"
    return
  fi

  ensure_log_dir
  echo "Starting frontend on port $FRONTEND_PORT..."
  (cd "$SCRIPT_DIR/frontend" && exec npx vite --port "$FRONTEND_PORT" \
    >> "$LOG_DIR/frontend.log" 2>&1) &
  local new_pid=$!
  write_pid frontend "$new_pid"
  echo "Frontend started (PID $new_pid) — logs: .dev-logs/frontend.log"
}

start_all() {
  start_backend
  start_frontend
  echo ""
  echo "Both servers starting. Run './dev.sh status' to check."
  echo "  Backend:  http://localhost:$BACKEND_PORT"
  echo "  Frontend: http://localhost:$FRONTEND_PORT"
}

# ── Stop ───────────────────────────────────────────────────────────────

kill_tree() {
  # Recursively kill a process and all its children (macOS-compatible)
  local target_pid="$1" signal="${2:-TERM}"
  local children
  children=$(pgrep -P "$target_pid" 2>/dev/null || true)
  for child in $children; do
    kill_tree "$child" "$signal"
  done
  kill -"$signal" "$target_pid" 2>/dev/null || true
}

stop_process() {
  local name="$1"
  local pid
  pid=$(read_pid "$name")

  if is_running "$pid"; then
    echo "Stopping $name (PID $pid)..."
    kill_tree "$pid" TERM
    # Wait briefly for graceful shutdown
    for _ in 1 2 3 4 5; do
      is_running "$pid" || break
      sleep 0.5
    done
    # Force kill if still running
    if is_running "$pid"; then
      kill_tree "$pid" 9
    fi
  else
    echo "$name is not running (stale PID)"
  fi
  remove_pid "$name"

  # Fallback: kill anything still occupying the port
  local port_var="${name^^}_PORT"  # BACKEND_PORT or FRONTEND_PORT
  local port="${!port_var}"
  if [[ -n "$port" ]]; then
    local stragglers
    stragglers=$(lsof -ti:"$port" 2>/dev/null || true)
    if [[ -n "$stragglers" ]]; then
      echo "Killing leftover processes on port $port..."
      echo "$stragglers" | xargs kill -9 2>/dev/null || true
      sleep 0.5
    fi
  fi

  echo "$name stopped"
}

stop_all() {
  stop_process backend
  stop_process frontend
}

# ── Status ─────────────────────────────────────────────────────────────

show_status() {
  local backend_pid frontend_pid

  backend_pid=$(read_pid backend)
  frontend_pid=$(read_pid frontend)

  echo "STS Dev Servers"
  echo "───────────────────────────────────────"

  if is_running "$backend_pid"; then
    echo "  Backend:  running (PID $backend_pid) on port $BACKEND_PORT"
  else
    echo "  Backend:  stopped"
    if [[ -n "$backend_pid" ]]; then remove_pid backend; fi
  fi

  if is_running "$frontend_pid"; then
    echo "  Frontend: running (PID $frontend_pid) on port $FRONTEND_PORT"
  else
    echo "  Frontend: stopped"
    if [[ -n "$frontend_pid" ]]; then remove_pid frontend; fi
  fi

  return 0
}

# ── Logs ───────────────────────────────────────────────────────────────

show_logs() {
  local name="$1"
  local log_file="$LOG_DIR/${name}.log"

  if [[ ! -f "$log_file" ]]; then
    echo "No log file found for $name"
    exit 1
  fi

  echo "Tailing $name logs (Ctrl+C to detach)..."
  echo "───────────────────────────────────────"
  tail -f "$log_file"
}

# ── Usage ──────────────────────────────────────────────────────────────

usage() {
  cat <<EOF
Usage: ./dev.sh <command> [service]

Commands:
  start                Start both servers (default if no command given)
  stop                 Stop both servers
  restart [service]    Restart both servers, or just 'backend' / 'frontend'
  status               Show running status of both servers
  logs <service>       Tail logs for 'backend' or 'frontend' (Ctrl+C to detach)

Services: backend, frontend

Examples:
  ./dev.sh                     # Start both servers
  ./dev.sh status              # Check what's running
  ./dev.sh logs backend        # Follow backend logs
  ./dev.sh restart frontend    # Restart just the frontend
  ./dev.sh stop                # Stop everything
EOF
}

# ── Main ───────────────────────────────────────────────────────────────

cmd="${1:-start}"
service="${2:-}"

case "$cmd" in
  start)
    if [[ -n "$service" ]]; then
      case "$service" in
        backend)  start_backend ;;
        frontend) start_frontend ;;
        *) echo "Unknown service: $service"; usage; exit 1 ;;
      esac
    else
      start_all
    fi
    ;;
  stop)
    if [[ -n "$service" ]]; then
      stop_process "$service"
    else
      stop_all
    fi
    ;;
  restart)
    if [[ -n "$service" ]]; then
      stop_process "$service"
      case "$service" in
        backend)  start_backend ;;
        frontend) start_frontend ;;
        *) echo "Unknown service: $service"; usage; exit 1 ;;
      esac
    else
      stop_all
      start_all
    fi
    ;;
  status)
    show_status
    ;;
  logs)
    if [[ -z "$service" ]]; then
      echo "Usage: ./dev.sh logs <backend|frontend>"
      exit 1
    fi
    show_logs "$service"
    ;;
  help|--help|-h)
    usage
    ;;
  *)
    echo "Unknown command: $cmd"
    usage
    exit 1
    ;;
esac
