# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.0] - 2026-03-25

### Added
- **Generation Settings tab** in Settings & Maintenance modal: shows live VRAM free/total, CUDA status, and per-model recommended batch size. Users can now set a custom batch size override per model, saved persistently in `data/settings.json`.
- **True GPU batching for VibeVoice**: `synthesize_batch` now issues a single `processor()` + `model.generate()` call for the entire batch instead of looping sequentially, fully exploiting GPU parallelism (expected 2–4× throughput on CUDA).
- **Script generation batching**: `generation_job` now groups consecutive lines with the same `voice_id` and calls `synthesize_batch`, matching the subtitle pipeline's batching behaviour.
- **Final audio served via HTTP**: The completed output MP3/WAV is no longer base64-encoded into the SSE stream (~50 MB string). The file is written to `data/outputs/` and a new `GET /outputs/{filename}` endpoint serves it directly. Eliminates the large in-memory payload and the indefinite `audio_b64` retention in the task registry.
- **Task memory eviction**: Completed, failed, and cancelled tasks are automatically removed from the in-memory registry 10 minutes after finishing, preventing unbounded memory growth during long sessions.

### Fixed
- **CORS error on intermittent audio fetch**: Added a global FastAPI exception handler that always injects `Access-Control-Allow-Origin: *` on error responses (4xx/5xx). Previously, unhandled exceptions bypassed the CORS middleware, causing the browser to report a CORS error instead of the real cause.
- **Browser CORS cache poisoning**: Added `Cache-Control: no-store` to all audio file responses so a failed fetch is never cached by the browser.

### Changed
- **VRAM budget**: Safety margin changed from a flat `−1 GB` to `free_vram × 0.60` (reserves 40% as headroom for KV cache and attention buffers during `model.generate()`). Per-model peak multipliers added (Qwen3-1.7B: 2.5×, 0.6B: 2.0×) with absolute max-batch caps (6 and 8 respectively). Prevents large-VRAM systems from allocating oversized batches that spill into RAM.
- **OOM auto-recovery**: If a batch triggers `torch.cuda.OutOfMemoryError`, the batch is halved, the VRAM cost estimate is doubled to prevent recurrence, and synthesis retries sequentially — no crash, no silent failure.
- **VRAM profiling on first batch**: Measures actual VRAM delta after the first real batch and uses that value for subsequent calculations instead of static estimates.
- **DB writes batched**: `get_job` + `update_job` now called once per batch (not once per segment). For a 100-segment job with batch size 4, this reduces SQLite operations from 200 to 50.
- **Qwen: single VRAM flush in fallback path**: The sequential fallback (called when a batch fails) now passes `skip_cleanup=True` to each `synthesize` call and performs a single `gc.collect()` + `empty_cache()` at the end of the loop, instead of flushing once per segment.
- **Qwen: per-segment language detection**: `synthesize_batch` now detects the language of each text individually and groups consecutive segments by language, issuing one model call per language group. Previously the language of `texts[0]` was applied to all segments.
- **Qwen: voice reference caching**: `_get_voice_ref` is decorated with `@functools.lru_cache(maxsize=64)`. The `.wav` path and `.txt` transcription are read from disk only once per voice, not once per segment.
- **`batch_overrides` respected in both jobs**: `calculate_optimal_batch_size` now reads `tts.batch_overrides` from `settings.json` and returns the user value immediately, bypassing VRAM calculation entirely.

## [0.6.0] - 2026-03-19

### Added
- **File-Based Audio Storage**: Audio segments are no longer stored as base64 blobs inside SQLite. Each WAV file is now saved to `data/audio-rendering/{job_name}_{job_id}/{index}.wav` on disk. Database size reduced by orders of magnitude for long jobs.
- **HTTP Audio Serving**: New `GET /audio-files/{job_folder}/{filename}` endpoint serves WAV files with correct CORS headers. Replaced `StaticFiles` mount (which bypassed CORS middleware) with a proper FastAPI route.
- **Modal UI System**: Replaced all native `alert()` / `confirm()` calls with a React-based system — `ConfirmDialog` (blocking confirm), `ToastNotification` (auto-dismissing feedback), and `UIContext` / `uiEvents` singleton accessible from any hook without context injection.
- **Segment Regeneration saves to disk**: The "Regenerate" action in the Review Modal now passes `job_id`, `segment_index`, and `original_filename` to the backend, which saves the new WAV to disk and returns the file path instead of a base64 blob.
- **Finalization supports mixed jobs**: The `POST /{job_id}/finalize` endpoint now reads audio from both file paths (`data/audio-rendering/...`) and legacy base64 inline URLs, so jobs with mixed-format segments finalize correctly.

### Fixed
- **VRAM growth during batch generation (Qwen3)**: Added `del audio_data` / `del audio_tensor` inside the `synthesize_batch` conversion loop so each GPU tensor is freed immediately after being moved to CPU, instead of accumulating until the `finally` block.
- **Batch size recalculated per iteration**: `calculate_optimal_batch_size()` is now called at the start of each batch loop iteration rather than once globally, with explicit `torch.cuda.empty_cache()` + `gc.collect()` between batches.
- **CORS error on audio file fetch**: Removed `allow_credentials=True` from CORS middleware (incompatible with `allow_origins=["*"]` in recent Starlette versions), which was suppressing the `Access-Control-Allow-Origin` header on audio responses.

### Changed
- SQLite no longer stores audio data — only relative file paths (`data/audio-rendering/...`). Legacy base64 fields are still read for backward compatibility but never written.
- `data/audio-rendering/` added to `.gitignore`.

## [0.5.0] - 2026-03-14

### Added
- **Hardware-Aware Dynamic Batching**: Qwen3-TTS now automatically queries the GPU's available VRAM to determine the optimal batch size in real-time, preventing Out-Of-Memory (OOM) crashes while maximizing synthesis speed.
- **Backend-Driven Real-time Saving**: Audio segments are now instantly persisted to the SQLite database during synthesis. Progress is no longer lost if the browser crashes or if the generation is cancelled mid-way.
- **Job Audio Gallery (Review Modal)**: Added a dedicated, paginated modal to review massive jobs (200+ segments) with ease. Includes filtering options and inline waveform players.
- **Surgical Regeneration**: Individual segments can now be regenerated directly from the Review Modal. The system perfectly recalls the specific Voice, Model, and Language used for that segment.
- **Aggressive VRAM Management**: Enforced explicit PyTorch tensor deletion and Python garbage collection between batches, solving severe memory leak issues during long generations.
- **Backend Architecture Refactor**: Monolithic `generation.py` split into modular, domain-specific routers (`tasks.py`, `translation.py`, `generation.py`). TTS Providers segmented into a highly extensible `core/tts/` module.
- **Internal Offline Translator (NLLB-200)**: 
  - Integrated Facebook's NLLB-200 for 100% offline translation supporting 200+ languages.
  - Retained external Ollama service support as a secondary translation option.
- **Advanced Audio Trimmer**:
  - New built-in editor to trim generated audio segments on the fly.
  - Mark-In/Mark-Out visual sliders with live preview to remove hallucinations or noise.
- **Frontend Modular Architecture**:
  - Complete refactor of React components into a folder-based structure.
  - Separated business logic (Hooks) from UI presentation (JSX) for better performance and maintainability.
- **Unified UI System**:
  - Standardized `ProgressBar` component for consistent feedback across the app.
  - Modern `FileUploadArea` with native **Drag & Drop** support.
- **Environment Optimization Script**:
  - New `optimize_env.py` script that centralizes hardware/software checks.
  - **Dynamic Flash Attention**: Automatically detects and installs the correct wheel from Hugging Face based on your specific Torch/CUDA version.
- **Auto-Save before Generation**: 
  - Subtitle jobs are now automatically saved to the archive before starting a generation task.

### Fixed
- Resolved a 1MB payload limitation issue when resuming large jobs by offloading data retrieval entirely to the backend database.
- Fixed a `SyntaxError` related to TypeScript interfaces in Vite (`isolatedModules`).
- **VibeVoice Critical Fixes**:
  - Resolved `AttributeError: GREEDY` and `AttributeError: key_cache` by updating vendored code for compatibility with newer Transformers versions.
  - Added missing `audio_utils.py` using FFmpeg subprocess for robust audio loading.
- **Test Stability**: Fixed multiple Vitest failures related to asynchronous state updates and missing unique keys.
- **SoX Path Configuration**: Centralized tool path management via `data/settings.json`.

### Changed
- Renamed "Synchronize Audio" action to **"Generate Voice-over"** for better clarity.
- Switched VibeVoice synthesis mode to `Sampling` (low temperature) to prevent `GREEDY` mode crashes.

## [0.4.0] - 2026-03-10
### Added
- Multi-Engine Architecture (VibeVoice + Qwen3-TTS).
- Voice Design and 3-Second Voice Cloning support.
- Interactive Weights Downloader.

## [0.3.0] - 2026-03-09
### Added
- Subtitle Grouping logic.
- Asynchronous generation with SSE (Server-Sent Events).

## [0.1.0] - 2026-03-07
### Added
- Initial beta release.
