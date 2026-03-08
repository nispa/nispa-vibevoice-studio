# Nispa VibeVoice Studio 

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)
![Node.js](https://img.shields.io/badge/node-v18+-green.svg)

## Overview


**nispa - VibeVoice Studio** is a powerful, locally-hosted Text-to-Speech (TTS) application designed to provide high-quality voice synthesis. It leverages the Microsoft VibeVoice model as its core engine, seamlessly integrating a fast Python FastAPI backend and a modern React/TypeScript frontend.




## Key Features

- **Offline Voice Generation:** Local, private and unlimited TTS synthesis using VibeVoice models, with support for voice cloning from reference audio.
- **Dynamic Mode Support:** Seamlessly switch between **Subtitle Mode** (timed) and **Script Mode** (untimed) with shared voice/model configurations.
- **Flexible Voice Management:** Easily select, filter, and configure voice profiles (language, accent, gender) for custom results.
- **Refined User Interface:** Modern React/TypeScript UI with modular components, waveform audio player, and real-time processing feedback.
- **Intelligent Job Archive:** Save, update, and manage synthesis jobs with draft support and state recovery.
- **Subtitle & Script Tools:** Automatic grouping, manual segment editing, and real-time preview of processing steps.
- **Subtitle Translation:** Integration with local Ollama service for high-quality, offline multi-language translation.
- **System Monitoring:** Integrated hardware dashboard (GPU VRAM, CUDA, MPS, RAM) to monitor local resource usage.
- **One-Click Setup & Launch:** Automated `.bat` scripts handle full installation (venv, dependencies, engine cloning) and startup.

---
## Documentation & History

- [Full Changelog](CHANGELOG.md) - Track all project updates and version history.
- [Model Zoo](#model-zoo) - Information on supported VibeVoice models.

---

## Prerequisites

Before installing, ensure you have the following installed on your Windows machine:
- **Python 3.11+** (Make sure it is added to your system PATH)
- **Node.js** (v18+ recommended)
- **Git** (Required for cloning the repository and external dependencies)
- **Ollama + huihui_ai/hy-mt1.5-abliterated:7B** (Optional) to enable `offline` subtitle-translation service.

---

## Quick Start

We have engineered the setup process to be as frictionless as possible. You **do not** need to manually configure virtual environments or run distinct install commands.

### 1. Clone the repository 
```bash
git clone https://github.com/nispa/nispa-vibevoice-studio.git
cd nispa-vibevoice-studio
```
Or download zip release (yet in beta v0.1)

### 2. Installation
Simply double-click on `install.bat` (or run it via Command Prompt). This automated script will:
- Create a Python virtual environment (`venv`).
- Install all required Python backend dependencies.
- Clone the commuinty VibeVoice repository into `data/vibevoice` and install it.
- Set up necessary data directories (`data/model` and `data/voices`).
- Install all NPM dependencies for the React frontend.

## Model Zoo

You can download VibeVoice models from Hugging Face and place them in the `data/model` directory. Choose the model that best fits your needs:

| Model | Context Length | Generation Length | Speakers | Download Link |
|-------|----------------|------------------|----------|---------------|
| VibeVoice-Streaming-0.5B | 8K | Real-time | 1 | [HF link](https://huggingface.co/microsoft/VibeVoice-Realtime-0.5B) |
| VibeVoice-1.5B | 64K | ~90 min | Up to 4 | [HF link](https://huggingface.co/vibevoice/VibeVoice-1.5B) |
| VibeVoice-Large (7B) | 32K | ~45 min | Up to 4 | [HF link](https://huggingface.co/vibevoice/VibeVoice-7B) |


**VibeVoice Engine:**
VibeVoice is the underlying TTS engine powering this application. For standard synthesis, it uses pre-trained models located in the `data/model` directory. For voice cloning, you must provide at least 10 seconds of clear reference audio (WAV format) for each custom voice. Place these files in the `data/voices` directory, following the naming convention (e.g., `en-john_man.wav`). The engine will use these samples to clone the voice and generate speech in your desired language and style.


### 3. Running the Application
Double-click on `start.bat`. This launch script will:
- Boot up the Python API backend (FastAPI/Uvicorn).
- Start the React frontend development server (Vite).
- Automatically open your default web browser to `http://localhost:5173/`.

> **Note:** The backend and frontend servers run in separate PowerShell windows. To safely shut down the application, simply close those terminal windows.

---

## Usage Guide

Once the studio is running in your browser:
1. **Scripting:** Enter or paste the text you want to synthesize into the main text editor.
2. **Translation:** Choose tu edit script and translate line-by-line or choose to translate everithing at once using ollama service.
3. **Voice Selection:** Use the right-hand panel to open the **Voice Settings** and select a speaker profile (filtered by accent, language, or gender).
4. **Synthesis:** Click the **Generate** button. The local backend will process the text and return the generated audio.
5. **Playback:** Use the embedded waveform audio player to scrub through your audio, listen to the result and download result.

---

## Project Architecture

```text
nispa-voiceover/
├── backend/          # Python API server (FastAPI)
│   ├── core/         # TTS provider logic & model integrations
│   └── main.py       # Application entry point
├── frontend/         # React/TypeScript User Interface
│   ├── src/          # Interactive components, state management
│   └── package.json  # Node dependencies and Vite config
├── data/             # Application state and models
│   ├── model/        # Pre-trained VibeVoice model files
│   ├── vibevoice/    # The underlying TTS engine core
│   └── voices/       # Available voice samples and mapping
├── install.bat       # One-click installation script
└── start.bat         # One-click launch script
```

---
## License

Distributed under the MIT License. See `LICENSE` for more information.
