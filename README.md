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
  <em>&ldquo;<strong>LANGUAGE MODEL</strong>, n. A magnificent automaton endowed with all the vocabulary of mankind and none of its discretion &mdash; in which respect it differs very little from the average orator.<br>
  <strong>VOICE CLONING</strong>, n. The ingenious art of borrowing an honest man’s vocal cords to utter with supreme confidence that which he was far too wise ever to think.&rdquo;</em><br>
  <small>&mdash; <strong>Ambrose Bierce</strong>, <em>The Devil&rsquo;s Dictionary (Modern Apocrypha)</em></small>
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
| **OmniVoice** | Fast voice cloning with expressive non-verbal inline tags | ✅ Zero-shot (WAV + Transcript) | ❌ |
| **Qwen3-TTS** | State-of-the-art expressive quality (1.7B recommended), multi-language | ✅ 3-second zero-shot (x-vector / transcript) | ✅ Text description |
| **VibeVoice** | Stable long-form synthesis, multi-speaker synchronised | ✅ Reference audio | ❌ |

### ⚡ Hardware-Aware Dynamic Batching & Multi-GPU
The system queries your GPU's available VRAM in real-time and dynamically scales inference batch size (1–8 segments simultaneously). Work is automatically split across multiple GPUs when available. Manual overrides and hardware preferences can be configured in the UI or via `data/settings.json` (see [Settings & Configuration Guide](docs/SETTINGS_GUIDE.md)).

### 📦 WebUI Models & Engines Manager
Download, inspect, filter, and delete models directly inside the application with live SSE download progress, speed reporting (MB/s), cancellation support, and system health diagnostics.

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

## 🤖 Models & Capabilities

### TTS Engines

| Engine | Size / Precision | VRAM Footprint | Best For | Control Syntax |
|--------|------------------|:--------------:|----------|:--------------:|
| **Higgs Audio v3** | 4B (`bfloat16`) | ~8–9 GB | Expressive acting, emotions, vocal styles | `<|emotion:...|>`, `<|style:...|>` |
| **OmniVoice** | 3.0 GB Diffusion | ~3 GB | Ultra-fast cloning, paralinguistic SFX, CMU phonetics | `[laughter]`, `[B EY1 S]` |
| **Qwen3 1.7B** | Premium Base | ~6 GB | SOTA expressive cloning, natural conversational tone | Natural Respelling |
| **Qwen3 0.6B** | Lightweight Base | ~2 GB | Fast testing, lower VRAM requirements | Natural Respelling |
| **VibeVoice 1.5B/7B** | Long-form Diffusion | ~4–14 GB | Production subtitle voiceover, multi-speaker sync | Timing-aligned |

> 💡 **Expressive Tag & Phonetic Guides**:
> - **Higgs Audio v3**: See the [User Guide](docs/USER_GUIDE.md#32-higgs-audio-v3-tag-palette--emotion-guide) for the full 45-element acoustic palette (emotions, styles, prosody, SFX).
> - **OmniVoice**: See the [CMU Phonetics Guide](docs/GUIDA_FONETICA_CMU.md) for the 39 ARPAbet phoneme dictionary and inline pronunciation override rules.

### Translation Engines

| Engine | Type | Languages | Offline Support |
|--------|------|:---------:|:---------------:|
| **NLLB-200-Distilled-600M** | Built-in Neural MT | 200+ | ✅ 100% Offline |
| **Ollama (any local LLM)** | Extensible Local LLM | Depends on LLM | ✅ 100% Offline |

### 🔒 Privacy & Biometric Protection
- **Strictly Offline**: Network access is explicitly disabled during inference (`HF_HUB_OFFLINE=1`, `TRANSFORMERS_OFFLINE=1`). No audio, transcript, or prompt leaves your machine.
- **Biometric Derivative Protection**: Cached acoustic prompts (`VoiceClonePrompt`) are keyed to cryptographic hashes under `data/voice-prompts/`, excluded from Git, and can be invalidated or flushed anytime via the UI.

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
| [docs/GUIDA_FONETICA_CMU.md](docs/GUIDA_FONETICA_CMU.md) | Guida completa alla fonetica CMU inline per OmniVoice (IT/EN) |
| [docs/SETTINGS_GUIDE.md](docs/SETTINGS_GUIDE.md) | Settings & Configuration guide (EN) — GPU tuning, paths, settings.json |
| [docs/GUIDA_IMPOSTAZIONI.md](docs/GUIDA_IMPOSTAZIONI.md) | Guida impostazioni e configurazione (IT) — tuning GPU, percorsi, settings.json |
| [docs/API_REFERENCE.md](docs/API_REFERENCE.md) | Backend REST API reference (v0.9.0) |
| [docs/TECHNICAL_DOCUMENTATION.md](docs/TECHNICAL_DOCUMENTATION.md) | Architecture & internals (v0.9.0) |
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
- [ ] **LLM Emotion & Prosody Tagging**: Contextual dialogue analysis and automated insertion of Higgs Audio v3 acoustic control tags (`<|emotion:...|>`, `<|style:...|>`, `<|sfx:...|>`, `<|prosody:...|>`) via local Ollama LLMs.
- [ ] **Automated Reference Audio Normalization**: Optional one-click audio cleanup (noise gating, loudness matching to -23 LUFS, silence trimming) during reference voice upload.

### ✅ Completed Milestones
- [x] **Quad TTS Engine Architecture**: Higgs Audio v3, OmniVoice, Qwen3-TTS, and VibeVoice with strict-offline inference
- [x] **WebUI Models & Engines Manager**: Live background downloads with SSE progress, speed reporting (MB/s), cancellation, safe deletion, and system health diagnostics
- [x] **Higgs Audio v3 Acoustic Architecture**: Standardized 45-element control syntax (`<|category:value|>`), collapsible category tag palette, and portal-based interactive guide modal
- [x] **Extensible Data-Driven Provider Registry & Model Catalog**: Dynamic capabilities routing replacing substring matching
- [x] **Untimed Script Mode Persistence & Isolated Archive**: Continuous local draft auto-save and dedicated database archive separate from subtitle jobs
- [x] **Hardware-Aware Dynamic Batching & Multi-GPU**: Real-time VRAM budget calculation, manual batch overrides, and proportional CUDA distribution
- [x] **Zero-Data-Loss Audio Persistence**: Instant SQLite & WAV disk saving during generation with session recovery
- [x] **OmniVoice Expressive Non-Verbal Tags & CMU Phonetics**: 13 paralinguistic inline vocalization tokens (`[laughter]`, `[sigh]`, etc.), uppercase CMU ARPAbet pronunciation override syntax (`[B EY1 S]`), collapsible Script Mode tag palette, and dedicated guide

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