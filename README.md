# Nispa VibeVoice Studio 

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)
![Node.js](https://img.shields.io/badge/node-v18+-green.svg)

## Overview

**nispa - VibeVoice Studio** is a powerful, locally-hosted Text-to-Speech (TTS) application designed to provide high-quality voice synthesis. It features a modern dual-engine architecture, integrating both **VibeVoice** and **Qwen3-TTS** for unparalleled flexibility and quality.

---

## Key Features

- **Multi-Engine TTS:** Seamless integration of **VibeVoice** (Stable) and **Qwen3-TTS** (State-of-the-art).
- **Voice Design (Qwen3):** Create entirely new voices using natural language descriptions (e.g., "a deep, warm male voice with a calm tone").
- **3-Second Voice Cloning:** High-fidelity zero-shot cloning with ultra-short reference samples via Qwen3.
- **Voice Library Manager:** Dedicated UI to manage your reference audio collection (Upload, Delete, Preview, and **Noise Reduction**).
- **Offline Voice Generation:** Local, private and unlimited TTS synthesis with shared voice/model configurations.
- **Dynamic Mode Support:** Seamlessly switch between **Subtitle Mode** (timed) and **Script Mode** (untimed).
- **Intelligent Job Archive:** Save, update, and manage synthesis jobs with draft support and state recovery.
- **Asynchronous Processing:** Full migration to background tasks with SSE for real-time updates and hardware monitoring.
- **Advanced Subtitle Tools:** Automatic grouping, manual editing, precise timecode alignment, and real-time preview.
- **Subtitle Translation:** Integration with local Ollama service for high-quality, offline multi-language translation.
- **Comprehensive Documentation:** Full [API Reference](API_REFERENCE.md) and [Technical Documentation](TECHNICAL_DOCUMENTATION.md) included.

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
- **Git**
- **Ollama** ([ollama.com](https://ollama.com/)) + **huihui_ai/hy-mt1.5-abliterated:7B** (Essential for high-quality offline translation)
- **SoX** ([sox.sourceforge.net](http://sox.sourceforge.net/)) - **Required for Qwen3 Voice Cloning**.

---

> **Workflow Tip:** If you are moving from an existing transcription to a translation, using the **Grouping** feature is essential to achieve fluid and natural speech, avoiding forced pauses between subtitle segments.

---

## Quick Start

### 1. Clone the repository 
```bash
git clone https://github.com/nispa/nispa-vibevoice-studio.git
cd nispa-vibevoice-studio
```

### 2. Installation

We provide an **interactive installer** to handle the setup of different synthesis engines. You can choose to install **VibeVoice**, **Qwen3-TTS**, or both.

#### Windows:
Double-click on `install.bat` and follow the on-screen menu. 
> **Note:** If using Qwen3 cloning, run `setup_sox_path.bat` as Administrator after installing SoX.

#### Linux / macOS:
Open a terminal and run:
```bash
chmod +x install.sh
./install.sh
```

### 3. Model Zoo (Weights)

Synthesis engines require pre-trained weights to function. You can use our built-in downloader or download them manually.

#### Using the Weights Downloader (Recommended)
This interactive tool downloads the official weights directly from Hugging Face into the correct directory. 
Run it after installation:
- **Windows**: `venv\Scripts\python backend\scripts\download_model.py`
- **Linux/macOS**: `./venv/bin/python backend\scripts\download_model.py`

#### Manual Download
If you prefer manual setup, download the weights and place them in the `data/model` directory:

#### VibeVoice Models (Stable)
| Model | Context | Speakers | Download Link |
|-------|---------|----------|---------------|
| VibeVoice-0.5B | 8K | 1 | [HF link](https://huggingface.co/microsoft/VibeVoice-Realtime-0.5B) |
| VibeVoice-1.5B | 64K | Up to 4 | [HF link](https://huggingface.co/vibevoice/VibeVoice-1.5B) |
| VibeVoice-Large (7B) | 32K | Up to 4 | [HF link](https://huggingface.co/vibevoice/VibeVoice-7B) |

#### Qwen3-TTS Models (High-Fidelity & Design)
| Model Type | Purpose | VRAM |
|------------|---------|------|
| **Tokenizer** | **Mandatory** for all Qwen3 models | - |
| **Base** | Best for **Voice Cloning** (Zero-shot) | 0.6B (~2GB) / 1.7B (~6GB) |
| **CustomVoice** | Best for high-quality **Built-in voices** | 0.6B (~2GB) / 1.7B (~6GB) |
| **VoiceDesign** | Enables **Text-to-Voice** creation | 1.7B (~6GB) |

> **Naming Tip:** Ensure the model folder name contains **"Qwen"** for the engine to automatically switch. If the model supports Voice Design, including **"VoiceDesign"** in the name will enable the design field in the UI.

---

## Running the Application

#### Windows:
Double-click on `start.bat`.

#### Linux / macOS:
Open a terminal and run:
```bash
chmod +x start.sh
./start.sh
```

---

## License

Distributed under the MIT License. See `LICENSE` for more information.
