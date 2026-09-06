"""
Tests for core/tts_provider.py — MultiModelProvider pool-based lazy loading.
TTS models are fully mocked: no GPU required.
"""
import pytest
from unittest.mock import MagicMock, patch, call


def make_mock_provider(wav_bytes=b"RIFF"):
    p = MagicMock()
    p.synthesize.return_value = wav_bytes
    p.synthesize_batch.return_value = [wav_bytes]
    return p


class TestLazyInit:
    def test_pools_start_empty(self):
        from core.tts_provider import MultiModelProvider
        engine = MultiModelProvider()
        assert engine._vibe_pool == {}
        assert engine._qwen_pool == {}

    def test_vibe_property_creates_instance_on_first_access(self):
        from core.tts_provider import MultiModelProvider
        engine = MultiModelProvider()
        mock = make_mock_provider()
        with patch("core.tts_provider.VibeVoiceProvider", return_value=mock) as MockVibe:
            _ = engine.vibe
            MockVibe.assert_called_once_with(device="cuda:0")
        assert "cuda:0" in engine._vibe_pool

    def test_qwen_property_creates_instance_on_first_access(self):
        from core.tts_provider import MultiModelProvider
        engine = MultiModelProvider()
        mock = make_mock_provider()
        with patch("core.tts_provider.Qwen3TTSProvider", return_value=mock) as MockQwen:
            _ = engine.qwen
            MockQwen.assert_called_once_with(device="cuda:0")
        assert "cuda:0" in engine._qwen_pool

    def test_repeated_access_reuses_instance(self):
        from core.tts_provider import MultiModelProvider
        engine = MultiModelProvider()
        with patch("core.tts_provider.VibeVoiceProvider", return_value=make_mock_provider()) as MockVibe:
            _ = engine.vibe
            _ = engine.vibe
            assert MockVibe.call_count == 1


class TestRouting:
    def test_synthesize_routes_to_vibe(self):
        from core.tts_provider import MultiModelProvider
        engine = MultiModelProvider()
        mock_vibe = make_mock_provider(b"vibe-audio")
        with patch("core.tts_provider.VibeVoiceProvider", return_value=mock_vibe):
            result = engine.synthesize("Hello", "VibeVoice-1.5B", voice_id="test")
        assert result == b"vibe-audio"
        mock_vibe.synthesize.assert_called_once()

    def test_synthesize_routes_to_qwen(self):
        from core.tts_provider import MultiModelProvider
        engine = MultiModelProvider()
        mock_qwen = make_mock_provider(b"qwen-audio")
        with patch("core.tts_provider.Qwen3TTSProvider", return_value=mock_qwen):
            result = engine.synthesize("Hello", "Qwen3-TTS-1.7B-VoiceDesign")
        assert result == b"qwen-audio"
        mock_qwen.synthesize.assert_called_once()

    def test_synthesize_batch_routes_to_vibe(self):
        from core.tts_provider import MultiModelProvider
        engine = MultiModelProvider()
        mock_vibe = make_mock_provider()
        with patch("core.tts_provider.VibeVoiceProvider", return_value=mock_vibe):
            engine.synthesize_batch(["A", "B"], "VibeVoice-1.5B")
        mock_vibe.synthesize_batch.assert_called_once()

    def test_synthesize_batch_routes_to_qwen(self):
        from core.tts_provider import MultiModelProvider
        engine = MultiModelProvider()
        mock_qwen = make_mock_provider()
        with patch("core.tts_provider.Qwen3TTSProvider", return_value=mock_qwen):
            engine.synthesize_batch(["A", "B"], "Qwen3-TTS-0.6B-CustomVoice")
        mock_qwen.synthesize_batch.assert_called_once()


class TestMultiGpuPool:
    def test_different_devices_get_separate_instances(self):
        from core.tts_provider import MultiModelProvider
        engine = MultiModelProvider()
        mocks = [make_mock_provider(), make_mock_provider()]
        with patch("core.tts_provider.VibeVoiceProvider", side_effect=mocks):
            p0 = engine._get_vibe("cuda:0")
            p1 = engine._get_vibe("cuda:1")
        assert p0 is not p1
        assert "cuda:0" in engine._vibe_pool
        assert "cuda:1" in engine._vibe_pool

    def test_synthesize_batch_on_device_uses_correct_pool(self):
        from core.tts_provider import MultiModelProvider
        engine = MultiModelProvider()
        mock_vibe_0 = make_mock_provider(b"gpu0")
        mock_vibe_1 = make_mock_provider(b"gpu1")

        def provider_factory(device):
            return mock_vibe_0 if device == "cuda:0" else mock_vibe_1

        with patch("core.tts_provider.VibeVoiceProvider", side_effect=lambda device: provider_factory(device)):
            r0 = engine.synthesize_batch_on_device(["Hi"], "VibeVoice-1.5B", "cuda:0")
            r1 = engine.synthesize_batch_on_device(["Hi"], "VibeVoice-1.5B", "cuda:1")

        mock_vibe_0.synthesize_batch.assert_called_once()
        mock_vibe_1.synthesize_batch.assert_called_once()


class TestCatalogAndCapabilities:
    def test_resolve_known_qwen_model(self):
        from core.tts.catalog import resolve_model_capabilities
        caps = resolve_model_capabilities("Qwen3-TTS-12Hz-0.6B-Base")
        assert caps.provider_id == "qwen"
        assert caps.supports_voice_clone is True
        assert caps.requires_reference_audio is True

    def test_resolve_known_vibe_model(self):
        from core.tts.catalog import resolve_model_capabilities
        caps = resolve_model_capabilities("VibeVoice-1.5B")
        assert caps.provider_id == "vibevoice"
        assert caps.max_speakers == 4

    def test_resolve_omnivoice_model(self):
        from core.tts.catalog import resolve_model_capabilities
        caps = resolve_model_capabilities("OmniVoice")
        assert caps.provider_id == "omnivoice"
        assert caps.execution == "local_worker"
        assert caps.requires_reference_transcript is True

    def test_resolve_higgs_model(self):
        from core.tts.catalog import resolve_model_capabilities
        caps = resolve_model_capabilities("higgs-audio-v3-4b")
        assert caps.provider_id == "higgs"
        assert caps.execution == "local_worker"
        assert caps.supports_voice_clone is True
        assert caps.supports_voice_design is False
        assert caps.requires_reference_audio is True
        assert caps.requires_reference_transcript is False
        assert caps.sample_rate == 24000
        assert "en" in caps.supported_languages
        assert "it" in caps.supported_languages

    def test_resolve_higgs_aliases(self):
        from core.tts.catalog import resolve_model_capabilities
        for alias in ["higgs", "higgs-audio-v3", "higgs-4b", "multimodalart/higgs-audio-v3-tts-4b-transformers"]:
            caps = resolve_model_capabilities(alias)
            assert caps.model_id == "higgs-audio-v3-4b"
            assert caps.provider_id == "higgs"

    def test_resolve_unknown_model_raises_model_not_found(self):
        from core.tts.catalog import resolve_model_capabilities
        from core.tts.capabilities import ModelNotFoundError
        with pytest.raises(ModelNotFoundError) as exc_info:
            resolve_model_capabilities("NonExistentTTS-Model")
        assert "Unknown model" in str(exc_info.value)

    def test_resolve_empty_model_raises(self):
        from core.tts.catalog import resolve_model_capabilities
        from core.tts.capabilities import ModelNotFoundError
        with pytest.raises(ModelNotFoundError):
            resolve_model_capabilities("")


class TestProviderRegistry:
    def test_registry_register_and_get(self):
        from core.tts.registry import ProviderRegistry
        reg = ProviderRegistry()
        mock_p = make_mock_provider()
        reg.register_factory("test_provider", lambda dev: mock_p)
        assert reg.has_provider("test_provider") is True
        p = reg.get_provider("test_provider", device="cpu")
        assert p is mock_p

    def test_registry_unknown_provider_raises_provider_not_found(self):
        from core.tts.registry import ProviderRegistry
        from core.tts.capabilities import ProviderNotFoundError
        reg = ProviderRegistry()
        with pytest.raises(ProviderNotFoundError):
            reg.get_provider("unknown_engine")

    def test_registry_clean_vram_calls_unload(self):
        from core.tts.registry import ProviderRegistry
        reg = ProviderRegistry()
        mock_p = make_mock_provider()
        reg.register_factory("test", lambda dev: mock_p)
        _ = reg.get_provider("test", device="cuda:0")
        assert len(reg.active_instances) == 1

        reg.clean_vram()
        mock_p.unload.assert_called_once()
        assert len(reg.active_instances) == 0


class TestNoDefaultFallback:
    def test_synthesize_unknown_model_raises_model_not_found(self):
        from core.tts_provider import MultiModelProvider
        from core.tts.capabilities import ModelNotFoundError
        engine = MultiModelProvider()
        with pytest.raises(ModelNotFoundError):
            engine.synthesize("Hello", "SomeRandomModelThatDoesNotExist")

