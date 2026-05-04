@echo off
title CritiqAI — ML Model Audit Agent

echo.
echo  ===================================
echo   CritiqAI — Starting Services
echo  ===================================
echo.

REM Start FastAPI Backend
echo [1/2] Starting Backend (FastAPI on port 8000)...
start "CritiqAI Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

REM Brief delay so backend can start
timeout /t 3 /nobreak >nul

REM Start Vite Frontend
echo [2/2] Starting Frontend (Vite on port 5173)...
start "CritiqAI Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo  ✅ Both services launched!
echo.
echo  Frontend → http://localhost:5173
echo  Backend  → http://localhost:8000
echo  API Docs → http://localhost:8000/docs
echo.
echo  Close the two terminal windows to stop services.
echo.
pause
