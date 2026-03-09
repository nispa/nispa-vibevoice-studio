# API Reference: Nispa VibeVoice Studio

This document details the REST API endpoints provided by the Nispa VibeVoice Studio backend.

## Base URL
Default local development URL: `http://localhost:8000/api`

---

## 1. System & Health

### GET `/health`
Check if the API server is running.
- **Response:** `{"status": "ok"}`

### GET `/system-info`
Retrieve real-time hardware telemetry.
- **Response:** Complex object containing `system`, `torch`, `gpu`, and `cpu` statistics.

---

## 2. Models & Voices

### GET `/models`
List available VibeVoice models in the `data/model` directory.
- **Response:** `{"models": ["VibeVoice-1.5B", ...]}`

### GET `/voices`
List available voice reference files in the `data/voices` directory.
- **Response:** `{"voices": [{"id": "en-john_man", "language": "en", ...}, ...]}`

### POST `/upload-voice`
Upload a new reference audio file for voice cloning.
- **Form Data:**
  - `voice_file`: MP3 or WAV file.
  - `voice_id`: Unique ID (e.g., `it-custom_woman`).
- **Response:** Metadata about the processed and saved voice file.

### GET `/ollama/models`
List available models from the local Ollama instance (used for translation).
- **Response:** `{"models": ["llama3", "hy-mt1.5", ...]}`

---

## 3. Subtitle Processing & Translation

### POST `/preview-subtitles`
Parse a subtitle file and return its segments, optionally applying intelligent grouping.
- **Form Data:** `subtitle_file` (.srt or .vtt)
- **Query Params:** `group_by_punctuation` (boolean)
- **Response:** JSON list of subtitle segments with timing and text.

### POST `/translate-segment`
Translate a single text string using Ollama.
- **Form Data:**
  - `text`: String to translate.
  - `target_language`: String (e.g., "Italian").
  - `model_name`: Ollama model ID.
  - `prompt`: (Optional) Custom system prompt.
- **Response:** `{"translated_text": "..."}`

---

## 4. Voiceover Generation (Tasks)

### POST `/tasks/generate-subtitles`
Create a background task for timed subtitle synthesis.
- **Form Data:**
  - `subtitle_file`: (Optional) .srt/.vtt file.
  - `subtitle_segments`: (Optional) JSON string of segments.
  - `voice_id`: ID of the reference voice.
  - `model_name`: VibeVoice model to use.
  - `output_format`: `mp3` or `wav`.
- **Response:** `{"status": "success", "task_id": "..."}`

### POST `/tasks/generate`
Create a background task for untimed script synthesis (multi-speaker).
- **Form Data:**
  - `script_text`: Raw text with "Speaker: Message" format.
  - `speaker_voice_map`: JSON mapping of speaker names to voice IDs.
  - `model_name`: VibeVoice model to use.
- **Response:** `{"status": "success", "task_id": "..."}`

### GET `/tasks/{task_id}/stream`
**SSE (Server-Sent Events)** endpoint to track task progress in real-time.
- **Event Data Protocol:**
  - `{"type": "progress", "progress": 50, "status": "Processing segment 5..."}`
  - `{"type": "complete", "audioBase64": "...", "format": "mp3"}`
  - `{"type": "error", "message": "..."}`

---

## 5. Job Archive (Persistence)

### GET `/jobs`
List all historical jobs with pagination.
- **Query Params:** `limit` (default 50), `offset` (default 0).
- **Response:** `{"jobs": [...], "total": 10}`

### POST `/jobs/create`
Save a job configuration as a draft.
- **Body (JSON):** `JobCreate` schema.

### DELETE `/jobs/{job_id}`
Permanently delete a job record.
