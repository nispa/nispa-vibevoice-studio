"""
Tests for core/vram_config.py — the single source of truth for VRAM batch sizing.
These are pure-logic tests: no GPU, no models required.
"""
import pytest
from core.vram_config import (
    get_model_config,
    recommended_batch,
    MODEL_VRAM_CONFIG,
    DEFAULT_VRAM_CONFIG,
)


class TestGetModelConfig:
    def test_known_model_1_7b(self):
        cfg = get_model_config("Qwen3-TTS-1.7B-VoiceDesign")
        assert cfg.cost_gb == 1.8
        assert cfg.peak_multiplier == 2.5
        assert cfg.max_batch == 6

    def test_known_model_0_6b(self):
        cfg = get_model_config("Qwen3-TTS-0.6B-CustomVoice")
        assert cfg.cost_gb == 1.0
        assert cfg.peak_multiplier == 2.0
        assert cfg.max_batch == 8

    def test_unknown_model_returns_default(self):
        cfg = get_model_config("SomeUnknownModel-3B")
        assert cfg == DEFAULT_VRAM_CONFIG

    def test_vibevoice_returns_default(self):
        # VibeVoice models don't match any key → use default
        cfg = get_model_config("VibeVoice-1.5B")
        assert cfg == DEFAULT_VRAM_CONFIG


class TestRecommendedBatch:
    def test_plenty_of_vram(self):
        # 16 GB free, default config: usable=9.6, cost=1.5*2.0=3.0 → batch=3, capped at 8
        result = recommended_batch("VibeVoice-1.5B", vram_free_gb=16.0)
        assert result == 3

    def test_tight_vram(self):
        # 2 GB free, default config: usable=1.2, cost=3.0 → batch=0 → clamp to 1
        result = recommended_batch("VibeVoice-1.5B", vram_free_gb=2.0)
        assert result == 1

    def test_max_batch_cap(self):
        # 100 GB free, 0.6B model: usable=60, cost=1.0*2.0=2.0 → batch=30 → capped at 8
        result = recommended_batch("Qwen3-TTS-0.6B", vram_free_gb=100.0)
        assert result == 8

    def test_1_7b_max_batch_cap(self):
        # 100 GB free, 1.7B model: capped at 6
        result = recommended_batch("Qwen3-TTS-1.7B", vram_free_gb=100.0)
        assert result == 6

    def test_returns_at_least_one(self):
        # Even with 0 VRAM should return 1
        result = recommended_batch("VibeVoice-1.5B", vram_free_gb=0.0)
        assert result >= 1


class TestConfigIntegrity:
    def test_all_configs_have_positive_values(self):
        for key, cfg in MODEL_VRAM_CONFIG.items():
            assert cfg.cost_gb > 0, f"{key}: cost_gb must be positive"
            assert cfg.peak_multiplier > 0, f"{key}: peak_multiplier must be positive"
            assert cfg.max_batch >= 1, f"{key}: max_batch must be >= 1"

    def test_default_config_has_positive_values(self):
        assert DEFAULT_VRAM_CONFIG.cost_gb > 0
        assert DEFAULT_VRAM_CONFIG.peak_multiplier > 0
        assert DEFAULT_VRAM_CONFIG.max_batch >= 1
