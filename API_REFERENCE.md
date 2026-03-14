# API Reference: Nispa VibeVoice Studio

This document details the REST API endpoints provided by the Nispa VibeVoice Studio backend.

## Base URL
Default local development URL: `http://localhost:8000/api`

---

## 1. System & Health

### GET `/health`
Check if the API server is running and the TTS engine is ready.
- **Response:** `{"status": "ok", "ready": true/false}`

### GET `/status`
Returns the readiness status of the backend.
- **Response:** `{"status": "loading"}` or `{"status": "ready"}`

### GET `/system-info`
Retrieve detailed hardware and environment information (CPU, GPU, RAM, OS).
- **Response:** Comprehensive nested dictionary with hardware telemetry.

### GET `/system/settings`
Retrieve the current system settings.
- **Response:** Dictionary of current settings.

### POST `/system/settings`
Update the system settings.
- **Body (JSON):** Dictionary of settings to update.

### GET `/system/check-tools`
Verify if system tools (SoX, FFmpeg, FFprobe) are accessible.
- **Response:** Status and path for each tool.

### POST `/system/trim-audio`
Trim a base64 encoded audio string using FFmpeg.
- **Body (JSON):**
  - `audio_base64`: String
  - `start_sec`: Float
  - `end_sec`: Float
- **Response:** `{"audio_base64": "..."}`

### POST `/system/test-qwen`
Perform a diagnostic test of the Qwen3-TTS engine and models.
- **Response:** List of test results for each model.

---

## 2. Models & Voices

### GET `/models`
List all available TTS models with metadata.
- **Response:** `{"models": [{"id": "...", "name": "...", "engine": "...", "supports_voice_design": bool}, ...]}`

### GET `/voices`
List all available voice reference files in the `data/voices` directory.
- **Response:** `{"voices": [{"id": "...", "filename": "...", "language": "...", "accent": "...", "name": "...", "gender": "...", "transcription": "..."}, ...]}`

### GET `/voices/{voice_id}/audio`
Retrieve the raw WAV audio file for a specific voice.
- **Response:** Audio file (audio/wav).

### POST `/upload-voice`
Upload and process a new voice reference file.
- **Form Data:**
  - `voice_file`: UploadFile (MP3/WAV).
  - `voice_id`: String (e.g., `en-myvoice`).
  - `transcription`: (Optional) String.
- **Response:** Metadata about the saved voice file.

### POST `/voices/{voice_id}/transcription`
Update the transcription text for an existing voice.
- **Body (JSON):** `{"transcription": "..."}`

### POST `/voices/{voice_id}/reprocess`
Apply noise reduction and normalization to a voice file.
- **Response:** `{"status": "success", "new_voice_id": "..."}`

### DELETE `/voices/{voice_id}`
Delete a voice reference file and its transcription.
- **Response:** Success message.

---

## 3. Subtitle Processing & Translation

### POST `/preview-subtitles`
Parse a subtitle file and return its segments.
- **Form Data:** `subtitle_file` (.srt or .vtt).
- **Query Params:** `group_by_punctuation` (boolean).
- **Response:** JSON list of subtitle segments with timing and text.

### GET `/ollama/models`
List available models from the local Ollama instance and local NLLB models.
- **Response:** `{"models": [...]}`

### POST `/translate-segment`
Translate a single text string using NLLB or Ollama.
- **Form Data:**
  - `text`: String.
  - `target_language`: String (e.g., "Italian").
  - `source_language`: String.
  - `model_name`: Model ID.
  - `prompt`: (Optional) Custom prompt for Ollama.
- **Response:** `{"translated_text": "..."}`

### POST `/translate-batch`
Translate multiple subtitle segments in a single batch.
- **Form Data:**
  - `segments_json`: JSON string of segments.
  - `target_language`: String.
  - `source_language`: String.
  - `model_name`: Model ID.
  - `prompt`: (Optional) Custom prompt.
- **Response:** `{"segments": [...]}`

### POST `/translate-subtitles`
Translate an entire subtitle file using NLLB.
- **Form Data:** `subtitle_file`, `target_language`, `source_language`.
- **Response:** JSON list of translated segments.

---

## 4. Voiceover Generation

### POST `/generate-segment`
Synchronously generate audio for a single text segment.
- **Form Data:** `text`, `voice_id`, `model_name`, `voice_description`, `language`.
- **Response:** `{"audio_base64": "..."}`

### POST `/generate-audio`
Synchronously generate and align audio for multiple subtitle segments.
- **Form Data:** `subtitle_file` or `subtitle_segments` (JSON), `voice_id`, `model_name`, etc.
- **Response:** Audio file (audio/mpeg).

### POST `/generate-script`
Synchronously generate audio for an untimed script (multi-speaker).
- **Form Data:** `script_file` or `script_text`, `speaker_voice_map` (JSON), etc.
- **Response:** Audio file (audio/mpeg).

### POST `/finalize-audio`
Join multiple segments (with data-URLs) into a single audio file.
- **Form Data:** `segments_json`, `output_format`.
- **Response:** `{"audio_base64": "...", "format": "..."}`

### POST `/export-audio-segments`
Create a ZIP archive containing individual audio segments.
- **Form Data:** `segments_json`.
- **Response:** ZIP file.

---

## 5. Background Tasks

### POST `/tasks/generate-subtitles`
Create a background task for timed subtitle synthesis.
- **Form Data:**
  - `subtitle_file` (Optional) or `subtitle_segments` (JSON)
  - `voice_id`
  - `model_name`
  - `group_by_punctuation`
  - `output_format`
  - `voice_description` (Optional)
  - `language` (Optional)
  - `job_id` (Optional): If provided, allows backend to load segments directly from SQLite, bypassing JSON payload limits and enabling Real-time saving.
- **Response:** `{"status": "success", "task_id": "..."}`

### POST `/tasks/generate`
Create a background task for untimed script synthesis.
- **Form Data:** Same as `/generate-script`.
- **Response:** `{"status": "success", "task_id": "..."}`

### GET `/tasks/{task_id}/stream`
**SSE (Server-Sent Events)** endpoint to track task progress.
- **Event Data:** JSON with `progress`, `status`, `new_segments`, or `complete`/`error` info.

### POST `/tasks/{task_id}/cancel`
Cancel a running background task.
- **Query Params:** `finalize` (boolean) - if true, attempt to join what's done.

---

## 6. Job Archive (Persistence)

### GET `/jobs`
List all historical jobs with pagination.
- **Query Params:** `limit`, `offset`.
- **Response:** `{"jobs": [...], "total": ...}`

### POST `/jobs/create`
Save a new job draft.
- **Body (JSON):** `JobCreate` schema.

### GET `/jobs/{job_id}`
Retrieve a specific job by ID.

### POST `/jobs/{job_id}/finalize`
Retrieves all segments for a job from the database, extracts their embedded audio (Base64), and joins them into a single file.
- **Query Params:** `output_format` (default "mp3").
- **Response:** Audio file download (mp3 or wav).

### PUT `/jobs/{job_id}`
Update job segments or notes.
- **Body (JSON):** `JobUpdate` schema.

### PATCH `/jobs/{job_id}/status`
Update job status and/or audio URL.
- **Query Params:** `status`, `audio_url`.

### DELETE `/jobs/{job_id}`
Permanently delete a job record.

### GET `/jobs/{job_id}/export-srt`
Export the modified segments of a job as an SRT file.
- **Response:** SRT file download.
