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
        result = provider.synthesize("[laughter] Hello [sigh] [B EY1 S]", "omnivoice-0.2", voice_id="speaker")
        assert result == b"RIFF....WAVEfmt...."
        assert mock_client.post.call_count == 2
        assert mock_client.post.call_args.kwargs["json"]["text"] == "[laughter] Hello [sigh] [B EY1 S]"


def test_omnivoice_synthesize_oom_error(tmp_path):
    from core.tts.capabilities import OutOfMemoryError

    wav_file = tmp_path / "speaker.wav"
    wav_file.write_bytes(b"mock wav data")

    provider = OmniVoiceProvider(device="cpu", model_dir=tmp_path)
    provider._ensure_worker = MagicMock()
    provider.base_url = "http://127.0.0.1:8008"

    mock_client = MagicMock()
    mock_prompt_resp = MagicMock(status_code=200)
    mock_synth_resp = MagicMock(status_code=507, text="GPU out of memory")
    mock_client.post.side_effect = [mock_prompt_resp, mock_synth_resp]
    provider._client = mock_client

    with patch("core.tts.omnivoice_provider.validate_voice_transcript", return_value=(wav_file, "transcript")):
        with pytest.raises(OutOfMemoryError):
            provider.synthesize("Hello", "omnivoice-0.2", voice_id="speaker")


def test_omnivoice_synthesize_invalid_audio_error(tmp_path):
    from core.tts.capabilities import InvalidAudioOutputError

    wav_file = tmp_path / "speaker.wav"
    wav_file.write_bytes(b"mock wav data")

    provider = OmniVoiceProvider(device="cpu", model_dir=tmp_path)
    provider._ensure_worker = MagicMock()
    provider.base_url = "http://127.0.0.1:8008"

    mock_client = MagicMock()
    mock_prompt_resp = MagicMock(status_code=200)
    mock_synth_resp = MagicMock(status_code=502, text="NaN or empty output")
    mock_client.post.side_effect = [mock_prompt_resp, mock_synth_resp]
    provider._client = mock_client

    with patch("core.tts.omnivoice_provider.validate_voice_transcript", return_value=(wav_file, "transcript")):
        with pytest.raises(InvalidAudioOutputError):
            provider.synthesize("Hello", "omnivoice-0.2", voice_id="speaker")


def test_omnivoice_synthesize_empty_content_error(tmp_path):
    from core.tts.capabilities import InvalidAudioOutputError

    wav_file = tmp_path / "speaker.wav"
    wav_file.write_bytes(b"mock wav data")

    provider = OmniVoiceProvider(device="cpu", model_dir=tmp_path)
    provider._ensure_worker = MagicMock()
    provider.base_url = "http://127.0.0.1:8008"

    mock_client = MagicMock()
    mock_prompt_resp = MagicMock(status_code=200)
    mock_synth_resp = MagicMock(status_code=200, content=b"")
    mock_client.post.side_effect = [mock_prompt_resp, mock_synth_resp]
    provider._client = mock_client

    with patch("core.tts.omnivoice_provider.validate_voice_transcript", return_value=(wav_file, "transcript")):
        with pytest.raises(InvalidAudioOutputError):
            provider.synthesize("Hello", "omnivoice-0.2", voice_id="speaker")


def test_omnivoice_synthesize_timeout_error(tmp_path):
    import httpx
    from core.tts.capabilities import TTSError

    wav_file = tmp_path / "speaker.wav"
    wav_file.write_bytes(b"mock wav data")

    provider = OmniVoiceProvider(device="cpu", model_dir=tmp_path)
    provider._ensure_worker = MagicMock()
    provider.base_url = "http://127.0.0.1:8008"

    mock_client = MagicMock()
    mock_prompt_resp = MagicMock(status_code=200)
    mock_client.post.side_effect = [mock_prompt_resp, httpx.TimeoutException("timeout")]
    provider._client = mock_client

    with patch("core.tts.omnivoice_provider.validate_voice_transcript", return_value=(wav_file, "transcript")):
        with pytest.raises(TTSError, match="timed out"):
            provider.synthesize("Hello", "omnivoice-0.2", voice_id="speaker")


def test_omnivoice_unload_calls_shutdown(tmp_path):
    provider = OmniVoiceProvider(device="cpu", model_dir=tmp_path)
    provider.shutdown = MagicMock()
    provider.unload()
    provider.shutdown.assert_called_once()


def test_omnivoice_worker_path_traversal_blocked(monkeypatch):
    from fastapi.testclient import TestClient
    from workers.omnivoice_worker import app
    import workers.omnivoice_worker as worker_module

    monkeypatch.setattr(worker_module, "_auth_token", "test-token")
    client = TestClient(app)

    # Test /prompt with traversal path
    resp = client.post(
        "/prompt",
        json={
            "voice_id": "test",
            "ref_audio_path": "../../etc/passwd",
            "ref_text": "sample",
            "cache_prompt_path": "../../evil/prompt.pt"
        },
        headers={"X-Session-Token": "test-token"}
    )
    assert resp.status_code == 400
    assert "Security violation" in resp.text

    # Test /synthesize with traversal path
    resp_synth = client.post(
        "/synthesize",
        json={
            "text": "sample text",
            "prompt_path": "../../evil/prompt.pt",
            "language": "en"
        },
        headers={"X-Session-Token": "test-token"}
    )
    assert resp_synth.status_code == 400
    assert "Security violation" in resp_synth.text


def test_omnivoice_worker_language_forwarded(monkeypatch):
    from fastapi.testclient import TestClient
    from workers.omnivoice_worker import app
    import workers.omnivoice_worker as worker_module
    import numpy as np

    monkeypatch.setattr(worker_module, "_auth_token", "test-token")
    client = TestClient(app)

    mock_model = MagicMock()
    dummy_wav = np.zeros(24000, dtype=np.float32)
    mock_model.generate.return_value = [dummy_wav]
    monkeypatch.setattr(worker_module, "_model", mock_model)

    resp = client.post(
        "/synthesize",
        json={
            "text": "[laughter] English [sigh] [B EY1 S]",
            "language": "en",
        },
        headers={"X-Session-Token": "test-token"}
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "audio/wav"
    assert len(resp.content) > 0
    # Verify language="en" was explicitly passed to model.generate
    mock_model.generate.assert_called_once()
    _, kwargs = mock_model.generate.call_args
    assert kwargs.get("language") == "en"
    assert kwargs.get("text") == "[laughter] English [sigh] [B EY1 S]"

