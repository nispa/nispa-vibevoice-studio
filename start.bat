@echo off
setlocal enabledelayedexpansion

echo =======================================
echo    Nispa VibeVoice Studio - Launcher
echo =======================================

:: --- SoX Runtime Patch ---
:: Check if 'sox' is in PATH, if not try to add common installation paths
sox --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [i] SoX not found in system PATH. Searching in common locations...
    set "SOX_SEARCH_PATH=C:\Program Files (x86)\sox-14-4-2"
    if exist "!SOX_SEARCH_PATH!\sox.exe" (
        echo [OK] Found SoX at !SOX_SEARCH_PATH!. Adding to session PATH.
        set "PATH=%PATH%;!SOX_SEARCH_PATH!"
    ) else (
        echo [!] WARNING: SoX not found. Qwen3 cloning may fail.
        echo     Install it from: http://sox.sourceforge.net/
    )
) else (
    echo [OK] SoX is correctly configured in PATH.
)
:: -------------------------

echo.
echo Starting Backend Server...
:: We pass the updated PATH to the new process
start "VibeVoice Backend" powershell -NoExit -Command "$env:PATH='%PATH%'; cd backend; ..\venv\Scripts\Activate.ps1; uvicorn main:app --reload"

echo.
echo Starting Frontend Server...
start "VibeVoice Frontend" powershell -NoExit -Command "cd frontend; npm run dev"

echo.
echo Launching browser...
timeout /t 3 /nobreak >nul
start "" "http://localhost:5173/"

echo.
echo =======================================
echo Servers are starting in separate windows.
echo Close them to stop the application.
echo =======================================
endlocal
