# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.1] - 2026-03-09

### Added
- **Comprehensive Source Documentation**:
    - **Backend**: Added standard Python docstrings to all core modules, API routers, and data models.
    - **Frontend**: Implemented JSDoc comments for all custom hooks, context providers, and key UI components.
- **Technical Documentation Suite**:
    - Created `TECHNICAL_DOCUMENTATION.md` detailing system architecture, component interaction, and data flows.
    - Created `API_REFERENCE.md` providing a complete guide to REST endpoints and the SSE (Server-Sent Events) communication protocol.
- **Robust Backend Testing (Pytest)**:
    - `test_aligner.py`: Verifies shifting logic and silence padding for precise audio synchronization.
    - `test_queue.py`: Validates asynchronous task concurrency, cancellation mechanics, and error propagation.
    - `test_api.py`: Ensures request validation and correct HTTP error signaling.
- **Frontend Logic Testing (Vitest)**:
    - `useTranslationLoop.test.ts`: Tests the progressive translation state machine and pause functionality.
    - `useScriptGeneration.test.ts`: Verifies real-time SSE stream consumption and binary blob conversion.
    - `SubtitleWorkflow.test.tsx`: Validates UI conditional rendering and workflow state transitions.

### Changed
- **Terminology Standardization**: Synchronized technical terms (Segments, Jobs, Voice IDs) across the entire codebase and documentation for better clarity.

## [0.3.0] - 2026-03-09

### Added
- **Intelligent Grouping Validation**: Added automated tests (`GroupingWorkflow.test.tsx`) to verify the grouping logic and state transitions.
- **Ollama Models Refresh**: Added a dedicated refresh button next to the AI model selector to re-fetch available Ollama models without a page reload.
- **Enhanced Task Cancellation**:
    - **Partial Audio Finalization**: When cancelling a generation, the user can now choose to download the audio synthesized so far instead of just discarding it.
    - **Dual UI Access**: Cancellation buttons added to both `GenerationControls` and `ActivityLogsModal` for easier access.
- **Improved UX for Operations**:
    - Renamed the "Logs" button to **"Dettagli Operazione"** (or **"In corso..."** during processing) for better clarity.
    - Added a pulsing animation and visual highlighting to the operation button when a task is active.

### Fixed
- **Intelligent Grouping Persistence**: Fixed a bug where subtitle grouping was not correctly saved in the job draft when "Use as Input" was clicked.
- **Progress Bar Accuracy**: Restored the progress bar logic to consistently use `current_item` and `total_items` from the backend, ensuring accurate segment-by-segment updates.
- **Backend Infinite Loop**: Fixed a redundant nested loop in the subtitle generation worker that could cause processing to hang.
- **Hardcoded Grouping Parameters**: Fixed several frontend components that were hardcoding `group_by_punctuation=false`, ignoring user preferences.

### Changed
- **Protected Progress Logic**: Added critical code comments in both frontend and backend to protect the progress calculation logic from accidental removal.

## [0.2.1] - 2026-03-08

### Added
- **Asynchronous Generation (Subtitles & Script)**: Full migration to background tasks with Server-Sent Events (SSE) for real-time updates.
- **Independent Progress Calculation**: The frontend now calculates progress percentages independently based on processed items/segments for maximum precision.
- **Audio Persistence**: Every generated audio is now automatically saved to `data/outputs` with a unique timestamp, preventing work loss.
- **Multi-Format Support**: Added choice between **WAV** (high quality) and **MP3** (compressed) for audio generation.
- **Precise Timecode Alignment**: Implemented "Shifting" logic in the audio aligner to prevent overlaps/cuts while maintaining timecode accuracy.
- **Enhanced Log Modal**: Re-designed `ActivityLogsModal` with a fixed progress bar, processing spinner, and a focused single-line display for the current task.
- **Overwrite Protection**: Added a confirmation alert before starting a new generation if an audio preview already exists.

### Fixed
- **Clean Logs**: Eliminated noise from underlying AI libraries (tqdm, debug prints) in the UI logs.
- **UI Stability**: Stopped automatic scrolling in logs to prevent the page from jumping during processing.
- **Reference Errors**: Fixed `currentAudioUrl` and other variable naming issues in `GenerationControls`.

### Changed
- **Log Formatting**: Standardized log format to `[TTS] Synthesizing text #X (xxx chars): '...'`.

## [0.2.0] - 2026-03-08

### Added
- **Global Context Management**: Centralized application state (voices, models, processing status) using React Context for better performance and consistency.
- **Job Archive Integration**: Added ability to save, delete, and recover job drafts directly from the UI.
- **Modular Frontend Architecture**: Refactored large components into smaller, maintainable units (e.g., `CpuStats`, `GpuStats`, `JobTableRow`).
- **User-Edited Segment Support**: The backend now respects manual edits made to subtitle segments in the frontend.

### Fixed
- **Audio Generation with Edited Text**: Fixed an issue where the backend would re-parse the original file instead of using user-modified text.
- **TypeScript Type Safety**: Resolved numerous type errors and improved strictness across the frontend.
- **Voice/Model Fetching**: Eliminated redundant API calls by sharing data across different application modes.

### Changed
- **Frontend Refactoring**: Significant cleanup of `SubtitleContext`, `ScriptContext`, and `GlobalContext`.
- **Improved Build Process**: Updated Vite and Vitest configurations.

## [0.1.0] - 2026-03-07

### Added
- Initial beta release of Nispa VibeVoice Studio.
- Support for VibeVoice 0.5B, 1.5B, and 7B models.
- Subtitle (.srt, .vtt) and Script processing workflows.
- Voice cloning from local WAV references.
- Offline translation service via Ollama.
- Automated installation and startup scripts for Windows.

