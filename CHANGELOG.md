# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-03-08

### Added
- **User-Edited Segment Support**: The backend now respects manual edits made to subtitle segments in the frontend during audio generation.
- **Global Context Management**: Centralized application state (voices, models, processing status) using React Context for better performance and consistency.
- **Job Archive Integration**: Added ability to save, delete, and recover job drafts directly from the UI.
- **Modular Frontend Architecture**: Refactored large components into smaller, maintainable units (e.g., `CpuStats`, `GpuStats`, `JobTableRow`).

### Fixed
- **Audio Generation with Edited Text**: Fixed an issue where the backend would re-parse the original file instead of using user-modified text.
- **TypeScript Type Safety**: Resolved numerous type errors and improved strictness across the frontend.
- **Voice/Model Fetching**: Eliminated redundant API calls by sharing data across different application modes.

### Changed
- **Frontend Refactoring**: Significant cleanup of `SubtitleContext`, `ScriptContext`, and `GlobalContext`.
- **Improved Build Process**: Updated Vite and Vitest configurations for better developer experience and more reliable testing.

## [0.1.0] - 2026-03-07

### Added
- Initial beta release of Nispa VibeVoice Studio.
- Support for VibeVoice 0.5B, 1.5B, and 7B models.
- Subtitle (.srt, .vtt) and Script processing workflows.
- Voice cloning from local WAV references.
- Offline translation service via Ollama.
- Automated installation and startup scripts for Windows.
