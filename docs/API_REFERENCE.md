# API Reference — Nispa VibeVoice Studio (v0.9.0)

Backend REST API for Nispa VibeVoice Studio. All endpoints are prefixed with `/api` unless otherwise noted.

**Base URL (local development):** `http://localhost:8000/api`

---

## 1. System & Hardware Diagnostics

### `GET /health`
Check if the backend application is running and the core TTS engine is ready.
- **Response:** `{"status": "ok", "ready": true|false}`

### `GET /status`
Check backend readiness lifecycle state.
- **Response:** `{"status": "loading"}` or `{"status": "ready"}`

### `GET /system-info`
CPU, RAM, GPU, and platform environment information. Safe to call on application startup without querying device CUDA context.
- **Response:** Nested object with `system`, `torch`, `gpu`, `cpu` fields. Includes `mps_available` flag for Apple Silicon.

### `GET /system/gpu-details`
Per-device GPU information (compute capability, VRAM).
- **Response:** `{"gpu_devices": [{"index": 0, "name": "...", "compute_capability": "...", "memory_total": "..."}, ...]}`

### `GET /system/settings`
Retrieve current settings dictionary from `data/settings.json`.
- **Response:** Settings dictionary.

### `POST /system/settings`
Update application settings.
- **Body (JSON):** Partial or full settings dictionary.
- **Response:** Updated settings dictionary.

### `GET /system/vram-info`
Snapshot of current VRAM usage (free and total GB) and recommended vs user-overridden batch sizes for all installed models.
- **Response:**
  ```json
  {
    "vram_free_gb": 12.4,
    "vram_total_gb": 16.0,
    "cuda_available": true,
    "models": [
      {
        "id": "higgs-audio-v3",
        "recommended_batch": 1,
        "user_batch": null,
        "effective_batch": 1
      }
    ]
  }
  ```

### `POST /system/batch-override`
Set or remove a custom batch size override for a specific model in `data/settings.json`.
- **Body (JSON):** `{"model_id": "string", "batch_size": int|null}` (1–32 or `null` to reset).
- **Response:** `{"ok": true, "overrides": {...}}`

### `GET /system/multi-gpu`
List all detected CUDA GPUs with real-time memory metrics and user-disabled device indices.
- **Response:**
  ```json
  {
    "gpu_count": 2,
    "devices": [
      {"index": 0, "device_str": "cuda:0", "name": "...", "total_gb": 16.0, "free_gb": 12.1},
      {"index": 1, "device_str": "cuda:1", "name": "...", "total_gb": 16.0, "free_gb": 14.5}
    ],
    "enabled": true,
    "disabled_devices": []
  }
  ```

### `POST /system/multi-gpu`
Save the list of disabled CUDA device indices to `data/settings.json`.
- **Body (JSON):** `{"enabled": true, "disabled_devices": [1]}`
- **Response:** `{"ok": true, "disabled_devices": [1]}`

### `GET /system/check-tools`
Verify if external CLI binaries (SoX, FFmpeg, FFprobe) are accessible on PATH or configured paths.
- **Response:** `{"sox": {"status": "ok"|"error", "path": "..."}, "ffmpeg": {...}, ...}`

### `POST /system/trim-audio`
Trim base64 audio between `start_sec` and `end_sec` using FFmpeg.
- **Body (JSON):** `{"audio_base64": "...", "start_sec": float, "end_sec": float}`
- **Response:** `{"audio_base64": "..."}`

### `POST /system/test-qwen`
Run an offline diagnostic self-test of the Qwen3-TTS engine.
- **Response:** `{"results": [{"model": "...", "status": "success"|"error"|"missing", "message": "..."}, ...]}`

### `GET /system/health`
System diagnostic health endpoint querying GPU metrics, FFmpeg, SoX, worker processes, and disk usage.
- **Response:** Health status dictionary including GPU VRAM, storage capacity, and tool statuses.

---

## 2. Maintenance & Storage

### `GET /maintenance/stats`
Storage statistics: SQLite database size, total job count, audio rendering folder size, and folder count.
- **Response:** `{"db_size_mb": float, "job_count": int, "audio_size_mb": float, "audio_folder_count": int}`

### `POST /maintenance/vacuum`
Run SQLite `VACUUM` to defragment `jobs.db` and reclaim disk space.
- **Response:** `{"size_before_mb": float, "size_after_mb": float, "saved_mb": float}`

### `GET /maintenance/orphan-audio`
List folders in `data/audio-rendering/` that have no corresponding job in the SQLite database.
- **Response:** `{"orphans": [{"folder": "...", "job_id": int|null, "size_mb": float}], "total_mb": float}`

### `DELETE /maintenance/orphan-audio`
Delete all orphaned audio folders from disk.
- **Response:** `{"deleted": [...], "errors": [...], "total_freed_mb": float}`

---

## 3. Models & Engines Management

### `GET /models`
List available TTS models driven by the authoritative model catalog.
- **Query Params:** `include_all` (boolean, default `false`). If `false`, returns only models currently installed on disk; if `true`, returns all catalog models with an `installed: bool` flag.
- **Response:**
  ```json
  {
    "models": [
      {
        "id": "higgs-audio-v3",
        "name": "Higgs Audio v3 (4B)",
        "engine": "higgs",
        "supports_voice_design": false,
        "supports_emotion_tags": true,
        "requires_reference": true,
        "requires_transcript": false,
        "max_speakers": 8,
        "sample_rate": 24000,
        "execution": "worker",
        "installed": true,
        "disk_size_gb": 8.0,
        "description": "..."
      }
    ]
  }
  ```

### `GET /models/manage`
Returns complete catalog metadata, installation state, actual verified disk usage, and hardware profiling for the Models & Engines Manager modal.
- **Response:**
  ```json
  {
    "models": [
      {
        "id": "omnivoice",
        "name": "OmniVoice",
        "engine": "omnivoice",
        "description": "...",
        "folder_name": "omnivoice",
        "destination_folder": "model/omnivoice",
        "upstream_repo": "k2-fsa/OmniVoice",
        "pinned_revision": "...",
        "disk_size_gb": 3.0,
        "actual_size_gb": 3.0,
        "actual_size_bytes": 3221225472,
        "vram_cost_gb": 3.0,
        "vram_peak_multiplier": 1.2,
        "max_batch_size": 8,
        "supports_voice_clone": true,
        "supports_voice_design": false,
        "supports_emotion_tags": false,
        "requires_reference_audio": true,
        "requires_reference_transcript": true,
        "sample_rate": 24000,
        "execution": "worker",
        "installed": true,
        "can_download": true,
        "can_delete": true
      }
    ]
  }
  ```

### `POST /models/{model_id}/download`
Initiate background download of weights for a model from its pinned upstream repository.
- **Response:** `{"status": "started", "model_id": "...", "name": "...", "message": "..."}`
- **Errors:** `409 Conflict` if another download is already running; `404 Not Found` if model_id is invalid.

### `GET /models/download/progress`
**Server-Sent Events (SSE)** stream delivering real-time download events:
- **Payload:**
  ```json
  {
    "status": "downloading",
    "model_id": "higgs-audio-v3",
    "progress_percent": 42.5,
    "current_file": "model.safetensors",
    "speed_mb": 14.8,
    "downloaded_bytes": 3650722201,
    "total_bytes": 8589934592,
    "message": "Downloading model weights..."
  }
  ```
- **Terminal States:** `"completed"`, `"error"`, `"cancelled"`.

### `POST /models/download/cancel`
Cancel the currently active model download.
- **Response:** `{"status": "success"|"noop", "message": "..."}`

### `DELETE /models/{model_id}`
Permanently delete installed weights for the specified model from disk with strict path containment.
- **Response:** `{"status": "success", "model_id": "...", "message": "..."}`

---

## 4. Voice Library

### `GET /voices`
List all voice reference files in `data/voices/`.
- **Response:** `{"voices": [{"id": "...", "filename": "...", "language": "...", "name": "...", "gender": "...", "transcription": "..."}, ...]}`

### `GET /voices/{voice_id}/audio`
Serve raw reference WAV audio for a specific voice.
- **Response:** Audio file (`audio/wav`).

### `POST /upload-voice`
Upload a new voice reference audio file.
- **Form Data:**
  - `voice_file` (WAV/MP3)
  - `voice_id` (string, e.g. `en-alice`)
  - `transcription` (optional text transcript)
- **Response:** Metadata of saved voice.

### `POST /voices/{voice_id}/transcription`
Update the reference transcript text for a voice (saved to `data/voices/{voice_id}.txt`).
- **Body (JSON):** `{"transcription": "..."}`
- **Response:** Success confirmation.

### `POST /voices/{voice_id}/reprocess`
Apply noise reduction and normalization to a voice file.
- **Response:** `{"status": "success", "new_voice_id": "..."}`

### `DELETE /voices/{voice_id}`
Delete a voice file and its associated transcription file.
- **Response:** `{"status": "success", "message": "..."}`

---

## 5. Subtitle Processing & Translation

### `POST /preview-subtitles`
Parse an SRT or VTT file and return structured segments.
- **Form Data:** `subtitle_file` (.srt or .vtt), `group_by_punctuation` (boolean).
- **Response:** `{"segments": [...], "original_count": int, "final_count": int}`

### `GET /ollama/models`
List available models from the local Ollama instance and local NLLB models.
- **Response:** `{"models": [...]}`

### `POST /translate-segment`
Translate a single text string via NLLB-200 or Ollama.
- **Form Data:** `text`, `target_language`, `source_language`, `model_name`, `prompt` (optional).
- **Response:** `{"translated_text": "..."}`

### `POST /translate-batch`
Translate multiple segments in one request.
- **Form Data:** `segments_json` (JSON string), `target_language`, `source_language`, `model_name`, `prompt` (optional).
- **Response:** `{"segments": [...]}`

### `POST /translate-subtitles`
Translate an entire subtitle file using NLLB.
- **Form Data:** `subtitle_file`, `target_language`, `source_language`.
- **Response:** List of translated segments.

---

## 6. Voiceover Generation (Synchronous & Static Serving)

### `POST /generate-segment`
Synchronously generate audio for a single text segment.
- **Form Data:** `text`, `voice_id`, `model_name`, `voice_description` (optional), `language` (optional), `job_id` (optional int), `segment_index` (optional int), `original_filename` (optional string).
- **Response:** `{"audio_base64": "...", "audio_path": "data/audio-rendering/..."|null}`

### `POST /generate-audio`
Synchronously generate and align audio for multiple subtitle segments.
- **Form Data:** `subtitle_file` or `subtitle_segments` (JSON), `voice_id`, `model_name`, etc.
- **Response:** Audio file (`audio/mpeg`).

### `POST /generate-script`
Synchronously generate audio for an untimed multi-speaker script.
- **Form Data:** `script_file` or `script_text`, `speaker_voice_map` (JSON), etc.
- **Response:** Audio file (`audio/mpeg`).

### `GET /audio-files/{job_folder}/{filename}`
Serve a generated WAV segment from `data/audio-rendering/`.
- **Response:** Audio file (`audio/wav`) with `Cache-Control: no-store`.

### `GET /outputs/{filename}`
Serve a finalized output file from `data/outputs/`.
- **Response:** Audio file (`audio/mpeg` or `audio/wav`) with `Cache-Control: no-store`.

---

## 7. Background Tasks & Server-Sent Events (SSE)

### `POST /tasks/generate-subtitles`
Create a background task for timed subtitle synthesis with incremental per-segment saving.
- **Form Data:** `job_id` (optional int for resume), `subtitle_file`, `subtitle_segments` (JSON), `voice_id`, `model_name`, `group_by_punctuation`, `output_format` (`mp3`|`wav`), `voice_description`, `language`.
- **Response:** `{"status": "success", "task_id": "..."}`

### `POST /tasks/generate`
Create a background task for untimed script synthesis. Automatically persists a Job record in SQLite with `workflow_type="script"` and saves individual line WAV files under `data/audio-rendering/script_{job_id}/`.
- **Form Data:** `script_file` or `script_text`, `speaker_voice_map` (JSON), `model_name`, `output_format`, etc.
- **Response:** `{"status": "success", "task_id": "...", "job_id": int}`

### `GET /tasks/active`
Returns the currently active task (`QUEUED` or `PROCESSING`), if any. Used for session recovery after browser refresh.
- **Response:** `{"task_id": "...", "job_id": int|null, "status": "QUEUED"|"PROCESSING"}` or `{"task_id": null}`.

### `GET /tasks/{task_id}/stream`
**SSE stream** for real-time task progress updates.

| Event | Payload Description |
|-------|---------------------|
| `progress` | `{"type": "progress", "progress": int, "current_item": int, "total_items": int, "status": string, "new_segments": [{"index": int, "audio_url": "http://..."}]}` |
| `complete` | `{"type": "complete", "progress": 100, "output_url": "http://localhost:8000/api/outputs/{filename}"}` |
| `error` | `{"type": "error", "message": "..."}` |

### `POST /tasks/{task_id}/cancel`
Cancel a running generation task.
- **Query Params:** `finalize` (boolean, default `false`). If `true`, assembles all segments generated so far and emits a `complete` event.

---

## 8. Job Archive

### `GET /jobs`
List all jobs with pagination and workflow isolation.
- **Query Params:**
  - `limit` (1–100, default 50)
  - `offset` (default 0)
  - `workflow_type` (optional string, `'subtitle'` or `'script'`)
- **Response:** `{"jobs": [...], "total": int}`

### `POST /jobs/create`
Create a new job draft record.
- **Body (JSON):** `JobCreate` model with `workflow_type` (`'subtitle'` or `'script'`).

### `GET /jobs/{job_id}`
Retrieve full details and segment list for a specific job.

### `PUT /jobs/{job_id}`
Update job segments, notes, language, voice, model, or workflow_type.
- **Body (JSON):** `JobUpdate` model.

### `PATCH /jobs/{job_id}/status`
Update job status (`draft`|`processing`|`completed`|`failed`) and optionally `audio_url`.

### `DELETE /jobs/{job_id}`
Permanently delete a job record from `data/jobs.db`.

### `POST /jobs/{job_id}/finalize`
Assemble all segment WAV files into a single time-aligned output file.
- **Query Params:** `output_format` (`mp3` or `wav`).
- **Response:** Audio file download.

### `GET /jobs/{job_id}/export-srt`
Export the modified segments of a job as an `.srt` file.
- **Response:** SRT file download.
