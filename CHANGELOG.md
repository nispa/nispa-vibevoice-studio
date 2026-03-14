# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-03-14

### Added
- **Internal Offline Translator (NLLB-200)**: 
  - Integrated Facebook's NLLB-200 for 100% offline translation supporting 200+ languages.
  - Eliminated dependency on external Ollama service for a fully private workflow.
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
- **VRAM Lifecycle Management**:
  - Automatic memory cleanup (`torch.cuda.empty_cache`) when switching between VibeVoice and Qwen3 engines.
- **Auto-Save before Generation**: 
  - Subtitle jobs are now automatically saved to the archive before starting a generation task.

### Fixed
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
