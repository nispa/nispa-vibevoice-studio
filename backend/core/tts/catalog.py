from typing import Dict, List, Optional
from core.tts.capabilities import ModelCapabilities, ModelNotFoundError

# Canonical model definitions with complete capability metadata
_CATALOG: Dict[str, ModelCapabilities] = {
    # --- Qwen3-TTS ---
    "qwen3-0.6b-base": ModelCapabilities(
        provider_id="qwen",
        model_id="qwen3-0.6b-base",
        display_name="Qwen3-TTS 0.6B Base (Voice Cloning)",
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
        supports_voice_clone=True,
        supports_voice_design=False,
        supports_batch=False,  # Sequential fallback initially
        supports_native_dialogue=False,
        max_speakers=1,
        requires_reference_audio=True,
        requires_reference_transcript=True,  # Mandatory for voice cloning
        supported_languages=["en", "it", "es", "fr", "de", "ja", "zh"],
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

    # VibeVoice legacy folder names & aliases
    "VibeVoice": "vibevoice-1.5b",
    "VibeVoice-1.5B": "vibevoice-1.5b",
    "VibeVoice-Streaming-0.5B": "vibevoice-0.5b",
    "VibeVoice-0.5B": "vibevoice-0.5b",
    "VibeVoice-7B": "vibevoice-7b",
    "VibeVoice7b-low-vram-4bit": "vibevoice-7b",
    "VibeVoice-Large": "vibevoice-large",
    "VibeVoice-Large-Q8": "vibevoice-large",

    # OmniVoice aliases
    "OmniVoice": "omnivoice-0.2",
    "k2-fsa/OmniVoice": "omnivoice-0.2",
    "OmniVoice-0.2": "omnivoice-0.2",
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
