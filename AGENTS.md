# AGENTS.md — Engineering instructions for Nispa Voiceover

## Mission

Work as a senior software engineer on Nispa Voiceover, a local-first desktop application for subtitle voiceover and untimed multi-speaker dialogue generation.

The immediate product goal is to integrate OmniVoice as an additional local TTS provider and refactor the current two-provider implementation into a maintainable, data-driven architecture. Deliver working product functionality, not demos, placeholders, or model-specific branches scattered through the codebase.

The primary usage is English dialogue with UK-accented cloned voices. Italian and other languages remain supported but are not the main optimisation target.

## Source of truth and task workflow

Before changing code:

1. Read this file completely.
2. Read `TASKS.md`, `PLANNING.md`, and the files directly involved in the current task.
3. Inspect `git status --short` and preserve all unrelated user changes.
4. Verify claims against the current code, installed environment, and tests. Documentation may lag behind implementation; do not treat version numbers or architecture descriptions as authoritative without checking.
5. Identify the current phase in `TASKS.md` and work only on a coherent, testable slice.

After completing a slice:

1. Run focused tests for the changed area.
2. Run the broader regression suite appropriate to the risk.
3. Update `TASKS.md` checkboxes only for work actually implemented and verified.
4. Update documentation when public behaviour, installation, configuration, API payloads, or limitations change.
5. Report what changed, what was verified, and any remaining risk or decision.

Do not mark a task complete based only on mocked tests when the task explicitly requires a real model, GPU, installer, or offline smoke test.

## Non-negotiable product constraints

- TTS inference is local. Do not add cloud TTS APIs or remote fallbacks.
- Voice references, transcripts, embeddings, acoustic tokens, cached prompts, generated segments, and outputs are biometric or sensitive data. They must remain local and must not appear in telemetry, remote requests, fixtures, Git history, or verbose logs.
- Model download is an explicit installation action. Synthesis must never trigger an implicit download.
- Runtime must support strict offline operation after models and dependencies are installed.
- OmniVoice is an additional provider, regardless of whether it outperforms Qwen in every benchmark. Benchmarks determine recommendations and presets, not whether the provider exists.
- OmniVoice v1 is a per-utterance provider in the existing Script Mode. Do not claim or simulate native multi-speaker generation.
- Existing Qwen and VibeVoice workflows, archived jobs, voice files, and settings must remain backward compatible unless a migration is deliberately designed and tested.
## Current environment assumptions

Treat these as important project constraints, but verify the installed environment before changing dependencies:

- Primary development machine: NVIDIA RTX 5070 Ti Laptop, Blackwell `sm_120`, 16 GB VRAM.
- Current CUDA target: CUDA 13.2.
- Current PyTorch target: `2.10.0+cu130`, installed from the CUDA 13.0 PyTorch index.
- Flash Attention may be installed with `pip install flash-attn --no-build-isolation`.
- Do not switch to `cu124`, generic stable wheels, or nightly wheels just because an upstream README uses them. Blackwell support and the installed application environment take precedence.

Useful existing project patterns:

- Launch from `start.bat` / `start.sh`.
- Install through `install.bat` / `install.sh`; model downloads go through `backend/scripts/download_model.py`.
- Backend stack: FastAPI, SQLite, PyTorch, local model inference.
- Frontend stack: React, Vite, TypeScript, Tailwind.
- Keep TTS model loading lazy. Application startup must not load model weights.
- Save generated segments as WAV under `data/audio-rendering/` and final outputs under `data/outputs/`.
- Prefer `soundfile.write()` for generated WAV bytes. Do not reintroduce known `torchaudio.save()` / TorchCodec issues in Qwen paths.
- Use `asyncio.to_thread()` or a managed worker for blocking TTS work.

Known legacy risks to re-check before touching the area:

- `backend/core/tts_provider.py` currently routes providers through hard-coded pools and model-name heuristics.
- `backend/api/routers/voices.py` currently derives model/provider behaviour from discovered model folders and name checks.
- `backend/api/routers/tasks.py` contains script/dialogue orchestration, batching, cancellation, SSE progress, and speaker limits.
- `backend/api/routers/translation.py` may contain older Transformers argument usage; verify before editing translation code.
- `backend/db/database.py` may still have SQLite connection lifecycle issues; fix only if they block the current slice or are already in touched code.
- `backend/main.py` may still use deprecated FastAPI startup events; do not fold that cleanup into OmniVoice work unless it becomes necessary.

## Definition of professional implementation

### Build features, not patches

- Implement end-to-end behaviour: domain model, backend, installer, API, frontend, errors, tests, documentation, upgrade path, and cleanup where relevant.
- Do not stop at a provider class if users cannot install, select, run, diagnose, and remove the provider through the existing product workflow.
- Avoid speculative abstractions. Introduce an abstraction when it removes known duplication or supports a concrete current requirement, then cover it with tests.
- Prefer small cohesive modules with explicit ownership over large orchestrators that know every provider detail.

### No hard-coded provider behaviour

- Never route by substrings such as `"Qwen" in model_name`.
- Never treat an unknown provider as VibeVoice or any other default. Fail explicitly with an actionable error.
- Do not encode model capability in folder names, display labels, UI conditionals, or endpoint-specific lists.
- Store model/provider metadata in one authoritative catalog or registry. Consumers query capabilities rather than checking provider names.
- Provider identifiers, model identifiers, display names, filesystem paths, and upstream repository identifiers are distinct concepts. Model them separately.
- Speaker limits, supported languages, reference requirements, voice design, batch support, sample rate, execution mode, and VRAM policy must be data-driven capabilities.
- Defaults belong in typed configuration with validation. Do not scatter magic values across routers, providers, React components, and scripts.

### Compatibility and migrations

- Preserve current model IDs in persisted jobs or provide an explicit compatibility map/migration.
- Additive API evolution is preferred. If a payload changes, update all callers and tests in the same slice.
- Configuration loading must tolerate older settings while validating new fields and writing stable defaults.
- Installer reruns must be idempotent and safe for existing installations.

## Target provider architecture

Use these responsibilities as the intended direction; adapt names to the codebase rather than forcing unnecessary structure.

### Model catalog

One source of truth describes every supported model:

- stable `model_id`;
- `provider_id`;
- display name and description;
- local relative model path;
- upstream repository and pinned revision used only by the downloader;
- install state;
- capabilities;
- VRAM/batching profile;
- dependency/runtime profile.

The `/api/models` endpoint, frontend selectors, validation, downloader, and batch policy should consume this catalog instead of maintaining parallel lists.

### Provider registry

The provider registry:

- maps `provider_id` to a lazy factory;
- resolves a `model_id` through the catalog;
- pools provider instances by provider and device where appropriate;
- owns lifecycle dispatch but not provider internals;
- calls public `unload()`/health methods instead of manipulating `.model`, `.processor`, or implementation-specific attributes;
- produces explicit errors for missing registration, missing model files, unsupported capabilities, and unhealthy runtimes.

### Provider contract

Keep compatibility with current synthesis call sites while evolving toward typed request/response objects. The contract should cover:

- single-utterance synthesis;
- optional provider-native batch synthesis with a correct sequential fallback;
- lazy load and unload;
- cancellation awareness where supported;
- output audio bytes plus declared format/sample rate;
- voice reference and transcript requirements;
- optional native dialogue synthesis for future providers, without pretending OmniVoice supports it.

Provider implementations translate the generic request into the upstream library API. Routers and React components must not know OmniVoice/Qwen/Vibe-specific Python arguments.

## OmniVoice implementation rules

- Use a pinned, reviewed OmniVoice release and pinned model revision. Do not depend on a moving branch.
- Pass a verified local model directory to `OmniVoice.from_pretrained()`. Never pass a Hub ID during synthesis.
- Disable implicit network access in runtime with the appropriate Hugging Face/Transformers offline settings and test with the network unavailable.
- Do not enable OmniVoice automatic Whisper transcription as a hidden fallback. Use the verified local `.txt` transcript paired with the voice WAV; return an actionable error when it is missing.
- Prefer voice cloning for production UK voices. A UK reference is the primary source of accent. Do not automatically layer a `british accent` voice-design instruction on a cloned voice unless the upstream API explicitly supports and testing validates that combination.
- Treat `VoiceClonePrompt` files as biometric derivatives. Store them below `data/`, gitignore them, hash their inputs, invalidate them when WAV/transcript/model revision changes, and remove or rebuild them through explicit lifecycle operations.
- Produce the common audio contract expected by the application. Convert in memory where possible and avoid persistent temporary files.
- Begin with correct sequential synthesis. Enable native batching only after validating ordering, multiple requests, prompt reuse, cancellation, and VRAM behaviour.
- Surface upstream generation parameters only when users benefit from them. Provide validated presets and safe bounds; do not expose every library knob by default.
- Preserve supported inline non-verbal/pronunciation syntax. Do not silently rewrite user dialogue unless a visible, reversible normalisation option is enabled.

## Dependency and runtime integration

The repository already has guided installers and launchers. They are the only supported user-facing environment workflow.

- Extend `install.bat` and `install.sh`; do not introduce manual setup instructions as the primary path.
- Extend the existing guided engine selection to include OmniVoice and useful combinations. Avoid an unmaintainable explosion of numbered combinations; parse a multi-selection or use a small data-driven installer helper.
- Keep provider requirements separate and versioned.
- First test whether OmniVoice can coexist in the main application venv with Qwen and vendored VibeVoice.
- If dependencies are incompatible, an isolated OmniVoice environment/worker is acceptable only when the installer creates, validates, updates, and repairs it automatically and the launcher manages its full lifecycle.
- An isolated worker must bind only to loopback, have bounded requests/timeouts, validate local paths, avoid orphan processes, expose health diagnostics through the main backend, and remain invisible as an operational burden to users.
- A failed optional provider must not prevent the application or other installed providers from starting.
- Update `backend/scripts/optimize_env.py` to validate the engines the user selected, rather than assuming all engines are installed.
- Extend `backend/scripts/download_model.py` through catalog data, including prerequisite artifacts, pinned revisions, partial-download handling, and install-state reporting.
- Do not change the project's CUDA/PyTorch strategy based only on upstream README examples. Test against the actual supported Blackwell/CUDA environment documented in this file and the installed environment.

## Backend engineering conventions

- Keep FastAPI routers thin: parse/validate requests, call domain/application services, translate expected errors to HTTP responses.
- Do not duplicate synthesis orchestration between `generation.py` and `tasks.py`; extract shared services when modifying both flows.
- Run blocking model and audio work outside the event loop with `asyncio.to_thread()` or a managed worker.
- Preserve task progress, cancellation, session recovery, partial-result persistence, and SSE semantics.
- Never replace a provider failure with silent audio without recording a structured warning/error that the UI can expose. Silence fallback, if retained for batch continuity, must be explicit in job metadata.
- Validate filesystem identifiers and ensure resolved paths remain under approved `data/` directories.
- Use `pathlib.Path` for new path-heavy code and central configuration paths from `core.config`.
- Use typed dataclasses or Pydantic models at boundaries. Avoid loosely shaped dictionaries when the structure is persistent or crosses modules.
- Preserve lazy model loading; application startup must not load TTS weights.
- Use in-memory WAV generation (`io.BytesIO` and `soundfile`) when practical. Avoid reintroducing known TorchCodec/`torchaudio.save()` issues.
- Integrate VRAM configuration into the model catalog or a provider-owned policy. Do not add new substring matching to `vram_config.py`.
- Log provider/model/device, timings, and recoverable diagnostics, but never sensitive voice content.
- Catch only errors that can be handled meaningfully. Preserve exception context and use domain-specific exceptions rather than broad `except Exception` where possible.

## Frontend engineering conventions

- Use React Context and the existing feature/service structure unless a demonstrated need justifies a larger state-management change.
- Keep API access in typed service modules; never hard-code backend URLs outside the existing API client configuration.
- Do not add TypeScript `any`. Model API responses and capability fields explicitly.
- UI behaviour must derive from model capabilities: reference requirement, transcript requirement, voice design, language choices, speaker limit, options, and availability.
- Do not add provider-name checks in React components.
- Preserve loading, cancellation, SSE reconnection, job recovery, error, and empty states.
- Use the existing toast/confirmation mechanisms instead of native browser dialogs.
- Revoke object URLs and close audio resources according to existing project conventions.
- Keep Tailwind classes statically discoverable; avoid runtime-built class fragments.
- Accessibility is part of completion: labels, keyboard operation, disabled reasons, status text, and error association must be usable.

## Privacy and security review

For every change involving voices or generated audio, verify:

- no remote request occurs during inference;
- no implicit Hub or ASR fallback occurs;
- no sensitive file is versioned;
- caches have deletion and invalidation behaviour;
- logs do not contain reference transcript/audio tokens;
- path traversal is prevented using resolved-path containment, not only substring checks;
- a local worker cannot be reached externally;
- temporary files are scoped, cleaned, and not left after cancellation/crash where avoidable.

Do not describe hashed voice prompts as anonymous. They remain derived biometric material.

## Testing requirements

Every functional change includes tests at the lowest useful level and at integration boundaries.

### Required test layers

- Unit tests for catalog, registry, capability validation, provider adapter, prompt-cache keys/invalidation, path safety, and error mapping.
- API tests for model listing, synthesis validation, task progress/cancellation, and backward-compatible model IDs.
- Frontend tests for capability-driven rendering, selection, validation, errors, and generation request payloads.
- Regression tests for Qwen and VibeVoice routing and lifecycle.
- Marked slow/GPU smoke tests for real OmniVoice loading and synthesis; do not make model weights mandatory for the default unit suite.
- Offline smoke test after installation with network disabled.
- Installer tests or scripted dry-runs for fresh install, rerun/upgrade, single-engine selection, multi-engine selection, failed optional engine, and missing model.

### Standard commands

Run focused tests during development, then as appropriate:

```text
python run_tests.py --backend
python run_tests.py --frontend
python run_tests.py
cd frontend && npm run build
cd frontend && npm run lint
```

If a command cannot run because weights, GPU, or a platform tool is unavailable, document exactly what remains unverified. Do not report a mocked provider test as real inference validation.

## Quality benchmark

Maintain an offline, reproducible Qwen-versus-OmniVoice benchmark focused on English-UK dialogue. Reference audio stays gitignored; only non-sensitive manifests and evaluation tooling may be versioned.

Cover:

- multiple authorised UK voices and genders;
- short conversational turns and longer lines;
- questions, interruptions, irony, emotion, hesitation, and rapid alternation;
- UK names, addresses, dates, times, currency, abbreviations, and heteronyms;
- speaker similarity, naturalness, accent credibility, intelligibility, pacing, artifacts, latency, VRAM, and failure/OOM rate.

Use blind randomised A/B listening where possible. Publish model-specific recommendations and presets from evidence; do not claim one model is universally superior.

## Scope control

- Do not combine the OmniVoice integration with MOSS-TTSD or another native-dialogue provider in the same implementation cycle.
- Design the registry so a native-dialogue provider can be added later, but do not implement unused infrastructure beyond the typed extension point and tests needed now.
- Fix unrelated bugs only when they block the current slice or create a correctness/security problem in touched code. Otherwise document them separately.
- Do not perform broad formatting, dependency upgrades, renames, or rewrites unrelated to the feature.

## Completion standard

OmniVoice integration is complete only when:

1. Users can select and install it through the existing guided installer.
2. The downloader installs a pinned model explicitly and synthesis works from local paths with the network disabled.
3. Existing local voices and transcripts can be used from Script Mode for English-UK dialogue.
4. Prompt caches are treated as sensitive, invalidated correctly, and removable.
5. Provider/model selection is registry- and capability-driven with no name-substring routing.
6. Qwen and VibeVoice behaviour remains compatible and regression-tested.
7. Installer rerun, startup, provider failure, cancellation, and cleanup are handled professionally.
8. Backend, frontend, installer, privacy, and documentation changes form one coherent user-visible feature.
9. Tests pass, and any hardware-dependent verification not performed is explicitly stated.
