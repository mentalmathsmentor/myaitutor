#!/bin/bash
# MAIT dogfood cold start — backend + frontend + tailscale serve.
# Target: session-ready in < 2 minutes. See "Dogfood cold start" in README.md.
set -e
cd "$(dirname "$0")"

# 0. Preflight: env
if [ -z "$GEMINI_API_KEY" ] && ! grep -q "^GEMINI_API_KEY=." backend/.env 2>/dev/null; then
    echo "WARNING: GEMINI_API_KEY not set (env or backend/.env) — generation will fail."
fi
if [ -z "$DATABASE_URL" ] && ! grep -q "^DATABASE_URL=." backend/.env 2>/dev/null; then
    echo "WARNING: DATABASE_URL not set (env or backend/.env) — backend will not boot."
fi

# 1. Clear ports
lsof -ti:5173,8000 | xargs kill -9 2>/dev/null || true
echo "Ports cleared"

# 2. Backend (FastAPI on 8000)
(cd backend && ./venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 > uvicorn.log 2>&1) &
echo "Uvicorn starting on :8000 (backend/uvicorn.log)"

# 3. Frontend (Vite dev server on 5173; proxies /api + /canvas to :8000)
(cd frontend && npm run dev -- --host 127.0.0.1 > vite.log 2>&1) &
echo "Vite starting on :5173 (frontend/vite.log)"

sleep 5

# 4. Tailscale serve — tablet access during sessions. No public exposure
#    (serve, NOT funnel). HTTPS on the tailnet fronting the Vite dev server.
if command -v tailscale >/dev/null 2>&1; then
    tailscale serve --bg http://127.0.0.1:5173
    echo "tailscale serve active → https://$(tailscale status --json 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))' 2>/dev/null || echo '<your-machine>.<tailnet>.ts.net')"
    echo "Open /teach on the tablet from that URL."
else
    echo "tailscale not installed — laptop-only at http://127.0.0.1:5173/teach"
fi

echo "Cold start complete."
