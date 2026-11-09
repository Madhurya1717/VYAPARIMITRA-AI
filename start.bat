@echo off
TITLE VyapariMitra AI — Launcher
COLOR 0A

echo ======================================================================
echo    VYAPARIMITRA AI — YOUR BUSINESS. YOUR VOICE. YOUR LANGUAGE.
echo    Great Indian AI Internship Challenge by Gnani.ai
echo ======================================================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python 3.10+ is required but not found in PATH.
    pause
    exit /b 1
)

:: Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js 18+ is required but not found in PATH.
    pause
    exit /b 1
)

echo [1/3] Initializing local database and demo seed data...
python -c "import asyncio; from backend.app.core.database import init_db; asyncio.run(init_db())"

echo [2/3] Launching FastAPI Backend on http://localhost:8000 ...
start "VyapariMitra Backend (Port 8000)" cmd /k "python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [3/3] Launching React Vite Frontend on http://localhost:5173 ...
cd frontend
start "VyapariMitra Frontend (Port 5173)" cmd /k "npm.cmd run dev"
cd ..

echo.
echo ======================================================================
echo  VYAPARIMITRA AI IS RUNNING!
echo  - Frontend Dashboard: http://localhost:5173
echo  - Backend API Docs:   http://localhost:8000/docs
echo  - Demo Login:         Click 'Use Demo Store Credentials' on Login page
echo ======================================================================
echo.
pause

