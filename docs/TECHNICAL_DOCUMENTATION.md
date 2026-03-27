# Technical Documentation — Nispa VibeVoice Studio (v0.7.1)

## 1. System Architecture

Nispa VibeVoice Studio follows a **Client-Server architecture** optimized for local execution of AI models, ensuring 100% privacy and maximum hardware utilization.

- **Frontend:** Single Page Application (SPA) built with React 19, TypeScript, and Tailwind CSS 4.
- **Backend:** High-performance asynchronous API built with FastAPI (Python 3.10+).
- **TTS Engine:** Modular, dual-provider architecture (`core/tts/`):
  - **Qwen3-TTS:** Uses the official `qwen-tts` library. Supports Voice Cloning (3-second reference), Voice Design (text description), and Custom/Built-in voices.
  - **VibeVoice:** Vendored autoregressive generator (`backend/vendors/vibevoice/`) for multi-speaker long-form content with native batch inference.
- **Translation:** Internal NLLB-200 engine (200+ languages, 100% offline), with optional Ollama integration.
- **Persistence:** SQLite database (`db/database.py`) for job tracking; local filesystem (`data/audio-rendering/`) for WAV segment storage; `data/outputs/` for final exported audio.

---

## 2. Backend Components

### 2.1. Modular Routers (`api/routers/`)

| Router | Responsibility |
|--------|---------------|
| `tasks.py` | Long-running async generation via SSE; VRAM batching; multi-GPU orchestration |
| `system.py` | Health, hardware status, VRAM info, maintenance operations |
| `generation.py` | Synchronous single-segment generation endpoint |
| `translation.py` | NLLB-200 inference + Ollama proxy |
| `jobs.py` | CRUD operations on the SQLite job archive |
| `voices.py` | Voice file management (upload, list, delete, reprocess) |

### 2.2. TTS Core Engine (`core/tts/`)

An extensible Provider pattern:

- **`base.py`** — `TTSProvider` abstract base class. `_get_best_gpu()` delegates to `device_utils.get_default_device()`.
- **`qwen_provider.py`** — Qwen3-TTS implementation. Lazy model loading. `@functools.lru_cache` on `_get_voice_ref()` to read `.wav`/`.txt` voice files once per voice. Per-segment language detection; groups consecutive segments by language for minimal model calls. `soundfile.write()` for WAV output (no `torchaudio` dependency).
- **`vibe_provider.py`** — VibeVoice implementation. Native batch inference: single `processor()` + `model.generate()` call for the entire batch. Device-specific model loading (CUDA `device_map`, MPS explicit `.to("mps")`, CPU).
- **`tts_provider.py`** — `MultiModelProvider` orchestrator. Maintains per-device provider pools (`_vibe_pool`, `_qwen_pool`). Default device resolved via `get_default_device()` at runtime — never hardcoded.

### 2.3. Device & VRAM Utilities (`core/`)

- **`device_utils.py`** — `get_default_device()`: single source of truth for device selection. Priority: `cuda:N` (best free VRAM among all GPUs) → `mps` (Apple Silicon) → `cpu`.
- **`gpu_manager.py`** — `GPUManager`: discovers CUDA GPUs, queries per-device free VRAM, computes proportional segment splits for multi-GPU workloads.
- **`vram_config.py`** — `MODEL_VRAM_CONFIG`: per-model static estimates (`cost_gb`, `peak_multiplier`, `max_batch`). `recommended_batch()`: calculates safe batch size from free VRAM. Single source of truth shared by `tasks.py` (runtime) and `system.py` (UI display).

### 2.4. Dynamic Batching (`api/routers/tasks.py`)

Before every batch iteration, `calculate_optimal_batch_size()`:
1. Checks for a user override in `settings.json` → `tts.batch_overrides[model_name]` (returns immediately if set).
2. Queries `torch.cuda.mem_get_info()` for current free VRAM.
3. Applies `free_vram × 0.60` usable budget (40% headroom for KV cache peaks).
4. Computes `batch = int(usable // (cost_gb × peak_multiplier))`, clamped to `max_batch`.
5. On the first real batch, measures actual VRAM delta and updates the cost estimate for subsequent iterations (first-batch profiling).
6. On `torch.cuda.OutOfMemoryError`: halves current batch, doubles cost estimate, retries sequentially — no crash.

On macOS (MPS) and CPU, VRAM querying is not available; batch size is always 1.

### 2.5. Multi-GPU (`core/gpu_manager.py` + `api/routers/tasks.py`)

When ≥2 CUDA GPUs are available and ≥2 segments must be processed, `tasks.py` splits the segment list proportionally to each GPU's free VRAM (`gpu_manager.compute_split()`), dispatches synthesis chunks in parallel via `asyncio.gather()`, and merges results.

### 2.6. Audio Storage (`core/audio_storage.py`)

Each WAV segment is written to `data/audio-rendering/{slug}_{job_id}/{index}.wav`. The database stores the relative file path only — no base64 blobs. Segments are served via `GET /audio-files/{job_folder}/{filename}` with `Cache-Control: no-store`.

### 2.7. Audio Aligner (`core/aligner.py`)

Ensures generated audio matches original SRT/VTT timing:
- **Shifting Logic:** If a segment is longer than its subtitle duration, subsequent segments shift forward to avoid overlap.
- **Silence Padding:** Adds silence gaps to maintain sync with video timestamps.

---

## 3. Frontend Components

### 3.1. Context Architecture

| Context | Responsibility |
|---------|---------------|
| `GlobalContext` | Voices, models, `isProcessing` global flag |
| `SubtitleContext` | Subtitle segment state; `segmentsRef` for stale-closure-safe auto-save |

### 3.2. Generation & Review UI

- **`GenerationControls`** — Opens SSE `EventSource`, handles `progress`/`complete`/`error` events. Saves `task_id` + `job_id` to `sessionStorage` on start; on mount, calls `GET /api/tasks/active` to reconnect to an in-progress task after a browser refresh.
- **`useGenerationProgress`** — ETA calculation in human-readable format (`Xs` / `Xm Xs` / `Xh Xm`); weighted moving average over recent segment durations.
- **`GenerationProgressDisplay`** — Progress bar + ETA display component.
- **`JobReviewModal`** — Paginated audio gallery (10 per page). Per-segment waveform player, `AudioTrimmer` (Mark-In/Mark-Out sliders), and Regenerate button (calls `/api/generate-segment` with original voice/model/language metadata).

---

## 4. Data Models

### 4.1. Job Schema (SQLite)

| Field | Type | Description |
|-------|------|-------------|
| `id` | INTEGER | Primary key |
| `original_filename` | TEXT | Source filename |
| `subtitle_segments` | TEXT (JSON) | Original parsed segments |
| `modified_segments` | TEXT (JSON) | Segments after editing; each has `audioUrl` (relative file path) |
| `voice_id` | TEXT | Default reference voice |
| `status` | TEXT | `draft` · `processing` · `completed` · `failed` |

> `audioUrl` stores a relative path like `data/audio-rendering/{folder}/{index}.wav`. Legacy jobs with inline `audioBase64` are still read for backward compatibility (`extra="ignore"` on the Pydantic model) but are never written in current versions.

### 4.2. Task Lifecycle

Tasks live in the `QueueManager` in-memory dict. States: `QUEUED` → `PROCESSING` → `COMPLETED` / `FAILED` / `CANCELLED`. Tasks are automatically evicted 10 minutes after reaching a terminal state to prevent unbounded memory growth.

---

## 5. API Flow: Subtitle Generation

This workflow guarantees **zero data loss**:

1. **`POST /api/tasks/generate-subtitles`** — Frontend submits `job_id` (segments loaded from SQLite, supports resume) or raw subtitle data.
2. **`GET /api/tasks/{task_id}/stream`** — Frontend opens SSE connection. Backend streams `progress` events; each event includes `new_segments` with `audio_url` (HTTP path, not base64).
3. **Dynamic Batching** — `calculate_optimal_batch_size()` runs at every loop iteration.
4. **Write to disk** — WAV saved to `data/audio-rendering/` immediately after synthesis; DB updated once per batch (not per segment).
5. **`complete` event** — Final output (MP3/WAV) written to `data/outputs/` and served via `GET /outputs/{filename}`. No base64 in the event payload.
6. **Cancellation** — Loop stops; all audio generated up to that point is already on disk and in the DB.

---

## 6. Session Recovery

`task_id` and `job_id` are saved to `sessionStorage` when generation starts. On mount, `GenerationControls` calls `GET /api/tasks/active`. If the task is still `QUEUED` or `PROCESSING`, the SSE stream is reconnected automatically — no user action required after a browser refresh.

---

## 7. Installation Logic

`install.bat` (Windows) and `install.sh` (macOS/Linux) automate environment setup:

1. Create a local Python `venv`.
2. Install backend requirements:
   - **Windows/Linux:** `requirements.txt` — PyTorch `cu130` build, Flash Attention optional.
   - **macOS:** `requirements-mac.txt` — standard PyTorch from PyPI (MPS support built-in), no Flash Attention.
3. `optimize_env.py` — hardware/software checks; Flash Attention install on CUDA systems (skipped on Mac).
4. Create local data folders (`model`, `voices`, `outputs`, `audio-rendering`).
5. `npm install` for the React frontend.
