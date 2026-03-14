# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
