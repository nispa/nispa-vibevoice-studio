"""
Shared VRAM configuration for TTS batch sizing.
Single source of truth used by both tasks.py (runtime) and system.py (UI display).
"""
from dataclasses import dataclass
from core.tts.catalog import resolve_model_capabilities
from core.tts.capabilities import ModelNotFoundError


@dataclass(frozen=True)
class ModelVramCfg:
    cost_gb: float        # estimated VRAM cost per segment
    peak_multiplier: float  # overhead factor during model.generate()
    max_batch: int        # hard cap on batch size


DEFAULT_VRAM_CONFIG = ModelVramCfg(cost_gb=1.5, peak_multiplier=2.0, max_batch=8)

# Preserved for backward compatibility with legacy consumers and tests
MODEL_VRAM_CONFIG: dict[str, ModelVramCfg] = {
    "1.7B": ModelVramCfg(cost_gb=1.8, peak_multiplier=2.5, max_batch=6),
    "0.6B": ModelVramCfg(cost_gb=1.0, peak_multiplier=2.0, max_batch=8),
}

VRAM_HEADROOM = 0.60  # fraction of free VRAM considered usable


def get_model_config(model_name: str) -> ModelVramCfg:
    """
    Data-driven VRAM configuration derived from the authoritative model catalog.
    Never relies on model name substrings.
    """
    try:
        caps = resolve_model_capabilities(model_name)
        return ModelVramCfg(
            cost_gb=caps.vram_cost_gb,
            peak_multiplier=caps.vram_peak_multiplier,
            max_batch=caps.max_batch_size
        )
    except ModelNotFoundError:
        return DEFAULT_VRAM_CONFIG


def recommended_batch(model_name: str, vram_free_gb: float) -> int:
    """Returns the recommended batch size given free VRAM and model name."""
    cfg = get_model_config(model_name)
    divisor = cfg.cost_gb * cfg.peak_multiplier
    if divisor <= 0:
        return max(1, cfg.max_batch) if cfg.max_batch > 0 else 1
    usable = vram_free_gb * VRAM_HEADROOM
    calculated = int(usable // divisor)
    return max(1, min(calculated, cfg.max_batch))
