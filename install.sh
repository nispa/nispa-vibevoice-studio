#!/bin/bash

echo "======================================="
echo "   Nispa Studio Interactive Installer"
echo "======================================="

# Step 1: Virtual Environment Setup
if [ ! -d "venv" ]; then
    echo "[1/4] Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "[2/4] Installing base API requirements..."
pip install -r backend/requirements-base.txt

# Step 2: Choose Engine
echo ""
echo "Select synthesis engine(s) to install:"
echo "1) VibeVoice Only (Stable, 1.5B/7B support)"
echo "2) Qwen3-TTS Only (Experimental, 3s cloning, high fidelity)"
echo "3) Both (Full experience)"
read -p "Enter choice [1-3]: " ENGINE_CHOICE

# Step 3: Engine-specific installation
install_vibevoice() {
    if python3 -c "import vibevoice" &>/dev/null; then
        echo "--- VibeVoice is already installed. Skipping. ---"
    else
        echo "--- Installing VibeVoice ---"
        pip install -r backend/requirements-vibevoice.txt
    fi
}

install_qwen() {
    # SoX check for Qwen
    if ! command -v sox &> /dev/null; then
        echo ""
        echo "[i] NOTE: SoX not detected."
        echo "    For Qwen3 Voice Cloning, please install SoX."
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            echo "    Suggestion: sudo apt-get install sox libsox-fmt-all"
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            echo "    Suggestion: brew install sox"
        fi
        echo ""
    fi

    # Check for multiple critical Qwen dependencies
    if python3 -c "import qwen_tts, transformers, accelerate, sentencepiece, einops" &>/dev/null; then
        echo ""
        echo "--- Qwen3-TTS dependencies appear to be already installed. ---"
        read -p "Do you want to force a reinstall of Qwen3 components? (y/n): " FORCE_QWEN
        if [[ $FORCE_QWEN =~ ^[Yy]$ ]]; then
            pip install --upgrade --force-reinstall -r backend/requirements-qwen.txt
        else
            echo "Skipping Qwen installation."
        fi
    else
        echo "--- Installing Qwen3-TTS ---"
        pip install -r backend/requirements-qwen.txt
    fi
}

case $ENGINE_CHOICE in
    1)
        install_vibevoice
        ;;
    2)
        install_qwen
        ;;
    3)
        install_vibevoice
        install_qwen
        ;;
    *)
        echo "Invalid choice. Skipping engine installation."
        ;;
esac

# Step 4: Final Directory Checks
echo "[3/4] Ensuring data directories exist..."
mkdir -p data/model data/voices data/outputs

# Step 5: Frontend Setup
echo "[4/4] Setting up React frontend..."
cd frontend && npm install && cd ..

# Step 6: Optimization (Flash Attention)
# Note: Flash Attention on Linux is usually easier via pip, 
# but we still check if user wants it.
if python3 -c "import torch; exit(0 if torch.cuda.is_available() else 1)" &>/dev/null; then
    if ! python3 -c "import flash_attn" &>/dev/null; then
        echo ""
        echo "[Optimization] Flash Attention 2 can speed up Qwen3 synthesis."
        read -p "Do you want to attempt installing Flash Attention? (y/n): " INSTALL_FLASH
        if [[ $INSTALL_FLASH =~ ^[Yy]$ ]]; then
            pip install flash-attn --no-build-isolation
        fi
    fi
fi

# Optional: Download models
echo ""
read -p "Would you like to download a TTS model weights now? (y/n): " DOWNLOAD_CHOICE
if [[ $DOWNLOAD_CHOICE =~ ^[Yy]$ ]]; then
    ./venv/bin/python backend/scripts/download_model.py
fi

echo "======================================="
echo "Installation Complete!"
echo "Use ./start.sh to launch Nispa Studio."
echo "======================================="
