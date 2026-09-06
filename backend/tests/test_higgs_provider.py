import io
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
import soundfile as sf
import numpy as np

from core.tts.higgs_provider import HiggsProvider
from core.tts.capabilities import (
    VoiceNotFoundError,
    ModelNotFoundError,
    TTSError,
    OutOfMemoryError,
    InvalidAudioOutputError,
)
from core.tts_provider import MultiModelProvider


def make_dummy_wav_bytes(duration_s: float = 0.2, sr: int = 24000) -> bytes:
    num_samples = int(duration_s * sr)
    audio_data = np.zeros(num_samples, dtype=np.float32)
    buf = io.BytesIO()
    sf.write(buf, audio_data, sr, format="WAV", subtype="PCM_16")
    return buf.getvalue()


def test_higgs_provider_initialization():
    provider = HiggsProvider(device="cpu")
    assert provider.device == "cpu"
    assert provider.worker_process is None
    assert provider.port is None
    assert provider.token is None


def test_higgs_synthesize_missing_voice_raises():
    provider = HiggsProvider(device="cpu")
    with pytest.raises(VoiceNotFoundError):
        provider.synthesize("Hello world", model_name="higgs-audio-v3-4b")


def test_higgs_synthesize_success_mock(tmp_path):
    provider = HiggsProvider(device="cpu", model_dir=tmp_path)
    tmp_path.mkdir(parents=True, exist_ok=True)

    # Mock client and worker running
    provider.base_url = "http://127.0.0.1:8009"
    provider.token = "fake-token"
    provider.worker_process = MagicMock()
    provider.worker_process.poll.return_value = None

    dummy_wav = make_dummy_wav_bytes()

    mock_client = MagicMock()
    mock_health_res = MagicMock()
    mock_health_res.status_code = 200
    mock_synth_res = MagicMock()
    mock_synth_res.status_code = 200
    mock_synth_res.content = dummy_wav

    mock_client.get.return_value = mock_health_res
    mock_client.post.return_value = mock_synth_res
    provider._client = mock_client

    ref_wav = tmp_path / "reference.wav"
    ref_wav.write_bytes(dummy_wav)

    result = provider.synthesize(
        text="Testing Higgs speech generation",
        model_name="higgs-audio-v3-4b",
        reference_audio_path=str(ref_wav)
    )

    assert result == dummy_wav
    mock_client.post.assert_called_once()
    called_args, called_kwargs = mock_client.post.call_args
    assert "/synthesize" in called_args[0]
    payload = called_kwargs["json"]
    assert payload["text"] == "Testing Higgs speech generation"
    assert payload["ref_text"] is None
    assert payload["ref_audio_path"] == str(ref_wav.resolve())


def test_higgs_synthesize_with_optional_transcript(tmp_path):
    provider = HiggsProvider(device="cpu", model_dir=tmp_path)
    tmp_path.mkdir(parents=True, exist_ok=True)

    provider.base_url = "http://127.0.0.1:8009"
    provider.token = "fake-token"
    provider.worker_process = MagicMock()
    provider.worker_process.poll.return_value = None

    dummy_wav = make_dummy_wav_bytes()

    mock_client = MagicMock()
    mock_health_res = MagicMock()
    mock_health_res.status_code = 200
    mock_synth_res = MagicMock()
    mock_synth_res.status_code = 200
    mock_synth_res.content = dummy_wav

    mock_client.get.return_value = mock_health_res
    mock_client.post.return_value = mock_synth_res
    provider._client = mock_client

    ref_wav = tmp_path / "reference.wav"
    ref_wav.write_bytes(dummy_wav)
    ref_txt = tmp_path / "reference.txt"
    ref_txt.write_text("This is an optional UK transcript for Higgs.", encoding="utf-8")

    result = provider.synthesize(
        text="Hello with transcript",
        model_name="higgs-audio-v3-4b",
        reference_audio_path=str(ref_wav)
    )

    assert result == dummy_wav
    called_args, called_kwargs = mock_client.post.call_args
    payload = called_kwargs["json"]
    assert payload["ref_text"] == "This is an optional UK transcript for Higgs."


def test_higgs_synthesize_batch_sequential(tmp_path):
    provider = HiggsProvider(device="cpu", model_dir=tmp_path)
    dummy_wav = make_dummy_wav_bytes()

    with patch.object(provider, "synthesize", return_value=dummy_wav) as mock_synth:
        results = provider.synthesize_batch(
            texts=["Sentence one", "Sentence two", "Sentence three"],
            model_name="higgs-audio-v3-4b",
            reference_audio_path=str(tmp_path / "ref.wav")
        )
        assert len(results) == 3
        assert mock_synth.call_count == 3
        assert results[0] == dummy_wav


def test_higgs_synthesize_oom_mapped(tmp_path):
    provider = HiggsProvider(device="cpu", model_dir=tmp_path)
    tmp_path.mkdir(parents=True, exist_ok=True)

    provider.base_url = "http://127.0.0.1:8009"
    provider.worker_process = MagicMock()
    provider.worker_process.poll.return_value = None

    mock_client = MagicMock()
    mock_client.get.return_value.status_code = 200
    mock_synth_res = MagicMock()
    mock_synth_res.status_code = 507
    mock_synth_res.text = "CUDA OOM"
    mock_client.post.return_value = mock_synth_res
    provider._client = mock_client

    ref_wav = tmp_path / "ref.wav"
    ref_wav.write_bytes(make_dummy_wav_bytes())

    with pytest.raises(OutOfMemoryError):
        provider.synthesize("OOM test", model_name="higgs-audio-v3-4b", reference_audio_path=str(ref_wav))


def test_higgs_synthesize_invalid_audio_mapped(tmp_path):
    provider = HiggsProvider(device="cpu", model_dir=tmp_path)
    tmp_path.mkdir(parents=True, exist_ok=True)

    provider.base_url = "http://127.0.0.1:8009"
    provider.worker_process = MagicMock()
    provider.worker_process.poll.return_value = None

    mock_client = MagicMock()
    mock_client.get.return_value.status_code = 200
    mock_synth_res = MagicMock()
    mock_synth_res.status_code = 502
    mock_synth_res.text = "Empty or NaN"
    mock_client.post.return_value = mock_synth_res
    provider._client = mock_client

    ref_wav = tmp_path / "ref.wav"
    ref_wav.write_bytes(make_dummy_wav_bytes())

    with pytest.raises(InvalidAudioOutputError):
        provider.synthesize("Invalid audio test", model_name="higgs-audio-v3-4b", reference_audio_path=str(ref_wav))


def test_higgs_multi_model_provider_routing():
    engine = MultiModelProvider()
    mock_higgs = MagicMock()
    mock_higgs.synthesize.return_value = b"RIFF-WAV"

    with patch.object(engine, "_get_higgs", return_value=mock_higgs):
        res = engine.synthesize(
            text="Hello Higgs",
            model_name="higgs-audio-v3-4b",
            reference_audio_path="data/voices/ref.wav"
        )
        assert res == b"RIFF-WAV"
        mock_higgs.synthesize.assert_called_once()


def test_clean_vram_unloads_higgs():
    engine = MultiModelProvider()
    mock_higgs = MagicMock()

    engine._higgs_pool["cpu"] = mock_higgs
    engine.clean_vram()

    mock_higgs.unload.assert_called_once()
    assert len(engine._higgs_pool) == 0
