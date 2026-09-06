import io
import os
from pathlib import Path
from unittest.mock import MagicMock, patch

import numpy as np
import pytest
import soundfile as sf
import torch
from fastapi import HTTPException
from fastapi.testclient import TestClient

from workers.higgs_worker import (
    app,
    _validate_data_path,
    _data_dir,
    verify_token,
)


@pytest.fixture(autouse=True)
def reset_worker_state():
    import workers.higgs_worker as hw
    hw._auth_token = "test-secret-token"
    hw._model = None
    hw._tokenizer = None
    yield
    hw._auth_token = ""
    hw._model = None
    hw._tokenizer = None


def test_validate_data_path_containment(tmp_path):
    # Valid relative/absolute path within data_dir
    test_file = _data_dir / "test_ref.wav"
    test_file.touch(exist_ok=True)
    try:
        resolved = _validate_data_path(str(test_file), must_exist=True)
        assert resolved == test_file.resolve()
    finally:
        if test_file.exists():
            test_file.unlink()


def test_validate_data_path_traversal_blocked():
    # Outside data directory
    traversal_path = str(_data_dir / ".." / "backend" / "main.py")
    with pytest.raises(HTTPException) as exc_info:
        _validate_data_path(traversal_path)
    assert exc_info.value.status_code == 400
    assert "Security violation" in exc_info.value.detail


def test_validate_data_path_empty_rejected():
    with pytest.raises(HTTPException) as exc_info:
        _validate_data_path("")
    assert exc_info.value.status_code == 400


def test_validate_data_path_missing_file():
    non_existent = str(_data_dir / "non_existent_reference_file_12345.wav")
    with pytest.raises(HTTPException) as exc_info:
        _validate_data_path(non_existent, must_exist=True)
    assert exc_info.value.status_code == 404


def test_auth_token_enforcement():
    client = TestClient(app)

    # Missing token -> 403
    res = client.get("/health")
    assert res.status_code == 403

    # Invalid token -> 403
    res = client.get("/health", headers={"X-Session-Token": "wrong-token"})
    assert res.status_code == 403

    # Correct token -> 200
    res = client.get("/health", headers={"X-Session-Token": "test-secret-token"})
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_load_and_unload_endpoints():
    client = TestClient(app)
    headers = {"X-Session-Token": "test-secret-token"}

    mock_model = MagicMock()
    mock_tokenizer = MagicMock()

    with patch("workers.higgs_worker._get_model", return_value=(mock_model, mock_tokenizer)):
        res = client.post("/load", headers=headers)
        assert res.status_code == 200
        assert res.json()["status"] == "loaded"

    import workers.higgs_worker as hw
    hw._model = mock_model
    hw._tokenizer = mock_tokenizer

    res = client.post("/unload", headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "unloaded"
    assert hw._model is None
    assert hw._tokenizer is None


def test_synthesize_success_and_wav_format():
    client = TestClient(app)
    headers = {"X-Session-Token": "test-secret-token"}

    # Mock audio generation: 24kHz sine wave of 0.5s
    sample_rate = 24000
    num_samples = 12000
    audio_np = np.sin(2 * np.pi * 440 * np.linspace(0, 0.5, num_samples)).astype(np.float32)

    mock_model = MagicMock()
    mock_model.config.sample_rate = sample_rate
    mock_model.generate_speech.return_value = torch.from_numpy(audio_np)

    mock_tokenizer = MagicMock()

    with patch("workers.higgs_worker._get_model", return_value=(mock_model, mock_tokenizer)):
        res = client.post(
            "/synthesize",
            headers=headers,
            json={
                "text": "Hello, this is a test of Higgs Audio synthesis!",
                "temperature": 0.7,
                "top_p": 0.95
            }
        )
        assert res.status_code == 200
        assert res.headers["content-type"] == "audio/wav"

        # Verify WAV bytes
        buf = io.BytesIO(res.content)
        data, sr = sf.read(buf)
        assert sr == 24000
        assert len(data) == num_samples
        assert not np.isnan(data).any()


def test_synthesize_oom_mapped_to_507():
    client = TestClient(app)
    headers = {"X-Session-Token": "test-secret-token"}

    mock_model = MagicMock()
    mock_model.generate_speech.side_effect = torch.cuda.OutOfMemoryError("CUDA out of memory")
    mock_tokenizer = MagicMock()

    with patch("workers.higgs_worker._get_model", return_value=(mock_model, mock_tokenizer)):
        res = client.post(
            "/synthesize",
            headers=headers,
            json={"text": "Large payload causing OOM"}
        )
        assert res.status_code == 507
        assert "out of memory" in res.json()["detail"].lower()


def test_synthesize_nan_mapped_to_502():
    client = TestClient(app)
    headers = {"X-Session-Token": "test-secret-token"}

    mock_model = MagicMock()
    mock_model.config.sample_rate = 24000
    mock_model.generate_speech.return_value = np.array([np.nan, 0.5, 0.2], dtype=np.float32)
    mock_tokenizer = MagicMock()

    with patch("workers.higgs_worker._get_model", return_value=(mock_model, mock_tokenizer)):
        res = client.post(
            "/synthesize",
            headers=headers,
            json={"text": "Test NaN"}
        )
        assert res.status_code == 502
        assert "NaN or Inf" in res.json()["detail"]


def test_synthesize_empty_mapped_to_502():
    client = TestClient(app)
    headers = {"X-Session-Token": "test-secret-token"}

    mock_model = MagicMock()
    mock_model.config.sample_rate = 24000
    mock_model.generate_speech.return_value = np.array([], dtype=np.float32)
    mock_tokenizer = MagicMock()

    with patch("workers.higgs_worker._get_model", return_value=(mock_model, mock_tokenizer)):
        res = client.post(
            "/synthesize",
            headers=headers,
            json={"text": "Test empty"}
        )
        assert res.status_code == 502
        assert "empty audio" in res.json()["detail"].lower()


def test_download_model_higgs_spec():
    from scripts.download_model import MODELS, verify_installation
    assert "12" in MODELS
    spec = MODELS["12"]
    assert spec["name"] == "Higgs-Audio-v3"
    assert spec["repo"] == "multimodalart/higgs-audio-v3-tts-4b-transformers"
    assert "30f01593ee6a12efa586c92455afe4b76e45095d" in spec["revision"]
    assert "config.json" in spec["essential_files"]
    assert "model.safetensors" in spec["essential_files"]
    assert "tokenizer.json" in spec["essential_files"]
