"""
Shared VRAM configuration for TTS batch sizing.
Single source of truth used by both tasks.py (runtime) and system.py (UI display).
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class ModelVramCfg:
    cost_gb: float        # estimated VRAM cost per segment
    peak_multiplier: float  # overhead factor during model.generate()
    max_batch: int        # hard cap on batch size


# Per-model overrides keyed by substring present in model_name
MODEL_VRAM_CONFIG: dict[str, ModelVramCfg] = {
    "1.7B": ModelVramCfg(cost_gb=1.8, peak_multiplier=2.5, max_batch=6),
    "0.6B": ModelVramCfg(cost_gb=1.0, peak_multiplier=2.0, max_batch=8),
}

DEFAULT_VRAM_CONFIG = ModelVramCfg(cost_gb=1.5, peak_multiplier=2.0, max_batch=8)

VRAM_HEADROOM = 0.60  # fraction of free VRAM considered usable


def get_model_config(model_name: str) -> ModelVramCfg:
    for key, cfg in MODEL_VRAM_CONFIG.items():
        if key in model_name:
            return cfg
    return DEFAULT_VRAM_CONFIG


def recommended_batch(model_name: str, vram_free_gb: float) -> int:
    """Returns the recommended batch size given free VRAM and model name."""
    cfg = get_model_config(model_name)
    usable = vram_free_gb * VRAM_HEADROOM
    calculated = int(usable // (cfg.cost_gb * cfg.peak_multiplier))
    return max(1, min(calculated, cfg.max_batch))
