# User Guide - Nispa VibeVoice Studio (v0.5.0)

Welcome to **Nispa VibeVoice Studio**. This guide covers the dual-engine architecture (**VibeVoice** and **Qwen3-TTS**) to generate high-quality synthesized voices with advanced cloning and design capabilities.

---

## 1. Installation and Quick Start

### Interactive Installer
The installer handles all Python dependencies and detects your hardware:
- **Windows**: Run `install.bat`.
- **Linux/Mac**: Run `chmod +x install.sh && ./install.sh`.

### Environment Optimization
After dependency installation, the system runs `optimize_env.py`. This script:
1.  **Detects NVIDIA GPUs**: Suggests and installs the correct **Flash Attention** wheel.
2.  **Checks System Tools**: Verifies if **FFmpeg** and **SoX** are available.
3.  **Configures Paths**: Saves tool locations to `data/settings.json`.

### Voice Cloning Requirements (SoX)
If you plan to use Qwen3's Zero-Shot Voice Cloning on Windows:
1. Download SoX from [sox.sourceforge.net](http://sox.sourceforge.net/).
2. Add it to your PATH or configure the path in `data/settings.json`.

---

## 2. Models and Weights Management

### Weights Downloader (Recommended)
Use the integrated tool to fetch official weights from Hugging Face:
- **Windows**: `venv\Scripts\python backend\scripts\download_model.py`
- **Linux/Mac**: `./venv/bin/python backend/scripts/download_model.py`

### Resource Requirements (VRAM)

| Model | Strengths | VRAM Req. |
|-------|-----------|-----------|
| **VibeVoice 1.5B** | Stable, great for long texts, up to 4 speakers. | ~4GB |
| **VibeVoice Large (7B)** | Highest VibeVoice quality, very natural. | ~14GB |
| **Qwen3 0.6B** | Extremely fast, 3s cloning, lightweight. | ~2GB |
| **Qwen3 1.7B** | High fidelity, superior cloning, Premium. | ~6GB |

---

## 3. Workflow: Subtitle Mode

### 100% Offline Translation
Nispa Studio uses **NLLB-200** internally. No external service (like Ollama) is required.
1.  **Upload**: Drag and drop a `.srt` or `.vtt` file.
2.  **Configure**: Select Source and Target languages.
3.  **Translate**: Click "Translate Subtitles". The process is chunked for stability.
4.  **Edit**: Use the "Edit Translate" button to refine the text.

### Generation & Sync
1.  **Generate Voice-over**: This button triggers an **Auto-save** and starts synthesis.
2.  **Audio Trimmer**: If a segment has "hallucinations" (unwanted noise or words):
    - Click **Trim** next to the segment in the Activity Log.
    - Move the **Mark-In** and **Mark-Out** sliders to select the clean audio.
    - Click **Apply & Update** to fix the segment instantly.

---

## 4. Workflow: Script Mode (Free Text)

1.  **Syntax**: Use `Speaker1: Hello!`, `Speaker2: Hi there!` format.
2.  **Voice Mapping**: Map each speaker to a reference voice in the sidebar.
3.  **Voice Design (Qwen3)**: Describe a voice (e.g., "a raspy old man") to generate audio without a reference file.

---

## 5. Troubleshooting & FAQ

### "APEX FusedRMSNorm not available"
This is a standard warning. The system automatically uses the highly optimized native PyTorch implementation. You can ignore this.

### VRAM Saturation
The Studio includes a **VRAM Manager** that unloads the previous engine when you switch between VibeVoice and Qwen3. If you still encounter "Out of Memory" errors, use smaller models (0.6B or 1.5B).

### Missing Tools
If FFmpeg or SoX are not found, the Studio will notify you at startup. Install them and ensure they are in your system PATH.
