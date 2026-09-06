# Technical Documentation — Nispa VibeVoice Studio (v0.9.0)

## 1. System Architecture

Nispa VibeVoice Studio follows a local-first **Client-Server architecture** optimized for desktop execution of deep learning models, ensuring 100% data privacy and maximal hardware efficiency.

- **Frontend:** Single Page Application (SPA) built with React 19, TypeScript, and Tailwind CSS 4. Utilizes React Portals (`createPortal`) to guarantee viewport-relative modal overlays over modern `backdrop-filter` glassmorphism panels.
- **Backend:** High-performance asynchronous API built with FastAPI (Python 3.10+).
- **TTS Engine:** Modular, quad-provider architecture (`core/tts/`):
  - **Higgs Audio v3:** Dedicated standalone worker (`workers/higgs_worker.py`) running on loopback `127.0.0.1`. 4B parameter model supporting rich acoustic control via 45 specialized inline control tokens (emotions, styles, SFX, prosody, environment).
  - **OmniVoice:** Dedicated standalone worker (`workers/omnivoice_worker.py`) running on loopback `127.0.0.1`. Ultra-fast zero-shot voice cloning (RTF < 0.6) with SHA-256 keyed `VoiceClonePrompt` caching (`data/voice-prompts/omnivoice/`).
  - **Qwen3-TTS:** Integrated `qwen-tts` library supporting voice cloning (3-second reference), voice design (natural text descriptions), and custom voices.
  - **VibeVoice:** Autoregressive multi-speaker synchronized generator (`backend/vendors/vibevoice/`) with native batch inference.
- **Model Catalog & Manager:** Authoritative single source of truth (`core/tts/catalog.py` & `core/model_manager.py`) replacing legacy string-heuristics with typed capability metadata.
- **Translation:** Local NLLB-200 engine (200+ languages, 100% offline), with optional Ollama proxy integration.
- **Persistence:** SQLite database (`db/database.py`) with strict `workflow_type` separation (`subtitle` vs `script`); local filesystem (`data/audio-rendering/`) for intermediate WAV segments; `data/outputs/` for final exported audio.

---

## 2. Backend Components

### 2.1. Modular Routers (`api/routers/`)

| Router | Responsibility |
|--------|---------------|
| `models.py` | Model catalog querying, background downloading with SSE progress, deletion, and system health status |
| `tasks.py` | Long-running async generation via SSE; dynamic VRAM batching; multi-GPU distribution; script mode orchestration |
| `system.py` | Hardware monitoring, VRAM metrics, settings persistence (`settings.json`), batch overrides, and maintenance operations |
| `voices.py` | Voice file CRUD, catalog-driven model lists for dropdowns, audio serving, and transcription editing |
| `generation.py` | Synchronous single-segment synthesis and file export endpoints |
| `translation.py` | NLLB-200 offline inference and local Ollama proxy |
| `jobs.py` | CRUD operations on the SQLite job archive with workflow isolation |

### 2.2. TTS Core Engine & Workers

An extensible Provider pattern driven by capability metadata:

- **`core/tts/catalog.py`** — Authoritative catalog defining every model's `model_id`, `provider_id`, upstream repository, pinned revision, disk size, VRAM footprint, max batch size, speaker limit, and capability flags (`supports_voice_clone`, `supports_voice_design`, `supports_emotion_tags`, `requires_reference_audio`, `requires_reference_transcript`).
- **`core/tts/base.py`** — `TTSProvider` abstract base class.
- **`core/tts/higgs_provider.py` & `workers/higgs_worker.py`** — Higgs Audio v3 provider adapter and standalone worker process. Synthesizes dialogue conditioning on reference audio and 45 specialized control tokens (`<|category:value|>`).
- **`core/tts/omnivoice_provider.py` & `workers/omnivoice_worker.py`** — OmniVoice provider adapter and standalone worker process. Manages worker lifecycle, HTTP loopback communication, and biometric prompt caching.
- **`core/tts/qwen_provider.py`** — Qwen3-TTS provider. Uses `soundfile` for in-memory WAV serialization to prevent TorchCodec/torchaudio issues.
- **`core/tts/vibe_provider.py`** — VibeVoice provider. Native multi-speaker batch inference.
- **`core/tts_provider.py`** — `MultiModelProvider` orchestrator. Lazily loads providers and routes requests according to catalog capabilities.

### 2.3. Model Manager (`core/model_manager.py`)

- **`DownloadManager`**: Asynchronous downloader downloading safetensors from pinned Hugging Face revisions using `hf_hub_download`. Emits real-time progress, download speed (MB/s), and byte counters over an SSE queue. Supports non-blocking cancellation.
- **Safe Deletion**: Deletes model directories with strict path containment checks against `DATA_DIR / "model"` and `DATA_DIR / "model-translation"`.
- **System Health Diagnostics**: Gathers real-time telemetry (GPU compute capability, VRAM headroom, SoX, FFmpeg, worker processes, and disk utilization).

### 2.4. Device & VRAM Management (`core/`)

- **`device_utils.py`** — `get_default_device()`: Resolves optimal device (`cuda:N` with greatest free VRAM → `mps` → `cpu`).
- **`gpu_manager.py`** — Discovers CUDA GPUs, queries per-device free VRAM, and computes proportional split ratios for multi-GPU workloads.
- **`vram_config.py`** — Static VRAM profiles and `recommended_batch()` calculations. Shared by runtime batching and the Settings UI.

### 2.5. Dynamic Batching Algorithm (`api/routers/tasks.py`)

Before each batch:
1. Checks for manual user override in `settings.json` (`tts.batch_overrides[model_id]`).
2. Queries `torch.cuda.mem_get_info()` for current free VRAM.
3. Reserves **40% headroom** (`free_vram * 0.60`).
4. Calculates `batch_size = int(usable // (cost_gb * peak_multiplier))`, clamped to catalog `max_batch_size`.
5. On the first real batch, measures the actual VRAM delta to calibrate cost estimates.
6. Catches `torch.cuda.OutOfMemoryError`, halves the batch, and retries sequentially.

---

## 3. Frontend Architecture

### 3.1. Contexts & State Management

| Context | Responsibility |
|---------|---------------|
| `GlobalContext` | Models catalog, voices list, backend readiness sync |
| `SubtitleContext` | Subtitle segments, timecodes, intelligent grouping, draft auto-save |
| `ScriptContext` | Untimed dialogue text, speaker-voice mapping, continuous `localStorage` draft saving (`nispa_script_draft_v1`) |

### 3.2. Modal Architecture & Portals

To prevent CSS containing block entrapment (where ancestor elements with `backdrop-filter` or CSS transforms break `position: fixed` viewport positioning), all modal overlays in [`frontend/src/components/ui/modal/Modal.tsx`](file:///f:/nispa-voiceover/frontend/src/components/ui/modal/Modal.tsx) are rendered directly into `document.body` via React `createPortal`.

### 3.3. Specialized UI Modules

- **Models & Engines Manager (`features/models/`)**: Filterable model cards, real-time download banner with progress bar and cancel button, disk usage badges, and System Health view.
- **Higgs Tag Palette (`components/script/HiggsTagPalette.tsx`)**: Collapsible palette with category filter pills (Emotions, Styles, SFX, Prosody, Environment) for fast cursor insertion into script lines.
- **Higgs Emotion Guide (`components/script/HiggsEmotionGuideModal.tsx`)**: Modal detailing exact token formatting, acoustic conditioning behavior, and usage examples.

---

## 4. Data Models & Storage

### 4.1. SQLite Job Record Schema (`jobs.db`)

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `original_filename` | TEXT | Subtitle filename or script title |
| `subtitle_segments` | TEXT (JSON) | Original input segments |
| `modified_segments` | TEXT (JSON) | Current segments with relative `audioUrl` (`data/audio-rendering/...`) |
| `voice_id` | TEXT | Primary voice ID |
| `voice_name` | TEXT | Voice display name or speaker summary |
| `model_name` | TEXT | TTS model ID used |
| `workflow_type` | TEXT | `'subtitle'` (timed subtitle jobs) or `'script'` (untimed dialogue jobs) |
| `status` | TEXT | `'draft'`, `'processing'`, `'completed'`, `'failed'` |

---

## 5. Privacy, Security & Biometrics

- **Zero Remote Inference**: Synthesis never transmits audio or text off the local machine.
- **Biometric Caching**: Cached `VoiceClonePrompt` files in `data/voice-prompts/omnivoice/` are SHA-256 keyed and gitignored. They can be purged without affecting original voice references.
- **Loopback Isolation**: Dedicated worker processes bind strictly to `127.0.0.1` and communicate via ephemeral session tokens.
