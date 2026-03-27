@echo off
setlocal enabledelayedexpansion
echo =======================================
echo    Nispa VibeVoice Studio - Launcher
echo =======================================

:: --- SoX Runtime Patch ---
:: If sox is not in PATH, search common Windows installation directories
sox --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [i] SoX not found in system PATH. Searching in common locations...
    set "SOX_FOUND=0"
    for %%P in (
        "C:\Program Files (x86)\sox-14-4-2"
        "C:\Program Files\sox-14-4-2"
        "C:\Program Files (x86)\sox"
        "C:\Program Files\sox"
        "C:\sox"
    ) do (
        if "!SOX_FOUND!"=="0" if exist "%%~P\sox.exe" (
            echo [OK] Found SoX at %%~P. Adding to session PATH.
            set "PATH=%PATH%;%%~P"
            set "SOX_FOUND=1"
        )
    )
    if "!SOX_FOUND!"=="0" (
        echo [!] WARNING: SoX not found. Voice cloning may fail.
        echo     Install it from: http://sox.sourceforge.net/
    )
) else (
    echo [OK] SoX is correctly configured in PATH.
)
:: -------------------------

echo.
echo Starting Backend Server...
start "VibeVoice Backend" powershell -NoExit -Command "$env:PATH='!PATH!'; cd backend; ..\venv\Scripts\Activate.ps1; uvicorn main:app --reload"

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
