# VibeVoice Studio (nispa-voiceover)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)
![Node.js](https://img.shields.io/badge/node-v18+-green.svg)

## Overview

**nispa - VibeVoice Studio** is a powerful, locally-hosted Text-to-Speech (TTS) application designed to provide high-quality voice synthesis. Leveraging the Microsoft VibeVoice model, it offers a seamless integration between a blazing-fast Python FastAPI backend and a modern React/TypeScript frontend. 

This project aims to give creators, developers, and researchers a user-friendly GUI to generate offline speech, manage voice profiles, and visualize audio with an integrated waveform player—all while remaining completely private and running entirely on your local machine.

## Key Features

- **Local & Private TTS Engine:** Fully offline voice generation utilizing the VibeVoice core.
- **Dynamic Voice Management:** Seamlessly select and configure different voices with varying languages, accents, and genders.
- **Modern User Interface:** A sleek React-based UI featuring an interactive waveform player, subtitle mode, and project settings.
- **One-Click Setup & Launch:** Zero manual configuration required. Integrated `.bat` scripts handle both installation and execution workflows automatically.

---

## Prerequisites

Before installing, ensure you have the following installed on your Windows machine:
- **Python 3.11+** (Make sure it is added to your system PATH)
- **Node.js** (v18+ recommended)
- **Git** (Required for cloning the repository and external dependencies)

---

## Quick Start

We have engineered the setup process to be as frictionless as possible. You **do not** need to manually configure virtual environments or run distinct install commands.

### 1. Clone the repository
```bash
git clone https://github.com/your-username/nispa-voiceover.git
cd nispa-voiceover
```

### 2. Installation
Simply double-click on `install.bat` (or run it via Command Prompt). This automated script will:
- Create a Python virtual environment (`venv`).
- Install all required Python backend dependencies.
- Clone the commuinty VibeVoice repository into `data/vibevoice` and install it.
- Set up necessary data directories (`data/model` and `data/voices`).
- Install all NPM dependencies for the React frontend.

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
2. **Voice Selection:** Use the right-hand panel to open the **Voice Settings** and select a speaker profile (filtered by accent, language, or gender).
3. **Synthesis:** Click the **Generate** button. The local backend will process the text and return the generated audio.
4. **Playback:** Use the embedded waveform audio player to scrub through your audio, listen to the result, and manage your timeline.

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
