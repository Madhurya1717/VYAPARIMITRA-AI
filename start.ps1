
# VyapariMitra AI - One-Click Launcher

Set-Location $PSScriptRoot

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   VYAPARIMITRA AI - YOUR BUSINESS. YOUR VOICE. YOUR LANGUAGE." -ForegroundColor Green
Write-Host "   Great Indian AI Internship Challenge by Gnani.ai" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# 1. Launch Backend
Write-Host "`n[1/2] Launching FastAPI Backend on port 8001..." -ForegroundColor Yellow

Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$PSScriptRoot'; python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8001 --reload"

# 2. Launch Frontend
Write-Host "`n[2/2] Launching React Frontend..." -ForegroundColor Yellow

Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$PSScriptRoot\frontend'; npm.cmd run dev"

Write-Host "`n======================================================================" -ForegroundColor Green
Write-Host " VYAPARIMITRA AI STARTUP COMMANDS SENT!" -ForegroundColor Green
Write-Host " Frontend: http://localhost:5173" -ForegroundColor White
Write-Host " Backend:  http://127.0.0.1:8001/docs" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Green
