# Nispa VibeVoice Studio 

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)
![Node.js](https://img.shields.io/badge/node-v18+-green.svg)

## Overview

**nispa - VibeVoice Studio** is a powerful, locally-hosted Text-to-Speech (TTS) application designed to provide high-quality voice synthesis. It leverages the Microsoft VibeVoice model as its core engine, seamlessly integrating a fast Python FastAPI backend and a modern React/TypeScript frontend.

---

## Key Features

- **Offline Voice Generation:** Local, private and unlimited TTS synthesis using VibeVoice models, with support for voice cloning from reference audio.
- **Dynamic Mode Support:** Seamlessly switch between **Subtitle Mode** (timed) and **Script Mode** (untimed) with shared voice/model configurations.
- **Intelligent Job Archive:** Save, update, and manage synthesis jobs with draft support and state recovery.
- **Asynchronous Processing:** Full migration to background tasks with Server-Sent Events (SSE) for real-time updates and progress tracking.
- **Audio Persistence:** Automatically saves every generated audio to `data/outputs` with unique timestamps and choice between **WAV** and **MP3** formats.
- **Advanced Subtitle Tools:** Automatic grouping, manual segment editing, precise timecode alignment (shifting), and real-time preview.
- **Subtitle Translation:** Integration with local Ollama service for high-quality, offline multi-language translation.
- **Task Control:** Enhanced cancellation with "Partial Audio Finalization" (downloading what was synthesized so far).
- **System Monitoring:** Integrated hardware dashboard (GPU VRAM, CUDA, MPS, RAM) to monitor local resource usage.
- **Comprehensive Documentation:** Full [API Reference](API_REFERENCE.md) and [Technical Documentation](TECHNICAL_DOCUMENTATION.md) included.
- **Robust Testing:** Extensive test suite using Pytest (backend) and Vitest (frontend) for core logic and UI workflows.

---

## Documentation

- [**User Guide (English)**](USER_GUIDE.md) - **Start here!** A step-by-step guide for new users.
- [**Guida Utente (Italiano)**](GUIDA_UTENTE.md) - Guida passo-passo in italiano.
- [Full Changelog](CHANGELOG.md) - Track all project updates and version history.
- [Technical Documentation](TECHNICAL_DOCUMENTATION.md) - Deep dive into architecture, data flows, and internal logic.
- [API Reference](API_REFERENCE.md) - Complete guide to REST endpoints and SSE communication protocols.

---

## Prerequisites

Before installing, ensure you have the following installed on your machine:

- **Python 3.11+**
- **Node.js** (v18+ recommended)
- **Git** (Required for cloning the repository and external dependencies)
- **Ollama** ([ollama.com](https://ollama.com/)) + **huihui_ai/hy-mt1.5-abliterated:7B** (Essential for high-quality offline translation)

---

> **Workflow Tip:** If you are moving from an existing transcription to a translation, using the **Grouping** feature is essential to achieve fluid and natural speech, avoiding forced pauses between subtitle segments.

---

## Quick Start

### 1. Clone the repository 
```bash
git clone https://github.com/nispa/nispa-vibevoice-studio.git
cd nispa-vibevoice-studio
```
...or dowload the zip file from [GitHub](https://github.com/nispa/nispa-vibevoice-studio/releases)

### 2. Installation

We provide automated scripts to handle the full setup (venv, dependencies, engine cloning).

#### Windows:
Double-click on `install.bat` (or run it via Command Prompt).

#### Linux / macOS:
Open a terminal and run:
```bash
chmod +x install.sh
./install.sh
```

### 3. Model Zoo

You can download VibeVoice models from Hugging Face and place them in the `data/model` directory:

| Model | Context Length | Generation Length | Speakers | Download Link |
|-------|----------------|------------------|----------|---------------|
| VibeVoice-Streaming-0.5B | 8K | Real-time | 1 | [HF link](https://huggingface.co/microsoft/VibeVoice-Realtime-0.5B) |
| VibeVoice-1.5B | 64K | ~90 min | Up to 4 | [HF link](https://huggingface.co/vibevoice/VibeVoice-1.5B) |
| VibeVoice-Large (7B) | 32K | ~45 min | Up to 4 | [HF link](https://huggingface.co/vibevoice/VibeVoice-7B) |

> **VibeVoice Engine:** For voice cloning, place clear reference audio (WAV format, min 10s) in `data/voices` following the naming convention (e.g., `en-john_man.wav`).

### 4. Running the Application

#### Windows:
Double-click on `start.bat`.

#### Linux / macOS:
Open a terminal and run:
```bash
chmod +x start.sh
./start.sh
```

> **Note:** On Windows, the backend and frontend run in separate PowerShell windows. On Linux/macOS, they run as background processes managed by the script (press `Ctrl+C` to stop both).

---

## Usage Guide

1. **Input:** Paste your text in **Script Mode** or upload a subtitle file (.srt, .vtt) in **Subtitle Mode**.
2. **Translation:** (Optional) Use the local Ollama service to translate your text into multiple languages.
3. **Voice Settings:** Use the side panel to select a speaker profile or configure a custom reference voice.
4. **Synthesis:** Click **Generate**. You can monitor progress in real-time and view logs in the **Dettagli Operazione** modal.
5. **Playback & Export:** Use the waveform player to review results. Audio is automatically saved to `data/outputs`.

---

## Project Architecture

```text
nispa-voiceover/
├── backend/          # Python API server (FastAPI)
│   ├── api/          # Routers and SSE logic
│   ├── core/         # TTS engine integration & audio aligner
│   ├── db/           # Job models and persistence
│   └── tests/        # Pytest test suite
├── frontend/         # React/TypeScript User Interface
│   ├── src/          # Components, hooks, and global state
│   └── package.json  # Node dependencies and Vite config
├── data/             # Persistent data
│   ├── model/        # VibeVoice pre-trained models
│   ├── voices/       # Voice reference samples
│   └── outputs/      # Automatically saved audio generations
├── API_REFERENCE.md  # Endpoint documentation
├── TECHNICAL_DOCUMENTATION.md # Architectural overview
├── install.sh / .bat # Installation scripts
└── start.sh / .bat   # Execution scripts
```

---

## License

Distributed under the MIT License. See `LICENSE` for more information.
