"""
Integration tests for OmniVoice, job backwards compatibility, and provider switching.
Heavy model weights and GPU calls are mocked.
"""
import io
import os
import json
import pytest
import sqlite3
from unittest.mock import MagicMock, patch
from pydub import AudioSegment

from core.tts.catalog import resolve_model_capabilities, list_supported_models
from core.tts.capabilities import ModelCapabilities, ModelNotFoundError
from core.tts.registry import ProviderRegistry
from db.database import init_db, create_job, get_job
from db.models import JobCreate


def make_silent_wav(duration_ms: int = 250) -> bytes:
    buf = io.BytesIO()
    AudioSegment.silent(duration=duration_ms).export(buf, format="wav")
    return buf.getvalue()


class TestJobBackwardsCompatibility:
    """Verifies that jobs created with older/legacy model IDs remain valid and resolve correctly."""

    def test_legacy_model_ids_in_database(self, tmp_path):
        legacy_models = [
            "Qwen3-TTS-1.7B",
            "Qwen3-TTS-0.6B",
            "Qwen3-TTS",
            "VibeVoice",
            "VibeVoice-1.5B",
            "VibeVoice-Streaming-0.5B",
            "OmniVoice",
            "omnivoice-0.2",
            "qwen3-0.6b-base",
            "vibevoice-1.5b",
        ]

        for model_id in legacy_models:
            caps = resolve_model_capabilities(model_id)
            assert isinstance(caps, ModelCapabilities)
            assert caps.provider_id in ["qwen", "vibevoice", "omnivoice"]
            assert caps.sample_rate == 24000

    def test_archived_job_persistence_and_resolution(self, tmp_path):
        db_path = str(tmp_path / "test_jobs.db")
        with patch("db.database.DB_PATH", db_path):
            init_db()

            # Create an archived job with legacy model string
            job_data = JobCreate(
                name="Legacy Archive Job",
                original_filename="test.srt",
                model_name="Qwen3-TTS-1.7B",
                voice_id="voice_legacy",
                voice_name="Legacy Voice",
                source_language="ita_Latn",
                target_language="eng_Latn",
                subtitle_segments=[
                    {
                        "index": 1,
                        "start_ms": 1000,
                        "end_ms": 3000,
                        "text": "Buongiorno mondo",
                        "is_translated": False,
                    }
                ],
                modified_segments=[
                    {
                        "index": 1,
                        "start_ms": 1000,
                        "end_ms": 3000,
                        "text": "Buongiorno mondo",
                        "is_translated": False,
                    }
                ],
            )
            created = create_job(job_data)
            assert created.id is not None

            loaded = get_job(created.id)
            assert loaded is not None
            assert loaded.model_name == "Qwen3-TTS-1.7B"

            # Check that capabilities resolve cleanly for this archived job
            caps = resolve_model_capabilities(loaded.model_name)
            assert caps.provider_id == "qwen"
            assert caps.model_id == "qwen3-1.7b-base"


class TestOmniVoiceScriptIntegration:
    """Verifies script generation flow with OmniVoice mock."""

    def test_omnivoice_requires_transcript_validation(self, tmp_path):
        from core.security import validate_voice_transcript, TranscriptRequiredError

        voice_dir = tmp_path / "voices"
        voice_dir.mkdir()
        wav_file = voice_dir / "test_voice.wav"
        wav_file.write_bytes(make_silent_wav())

        # No txt file -> raises TranscriptRequiredError
        with pytest.raises(TranscriptRequiredError):
            validate_voice_transcript("test_voice", voices_dir=voice_dir)

        # Empty txt file -> raises TranscriptRequiredError
        txt_file = voice_dir / "test_voice.txt"
        txt_file.write_text("   ")
        with pytest.raises(TranscriptRequiredError):
            validate_voice_transcript("test_voice", voices_dir=voice_dir)

        # Valid txt file -> returns (resolved_wav, transcript text)
        txt_file.write_text("Hello this is a valid UK voice reference.")
        wav_path, transcript = validate_voice_transcript("test_voice", voices_dir=voice_dir)
        assert transcript == "Hello this is a valid UK voice reference."
        assert wav_path.name == "test_voice.wav"

    def test_omnivoice_script_generation_preserves_order(self):
        from core.tts_provider import MultiModelProvider

        lines = [
            ("Speaker 1", "Good morning, Inspector."),
            ("Speaker 2", "Good morning. What do we have here?"),
            ("Speaker 1", "A suspicious package, sir."),
        ]

        calls = []

        def mock_synthesize(text, model_name=None, reference_audio_path=None, voice_id=None, *args, **kwargs):
            calls.append((voice_id, text))
            return make_silent_wav(duration_ms=400)

        mock_provider = MagicMock()
        mock_provider.synthesize.side_effect = mock_synthesize

        registry = ProviderRegistry()
        registry.register_factory("omnivoice", lambda dev: mock_provider)

        engine = MultiModelProvider(registry=registry)

        # Run sequential lines as Script Mode does
        results = []
        speaker_voice_map = {"Speaker 1": "voice_inspector", "Speaker 2": "voice_officer"}

        for spk, text in lines:
            voice_id = speaker_voice_map[spk]
            audio_bytes = engine.synthesize(text, model_name="omnivoice-0.2", voice_id=voice_id)
            results.append(audio_bytes)

        assert len(results) == 3
        assert len(calls) == 3
        assert calls[0] == ("voice_inspector", "Good morning, Inspector.")
        assert calls[1] == ("voice_officer", "Good morning. What do we have here?")
        assert calls[2] == ("voice_inspector", "A suspicious package, sir.")


class TestProviderSwitchingAndVramCleanup:
    """Verifies that switching between providers unloads resources and cleans VRAM."""

    def test_switch_between_providers(self):
        registry = ProviderRegistry()

        mock_vibe = MagicMock()
        mock_qwen = MagicMock()
        mock_omni = MagicMock()

        registry.register_factory("vibevoice", lambda dev: mock_vibe)
        registry.register_factory("qwen", lambda dev: mock_qwen)
        registry.register_factory("omnivoice", lambda dev: mock_omni)

        # Instantiate Vibe
        p_vibe = registry.get_provider("vibevoice", device="cuda:0")
        assert len(registry.active_instances) == 1
        assert p_vibe is mock_vibe

        # Clean VRAM (as occurs when switching or explicitly cleaning)
        registry.clean_vram()
        mock_vibe.unload.assert_called_once()
        assert len(registry.active_instances) == 0

        # Instantiate OmniVoice
        p_omni = registry.get_provider("omnivoice", device="cuda:0")
        assert len(registry.active_instances) == 1
        assert p_omni is mock_omni

        registry.clean_vram()
        mock_omni.unload.assert_called_once()
        assert len(registry.active_instances) == 0
