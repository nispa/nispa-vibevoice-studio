<p align="center">
  <img src="docs/banner.png" alt="Nispa VibeVoice Studio" width="800"/>
</p>

<h1 align="center">Nispa VibeVoice Studio</h1>

<p align="center">
  <strong>The 100% Offline AI Voiceover & Subtitle Translation Studio</strong><br>
  Synthesize studio-quality voices, clone any voice in 3 seconds, translate subtitles in 200+ languages — all running locally on your own hardware.
</p>

<p align="center">
  <a href="#-key-features">Features</a> •
  <a href="#-quickstart">Quickstart</a> •
  <a href="#-models">Models</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-contributing">Contributing</a> •
  <a href="#-license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.6.0-blueviolet?style=flat-square" alt="Version"/>
  <img src="https://img.shields.io/badge/python-3.10%2B-blue?style=flat-square&logo=python" alt="Python"/>
  <img src="https://img.shields.io/badge/react-19-61DAFB?style=flat-square&logo=react" alt="React"/>
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License"/>
  <img src="https://img.shields.io/badge/GPU-NVIDIA_RTX-76B900?style=flat-square&logo=nvidia" alt="GPU"/>
  <img src="https://img.shields.io/badge/offline-100%25-orange?style=flat-square" alt="Offline"/>
</p>

---

## 🌟 Why Nispa VibeVoice Studio?

Most AI voiceover tools send your data to remote APIs. Nispa VibeVoice Studio runs **entirely on your machine** — no cloud, no API keys, no data leaves your computer. You get:

- **Zero latency** — Direct GPU inference, no network round-trips
- **Total privacy** — Your scripts, subtitles, and audio never leave your hardware
- **No subscriptions** — Download once, use forever
- **Full control** — Tweak models, add voices, extend the codebase

---

## ✨ Key Features

### 🧠 Dual TTS Engine Architecture

| Engine | Strengths | Voice Cloning | Voice Design |
|--------|-----------|:---:|:---:|
| **Qwen3-TTS** | State-of-the-art quality, multi-language | ✅ 3-second zero-shot | ✅ Text description |
| **VibeVoice** | Stable long-form synthesis, multi-speaker | ✅ Reference audio | ❌ |

### ⚡ Hardware-Aware Dynamic Batching
The system queries your GPU's available VRAM in real-time and dynamically scales inference batch size (1–8 segments simultaneously). No more OOM crashes — the engine adapts to your hardware.

### 💾 Zero-Data-Loss Persistence
Audio segments are saved to a local SQLite database **the instant they are generated**. If your browser crashes, you lose connection, or you cancel — your progress is guaranteed safe.

### 🎧 Professional Audio Review
- **Paginated Gallery**: Navigate jobs with hundreds of segments effortlessly
- **Surgical Regeneration**: Re-synthesize a single line using the exact Voice, Model, and Language used originally
- **Live Audio Trimmer**: Visually trim hallucinations or trailing silence directly in the browser

### 🌍 200+ Language Translation
- **NLLB-200** (built-in): Facebook's offline translation engine for 200+ languages including regional dialects
- **Ollama Integration**: huihui_ai/hy-mt1.5-abliterated:7b for more advanced translation (but slower), or you can use any LLM for translation

### 🎬 Two Workflow Modes
- **Subtitle Mode**: Upload `.srt`/`.vtt` → translate → generate timed voiceover → export aligned audio
- **Script Mode**: Paste a multi-speaker script → map speakers to voices → generate combined audio

---

## 🚀 Quickstart

### System Requirements

| Component | Requirement |
|-----------|-------------|
| **OS** | Windows 10/11, Linux, macOS |
| **Python** | 3.10+ |
| **Node.js** | 18+ (for frontend) |
| **GPU** | NVIDIA (RTX 30-series+ recommended) |
| **RAM** | 16GB+ recommended |
| **FFmpeg** | Required for audio processing |
| **SoX** | Required for Qwen3 Voice Cloning on Windows |

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/nispa/nispa-vibevoice-studio.git
cd nispa-vibevoice-studio

# 2. Run the installer
# Windows:
install.bat
# Linux/macOS:
chmod +x install.sh && ./install.sh

# 3. Download AI models
venv/Scripts/python backend/scripts/download_model.py   # Windows
venv/bin/python backend/scripts/download_model.py        # Linux/Mac

# 4. Launch the application
# Windows:
start.bat
# Linux/macOS:
./start.sh
```

The installer will:
1. Create a Python virtual environment
2. Install backend dependencies (with engine selection)
3. Auto-detect Flash Attention compatibility
4. Install frontend dependencies via `npm`
5. Optionally launch the model downloader

### FFmpeg Installation

```bash
# Windows (PowerShell as Admin)
choco install ffmpeg-full

# Linux
sudo apt install ffmpeg

# macOS
brew install ffmpeg
```

---

## 🤖 Models

### TTS Models

| Model | Size | VRAM | Best For |
|-------|------|------|----------|
| **VibeVoice 0.5B** | Streaming | ~2GB | Real-time preview, single speaker |
| **VibeVoice 1.5B** | Standard | ~4GB | Production voiceover, multi-speaker |
| **VibeVoice 7B** | Large | ~14GB | Highest fidelity, large context |
| **Qwen3 0.6B** | Lightweight | ~2GB | Fast cloning, low VRAM setups |
| **Qwen3 1.7B** | Premium | ~6GB | Best quality, voice design |

### Translation Models

| Model | Type | Languages |
|-------|------|-----------|
| **NLLB-200-Distilled-600M** | Built-in | 200+ (offline) |
| **Ollama (any model)** | External | Depends on LLM |

> **Note**: The Dynamic Batching system adjusts automatically based on your available VRAM and the selected model's footprint.

---

## 🏗 Architecture

```
nispa-voiceover/
├── frontend/                    # React 19 + TypeScript + Vite 7
│   ├── src/
│   │   ├── context/             # React Context API (state management)
│   │   ├── features/            # Feature modules (subtitle, script)
│   │   ├── components/          # Reusable UI components
│   │   └── hooks/               # Custom hooks
│   └── vite.config.ts
│
├── backend/                     # FastAPI + Python 3.11+
│   ├── api/routers/             # REST API endpoints
│   │   ├── tasks.py             # SSE generation streams
│   │   ├── generation.py        # Synchronous generation
│   │   ├── translation.py       # NLLB-200 + Ollama proxy
│   │   ├── jobs.py              # CRUD job persistence
│   │   ├── voices.py            # Voice file management
│   │   └── system.py            # Hardware monitoring, config
│   ├── core/
│   │   ├── tts/                 # TTS Provider pattern
│   │   │   ├── base.py          # Abstract TTSProvider
│   │   │   ├── qwen_provider.py # Qwen3-TTS implementation
│   │   │   └── vibe_provider.py # VibeVoice implementation
│   │   ├── tts_provider.py      # Multi-model orchestrator
│   │   ├── queue_manager.py     # Async task queue with SSE
│   │   ├── aligner.py           # Audio timestamp alignment
│   │   ├── parser.py            # SRT/VTT/Script parsing
│   │   ├── translator.py        # NLLB-200 engine
│   │   └── config.py            # Settings & path management
│   ├── db/
│   │   ├── database.py          # SQLite operations
│   │   └── models.py            # Pydantic data models
│   └── scripts/                 # Utilities (downloader, optimizer)
│
└── data/                        # Local data (gitignored)
    ├── model/                   # TTS model weights
    ├── model-translation/       # NLLB-200 weights
    ├── voices/                  # Voice reference files (.wav)
    └── outputs/                 # Generated audio files
```

### Key Design Patterns

- **Provider Pattern**: Pluggable TTS engines via abstract `TTSProvider` base class
- **Orchestrator**: `MultiModelProvider` routes requests to the correct engine based on model prefix
- **SSE Streaming**: Real-time progress updates via Server-Sent Events
- **Incremental Persistence**: Each audio segment is saved to SQLite the moment it's generated
- **Dynamic Batching**: GPU VRAM is queried before each batch to determine optimal size

---

## 🧪 Testing

```bash
# Run all tests (backend + frontend)
python run_tests.py

# Frontend only
cd frontend && npx vitest

# Backend only
cd backend && python -m pytest tests/ -v

# With coverage
cd frontend && npx vitest --coverage
```

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create a branch** for your feature: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m "feat: add amazing feature"`
4. **Push** to your branch: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Setup

```bash
# Backend (auto-reload)
cd backend && python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000

# Frontend (hot-reload)
cd frontend && npm run dev
```

### Code Style

- **Python**: Follow PEP 8, use type hints, docstrings for public functions
- **TypeScript**: Strict mode enabled, functional components with hooks
- **Commits**: Use [Conventional Commits](https://www.conventionalcommits.org/) format

### Areas Where Help Is Needed

- 🐛 Frontend refactoring (see [REFACTORING_PLAN.md](REFACTORING_PLAN.md))
- 🧪 Test coverage expansion (target: >60%)
- 🌍 UI internationalization (i18n)
- 🍎 macOS Apple Silicon (MPS) optimization
- 📖 Documentation improvements

---

## 📋 Roadmap

- [ ] Web-based voice recording directly in the browser
- [ ] Timeline editor with visual waveform alignment
- [ ] Plugin system for custom TTS providers
- [ ] Docker containerization for one-click deployment
- [ ] i18n support for the UI

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

### Third-Party Licenses

| Component | License | Repository |
|-----------|---------|------------|
| Qwen3-TTS | Apache 2.0 | [Qwen/Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) |
| VibeVoice | MIT | [vibevoice/VibeVoice](https://github.com/vibevoice) |
| NLLB-200 | CC-BY-NC-4.0 | [facebookresearch/NLLB](https://github.com/facebookresearch/fairseq) |
| FastAPI | MIT | [tiangolo/fastapi](https://github.com/tiangolo/fastapi) |
| React | MIT | [facebook/react](https://github.com/facebook/react) |

---

## 🙏 Acknowledgements

- [Qwen Team (Alibaba Cloud)](https://github.com/QwenLM) for the Qwen3-TTS models
- [VibeVoice Team](https://github.com/vibevoice) for the VibeVoice TTS engine
- [Facebook Research](https://github.com/facebookresearch) for NLLB-200 translation
- [Ollama](https://ollama.ai) for local LLM infrastructure

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/nispa">Nicola Spada</a>
</p>