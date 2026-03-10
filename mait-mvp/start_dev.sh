#!/bin/bash
# Clear ports
lsof -ti:5173,8000 | xargs kill -9 2>/dev/null || true
echo "Ports cleared"

# Start uvicorn
(cd backend && python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 > uvicorn.log 2>&1) &
echo "Uvicorn started"

# Start vite
(cd frontend && npm run dev -- --host 127.0.0.1 > vite.log 2>&1) &
echo "Vite started"

# Wait for them to initialize
sleep 5
echo "Logs should have content now."
