#!/bin/bash

echo "======================================="
echo "Installing VibeVoice Studio..."
echo "======================================="

# Step 1: Setup Python backend
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r backend/requirements.txt

# Step 2: Clone VibeVoice repository (if not already present)
if [ ! -d "data/vibevoice" ]; then
    echo "Cloning VibeVoice repository..."
    git clone https://github.com/microsoft/VibeVoice.git data/vibevoice
else
    echo "VibeVoice repository already exists."
fi

# Step 3: Install VibeVoice Python package (editable mode)
cd data/vibevoice
pip install -e .
cd ../..

# Step 4: Ensure model directory exists
if [ ! -d "data/model" ]; then
    echo "Creating model directory..."
    mkdir -p data/model
fi

# Step 5: Create default voices directory
if [ ! -d "data/voices" ]; then
    echo "Creating default voices directory..."
    mkdir -p data/voices
fi

# Step 6: Setup React frontend
cd frontend
npm install
cd ..

echo "======================================="
echo "Installation Complete!"
echo "To start the application, run ./start.sh"
echo "======================================="
