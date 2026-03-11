#!/bin/bash
# 1. Clear any hanging ports to save memory
echo "🧹 Clearing ports..."
lsof -ti:5173,8000,4173 | xargs kill -9 2>/dev/null || true

# 2. Start the backend
echo "🚀 Starting backend (Uvicorn)..."
(cd backend && ./venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 > uvicorn.log 2>&1) &

# 3. Build and Preview the Frontend
echo "📦 Building production frontend (this takes a minute but saves massive RAM)..."
cd frontend
npm run build

echo "⚡ Starting Vite Preview server (Low Memory Mode)..."
# Vite preview runs on port 4173 by default. We'll force it to 5173 to match your existing URLs.
npm run preview -- --host 127.0.0.1 --port 5173
