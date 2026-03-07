@echo off
echo =======================================
echo Starting VibeVoice Studio...
echo =======================================

echo.
echo Starting Backend Server...
start "VibeVoice Backend" powershell -NoExit -Command "cd backend; ..\venv\Scripts\Activate.ps1; uvicorn main:app --reload"

echo.
echo Starting Frontend Server...
start "VibeVoice Frontend" powershell -NoExit -Command "cd frontend; npm run dev"

echo.
echo Launching browser...
start "" "http://localhost:5173/"

echo.
echo Servers are starting in separate PowerShell windows.
echo Close those windows to stop the servers.
