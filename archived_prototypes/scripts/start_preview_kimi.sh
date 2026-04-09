#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
LOG_DIR="$ROOT_DIR/logs"
RUN_DIR="$ROOT_DIR/run"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"
BACKEND_PID_FILE="$RUN_DIR/backend.pid"
FRONTEND_PID_FILE="$RUN_DIR/frontend.pid"

mkdir -p "$LOG_DIR" "$RUN_DIR"
: > "$BACKEND_LOG"
: > "$FRONTEND_LOG"

log() {
    printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}

fail() {
    printf 'ERROR: %s\n' "$1" >&2
    exit 1
}

kill_from_pid_file() {
    local pid_file="$1"
    if [[ ! -f "$pid_file" ]]; then
        return
    fi

    local pid
    pid="$(cat "$pid_file" 2>/dev/null || true)"
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
        kill "$pid" 2>/dev/null || true
        sleep 1
        if kill -0 "$pid" 2>/dev/null; then
            kill -9 "$pid" 2>/dev/null || true
        fi
        wait "$pid" 2>/dev/null || true
    fi
    rm -f "$pid_file"
}

kill_bound_ports() {
    if ! command -v lsof >/dev/null 2>&1; then
        return
    fi

    local pids
    pids="$(lsof -ti:5173,4173,8000 2>/dev/null || true)"
    if [[ -n "$pids" ]]; then
        log "Clearing stale preview/backend processes on ports 5173, 4173, 8000."
        # shellcheck disable=SC2086
        kill -9 $pids 2>/dev/null || true
    fi
}

wait_for_url() {
    local url="$1"
    local label="$2"
    local attempts="${3:-30}"

    for ((i = 1; i <= attempts; i++)); do
        if curl -fsS "$url" >/dev/null 2>&1; then
            return 0
        fi
        sleep 1
    done

    fail "Timed out waiting for ${label} at ${url}. Check logs in ${LOG_DIR}."
}

cleanup() {
    kill_from_pid_file "$FRONTEND_PID_FILE"
    kill_from_pid_file "$BACKEND_PID_FILE"
}

trap cleanup EXIT INT TERM

[[ -x "$BACKEND_DIR/venv/bin/python" ]] || fail "Missing backend virtualenv at ${BACKEND_DIR}/venv. Run: python3 -m venv backend/venv && backend/venv/bin/pip install -r backend/requirements.txt"
[[ -x "$FRONTEND_DIR/node_modules/.bin/vite" ]] || fail "Missing frontend dependencies in ${FRONTEND_DIR}/node_modules. Run: (cd frontend && npm ci)"
command -v npm >/dev/null 2>&1 || fail "npm is required but was not found in PATH."
command -v curl >/dev/null 2>&1 || fail "curl is required but was not found in PATH."

[[ -f "$BACKEND_DIR/.env" ]] || fail "Missing ${BACKEND_DIR}/.env. Copy backend/.env.example and set GEMINI_API_KEY before launching preview."
set -a
# shellcheck disable=SC1091
source "$BACKEND_DIR/.env"
set +a

: "${GEMINI_API_KEY:?Missing GEMINI_API_KEY in backend/.env.}"

if [[ -f "$FRONTEND_DIR/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$FRONTEND_DIR/.env"
    set +a
fi

if [[ -f "$FRONTEND_DIR/.env.local" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$FRONTEND_DIR/.env.local"
    set +a
fi

export VITE_API_URL="${VITE_API_URL:-http://127.0.0.1:8000}"
if [[ -z "${VITE_GOOGLE_CLIENT_ID:-}" && -n "${GOOGLE_CLIENT_ID:-}" ]]; then
    export VITE_GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID"
fi

if [[ -z "${VITE_GOOGLE_CLIENT_ID:-}" ]]; then
    log "Warning: VITE_GOOGLE_CLIENT_ID is not set. Google sign-in will be unavailable in local preview."
fi

kill_from_pid_file "$FRONTEND_PID_FILE"
kill_from_pid_file "$BACKEND_PID_FILE"
kill_bound_ports

log "Starting backend on http://127.0.0.1:8000"
(
    cd "$BACKEND_DIR"
    exec "$BACKEND_DIR/venv/bin/python" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
) >>"$BACKEND_LOG" 2>&1 &
echo "$!" > "$BACKEND_PID_FILE"

wait_for_url "http://127.0.0.1:8000/health" "backend health"

log "Building frontend preview against ${VITE_API_URL}"
(
    cd "$FRONTEND_DIR"
    npm run build
    cp dist/index.html dist/404.html
) >>"$FRONTEND_LOG" 2>&1 || fail "Frontend build failed. See ${FRONTEND_LOG}."

log "Starting frontend preview on http://127.0.0.1:5173"
(
    cd "$FRONTEND_DIR"
    exec npm run preview -- --host 127.0.0.1 --port 5173
) >>"$FRONTEND_LOG" 2>&1 &
echo "$!" > "$FRONTEND_PID_FILE"

wait_for_url "http://127.0.0.1:5173" "frontend preview"

log "MAIT preview is live."
log "Frontend: http://127.0.0.1:5173"
log "Backend:  http://127.0.0.1:8000"
log "Logs:     ${LOG_DIR}"

wait "$(cat "$FRONTEND_PID_FILE")"
