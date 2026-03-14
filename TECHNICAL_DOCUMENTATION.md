# Technical Documentation: Nispa VibeVoice Studio (v0.5.0)

## 1. System Architecture
Nispa VibeVoice Studio follows a **Client-Server architecture** optimized for local execution of AI models, ensuring 100% privacy and maximum hardware utilization.

- **Frontend:** Single Page Application (SPA) built with React 19, TypeScript, and Tailwind CSS 4.
- **Backend:** High-performance asynchronous API built with FastAPI (Python 3.11+).
- **TTS Engine:** Modular, Dual-provider architecture (`core/tts/`):
  - **Qwen3-TTS:** Uses the official `qwen-tts` library with Flash Attention 2/3 for parallel tensor processing.
  - **VibeVoice:** Stable autoregressive generator for multi-speaker long-form content.
- **Translation:** Internal Dynamic NLLB-200 engine, with optional fallback/integration to a local Ollama instance.
- **Persistence:** SQLite database (`db/database.py`) for job tracking, real-time segment saving, and local filesystem for final audio storage.

---

## 2. Backend Components

### 2.1. Modular Routers (`api/routers/`)
The backend is split into domain-specific modules:
- `tasks.py`: Handles complex, long-running asynchronous tasks (SSE generation, batching).
- `translation.py`: Dedicated to offline NLLB and Ollama proxying.
- `generation.py`: Synchronous, lightweight generation endpoints.
- `jobs.py`: API for CRUD operations on the SQLite archive.

### 2.2. TTS Core Engine (`core/tts/`)
A highly extensible object-oriented pattern:
- **`base.py`**: Defines the `TTSProvider` abstract class.
- **`qwen_provider.py`**: 
  - Implements **Hardware-Aware Dynamic Batching**. It queries `torch.cuda.mem_get_info()` to dynamically adjust the `BATCH_SIZE` (from 1 to 8) based on available VRAM and the specific model's footprint (0.6B vs 1.7B).
  - Implements **Aggressive VRAM Cleanup**: Explicitly deletes heavy PyTorch tensors and forces `gc.collect()` and `torch.cuda.empty_cache()` inside `finally` blocks to prevent OOM memory leaks.
- **`tts_provider.py`**: The Orchestrator (`MultiModelProvider`) that routes requests to the correct underlying engine.

### 2.3. Audio Aligner (`core/aligner.py`)
Ensures that generated audio perfectly matches the original SRT/VTT timing.
- **Shifting Logic:** If a generated segment is longer than the subtitle duration, the system shifts subsequent segments forward to avoid overlap.
- **Silence Padding:** Adds silence gaps between segments to maintain synchronization with video timestamps.

---

## 3. Frontend Components

### 3.1. Context Architecture
Uses **React Context API** to separate business logic from UI:
- `GlobalContext`: System settings, hardware monitoring, and shared TTS metadata.
- `SubtitleContext`: Manages subtitle segments. It uses a robust `useRef` architecture (`segmentsRef`) to ensure the auto-save functionality always has access to real-time data, avoiding React stale-closure bugs during asynchronous operations.
- `TranslationContext`: Controls the LLM translation loop state.

### 3.2. Generation & Review UI
- **GenerationControls**: Interacts with the SSE stream, calculating ETA using a weighted moving average to compensate for the "burst" updates caused by backend dynamic batching.
- **JobReviewModal**: A paginated, non-destructive editing gallery. Allows users to listen to individual waveforms, trim hallucinations via `AudioTrimmer`, and perform **Surgical Regenerations** by calling `/api/generate-segment` using the preserved metadata (Voice, Model, Language) of that specific segment.

---

## 4. Data Models

### 4.1. Job Schema (SQLite)
| Field | Type | Description |
|-------|------|-------------|
| `id` | INTEGER | Primary Key |
| `original_filename` | TEXT | Source filename |
| `subtitle_segments` | TEXT (JSON) | Original segments |
| `modified_segments` | TEXT (JSON) | Segments after editing. **Includes `audioBase64`** |
| `voice_id` | TEXT | Reference voice used |
| `status` | TEXT | draft, processing, completed, failed |

*Note: The `SubtitleSegmentData` Pydantic model enforces `extra="ignore"` to safely handle legacy job formats while supporting new fields like `voice_id` and `audioBase64` per segment.*

---

## 5. API Flow: Subtitle Generation (Backend-Driven Real-Time Save)
This workflow guarantees **Zero Data Loss**:
1. **POST `/api/tasks/generate-subtitles`**: Frontend requests generation and passes a `job_id`.
2. **SSE Connection**: Frontend opens `/api/tasks/{task_id}/stream`.
3. **Dynamic Batching**: The `queue_manager` calculates the optimal batch size based on VRAM.
4. **Synthesis & Injection**: The engine synthesizes a batch. **Before** yielding the result to the frontend, the backend instantly injects the generated `audioBase64` into the SQLite database for the specific `job_id`.
5. **Streaming**: The SSE stream updates the frontend UI.
6. **Cancellation (Safe)**: If the user cancels, the backend simply stops the loop. No data is lost because every completed segment was already persisted to disk at Step 4.

---

## 6. Installation Logic
The `install.bat` and `install.sh` scripts automate the environment setup:
1. Creation of a local Python `venv`.
2. Installation of backend requirements (`requirements.txt`).
3. Automated cloning of the VibeVoice core repository into `data/`.
4. Creation of local data folders (`model`, `voices`, `outputs`).
5. `npm install` for the React application.
