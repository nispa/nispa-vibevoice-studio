# API Reference — Nispa VibeVoice Studio

Backend REST API. All endpoints are prefixed with `/api` unless otherwise noted.

**Base URL (local dev):** `http://localhost:8000/api`

---

## 1. System & Health

### `GET /health`
Check if the backend is running and the TTS engine is ready.
- **Response:** `{"status": "ok", "ready": true|false}`

### `GET /status`
Returns the backend readiness state.
- **Response:** `{"status": "loading"}` or `{"status": "ready"}`

### `GET /system-info`
CPU, RAM, GPU, and environment information. Safe to call on startup (no CUDA device queries).
- **Response:** Nested object with `system`, `torch`, `gpu`, `cpu` fields. Includes `mps_available` flag for Apple Silicon.

### `GET /system/gpu-details`
Per-device GPU info (compute capability, VRAM). Called only on explicit user request.
- **Response:** `{"gpu_devices": [{"index": 0, "name": "...", "compute_capability": "...", "memory_total": "..."}, ...]}`

### `GET /system/settings`
Retrieve current settings (`data/settings.json`).
- **Response:** Settings dictionary.

### `POST /system/settings`
Update settings.
- **Body (JSON):** Partial settings dictionary.
- **Response:** Updated settings dictionary.

### `GET /system/check-tools`
Verify if system tools (SoX, FFmpeg, FFprobe) are accessible.
- **Response:** `{"sox": {"status": "ok"|"error", "path": "..."}, "ffmpeg": {...}, ...}`

### `POST /system/trim-audio`
Trim an audio file using FFmpeg.
- **Body (JSON):** `{"audio_base64": "...", "start_sec": float, "end_sec": float}`
- **Response:** `{"audio_base64": "..."}`

### `POST /system/test-qwen`
Run a diagnostic test of the Qwen3-TTS engine.
- **Response:** `{"results": [{"model": "...", "status": "success"|"error"|"missing", "message": "..."}, ...]}`

---

## 2. Maintenance

### `GET /maintenance/stats`
Storage statistics: DB size, job count, audio rendering folder size.
- **Response:** `{"db_size_mb": float, "job_count": int, "audio_size_mb": float, "audio_folder_count": int}`

### `POST /maintenance/vacuum`
Run SQLite `VACUUM` to reclaim disk space after deletions.
- **Response:** `{"size_before_mb": float, "size_after_mb": float, "saved_mb": float}`

### `GET /maintenance/orphan-audio`
List audio folders in `data/audio-rendering/` with no corresponding job in the database.
- **Response:** `{"orphans": [{"folder": "...", "job_id": int|null, "size_mb": float}], "total_mb": float}`

### `DELETE /maintenance/orphan-audio`
Delete all orphaned audio folders.
- **Response:** `{"deleted": [...], "errors": [...], "total_freed_mb": float}`

---

## 3. Models & Voices

### `GET /models`
List all available TTS models with metadata.
- **Response:** `{"models": [{"id": "...", "name": "...", "engine": "...", "supports_voice_design": bool}, ...]}`

### `GET /voices`
List all voice reference files in `data/voices/`.
- **Response:** `{"voices": [{"id": "...", "filename": "...", "language": "...", "name": "...", "gender": "...", "transcription": "..."}, ...]}`

### `GET /voices/{voice_id}/audio`
Raw WAV audio for a specific voice.
- **Response:** Audio file (`audio/wav`).

### `POST /upload-voice`
Upload a new voice reference file.
- **Form Data:** `voice_file` (MP3/WAV), `voice_id` (string, e.g. `en-myvoice`), `transcription` (optional).
- **Response:** Metadata of the saved voice.

### `POST /voices/{voice_id}/transcription`
Update the transcription text for a voice.
- **Body (JSON):** `{"transcription": "..."}`

### `POST /voices/{voice_id}/reprocess`
Apply noise reduction and normalization to a voice file.
- **Response:** `{"status": "success", "new_voice_id": "..."}`

### `DELETE /voices/{voice_id}`
Delete a voice file and its transcription.
- **Response:** Success message.

---

## 4. Subtitle Processing & Translation

### `POST /preview-subtitles`
Parse a subtitle file and return its segments.
- **Form Data:** `subtitle_file` (.srt or .vtt), `group_by_punctuation` (boolean).
- **Response:** `{"segments": [...], "original_count": int, "final_count": int}`

### `GET /ollama/models`
List models from the local Ollama instance and local NLLB models.
- **Response:** `{"models": [...]}`

### `POST /translate-segment`
Translate a single text string via NLLB or Ollama.
- **Form Data:** `text`, `target_language`, `source_language`, `model_name`, `prompt` (optional).
- **Response:** `{"translated_text": "..."}`

### `POST /translate-batch`
Translate multiple segments in one request.
- **Form Data:** `segments_json` (JSON string), `target_language`, `source_language`, `model_name`, `prompt` (optional).
- **Response:** `{"segments": [...]}`

### `POST /translate-subtitles`
Translate an entire subtitle file using NLLB.
- **Form Data:** `subtitle_file`, `target_language`, `source_language`.
- **Response:** JSON list of translated segments.

---

## 5. Voiceover Generation

### `POST /generate-segment`
Synchronously generate audio for a single text segment.
- **Form Data:** `text`, `voice_id`, `model_name`, `voice_description` (optional), `language` (optional), `job_id` (optional int), `segment_index` (optional int), `original_filename` (optional string).
- **Response:** `{"audio_base64": "...", "audio_path": "data/audio-rendering/..."|null}`
  `audio_path` is populated only when `job_id` + `segment_index` + `original_filename` are all provided (the file is saved to disk).

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
- **Response:** Audio file (`audio/wav`). `Cache-Control: no-store`.

### `GET /outputs/{filename}`
Serve a finalized output file from `data/outputs/`.
- **Response:** Audio file (`audio/mpeg` or `audio/wav`). `Cache-Control: no-store`.

---

## 6. Background Tasks (SSE)

### `POST /tasks/generate-subtitles`
Create a background task for timed subtitle synthesis with incremental per-segment saving.
- **Form Data:**
  - `job_id` (optional int) — if provided, segments are loaded from SQLite; supports resume of partially completed jobs
  - `subtitle_file` (optional) — used if no `job_id`
  - `subtitle_segments` (optional JSON string) — fallback if no file
  - `voice_id`
  - `model_name`
  - `group_by_punctuation` (boolean)
  - `output_format` (`mp3` or `wav`)
  - `voice_description` (optional)
  - `language` (optional)
- **Response:** `{"status": "success", "task_id": "..."}`

### `POST /tasks/generate`
Create a background task for untimed script synthesis.
- **Form Data:** Same fields as `/generate-script`.
- **Response:** `{"status": "success", "task_id": "..."}`

### `GET /tasks/active`
Returns the currently active task (status `QUEUED` or `PROCESSING`), if any. Used for session recovery after browser refresh.
- **Response:** `{"task_id": "...", "job_id": int|null, "status": "QUEUED"|"PROCESSING"}` or `{"task_id": null}` if no active task.

### `GET /tasks/{task_id}/stream`
**SSE stream** for real-time task progress.

| Event | Payload |
|-------|---------|
| `progress` | `{"type": "progress", "progress": int, "current_item": int, "total_items": int, "status": string, "new_segments": [{"index": int, "audio_url": "http://..."}]}` |
| `complete` | `{"type": "complete", "progress": 100, "output_url": "http://localhost:8000/api/outputs/{filename}"}` |
| `error` | `{"type": "error", "message": "..."}` |

> **Note:** `new_segments` carries `audio_url` (an HTTP URL pointing to the saved WAV file), not base64-encoded audio. The `complete` event carries `output_url` to the final MP3/WAV, also served via HTTP.

### `POST /tasks/{task_id}/cancel`
Cancel a running task.
- **Query Params:** `finalize` (boolean, default `false`) — if `true`, assembles all segments generated so far and emits a `complete` SSE event instead of discarding them.

---

## 7. Job Archive

### `GET /jobs`
List all jobs with pagination.
- **Query Params:** `limit` (1–100, default 50), `offset` (default 0).
- **Response:** `{"jobs": [...], "total": int}`

### `POST /jobs/create`
Save a new job draft.
- **Body (JSON):** `JobCreate` — `original_filename`, `subtitle_segments`, `modified_segments`, `voice_id`, `voice_name`, `model_name`, `language`, `group_by_punctuation`, `notes`.

### `GET /jobs/{job_id}`
Retrieve a specific job (includes full segment data).

### `PUT /jobs/{job_id}`
Update job segments, notes, language, voice, or model.
- **Body (JSON):** `JobUpdate` — all fields optional: `modified_segments`, `notes`, `language`, `voice_id`, `model_name`.

### `PATCH /jobs/{job_id}/status`
Update job status and optionally the audio URL.
- **Query Params:** `status` (`draft`|`processing`|`completed`|`failed`), `audio_url` (optional).

### `DELETE /jobs/{job_id}`
Permanently delete a job record from the database.

### `POST /jobs/{job_id}/finalize`
Assemble all segment WAV files into a single time-aligned output. Supports both file-path segments (`data/audio-rendering/...`) and legacy base64 segments.
- **Query Params:** `output_format` (default `mp3`).
- **Response:** Audio file download (`mp3` or `wav`).

### `GET /jobs/{job_id}/export-srt`
Export the modified segments of a job as an `.srt` file.
- **Response:** SRT file download.
