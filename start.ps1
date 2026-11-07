# VyapariMitra AI — PowerShell One-Click Launcher
# Great Indian AI Internship Challenge by Gnani.ai

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   VYAPARIMITRA AI — YOUR BUSINESS. YOUR VOICE. YOUR LANGUAGE." -ForegroundColor Green
Write-Host "   Great Indian AI Internship Challenge by Gnani.ai" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Initialize DB
Write-Host "[1/3] Initializing local database and demo seed data..." -ForegroundColor Yellow
python -c "import asyncio; from backend.app.core.database import init_db; asyncio.run(init_db())"

# 2. Launch Backend
Write-Host "[2/3] Launching FastAPI Backend on http://localhost:8000 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload"

# 3. Launch Frontend
Write-Host "[3/3] Launching React Vite Frontend on http://localhost:5173 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location frontend; npm.cmd run dev"

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Green
Write-Host " VYAPARIMITRA AI IS RUNNING!" -ForegroundColor Green
Write-Host " - Frontend Dashboard: http://localhost:5173" -ForegroundColor White
Write-Host " - Backend API Docs:   http://localhost:8000/docs" -ForegroundColor White
Write-Host " - Demo Login:         Click 'Use Demo Store Credentials' on Login page" -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Green
Write-Host ""
