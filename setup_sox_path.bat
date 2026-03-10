@echo off
setlocal enabledelayedexpansion

set "DEFAULT_SOX_PATH=C:\Program Files (x86)\sox-14-4-2"

echo =======================================
echo   SoX Path Setup for Windows
echo =======================================
echo.
echo Default path: %DEFAULT_SOX_PATH%
set /p "USER_PATH=Press ENTER to use default or type your custom SoX path: "

if "!USER_PATH!"=="" (
    set "FINAL_PATH=%DEFAULT_SOX_PATH%"
) else (
    set "FINAL_PATH=!USER_PATH!"
)

:: Remove quotes if present
set "FINAL_PATH=%FINAL_PATH:"=%"

echo.
echo Checking: %FINAL_PATH%\sox.exe

if not exist "%FINAL_PATH%\sox.exe" (
    echo [!] ERROR: sox.exe not found in %FINAL_PATH%
    echo Please ensure you entered the correct installation directory.
    pause
    exit /b
)

echo Adding to User PATH...
powershell -command "$oldPath = [Environment]::GetEnvironmentVariable('Path', 'User'); $newPath = '%FINAL_PATH%'; if ($oldPath -notlike '*'+$newPath+'*') { [Environment]::SetEnvironmentVariable('Path', $oldPath + ';' + $newPath, 'User'); Write-Host '✓ Path added successfully.' -ForegroundColor Green } else { Write-Host '! Path already exists in environment variables.' -ForegroundColor Yellow }"

echo.
echo =======================================
echo DONE! Please RESTART your terminal or 
echo Nispa Studio for changes to take effect.
echo =======================================
pause
