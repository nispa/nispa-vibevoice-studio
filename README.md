# Nispa VibeVoice Studio (v0.5.0)

A professional, **100% offline** AI Voiceover and Subtitle Translation Studio. 
Synthesize high-quality voices, clone any voice in 3 seconds, and translate subtitles between 200+ languages and dialects—all on your own hardware, with an advanced, non-destructive editing workflow.

---

## 🚀 Key Features

### 🧠 Dual-Engine TTS Architecture
- **Qwen3-TTS**: State-of-the-art engine with **3-second zero-shot voice cloning** and **Voice Design** (text-to-voice generation based on natural language descriptions).
- **VibeVoice**: Stable, high-fidelity synthesis for long, multi-speaker dialogues.

### ⚡ Dynamic Batching & Performance
- **Flash Attention 2 / 3**: Fully integrated for parallel tensor processing.
- **Hardware-Aware Dynamic Batching**: The system queries your GPU's available VRAM in real-time and dynamically scales the inference batch size (e.g., processing 4 to 8 segments simultaneously). This eliminates "Out of Memory" crashes on smaller GPUs while drastically reducing synthesis times on high-end hardware (RTX 3090/4090).
- **Aggressive VRAM Management**: Immediate tensor destruction and garbage collection after every synthesis loop to prevent memory leaks during massive jobs.

### 💾 Real-Time Database Persistence (Zero-Data-Loss)
- **Backend-Driven Saves**: Audio segments are saved to a local SQLite database the exact millisecond they are generated. If your browser crashes, you lose internet connection, or you hit "Cancel", your progress is guaranteed to be saved.
- **Instant Resume**: Loading a job from the archive restores the exact state and instantly reconstructs the audio without re-downloading massive payloads.

### 🎧 Professional Audio Review Gallery
- **Paginated Review Modal**: Manage scripts with hundreds of segments easily. Filter by "Generated Only", navigate pages, and review text alongside its audio waveform.
- **Surgical Regeneration**: Not happy with a specific line? Click **Regenerate** on a single segment. The system remembers the exact Voice, Model, and Language used for that specific line and resynthesizes it instantly without affecting the rest of the timeline.
- **Advanced Audio Trimmer**: Visually trim hallucinations or trailing silences from generated segments directly in the browser.

### 🌍 Translation Engine (NLLB & Ollama)
- Powered natively by **Facebook's NLLB-200** for 100% offline, lightning-fast private translations. Supports 200+ languages including regional dialects (Sicilian, Friulian, Sardinian, Neapolitan, etc.).
- **Ollama Integration**: Optionally connect to your local Ollama instance to use LLMs (like Llama 3, Mistral) for advanced contextual translations.

---

## 🛠️ Installation

### 1. Requirements
- **OS**: Windows 10/11 (Optimized), Linux, or macOS.
- **Python**: 3.10+
- **GPU**: NVIDIA GPU (RTX 30-series or newer highly recommended for Flash Attention).
- **RAM**: 16GB+ recommended.
- **System Tools**: 
  - **FFmpeg**: Required for all audio processing.
  - **SoX**: Required for Qwen3 Voice Cloning on Windows.

### 2. Resource Requirements (VRAM)

| Model | Strengths | VRAM Req. |
|-------|-----------|-----------|
| **VibeVoice 1.5B** | Stable, great for long texts, up to 4 speakers. | ~4GB |
| **VibeVoice Large (7B)** | Highest VibeVoice quality, very natural. | ~14GB |
| **Qwen3 0.6B** | Extremely fast, 3s cloning, lightweight. | ~2GB |
| **Qwen3 1.7B** | High fidelity, superior cloning, Premium. | ~6GB |

*Note: The Dynamic Batching system will adjust automatically based on your available VRAM and the selected model.*

### 3. Quick Start
1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/your-repo/nispa-voiceover.git
    cd nispa-voiceover
    ```
2.  **Run the Installer**:
    - **Windows**: Double-click `install.bat`.
    - **Linux/Mac**: Run `chmod +x install.sh && ./install.sh`.
    *The installer will automatically detect your environment, install the correct PyTorch CUDA build, and suggest Flash Attention optimizations.*
3.  **Download Models**:
    Run the downloader to fetch weights for TTS and Translation:
    ```bash
    venv\Scripts\python backend\scripts\download_model.py
    ```
4.  **Launch**:
    - **Windows**: Double-click `start.bat`.
    - **Linux/Mac**: Run `./start.sh`.

---

## 📂 Architecture & Modularity

The backend has been meticulously refactored into a highly maintainable, enterprise-grade structure:
- `backend/api/routers/`: Segmented logic (`translation.py`, `tasks.py` for SSE streams, `generation.py` for sync operations).
- `backend/core/tts/`: Modular TTS providers (`qwen_provider.py`, `vibe_provider.py`) managed by an orchestrator, allowing seamless future integration of new AI models.
- `backend/db/`: SQLite integration ensuring state persistence.

---

## 🧪 Testing
Verify the entire system (backend APIs, frontend components, and hardware integrations) with the unified test runner:
```bash
python run_tests.py
```

---

## 📜 License
MIT License - See [LICENSE](LICENSE) for details.
All integrated AI models (VibeVoice, Qwen3, NLLB) are subject to their respective creators' licenses.