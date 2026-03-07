@echo off

echo =======================================

echo Installing VibeVoice Studio...

echo =======================================

:: Step 1: Setup Python backend
if not exist "venv\\" (
    echo Creating virtual environment...
    python -m venv venv
)
call venv\\Scripts\\activate.bat
pip install -r backend\\requirements.txt

:: Step 2: Clone VibeVoice repository (if not already present)
if not exist "data\\vibevoice" (
    echo Cloning VibeVoice repository...
    git clone https://github.com/microsoft/VibeVoice.git data\\vibevoice
) else (
    echo VibeVoice repository already exists.
)

:: Step 3: Install VibeVoice Python package (editable mode)
cd data\\vibevoice
pip install -e .
cd ..\\..

:: Step 4: Ensure model directory exists (placeholder for model download)
if not exist "data\\model" (
    echo Creating model directory...
    mkdir data\\model
)
:: TODO: Add commands to download desired VibeVoice model files into data\\model

:: Step 5: Create default voices directory
if not exist "data\\voices" (
    echo Creating default voices directory...
    mkdir data\\voices
)

:: Step 6: Setup React frontend
cd frontend
call npm install
cd ..

echo =======================================

echo Installation Complete!

echo To start the application, run start.bat

echo =======================================
pause
