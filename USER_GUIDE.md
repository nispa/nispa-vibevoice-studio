# User Guide - Nispa VibeVoice Studio (v0.5.0)

Welcome to **Nispa VibeVoice Studio**. This guide covers the dual-engine architecture (**VibeVoice** and **Qwen3-TTS**) to generate high-quality synthesized voices with advanced cloning, batching, and design capabilities.

---

## 1. Installation and Quick Start

### Interactive Installer
The installer handles all Python dependencies and detects your hardware:
- **Windows**: Run `install.bat`.
- **Linux/Mac**: Run `chmod +x install.sh && ./install.sh`.

### Environment Optimization
After dependency installation, the system runs `optimize_env.py`. This script:
1.  **Detects NVIDIA GPUs**: Suggests and installs the correct **Flash Attention** wheel for massive performance boosts during generation.
2.  **Checks System Tools**: Verifies if **FFmpeg** and **SoX** are available.
3.  **Configures Paths**: Saves tool locations to `data/settings.json`.

---

## 2. Models and Hardware Acceleration

### Weights Downloader
Use the integrated tool to fetch official weights from Hugging Face:
- **Windows**: `venv\Scripts\python backend\scripts\download_model.py`

### Dynamic Batching & VRAM Management
The engine automatically queries your GPU's VRAM in real-time. 
If you have a powerful GPU (like an RTX 4090), the system will automatically process up to 8 segments in parallel, drastically reducing generation time. If you have a smaller GPU, it scales down gracefully to prevent crashes.

### Resource Requirements (VRAM)

| Model | Strengths | VRAM Req. |
|-------|-----------|-----------|
| **VibeVoice 1.5B** | Stable, great for long texts, up to 4 speakers. | ~4GB |
| **VibeVoice Large (7B)** | Highest VibeVoice quality, very natural. | ~14GB |
| **Qwen3 0.6B** | Extremely fast, 3s cloning, lightweight. | ~2GB |
| **Qwen3 1.7B** | High fidelity, superior cloning, Premium. | ~6GB |

---

## 3. Workflow: Subtitle Generation (The Core Workflow)

### Step 1: Upload & Translation
Nispa Studio primarily uses **NLLB-200** internally for 100% offline translations. You can also connect to a local **Ollama** instance (like Llama 3) for advanced contextual translations.
1.  **Upload**: Drag and drop a `.srt` or `.vtt` file.
2.  **Configure**: Select Source and Target languages.
3.  **Translate**: Click "Translate Subtitles". The process is chunked for stability.

### Step 2: Edit Text & Timings
Click **Edit Subtitles** to manually adjust the translated text or tweak the Start/End times. This editor is purely text-based and non-destructive.

### Step 3: Generation & Real-time Persistence
1.  Select a Voice and a Model.
2.  Click **Generate Voice-over**. 
3.  **Zero Data Loss:** The system now saves every single generated audio segment directly to the database in real-time. If you close the browser or hit "Cancel," your progress is 100% saved and can be instantly resumed later from the Job Archive.

---

## 4. Audio Review & Finalization (New in v0.6.0)

Once generation is complete (or even partially complete), you can access the **Job Audio Gallery** by clicking the **Review Audio** button.

### Surgical Regeneration
If a specific segment sounds wrong:
1. Find it in the Paginated Review Modal.
2. Click the **Regenerate** button (circular arrows) next to the waveform.
3. The system perfectly recalls the specific Voice, Model, and Language used for that line and resynthesizes *only* that segment instantly.

### Audio Trimmer
If a segment has "hallucinations" (unwanted noise at the end):
- Click the **Scissors** icon to open the trimmer.
- Move the **Mark-In** and **Mark-Out** sliders to isolate the clean audio.
- Click **Apply** to cut the bad parts out.

### Final Assembly
Once you are happy with all segments, click **Download Final Voiceover** in the Review Modal. The system will precisely align all audio files to match the exact timestamps of the original `.srt` file.

---

## 5. Job Archive & Resuming Work

Your jobs are automatically saved. 
To resume a previous session:
1. Open the **Job Archive** (top right corner).
2. Look for jobs with the green **🎵 AUDIO SAVED** badge.
3. Click the **Load** icon. 
4. The system will instantly reconstruct the audio without re-generating anything. You can immediately click "Review Audio" to listen or "Generate" to pick up exactly where you left off.
