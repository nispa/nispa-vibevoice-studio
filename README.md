# Nispa VibeVoice Studio (v0.5.0)

A professional, **100% offline** AI Voiceover and Subtitle Translation Studio. 
Synthesize high-quality voices, clone any voice in 3 seconds, and translate subtitles between 200+ languages and dialects—all on your own hardware.

---

## 🚀 Key Features (v0.5.0)

- **Dual-Engine TTS**: 
  - **VibeVoice**: Stable, high-fidelity synthesis for long dialogues. Supports up to 4 speakers.
  - **Qwen3-TTS**: State-of-the-art engine with **3-second zero-shot cloning** and **Voice Design** (text-to-voice).
- **Internal Offline Translation**: Powered by **Facebook's NLLB-200**. 
  - Supports 200+ languages (including Sicilian, Friulian, Sardinian, and more).
  - 100% private and local—no external API or installed Ollama instance required.
- **Advanced Audio Editing**:
  - **Audio Trimmer**: Edit generated segments on the fly to remove hallucinations or silence.
  - **Mark-In/Mark-Out**: Precise control with visual sliders and live preview.
- **Workflow-Centric UI**:
  - **New Modular Architecture**: Faster, more responsive UI with organized feature components.
  - **Unified Progress Tracking**: Standardized progress bars and activity logs across all operations.
  - **Drag & Drop**: Modern file upload area with native drag-and-drop support.
- **Environment Optimization**:
  - **Dynamic Flash Attention**: Automatic detection and installation of the best FA2/FA3 version for your GPU.
  - **VRAM Manager**: Automatic memory cleanup when switching between TTS engines.

---

## 🛠️ Installation

### 1. Requirements
- **OS**: Windows 10/11 (Optimized), Linux, or macOS.
- **Python**: 3.10+
- **GPU**: NVIDIA GPU (RTX 30-series or newer highly recommended for **Flash Attention**).
- **RAM**: 16GB+ recommended.
- **System Tools**: 
  - **FFmpeg**: Required for audio processing.
  - **SoX**: Required for Qwen3 Voice Cloning on Windows.

### 2. Quick Start
1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/your-repo/nispa-voiceover.git
    cd nispa-voiceover
    ```
2.  **Run the Installer**:
    - **Windows**: Double-click `install.bat`.
    - **Linux/Mac**: Run `chmod +x install.sh && ./install.sh`.
    *The installer will automatically detect your environment and suggest optimizations.*
3.  **Download Models**:
    Run the downloader to fetch weights for TTS and Translation:
    ```bash
    venv\Scripts\python backend\scripts\download_model.py
    ```
4.  **Launch**:
    - **Windows**: Double-click `start.bat`.
    - **Linux/Mac**: Run `./start.sh`.

---

## 📂 Project Structure

- `backend/`: FastAPI server and AI Engine providers.
- `frontend/`: React (TypeScript) Studio interface.
- `data/model/`: TTS model weights (VibeVoice, Qwen3).
- `data/model-translation/`: Offline translation models (NLLB).
- `data/voices/`: Your local reference audio library.
- `data/outputs/`: Every generated audio is automatically saved here.

---

## 🧪 Testing
Verify the entire system with the integrated test runner:
```bash
python run_tests.py
```

---

## 📜 License
MIT License - See [LICENSE](LICENSE) for details.
All AI models (VibeVoice, Qwen3, NLLB) are subject to their respective licenses.
