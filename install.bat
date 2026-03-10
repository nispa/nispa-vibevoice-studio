@echo off
setlocal

echo =======================================
echo    Nispa Studio Interactive Installer
echo =======================================

:: Step 1: Virtual Environment Setup
if not exist "venv\\" (
    echo [1/4] Creating virtual environment...
    python -m venv venv
)
call venv\\Scripts\\activate.bat

echo [2/4] Installing base API requirements...
pip install -r backend\\requirements-base.txt

:: Step 2: Choose Engine
echo.
echo Select synthesis engine(s) to install:
echo 1) VibeVoice Only (Stable, 1.5B/7B support)
echo 2) Qwen3-TTS Only (Experimental, 3s cloning, high fidelity)
echo 3) Both (Full experience)
set /p ENGINE_CHOICE="Enter choice [1-3]: "

:: Step 3: Engine-specific installation
if "%ENGINE_CHOICE%"=="1" goto INSTALL_VIBE
if "%ENGINE_CHOICE%"=="2" goto INSTALL_QWEN
if "%ENGINE_CHOICE%"=="3" goto INSTALL_BOTH
goto END_ENGINE

:INSTALL_VIBE
call :SUB_VIBE
goto END_ENGINE

:INSTALL_QWEN
call :SUB_QWEN
goto END_ENGINE

:INSTALL_BOTH
call :SUB_VIBE
call :SUB_QWEN
goto END_ENGINE

:SUB_VIBE
python -c "import vibevoice" 2>nul
if %errorlevel% equ 0 (
    echo --- VibeVoice is already installed. Skipping. ---
) else (
    echo --- Installing VibeVoice ---
    pip install -r backend\requirements-vibevoice.txt
)
exit /b

:SUB_QWEN
:: SoX check for Qwen
sox --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [i] NOTE: SoX not detected.
    echo     For Qwen3 Voice Cloning, please install SoX from:
    echo     http://sox.sourceforge.net/
    echo     (Nispa Studio handles the path automatically during startup)
    echo.
)

python -c "import qwen_tts, transformers, accelerate, sentencepiece, einops" 2>nul
if %errorlevel% equ 0 (
    echo.
    echo --- Qwen3-TTS dependencies appear to be already installed. ---
    echo Do you want to force a reinstall of Qwen3 components?
    choice /c yn /m "Choice"
    if %errorlevel% equ 1 (
        pip install --upgrade --force-reinstall -r backend\requirements-qwen.txt
    ) else (
        echo Skipping Qwen installation.
    )
) else (
    echo --- Installing Qwen3-TTS ---
    pip install -r backend\requirements-qwen.txt
)
exit /b
:END_ENGINE
:: Step 4: Final Directory Checks
echo [3/4] Ensuring data directories exist...
if not exist "data\\model" mkdir data\\model
if not exist "data\\voices" mkdir data\\voices
if not exist "data\\outputs" mkdir data\\outputs

:: Step 5: Frontend Setup
echo [4/4] Setting up React frontend...
cd frontend
call npm install
cd ..

:: Step 6: Optimization (Flash Attention)
echo.
echo [Optimization] Checking for Flash Attention 2...
python -c "import flash_attn" 2>nul
if %errorlevel% neq 0 (
    venv\Scripts\python backend\scripts\install_flash_attn.py
)

:: Optional: Download models
echo.
set /p DOWNLOAD_CHOICE="Would you like to download a TTS model weights now? (y/n): "
if /i "%DOWNLOAD_CHOICE%"=="y" (
    venv\Scripts\python backend\scripts\download_model.py
)

echo =======================================
echo Installation Complete!
echo Use start.bat to launch Nispa Studio.
echo =======================================
pause
endlocal
