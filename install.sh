#!/bin/bash

echo "======================================="
echo "   Nispa Studio Installer (v0.7.0)"
echo "======================================="

# Detect platform
if [[ "$OSTYPE" == "darwin"* ]]; then
    PLATFORM="mac"
    echo "[i] macOS detected — using CPU/MPS (Apple Silicon) build"
else
    PLATFORM="linux"
fi

# Step 1: Virtual Environment Setup
if [ ! -d "venv" ]; then
    echo "[1/5] Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "[2/5] Installing Core dependencies..."
if [ "$PLATFORM" = "mac" ]; then
    pip install -r backend/requirements-mac.txt
else
    pip install -r backend/requirements.txt
fi

# Step 2: Choose Engines
echo ""
echo "======================================="
echo "SELECT TTS ENGINES TO INSTALL"
echo "======================================="
echo "[1] VibeVoice only (Zero-shot cloning)"
echo "[2] Qwen3-TTS only (Voice Design, High-fidelity)"
echo "[3] BOTH (Recommended)"
echo ""
read -p "Enter your choice (1/2/3): " ENGINE_CHOICE

if [ "$ENGINE_CHOICE" = "1" ]; then
    echo "[3/5] Installing VibeVoice dependencies..."
    pip install -r backend/requirements-vibevoice.txt
elif [ "$ENGINE_CHOICE" = "2" ]; then
    echo "[3/5] Installing Qwen3-TTS dependencies..."
    pip install -r backend/requirements-qwen.txt
else
    echo "[3/5] Installing ALL dependencies..."
    pip install -r backend/requirements-vibevoice.txt
    pip install -r backend/requirements-qwen.txt
fi

# Flash Attention — macOS not supported, skip gracefully
if [ "$PLATFORM" = "mac" ]; then
    echo ""
    echo "[3b/5] Skipping Flash Attention (not supported on macOS — sdpa used automatically)"
fi

# Step 3: System Checks and Optimizations
echo ""
echo "[4/5] Environment Optimization..."
./venv/bin/python backend/scripts/optimize_env.py || true

# Step 4: Final Directory Checks
echo ""
echo "[5/5] Ensuring data directories exist..."
mkdir -p data/model data/model-translation data/voices data/outputs data/audio-rendering

# SoX check (needed for Qwen voice cloning)
if command -v sox &> /dev/null; then
    echo "[OK] SoX found: $(sox --version 2>&1 | head -1)"
elif [ "$PLATFORM" = "mac" ]; then
    echo "[!] WARNING: SoX not found. Voice cloning may fail."
    echo "    Install with: brew install sox"
fi

# Step 5: Frontend Setup
echo ""
echo "Setting up React frontend..."
if [ -f "frontend/package.json" ]; then
    cd frontend && npm install && cd ..
else
    echo "[!] Frontend folder not found or missing package.json. Skipping..."
fi

# Optional: Download models
echo ""
echo "======================================="
echo "READY TO DOWNLOAD MODELS"
echo "======================================="
echo "Recommendation:"
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
