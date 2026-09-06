from pathlib import Path
import os
from typing import Dict, List, Optional
from core.tts.capabilities import ModelCapabilities, ModelNotFoundError

# Canonical model definitions with complete capability, repository, and operational metadata
_CATALOG: Dict[str, ModelCapabilities] = {
    # --- Qwen3-TTS ---
    "qwen3-0.6b-base": ModelCapabilities(
        provider_id="qwen",
        model_id="qwen3-0.6b-base",
        display_name="Qwen3-TTS 0.6B Base (Voice Cloning)",
        description="Fast lightweight voice cloning with low VRAM footprint",
        folder_name="Qwen3-TTS-12Hz-0.6B-Base",
        upstream_repo="Qwen/Qwen3-TTS-12Hz-0.6B-Base",
        essential_files=["config.json", "model.safetensors"],
        disk_size_gb=1.2,
        vram_cost_gb=1.0,
        vram_peak_multiplier=2.0,
        max_batch_size=8,
        supports_voice_clone=True,
        supports_voice_design=False,
        supports_batch=True,
        supports_native_dialogue=False,
        max_speakers=1,
        requires_reference_audio=True,
        requires_reference_transcript=False,
        supported_languages=["en", "it", "zh", "ja", "ko", "de", "fr", "es"],
        sample_rate=24000,
        execution="local_in_process",
    ),
    "qwen3-1.7b-base": ModelCapabilities(
        provider_id="qwen",
        model_id="qwen3-1.7b-base",
        display_name="Qwen3-TTS 1.7B Base (Voice Cloning)",
        description="High-fidelity voice cloning, recommended for English-UK and general voiceover",
        folder_name="Qwen3-TTS-12Hz-1.7B-Base",
        upstream_repo="Qwen/Qwen3-TTS-12Hz-1.7B-Base",
        essential_files=["config.json", "model.safetensors"],
        disk_size_gb=3.4,
        vram_cost_gb=1.8,
        vram_peak_multiplier=2.5,
        max_batch_size=6,
        supports_voice_clone=True,
        supports_voice_design=False,
        supports_batch=True,
        supports_native_dialogue=False,
        max_speakers=1,
        requires_reference_audio=True,
        requires_reference_transcript=False,
        supported_languages=["en", "it", "zh", "ja", "ko", "de", "fr", "es"],
        sample_rate=24000,
        execution="local_in_process",
    ),
    "qwen3-0.6b-custom": ModelCapabilities(
        provider_id="qwen",
        model_id="qwen3-0.6b-custom",
        display_name="Qwen3-TTS 0.6B (Built-in Voices)",
        description="Fast synthesis using Qwen3 built-in character voices",
        folder_name="Qwen3-TTS-12Hz-0.6B-CustomVoice",
        upstream_repo="Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice",
        essential_files=["config.json", "model.safetensors"],
        disk_size_gb=1.2,
        vram_cost_gb=1.0,
        vram_peak_multiplier=2.0,
        max_batch_size=8,
        supports_voice_clone=False,
        supports_voice_design=False,
        supports_batch=True,
        supports_native_dialogue=False,
        max_speakers=1,
        requires_reference_audio=False,
        requires_reference_transcript=False,
        supported_languages=["en", "it", "zh", "ja", "ko", "de", "fr", "es"],
        sample_rate=24000,
        execution="local_in_process",
    ),
    "qwen3-1.7b-custom": ModelCapabilities(
        provider_id="qwen",
        model_id="qwen3-1.7b-custom",
        display_name="Qwen3-TTS 1.7B (Built-in Voices)",
        description="High quality synthesis using Qwen3 built-in speaker presets",
        folder_name="Qwen3-TTS-12Hz-1.7B-CustomVoice",
        upstream_repo="Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice",
        essential_files=["config.json", "model.safetensors"],
        disk_size_gb=3.4,
        vram_cost_gb=1.8,
        vram_peak_multiplier=2.5,
        max_batch_size=6,
        supports_voice_clone=False,
        supports_voice_design=False,
        supports_batch=True,
        supports_native_dialogue=False,
        max_speakers=1,
        requires_reference_audio=False,
        requires_reference_transcript=False,
        supported_languages=["en", "it", "zh", "ja", "ko", "de", "fr", "es"],
        sample_rate=24000,
        execution="local_in_process",
    ),
    "qwen3-0.6b-voicedesign": ModelCapabilities(
        provider_id="qwen",
        model_id="qwen3-0.6b-voicedesign",
        display_name="Qwen3-TTS 0.6B (Voice Design)",
        description="Create synthetic voices from natural language text descriptions",
        folder_name="Qwen3-TTS-12Hz-0.6B-VoiceDesign",
        upstream_repo="Qwen/Qwen3-TTS-12Hz-0.6B-VoiceDesign",
        essential_files=["config.json", "model.safetensors"],
        disk_size_gb=1.2,
        vram_cost_gb=1.0,
        vram_peak_multiplier=2.0,
        max_batch_size=8,
        supports_voice_clone=False,
        supports_voice_design=True,
        supports_batch=True,
        supports_native_dialogue=False,
        max_speakers=1,
        requires_reference_audio=False,
        requires_reference_transcript=False,
        supported_languages=["en", "it", "zh", "ja", "ko", "de", "fr", "es"],
        sample_rate=24000,
        execution="local_in_process",
    ),
    "qwen3-1.7b-voicedesign": ModelCapabilities(
        provider_id="qwen",
        model_id="qwen3-1.7b-voicedesign",
        display_name="Qwen3-TTS 1.7B (Voice Design)",
        description="High fidelity voice creation from descriptive prompt",
        folder_name="Qwen3-TTS-12Hz-1.7B-VoiceDesign",
        upstream_repo="Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign",
        essential_files=["config.json", "model.safetensors"],
        disk_size_gb=3.4,
        vram_cost_gb=1.8,
        vram_peak_multiplier=2.5,
        max_batch_size=6,
        supports_voice_clone=False,
        supports_voice_design=True,
        supports_batch=True,
        supports_native_dialogue=False,
        max_speakers=1,
        requires_reference_audio=False,
        requires_reference_transcript=False,
        supported_languages=["en", "it", "zh", "ja", "ko", "de", "fr", "es"],
        sample_rate=24000,
        execution="local_in_process",
    ),

    # --- VibeVoice ---
    "vibevoice-0.5b": ModelCapabilities(
        provider_id="vibevoice",
        model_id="vibevoice-0.5b",
        display_name="VibeVoice-Streaming-0.5B",
        description="Ultra-fast streaming synthesis with minimal VRAM usage",
        folder_name="VibeVoice-Realtime-0.5B",
        upstream_repo="microsoft/VibeVoice-Realtime-0.5B",
        essential_files=["config.json"],
        disk_size_gb=1.5,
        vram_cost_gb=0.8,
        vram_peak_multiplier=1.5,
        max_batch_size=4,
        supports_voice_clone=True,
        supports_voice_design=False,
        supports_batch=False,
        supports_native_dialogue=False,
        max_speakers=1,
        requires_reference_audio=False,
        requires_reference_transcript=False,
        supported_languages=["en", "it", "zh", "ja"],
        sample_rate=24000,
        execution="local_in_process",
    ),
    "vibevoice-1.5b": ModelCapabilities(
        provider_id="vibevoice",
        model_id="vibevoice-1.5b",
        display_name="VibeVoice 1.5B (Zero-shot Cloning)",
        description="Stable multi-speaker zero-shot voice cloning with 64K context",
        folder_name="VibeVoice-1.5B",
        upstream_repo="vibevoice/VibeVoice-1.5B",
        essential_files=["config.json"],
        disk_size_gb=3.2,
        vram_cost_gb=1.5,
        vram_peak_multiplier=2.0,
        max_batch_size=8,
        supports_voice_clone=True,
        supports_voice_design=False,
        supports_batch=True,
        supports_native_dialogue=False,
        max_speakers=4,
        requires_reference_audio=False,
        requires_reference_transcript=False,
        supported_languages=["en", "it", "zh", "ja", "de", "fr", "es"],
        sample_rate=24000,
        execution="local_in_process",
    ),
    "vibevoice-7b": ModelCapabilities(
        provider_id="vibevoice",
        model_id="vibevoice-7b",
        display_name="VibeVoice 7B",
        description="High-fidelity 7B diffusion-transformer multi-speaker model",
        folder_name="VibeVoice-7B",
        upstream_repo="vibevoice/VibeVoice-7B",
        essential_files=["config.json"],
        disk_size_gb=15.0,
        vram_cost_gb=3.0,
        vram_peak_multiplier=2.5,
        max_batch_size=2,
        supports_voice_clone=True,
        supports_voice_design=False,
        supports_batch=True,
        supports_native_dialogue=False,
        max_speakers=4,
        requires_reference_audio=False,
        requires_reference_transcript=False,
        supported_languages=["en", "it", "zh", "ja", "de", "fr", "es"],
        sample_rate=24000,
        execution="local_in_process",
    ),
    "vibevoice-large": ModelCapabilities(
        provider_id="vibevoice",
        model_id="vibevoice-large",
        display_name="VibeVoice Large",
        description="VibeVoice Large experimental configuration",
        folder_name="VibeVoice-Large",
        upstream_repo="vibevoice/VibeVoice-7B",
        essential_files=["config.json"],
        disk_size_gb=15.0,
        vram_cost_gb=3.0,
        vram_peak_multiplier=2.5,
        max_batch_size=2,
        supports_voice_clone=True,
        supports_voice_design=False,
        supports_batch=True,
        supports_native_dialogue=False,
        max_speakers=4,
        requires_reference_audio=False,
        requires_reference_transcript=False,
        supported_languages=["en", "it", "zh", "ja", "de", "fr", "es"],
        sample_rate=24000,
        execution="local_in_process",
    ),

    # --- OmniVoice ---
    "omnivoice-0.2": ModelCapabilities(
        provider_id="omnivoice",
        model_id="omnivoice-0.2",
        display_name="OmniVoice (Voice Cloning)",
        description="Fast voice cloning for 600+ languages; requires reference WAV and transcript TXT",
        folder_name="OmniVoice",
        upstream_repo="k2-fsa/OmniVoice",
        pinned_revision="c5fdb5ccb189668d56333f77ba2629f4cd7535f4",
        essential_files=[
            "config.json",
            "model.safetensors",
            "tokenizer.json",
        ],
        disk_size_gb=2.5,
        vram_cost_gb=2.0,
        vram_peak_multiplier=2.0,
        max_batch_size=1,
        supports_voice_clone=True,
        supports_voice_design=False,
        supports_batch=False,
        supports_native_dialogue=False,
        max_speakers=1,
        requires_reference_audio=True,
        requires_reference_transcript=True,
        supported_languages=["en", "it", "es", "fr", "de", "ja", "zh"],
        sample_rate=24000,
        execution="local_worker",
    ),

    # --- Higgs Audio v3 ---
    "higgs-audio-v3-4b": ModelCapabilities(
        provider_id="higgs",
        model_id="higgs-audio-v3-4b",
        display_name="Higgs Audio v3 (4B Emotion & Style)",
        description="4B multimodal TTS supporting emotions, styles, pauses, and sound effects",
        folder_name="Higgs-Audio-v3",
        upstream_repo="multimodalart/higgs-audio-v3-tts-4b-transformers",
        pinned_revision="30f01593ee6a12efa586c92455afe4b76e45095d",
        essential_files=[
            "config.json",
            "model.safetensors",
            "tokenizer.json"
        ],
        disk_size_gb=9.3,
        vram_cost_gb=3.5,
        vram_peak_multiplier=2.5,
        max_batch_size=1,
        supports_voice_clone=True,
        supports_voice_design=False,
        supports_emotion_tags=True,
        supports_batch=False,
        supports_native_dialogue=False,
        max_speakers=1,
        requires_reference_audio=True,
        requires_reference_transcript=False,
        supported_languages=["en", "it", "fr", "de", "es", "ja", "zh"],
        sample_rate=24000,
        execution="local_worker",
    ),

    # --- Internal Offline Translation ---
    "nllb-200-distilled-600m": ModelCapabilities(
        provider_id="translation",
        model_id="nllb-200-distilled-600m",
        display_name="NLLB-200 Distilled 600M (Offline Translator)",
        description="High-quality offline subtitle translation across 200 languages",
        folder_name="NLLB-200-Distilled-600M",
        destination_folder="model-translation",
        upstream_repo="facebook/nllb-200-distilled-600M",
        essential_files=["config.json", "model.safetensors"],
        disk_size_gb=2.4,
        vram_cost_gb=1.2,
        vram_peak_multiplier=1.5,
        max_batch_size=16,
        supports_voice_clone=False,
        supports_voice_design=False,
        supports_batch=True,
        supports_native_dialogue=False,
        max_speakers=0,
        requires_reference_audio=False,
        requires_reference_transcript=False,
        supported_languages=["all"],
        sample_rate=0,
        execution="local_in_process",
    ),

    # --- Required Artifacts ---
    "qwen3-tokenizer-12hz": ModelCapabilities(
        provider_id="qwen",
        model_id="qwen3-tokenizer-12hz",
        display_name="Qwen3-TTS Tokenizer 12Hz",
        description="Critical acoustic tokenizer required by all Qwen3 models",
        folder_name="Qwen3-TTS-Tokenizer-12Hz",
        upstream_repo="Qwen/Qwen3-TTS-Tokenizer-12Hz",
        essential_files=["config.json"],
        disk_size_gb=0.1,
        vram_cost_gb=0.0,
        vram_peak_multiplier=1.0,
        max_batch_size=0,
        supports_voice_clone=False,
        supports_voice_design=False,
        supports_batch=False,
        supports_native_dialogue=False,
        max_speakers=0,
        requires_reference_audio=False,
        requires_reference_transcript=False,
        supported_languages=[],
        sample_rate=24000,
        execution="local_in_process",
    ),
    "higgs-audio-v2-tokenizer": ModelCapabilities(
        provider_id="higgs",
        model_id="higgs-audio-v2-tokenizer",
        display_name="Higgs Audio v2 Tokenizer (Codec)",
        description="Discrete neural audio codec required by Higgs Audio v3",
        folder_name="Higgs-Audio-v2-Tokenizer",
        upstream_repo="bosonai/higgs-audio-v2-tokenizer",
        essential_files=["config.json", "model.safetensors"],
        disk_size_gb=0.8,
        vram_cost_gb=0.0,
        vram_peak_multiplier=1.0,
        max_batch_size=0,
        supports_voice_clone=False,
        supports_voice_design=False,
        supports_batch=False,
        supports_native_dialogue=False,
        max_speakers=0,
        requires_reference_audio=False,
        requires_reference_transcript=False,
        supported_languages=[],
        sample_rate=24000,
        execution="local_worker",
    ),
}

# Alias map: legacy folder names, directory names, and identifiers mapped to canonical model_id
_ALIASES: Dict[str, str] = {
    # Qwen legacy folder names & aliases
    "Qwen3-TTS-1.7B": "qwen3-1.7b-base",
    "Qwen3-TTS-0.6B": "qwen3-0.6b-base",
    "Qwen3-TTS": "qwen3-0.6b-base",
    "Qwen3-TTS-12Hz-0.6B-Base": "qwen3-0.6b-base",
    "Qwen3-TTS-0.6B-Base": "qwen3-0.6b-base",
    "Qwen3-TTS-12Hz-1.7B-Base": "qwen3-1.7b-base",
    "Qwen3-TTS-1.7B-Base": "qwen3-1.7b-base",
    "Qwen3-TTS-0.6B-CustomVoice": "qwen3-0.6b-custom",
    "Qwen3-TTS-12Hz-0.6B-CustomVoice": "qwen3-0.6b-custom",
    "Qwen3-TTS-1.7B-CustomVoice": "qwen3-1.7b-custom",
    "Qwen3-TTS-12Hz-1.7B-CustomVoice": "qwen3-1.7b-custom",
    "Qwen3-TTS-0.6B-VoiceDesign": "qwen3-0.6b-voicedesign",
    "Qwen3-TTS-12Hz-0.6B-VoiceDesign": "qwen3-0.6b-voicedesign",
    "Qwen3-TTS-1.7B-VoiceDesign": "qwen3-1.7b-voicedesign",
    "Qwen3-TTS-12Hz-1.7B-VoiceDesign": "qwen3-1.7b-voicedesign",
    "Qwen3-TTS-Tokenizer-12Hz": "qwen3-tokenizer-12hz",
    "Qwen/Qwen3-TTS-Tokenizer-12Hz": "qwen3-tokenizer-12hz",

    # VibeVoice legacy folder names & aliases
    "VibeVoice": "vibevoice-1.5b",
    "VibeVoice-1.5B": "vibevoice-1.5b",
    "VibeVoice-Streaming-0.5B": "vibevoice-0.5b",
    "VibeVoice-0.5B": "vibevoice-0.5b",
    "VibeVoice-Realtime-0.5B": "vibevoice-0.5b",
    "VibeVoice-7B": "vibevoice-7b",
    "VibeVoice7b-low-vram-4bit": "vibevoice-7b",
    "VibeVoice-Large": "vibevoice-large",
    "VibeVoice-Large-Q8": "vibevoice-large",

    # OmniVoice aliases
    "OmniVoice": "omnivoice-0.2",
    "k2-fsa/OmniVoice": "omnivoice-0.2",
    "OmniVoice-0.2": "omnivoice-0.2",

    # Higgs Audio v3 aliases
    "higgs": "higgs-audio-v3-4b",
    "higgs-audio-v3": "higgs-audio-v3-4b",
    "higgs-4b": "higgs-audio-v3-4b",
    "HiggsAudioV3": "higgs-audio-v3-4b",
    "Higgs-Audio-v3": "higgs-audio-v3-4b",
    "multimodalart/higgs-audio-v3-tts-4b-transformers": "higgs-audio-v3-4b",
    "Higgs-Audio-v2-Tokenizer": "higgs-audio-v2-tokenizer",
    "bosonai/higgs-audio-v2-tokenizer": "higgs-audio-v2-tokenizer",

    # Translation aliases
    "NLLB-200-Distilled-600M": "nllb-200-distilled-600m",
    "facebook/nllb-200-distilled-600M": "nllb-200-distilled-600m",
    "nllb": "nllb-200-distilled-600m",
}


def resolve_model_capabilities(model_name_or_id: str) -> ModelCapabilities:
    """
    Resolves a canonical model ID, legacy folder name, or alias to its ModelCapabilities.
    Raises ModelNotFoundError with actionable diagnostics if the model is unknown.
    Never relies on substring matching.
    """
    if not model_name_or_id:
        raise ModelNotFoundError("Model identifier cannot be empty.")

    # Direct canonical lookup
    if model_name_or_id in _CATALOG:
        return _CATALOG[model_name_or_id]

    # Alias lookup
    canonical_id = _ALIASES.get(model_name_or_id)
    if canonical_id and canonical_id in _CATALOG:
        return _CATALOG[canonical_id]

    # Case-insensitive / strip whitespace lookup
    normalized = model_name_or_id.strip().lower()
    for mid, caps in _CATALOG.items():
        if mid.lower() == normalized or caps.display_name.lower() == normalized:
            return caps
    for alias, cid in _ALIASES.items():
        if alias.lower() == normalized and cid in _CATALOG:
            return _CATALOG[cid]

    available = list(_CATALOG.keys()) + list(_ALIASES.keys())
    raise ModelNotFoundError(
        f"Unknown model '{model_name_or_id}'. "
        f"Available models and aliases: {sorted(set(available))}"
    )


def list_supported_models() -> List[ModelCapabilities]:
    """Returns a list of all supported canonical ModelCapabilities."""
    return list(_CATALOG.values())


def get_model_target_dir(caps: ModelCapabilities) -> Path:
    """Returns the absolute Path directory where this model is or will be installed."""
    from core.config import MODELS_DIR, TRANSLATION_MODELS_DIR
    base = TRANSLATION_MODELS_DIR if caps.destination_folder == "model-translation" else MODELS_DIR
    folder = caps.folder_name or caps.model_id
    return base / folder


def is_model_installed(caps_or_id: ModelCapabilities | str) -> bool:
    """
    Verifies that a model's directory exists and contains all declared essential files
    with non-zero size. Prevents partial/broken downloads from reporting as installed.
    """
    if isinstance(caps_or_id, str):
        try:
            caps = resolve_model_capabilities(caps_or_id)
        except ModelNotFoundError:
            return False
    else:
        caps = caps_or_id

    target_dir = get_model_target_dir(caps)
    if not target_dir.is_dir():
        return False

    for ef in caps.essential_files:
        ef_path = target_dir / ef
        if not ef_path.is_file() or ef_path.stat().st_size == 0:
            return False
    return True


_SIZE_CACHE: Dict[str, tuple[float, int]] = {}


def get_installed_model_size_bytes(caps: ModelCapabilities) -> int:
    """Calculates total bytes occupied by the installed model on disk (cached by mtime)."""
    target_dir = get_model_target_dir(caps)
    if not target_dir.is_dir():
        return 0

    try:
        current_mtime = target_dir.stat().st_mtime
    except OSError:
        current_mtime = 0.0

    cache_key = str(target_dir.resolve())
    if cache_key in _SIZE_CACHE:
        cached_mtime, cached_size = _SIZE_CACHE[cache_key]
        if cached_mtime == current_mtime:
            return cached_size

    total = 0
    for root, _, files in os.walk(target_dir):
        for f in files:
            fp = os.path.join(root, f)
            try:
                total += os.path.getsize(fp)
            except OSError:
                pass

    _SIZE_CACHE[cache_key] = (current_mtime, total)
    return total

