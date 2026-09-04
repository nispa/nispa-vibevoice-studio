@echo off
setlocal enabledelayedexpansion

echo =======================================
echo    Nispa Studio Installer (v0.8.0)
echo =======================================

:: Step 1: Virtual Environment Setup
if not exist "venv\\" (
    echo [1/5] Creating virtual environment...
    python -m venv venv
)
call venv\\Scripts\\activate.bat

echo [2/5] Installing Core dependencies...
pip install -r backend\\requirements.txt

:: Step 2: Choose Engines
echo.
echo =======================================
echo SELECT TTS ENGINES TO INSTALL
echo =======================================
echo [1] VibeVoice only (Zero-shot cloning)
echo [2] Qwen3-TTS only (Voice Design, High-fidelity)
echo [3] OmniVoice only (Voice Cloning, UK English)
echo [4] VibeVoice + Qwen3-TTS
echo [5] ALL ENGINES (VibeVoice + Qwen3-TTS + OmniVoice - Recommended)
echo.
set /p ENGINE_CHOICE="Enter your choice (1/2/3/4/5): "

set OPT_ENGINES=vibevoice,qwen,omnivoice
if "%ENGINE_CHOICE%"=="1" (
    set OPT_ENGINES=vibevoice
    echo [3/5] Installing VibeVoice dependencies...
    pip install -r backend\requirements-vibevoice.txt
) else if "%ENGINE_CHOICE%"=="2" (
    set OPT_ENGINES=qwen
    echo [3/5] Installing Qwen3-TTS dependencies...
    pip install -r backend\requirements-qwen.txt
) else if "%ENGINE_CHOICE%"=="3" (
    set OPT_ENGINES=omnivoice
    echo [3/5] Installing OmniVoice worker in isolated environment...
    if not exist "venv_omnivoice\" (
        python -m venv venv_omnivoice
    )
    venv_omnivoice\Scripts\pip install -r backend\requirements-omnivoice.txt
) else if "%ENGINE_CHOICE%"=="4" (
    set OPT_ENGINES=vibevoice,qwen
    echo [3/5] Installing VibeVoice and Qwen3-TTS dependencies...
    pip install -r backend\requirements-vibevoice.txt
    pip install -r backend\requirements-qwen.txt
) else (
    set OPT_ENGINES=vibevoice,qwen,omnivoice
    echo [3/5] Installing ALL dependencies...
    pip install -r backend\requirements-vibevoice.txt
    pip install -r backend\requirements-qwen.txt
    echo Installing OmniVoice worker in isolated environment...
    if not exist "venv_omnivoice\" (
        python -m venv venv_omnivoice
    )
    venv_omnivoice\Scripts\pip install -r backend\requirements-omnivoice.txt
)

:: Flash Attention (compiled against installed torch/CUDA — requires MSVC + CUDA toolkit)
echo.
echo [3b/5] Installing Flash Attention...
pip install flash-attn --no-build-isolation
if errorlevel 1 (
    echo [!] Flash Attention build failed. Continuing without it ^(optional^).
)

:: System Checks and Optimizations
echo.
echo [4/5] Environment Optimization...
venv\Scripts\python backend\scripts\optimize_env.py --engines !OPT_ENGINES!

:: Step 4: Final Directory Checks
echo.
echo [5/5] Ensuring data directories exist...
if not exist "data\\model" mkdir data\\model
if not exist "data\\model-translation" mkdir data\\model-translation
if not exist "data\\voices" mkdir data\\voices
if not exist "data\\outputs" mkdir data\\outputs
if not exist "data\\audio-rendering" mkdir data\\audio-rendering
if not exist "data\\voice-prompts\\omnivoice" mkdir data\\voice-prompts\\omnivoice

:: Step 5: Frontend Setup
echo.
echo Setting up React frontend...
if exist "frontend\\package.json" (
    cd frontend
    call npm install
    cd ..
) else (
    echo [!] Frontend folder not found or missing package.json. Skipping...
)

:: Optional: Download models
echo.
echo =======================================
echo READY TO DOWNLOAD MODELS
echo =======================================
echo Recommendation:
echo - Download Option 10 (NLLB-200) for Offline Translation.
echo - Download a VibeVoice or Qwen3 model for synthesis.
echo.
set /p DOWNLOAD_CHOICE="Would you like to open the Downloader now? (y/n): "
if /i "%DOWNLOAD_CHOICE%"=="y" (
    venv\Scripts\python backend\scripts\download_model.py
)

echo.
echo =======================================
echo Installation Complete!
echo Use start.bat to launch Nispa Studio.
echo =======================================
pause
endlocal
