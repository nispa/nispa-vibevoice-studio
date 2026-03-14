#!/bin/bash

echo "======================================="
echo "   Nispa Studio Installer (v0.5.0)"
echo "======================================="

# Step 1: Virtual Environment Setup
if [ ! -d "venv" ]; then
    echo "[1/4] Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "[2/4] Installing dependencies..."
echo "(This includes TTS engines, Offline Translator and API)"
pip install -r backend/requirements.txt

# Step 2: System Checks and Optimizations
echo ""
echo "[3/4] Environment Optimization..."
./venv/bin/python backend/scripts/optimize_env.py

# Step 3: Final Directory Checks
echo ""
echo "[4/4] Ensuring data directories exist..."
mkdir -p data/model data/model-translation data/voices data/outputs

# Step 4: Frontend Setup
echo ""
echo "Setting up React frontend..."
cd frontend && npm install && cd ..

# Optional: Download models
echo ""
echo "======================================="
echo "READY TO DOWNLOAD MODELS"
echo "======================================="
echo "Recommendation for v0.5.0:"
echo "- Download Option 10 (NLLB-200) for Offline Translation."
echo "- Download a VibeVoice or Qwen3 model for synthesis."
echo ""
read -p "Would you like to open the Downloader now? (y/n): " DOWNLOAD_CHOICE
if [[ $DOWNLOAD_CHOICE =~ ^[Yy]$ ]]; then
    ./venv/bin/python backend/scripts/download_model.py
fi

echo "======================================="
echo "Installation Complete!"
echo "Use ./start.sh to launch Nispa Studio."
echo "======================================="
