# Technical Documentation: Nispa VibeVoice Studio

## 1. System Architecture
Nispa VibeVoice Studio follows a **Client-Server architecture** optimized for local execution of AI models.

- **Frontend:** Single Page Application (SPA) built with React 19, TypeScript, and Tailwind CSS 4.
- **Backend:** High-performance asynchronous API built with FastAPI (Python 3.11+).
- **TTS Engine:** Dual-provider (VibeVoice & Qwen3-TTS). Qwen3 uses the official `qwen-tts` library with Flash Attention 2.
- **Translation:** Internal Dynamic NLLB-200 engine. Supports multiple model loading from `data/model-translation/`.
- **Persistence:** SQLite database for job tracking and local filesystem for audio storage.

---

## 2. Backend Components

### 2.1. TTS Queue Manager (`core/queue_manager.py`)
To prevent blocking the main thread during heavy AI inference, the system uses an internal asynchronous queue.
- **Asynchronous Processing:** Uses `asyncio.Queue` to process tasks sequentially.
- **Progress Tracking:** Implements `OutputRedirector` to capture logs and streams them to the frontend using **Server-Sent Events (SSE)**.
- **Task Management:** Supports submission, cancellation, and retrieval of job status.

### 2.2. VibeVoice Provider (`core/tts_provider.py`)
This is the interface to the VibeVoice model.
- **Device Detection:** Automatically selects CUDA (NVIDIA), MPS (Apple Silicon), or CPU.
- **Zero-Shot Cloning:** Uses a 10-second reference WAV to extract speaker embeddings and synthesize text in the cloned voice.
- **Caching:** Models are loaded into VRAM/RAM once and cached for subsequent requests to reduce latency.

### 2.3. Audio Aligner (`core/aligner.py`)
The aligner ensures that generated audio matches the timing of the original subtitles.
- **Shifting Logic:** If a generated audio segment is longer than the subtitle duration, the system "shifts" the subsequent segments forward to avoid overlap.
- **Silence Padding:** Adds silence gaps between segments to maintain synchronization with the original video timestamps.

### 2.4. Subtitle Parser (`core/parser.py`)
- **SRT/VTT Support:** Uses `srt` and `webvtt-py` libraries.
- **Intelligent Grouping:** A specialized algorithm that merges segments based on punctuation (., !, ?) to create complete sentences, leading to more natural TTS intonation.

---

## 3. Frontend Components

### 3.1. State Management
The application uses **React Context API** for modular state management:
- `GlobalContext`: Handles system-wide settings, hardware monitoring, and shared TTS metadata (voices/models).
- `SubtitleContext`: Manages the complex state of subtitle files, segments, and generation logs.
- `TranslationContext`: Controls the LLM translation loop state.

### 3.2. Translation Workflow
Translation is handled iteratively to avoid long timeouts and provide real-time feedback:
1. The frontend identifies untranslated segments.
2. It sends individual segments to the `/api/translate-segment` endpoint.
3. This endpoint proxies the request to a local **Ollama** instance.
4. The frontend updates the UI segment-by-segment and auto-saves progress.

### 3.3. Hardware Monitoring
The system leverages `psutil` and `torch` on the backend to provide real-time hardware telemetry:
- GPU VRAM allocation/total.
- CPU core usage and total system RAM.
- Active hardware acceleration (CUDA/MPS).

---

## 4. Data Models

### 4.1. Job Schema (SQLite)
| Field | Type | Description |
|-------|------|-------------|
| `id` | INTEGER | Primary Key |
| `original_filename` | TEXT | Source filename |
| `subtitle_segments` | TEXT (JSON) | Original segments |
| `modified_segments` | TEXT (JSON) | Segments after editing/grouping/translation |
| `voice_id` | TEXT | Reference voice used |
| `status` | TEXT | draft, processing, completed, failed |

---

## 5. API Flow: Audio Generation
1. **POST `/api/tasks/generate-subtitles`**: Backend receives segments and voice config, returns `task_id`.
2. **GET `/api/tasks/{task_id}/stream`**: Frontend opens an SSE connection to receive live logs and progress.
3. **Synthesis Loop**: The `QueueManager` calls `tts_engine.synthesize` for each segment.
4. **Alignment**: The `Aligner` combines WAV bytes into a single MP3/WAV file.
5. **Completion**: The SSE stream sends `type: complete` with the final audio as a **Base64 string**.
6. **Persistence**: The file is saved in `data/outputs/` for future retrieval.

---

## 6. Installation Logic
The `install.bat` and `install.sh` scripts automate the environment setup:
1. Creation of a local Python `venv`.
2. Installation of backend requirements (`requirements.txt`).
3. Automated cloning of the VibeVoice core repository into `data/`.
4. Creation of local data folders (`model`, `voices`, `outputs`).
5. `npm install` for the React application.
