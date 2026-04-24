# MAIT

## Setup

### Database setup

MAIT uses Postgres in production. For local development you can either:

1. Use Neon (recommended) and paste its connection string into `.env` as `DATABASE_URL`.
2. Run local Postgres via Docker: `docker-compose up db` and use `postgresql+asyncpg://mait:mait_dev_password@localhost:5432/mait_dev`.

### Backend

1. Copy `backend/.env.example` to `backend/.env`.
2. Install backend dependencies from `backend/requirements.txt`.
3. Run Alembic migrations before starting the API.
