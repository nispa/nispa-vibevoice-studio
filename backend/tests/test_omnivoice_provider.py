import pytest
from unittest.mock import MagicMock, patch
from pathlib import Path

from core.tts.omnivoice_provider import OmniVoiceProvider
from core.tts.capabilities import VoiceNotFoundError, TranscriptRequiredError
from core.tts_provider import MultiModelProvider


def test_omnivoice_provider_initialization():
    provider = OmniVoiceProvider(device="cpu")
    assert provider.device == "cpu"
    assert provider.worker_process is None


def test_omnivoice_synthesize_missing_voice_raises(tmp_path):
    provider = OmniVoiceProvider(device="cpu", model_dir=tmp_path)
    with pytest.raises(VoiceNotFoundError):
        provider.synthesize("test text", "omnivoice-0.2", voice_id=None, reference_audio_path=None)


def test_omnivoice_synthesize_missing_transcript_raises(tmp_path):
    wav = tmp_path / "voice_without_txt.wav"
    wav.write_bytes(b"dummy")
    provider = OmniVoiceProvider(device="cpu", model_dir=tmp_path)

    with pytest.raises(TranscriptRequiredError):
        provider.synthesize("test text", "omnivoice-0.2", reference_audio_path=str(wav))


def test_multimodel_provider_routes_omnivoice():
    mmp = MultiModelProvider()
    caps = mmp.get_capabilities("omnivoice-0.2")
    assert caps.provider_id == "omnivoice"

    provider, caps = mmp._resolve_provider("omnivoice-0.2")
    assert isinstance(provider, OmniVoiceProvider)
    assert caps.provider_id == "omnivoice"


def test_omnivoice_mocked_synthesis(tmp_path):
    wav_file = tmp_path / "speaker.wav"
    wav_file.write_bytes(b"mock wav data")
    txt_file = tmp_path / "speaker.txt"
    txt_file.write_text("Reference transcript for speaker.", encoding="utf-8")

    provider = OmniVoiceProvider(device="cpu", model_dir=tmp_path)
    provider._ensure_worker = MagicMock()
    provider.base_url = "http://127.0.0.1:8008"
    
    mock_client = MagicMock()
    mock_prompt_resp = MagicMock()
    mock_prompt_resp.status_code = 200
    mock_synth_resp = MagicMock()
    mock_synth_resp.status_code = 200
    mock_synth_resp.content = b"RIFF....WAVEfmt...."

    mock_client.post.side_effect = [mock_prompt_resp, mock_synth_resp]
    provider._client = mock_client

    with patch("core.tts.omnivoice_provider.validate_voice_transcript", return_value=(wav_file, "Reference transcript")):
        result = provider.synthesize("Hello world", "omnivoice-0.2", voice_id="speaker")
        assert result == b"RIFF....WAVEfmt...."
        assert mock_client.post.call_count == 2
