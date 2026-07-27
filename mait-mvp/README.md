# MAIT

## Dogfood cold start (< 2 min)

Session-day startup for the Tutor V1 cockpit (`/teach`). One command:

```bash
./start_dogfood.sh
```

That clears ports, starts the backend (uvicorn on `:8000`), the frontend
(Vite on `:5173`, proxying `/api` + `/canvas` to the backend), and — if
`tailscale` is installed — runs `tailscale serve --bg http://127.0.0.1:5173`
for tablet access over the tailnet (serve, **not** funnel: no public
exposure). Open `/teach` on the tablet at the printed `*.ts.net` URL.

Manual equivalent:

```bash
# terminal 1 — backend (needs DATABASE_URL + GEMINI_API_KEY in backend/.env)
cd backend && ./venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# terminal 2 — frontend
cd frontend && npm run dev -- --host 127.0.0.1

# terminal 3 — tablet access (once per boot; --bg persists)
tailscale serve --bg http://127.0.0.1:5173
# check:  tailscale serve status        stop:  tailscale serve --https=443 off
```

**Pre-first-session smoke (mandatory, Phase 4):** with the backend running
against the real Neon DB and a real Gemini key:

```bash
cd backend && python scripts/mock_session_smoke.py
```

It drives the full Done-line loop (S1 → generate with memory context →
Cerberus incl. a planted wrong solution → deck→Canvas export → pdflatex
compile → PDF → check-in), enforces the ship gates (real syllabus chunks
retrieved, Cerberus catches the planted error, no misconception
meta-commentary in question text, session row written), and prints per-step
timings against the 10-minute Done line. `--echo` runs mechanics-only
against a `MAIT_PROMPT_ECHO=1` backend (no model calls). `pdflatex` must be
on PATH for the compile step.

## Setup

### Database setup

MAIT uses Postgres in production. For local development you can either:

1. Use Neon (recommended) and paste its connection string into `.env` as `DATABASE_URL`.
2. Run local Postgres via Docker: `docker-compose up db` and use `postgresql+asyncpg://mait:mait_dev_password@localhost:5432/mait_dev`.

### Backend

1. Copy `backend/.env.example` to `backend/.env`.
2. Install backend dependencies from `backend/requirements.txt`.
3. Run Alembic migrations before starting the API.
