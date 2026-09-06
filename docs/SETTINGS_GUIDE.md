# Settings & Configuration Guide — Nispa VibeVoice Studio

This guide provides a comprehensive reference for all configuration options, hardware tuning settings, paths, environment variables, and persistence mechanisms in Nispa VibeVoice Studio.

---

## 1. Overview of Configuration Architecture

Nispa VibeVoice Studio prioritizes local, reproducible, and non-destructive execution:
- **Central Settings File**: `data/settings.json` stores user preferences, tool paths, and GPU overrides.
- **Data Directory Hierarchy**: All models, audio files, databases, and voice references are stored strictly under the `data/` folder.
- **Strict Offline Policy**: Network access is explicitly disabled during inference (`HF_HUB_OFFLINE=1`, `TRANSFORMERS_OFFLINE=1`).

---

## 2. The Settings File (`data/settings.json`)

The primary configuration file is located at `data/settings.json`. If it does not exist, the backend automatically creates it with safe defaults on first launch.

### Default Schema & Options

```json
{
  "paths": {
    "sox": "sox",
    "ffmpeg": "ffmpeg",
    "ffprobe": "ffprobe"
  },
  "audio": {
    "default_format": "mp3",
    "sample_rate_asr": 16000,
    "sample_rate_tts": 24000
  },
  "ui": {
    "theme": "dark"
  },
  "tts": {
    "strict_offline": true,
    "batch_overrides": {},
    "multi_gpu": {
      "disabled_devices": []
    }
  }
}
```

### Configuration Sections

| Section | Key | Type | Default | Description |
|---------|-----|------|---------|-------------|
| `paths` | `sox` | `string` | `"sox"` | Absolute path or PATH command name for SoX executable (required for Qwen voice cloning). |
| `paths` | `ffmpeg` | `string` | `"ffmpeg"` | Absolute path or PATH command name for FFmpeg executable. |
| `paths` | `ffprobe` | `string` | `"ffprobe"` | Absolute path or PATH command name for FFprobe executable. |
| `audio` | `default_format` | `string` | `"mp3"` | Default export format (`"mp3"` or `"wav"`). |
| `audio` | `sample_rate_tts` | `integer` | `24000` | Target sample rate for assembled audio (in Hz). |
| `tts` | `strict_offline` | `boolean` | `true` | Enforces offline environment flags so no network requests are attempted during inference. |
| `tts` | `batch_overrides` | `object` | `{}` | Key-value mapping of `model_id` to custom batch size (e.g. `{"qwen3-1.7b": 2}`). Overrides dynamic VRAM calculation. |
| `tts.multi_gpu` | `disabled_devices` | `array[int]` | `[]` | List of CUDA device indices to exclude from multi-GPU segment distribution (e.g. `[1]`). |

---

## 3. Hardware & GPU Tuning

### 3.1. Hardware-Aware Dynamic Batching (CUDA)

On NVIDIA GPUs, the system dynamically measures free VRAM before every batch:
1. **Headroom Reservation**: The engine reserves **40% headroom** (`free_vram * 0.60`) to absorb KV cache peaks and activation spikes.
2. **Model Footprint**: Each model has a static VRAM cost profile (`cost_gb` and `peak_multiplier`).
3. **Safety Fallback**: If a `torch.cuda.OutOfMemoryError` occurs:
   - The current batch size is immediately halved.
   - The memory cost estimate is doubled.
   - The failed batch is retried sequentially without crashing the application.

### 3.2. Manual Batch Overrides

You can manually fix the batch size for any model:
- **Via the UI**: Open **Settings & Maintenance** (gear icon) → **Generation** tab → Adjust the number under **Batch Size per Model** and click **Save**.
- **Via `data/settings.json`**:
  ```json
  "tts": {
    "batch_overrides": {
      "higgs-audio-v3": 1,
      "omnivoice": 4,
      "qwen3-1.7b": 2
    }
  }
  ```
- **Reset to Auto**: Click **Reset** in the UI or remove the key from `batch_overrides`.

### 3.3. Multi-GPU Distribution

When two or more NVIDIA CUDA GPUs are detected:
- The system queries free VRAM on all devices in real time.
- Batches of segments are split proportionally to each GPU's available capacity.
- Work is executed in parallel across devices and merged chronologically.
- **Disabling a GPU**: If a specific GPU is reserved for other tasks (display, training), disable it in **Settings** → **Generation** → **GPU Devices**. Its index will be saved to `tts.multi_gpu.disabled_devices`.

### 3.4. Apple Silicon (macOS MPS) & CPU

- **MPS Acceleration**: PyTorch MPS is auto-detected on macOS (`M1/M2/M3/M4`).
- **Batch Size**: Fixed at **1** on MPS and CPU because unified memory does not expose per-device VRAM pools in the same manner as CUDA.
- **Flash Attention**: Automatically skipped on macOS; inference uses standard PyTorch attention.

---

## 4. System Tools & External Binaries

Nispa VibeVoice Studio relies on two external CLI tools:

### FFmpeg
- **Used for**: Audio concatenation, silence padding, format conversion (WAV to MP3), and audio trimming.
- **Setup**: Must be available on your system `PATH`.
  - Windows: `choco install ffmpeg-full` or download from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/)
  - Linux: `sudo apt install ffmpeg`
  - macOS: `brew install ffmpeg`
- **Custom Path**: If FFmpeg is not in your system PATH, specify the absolute path in `data/settings.json`:
  ```json
  "paths": {
    "ffmpeg": "C:\\Tools\\ffmpeg\\bin\\ffmpeg.exe",
    "ffprobe": "C:\\Tools\\ffmpeg\\bin\\ffprobe.exe"
  }
  ```

### SoX (Sound eXchange)
- **Used for**: Audio normalization and voice reference feature extraction in Qwen3-TTS voice cloning.
- **Windows Auto-Detection**: The backend scans common install paths automatically:
  - `C:\Program Files (x86)\sox-14-4-2\sox.exe`
  - `C:\Program Files\sox-14-4-2\sox.exe`
  - `C:\sox\sox.exe`
- **Manual Path**: Set `"paths": {"sox": "C:\\path\\to\\sox.exe"}` in `data/settings.json` if installed in a custom location.

---

## 5. Storage Directory Structure

All persistent data is stored in the `data/` directory:

```
data/
├── model/                         # TTS weights (Higgs, OmniVoice, Qwen, VibeVoice)
├── model-translation/             # NLLB-200 offline translation model
├── voices/                        # Reference voice files (.wav) and transcripts (.txt)
├── voice-prompts/
│   └── omnivoice/                 # Cached cryptographic VoiceClonePrompt files
├── audio-rendering/               # Generated intermediate WAV segment files
│   ├── job_{id}/                  # Subtitle mode segments
│   └── script_{id}/               # Script mode segments
├── outputs/                       # Assembled final MP3/WAV outputs
├── jobs.db                        # SQLite database for job persistence
└── settings.json                  # Application settings
```

---

## 6. Translation Settings

### Built-in NLLB-200 (Offline)
- Installed locally in `data/model-translation/nllb-200-distilled-600M`.
- Supports 200+ languages without any external dependencies or network traffic.

### Local Ollama Integration
- If you have [Ollama](https://ollama.ai) running locally, Nispa VibeVoice Studio can query your local LLM models for context-aware translation.
- **Default Endpoint**: `http://localhost:11434`
- The backend queries `/api/tags` on Ollama to populate the model dropdown in **Subtitle Mode** → **Step 2 (Refining & Translation)**.

---

## 7. Privacy, Security & Biometric Voice Prompts

1. **Strict Offline Environment**:
   - The backend enforces `HF_HUB_OFFLINE=1` and `TRANSFORMERS_OFFLINE=1`.
   - Model download is always an explicit user action (via the Models Manager or `download_model.py`). Synthesis never downloads files in the background.
2. **Biometric Derivative Caching**:
   - OmniVoice creates acoustic `VoiceClonePrompt` files cached under `data/voice-prompts/omnivoice/`.
   - Prompt files are keyed to SHA-256 hashes of the voice WAV and transcript.
   - If a voice WAV or transcript changes, the cache is automatically invalidated.
   - These files are strictly gitignored and can be safely deleted at any time without losing original voice references.

---

## 8. Frontend Runtime Configuration

The frontend supports dynamic runtime configuration without requiring a re-build:

### Dynamic Runtime (`frontend/public/config.js`)
For Docker containers, local reverse proxies, or custom backend ports, edit `frontend/public/config.js`:
```javascript
window.__RUNTIME_CONFIG__ = {
  API_BASE_URL: "http://localhost:8000/api"
};
```

### Build-Time Configuration (`frontend/.env`)
For standard Vite development and production builds:
```env
VITE_API_BASE_URL=http://localhost:8000/api
```

---

## 9. Maintenance & Storage Operations

Available from the **Settings & Maintenance** modal (gear icon) → **Maintenance** tab:

1. **VACUUM Database**:
   - Reclaims unused disk space from `data/jobs.db` after deleting jobs or segments.
2. **Scan for Orphans**:
   - Scans `data/audio-rendering/` for folders that no longer correspond to active jobs in the database.
   - Allows safe, one-click bulk deletion of orphaned WAV files.
