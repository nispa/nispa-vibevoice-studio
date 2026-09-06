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
  <img src="https://img.shields.io/badge/version-0.9.0-blueviolet?style=flat-square" alt="Version"/>
  <img src="https://img.shields.io/badge/python-3.10%2B-blue?style=flat-square&logo=python" alt="Python"/>
  <img src="https://img.shields.io/badge/react-19-61DAFB?style=flat-square&logo=react" alt="React"/>
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License"/>
  <img src="https://img.shields.io/badge/GPU-NVIDIA_RTX%20%7C%20Apple_MPS-76B900?style=flat-square&logo=nvidia" alt="GPU"/>
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

### 🧠 Quad TTS Engine Architecture

| Engine | Strengths | Voice Cloning | Voice Design |
|--------|-----------|:---:|:---:|
| **Higgs Audio v3** | 4B expressive voice cloning, inline emotion & style tag control | ✅ Zero-shot (WAV + optional transcript) | ❌ |
| **OmniVoice** | Ultra-fast (RTF < 0.6), high throughput, natural conversational flow | ✅ Zero-shot (WAV + Transcript) | ❌ |
| **Qwen3-TTS** | State-of-the-art expressive quality (1.7B recommended), multi-language | ✅ 3-second zero-shot (x-vector / transcript) | ✅ Text description |
| **VibeVoice** | Stable long-form synthesis, multi-speaker synchronised | ✅ Reference audio | ❌ |

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
- **Subtitle Mode**: Upload `.srt`/`.vtt` → translate → generate timed voiceover → export aligned audio with dedicated subtitle archive
- **Script Mode**: Paste a multi-speaker script → map speakers to voices (up to 8 speakers) → auto-saved drafts → generate combined dialogue audio → dedicated Script Archive with one-click reload into editor

---

## 🚀 Quickstart

### System Requirements

| Component | Requirement |
|-----------|-------------|
| **OS** | Windows 10/11, Linux, macOS |
| **Python** | 3.10+ |
| **Node.js** | 18+ (for frontend) |
| **GPU** | NVIDIA RTX (recommended) · Apple Silicon MPS · CPU fallback |
| **RAM** | 16GB+ recommended |
| **FFmpeg** | Required for audio processing |
| **SoX** | Required for Qwen3 Voice Cloning (`brew install sox` on Mac) |

> **macOS note**: Apple Silicon (M1/M2/M3/M4) is supported via PyTorch MPS. CUDA and Flash Attention are not required. `install.sh` auto-detects macOS and configures everything correctly. Batch size is fixed at 1 on MPS (VRAM-aware batching requires CUDA).

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
2. Install backend dependencies (engine selection + platform-appropriate PyTorch build)
3. Auto-detect Flash Attention compatibility (skipped automatically on macOS)
4. Install frontend dependencies via `npm`
5. Check for SoX and print install hint if missing
6. Optionally launch the model downloader

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
| **Higgs Audio v3** | 4B (~8GB bfloat16) | ~8-9GB | Expressive voice cloning with emotion, style, and paralinguistic tag control |
| **OmniVoice** | 3.0GB | ~3GB | Ultra-fast cloning (RTF < 0.6), fast multi-speaker dialogue & rapid script iterations |
| **Qwen3 1.7B** | Premium | ~6GB | Highest quality expressive cloning, voice design, zero-transcript cloning |
| **Qwen3 0.6B** | Lightweight | ~2GB | Lightweight Qwen testing |
| **VibeVoice 1.5B** | Standard | ~4GB | Production subtitle voiceover, synchronized multi-speaker (up to 4) |
| **VibeVoice 7B** | Large | ~14GB | High fidelity subtitle synthesis |
| **VibeVoice 0.5B** | Streaming | ~2GB | Real-time preview, single speaker |

### 🎭 Higgs Audio v3 Emotion & Style Tagging

When **Higgs Audio v3** is selected in **Script Mode**, a dedicated **Tag Palette** appears directly above the script text area. Clicking any tag inserts it at the cursor position:

- **Emotions**: `<|emotion:anger|>`, `<|emotion:sadness|>`, `<|emotion:amusement|>`, `<|emotion:elation|>`
- **Styles**: `<|whisper|>`, `<|shout|>`
- **Prosody**: `<|pitch:high|>`, `<|speed:slow|>`, `...` (pause)
- **Paralinguistic / SFX**: `[laughter]`, `[sigh]`, `[cough]`

You can also combine tags dynamically, for example:
```text
<|whisper|>Keep quiet... [laughter] <|emotion:amusement|>Did you really think nobody was watching?
```

### 🔒 Privacy, Offline Operation & Biometric Voice Prompts

- **100% Strict-Offline**: Network access is explicitly disabled during inference (`HF_HUB_OFFLINE=1`, `TRANSFORMERS_OFFLINE=1`). Model download is an explicit installation step; generation never triggers background downloads or remote API calls.
- **Biometric Voice Clone Prompts**: OmniVoice creates derived acoustic prompts (`VoiceClonePrompt`), cached in `data/voice-prompts/omnivoice/`. These are treated as sensitive biometric derivatives, excluded from Git via `.gitignore`, keyed to cryptographic hashes of the reference audio and transcript, and can be invalidated or deleted at any time without deleting original voices.

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
│   │   │   ├── higgs_provider.py # Higgs Audio v3 implementation (worker proxy)
│   │   │   ├── omnivoice_provider.py # OmniVoice implementation (worker proxy)
│   │   │   ├── qwen_provider.py # Qwen3-TTS implementation
│   │   │   └── vibe_provider.py # VibeVoice implementation
│   │   ├── tts_provider.py      # Multi-model orchestrator
│   │   ├── device_utils.py      # get_default_device() — CUDA/MPS/CPU selection
│   │   ├── queue_manager.py     # Async task queue with SSE
│   │   ├── aligner.py           # Audio timestamp alignment
│   │   ├── parser.py            # SRT/VTT/Script parsing
│   │   ├── translator.py        # NLLB-200 engine
│   │   └── config.py            # Settings & path management
│   ├── workers/                 # Isolated background workers
│   │   ├── higgs_worker.py      # Standalone Higgs Audio worker
│   │   └── omnivoice_worker.py  # Standalone OmniVoice worker
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

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | Full user guide (EN) — installation, workflows, FAQ |
| [docs/GUIDA_UTENTE.md](docs/GUIDA_UTENTE.md) | Guida utente completa (IT) — installazione, workflow, FAQ |
| [docs/API_REFERENCE.md](docs/API_REFERENCE.md) | Backend REST API reference |
| [docs/TECHNICAL_DOCUMENTATION.md](docs/TECHNICAL_DOCUMENTATION.md) | Architecture & internals |
| [CHANGELOG.md](CHANGELOG.md) | Version history |

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

- 🧪 Test coverage expansion (target: >60%)
- 🌍 UI internationalization (i18n)
- 🍎 macOS MPS batching — VRAM-aware batch sizing for Apple Silicon (currently fixed at 1)
- 📖 Documentation improvements

---

## 📋 Roadmap

### 🎯 Next Priorities
- [ ] **Additional Local TTS Engines**:
  - **Chatterbox / Chatterbox Turbo**: lightweight MIT-licensed voice cloning with paralinguistic tag and exaggeration control
  - **IndexTTS-2.5**: emotion/speed disentanglement and CMU phonemes
- [ ] **LLM Emotion & Prosody Tagging**: Preprocessing dialogue lines via local Ollama models to insert inline emotional, stylistic, and paralinguistic markers
- [ ] **Web-Based Voice Recording**: Record reference audio directly from the microphone in the browser Voice Library
- [ ] **Visual Timeline Editor**: Interactive multitrack waveform timeline for precise manual adjustment of pauses, overlaps, and subtitle sync
- [ ] **Docker & Headless Deployment**: Optional containerized profile for headless servers and developer workflows

### ✅ Completed Milestones
- [x] **Quad TTS Engine Architecture**: Higgs Audio v3, OmniVoice, Qwen3-TTS, and VibeVoice with strict-offline inference
- [x] **Extensible Data-Driven Provider Registry & Model Catalog**: Dynamic capabilities routing replacing substring matching
- [x] **Untimed Script Mode Persistence & Isolated Archive**: Continuous local draft auto-save and dedicated database archive separate from subtitle jobs
- [x] **Hardware-Aware Dynamic Batching & Multi-GPU**: Real-time VRAM budget calculation and proportional CUDA distribution
- [x] **Zero-Data-Loss Audio Persistence**: Instant SQLite & WAV disk saving during generation with session recovery

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

### Third-Party Licenses

| Component | License | Repository |
|-----------|---------|------------|
| Higgs Audio v3 | Apache 2.0 | [multimodalart/higgs-audio-v3](https://huggingface.co/multimodalart/higgs-audio-v3-tts-4b-transformers) |
| OmniVoice | Apache 2.0 (code) / CC-BY-NC 4.0 (model) | [k2-fsa/OmniVoice](https://github.com/k2-fsa/OmniVoice) |
| Qwen3-TTS | Apache 2.0 | [Qwen/Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) |
| VibeVoice | MIT | [vibevoice/VibeVoice](https://github.com/vibevoice) |
| NLLB-200 | CC-BY-NC-4.0 | [facebookresearch/NLLB](https://github.com/facebookresearch/fairseq) |
| FastAPI | MIT | [tiangolo/fastapi](https://github.com/tiangolo/fastapi) |
| React | MIT | [facebook/react](https://github.com/facebook/react) |

---

## 🙏 Acknowledgements

- [k2-fsa Team](https://github.com/k2-fsa) for the OmniVoice TTS model and framework
- [Qwen Team (Alibaba Cloud)](https://github.com/QwenLM) for the Qwen3-TTS models
- [VibeVoice Team](https://github.com/vibevoice) for the VibeVoice TTS engine
- [Facebook Research](https://github.com/facebookresearch) for NLLB-200 translation
- [Ollama](https://ollama.ai) for local LLM infrastructure

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/nispa">Nicola Spada</a>
</p>