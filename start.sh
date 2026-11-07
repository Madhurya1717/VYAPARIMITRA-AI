#!/usr/bin/env bash
# VyapariMitra AI — Bash One-Click Launcher
# Great Indian AI Internship Challenge by Gnani.ai

echo "======================================================================"
echo "   VYAPARIMITRA AI — YOUR BUSINESS. YOUR VOICE. YOUR LANGUAGE."
echo "   Great Indian AI Internship Challenge by Gnani.ai"
echo "======================================================================"
echo ""

echo "[1/3] Initializing local database and demo seed data..."
python3 -c "import asyncio; from backend.app.core.database import init_db; asyncio.run(init_db())"

echo "[2/3] Launching FastAPI Backend on http://localhost:8000 ..."
python3 -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

echo "[3/3] Launching React Vite Frontend on http://localhost:5173 ..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "======================================================================"
echo " VYAPARIMITRA AI IS RUNNING!"
echo " - Frontend Dashboard: http://localhost:5173"
echo " - Backend API Docs:   http://localhost:8000/docs"
echo " - Demo Login:         Click 'Use Demo Store Credentials' on Login page"
echo "======================================================================"
echo ""

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
