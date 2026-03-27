"""
Tests for the FastAPI HTTP layer.
TTS engine and heavy models are mocked — no GPU required.
"""
import io
import json
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from pydub import AudioSegment


def make_wav(duration_ms: int = 500) -> bytes:
    buf = io.BytesIO()
    AudioSegment.silent(duration=duration_ms).export(buf, format="wav")
    return buf.getvalue()


@pytest.fixture(scope="module")
def client():
    mock_engine = MagicMock()
    mock_engine.synthesize.return_value = make_wav()
    mock_engine.synthesize_batch.return_value = [make_wav()]
    mock_engine.synthesize_batch_on_device.return_value = [make_wav()]

    with patch("core.tts_provider.tts_engine", mock_engine):
        from main import app
        yield TestClient(app)


# ---------------------------------------------------------------------------
# Health & status
# ---------------------------------------------------------------------------

def test_health_returns_ok(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["ready"] is True


def test_status_returns_ready(client):
    r = client.get("/api/status")
    assert r.status_code == 200
    assert r.json()["status"] == "ready"


# ---------------------------------------------------------------------------
# Active task
# ---------------------------------------------------------------------------

def test_active_task_idle(client):
    r = client.get("/api/tasks/active")
    assert r.status_code == 200
    assert r.json()["active"] is False


# ---------------------------------------------------------------------------
# VRAM info
# ---------------------------------------------------------------------------

def test_vram_info_structure(client):
    r = client.get("/api/system/vram-info")
    assert r.status_code == 200
    data = r.json()
    assert "cuda_available" in data
    assert "models" in data
    assert isinstance(data["models"], list)


# ---------------------------------------------------------------------------
# Multi-GPU
# ---------------------------------------------------------------------------

def test_multi_gpu_structure(client):
    r = client.get("/api/system/multi-gpu")
    assert r.status_code == 200
    data = r.json()
    assert "gpu_count" in data
    assert "devices" in data
    assert "disabled_devices" in data


def test_multi_gpu_set_disabled(client):
    r = client.post(
        "/api/system/multi-gpu",
        json={"disabled_devices": [1]},
    )
    assert r.status_code == 200
    assert r.json()["disabled_devices"] == [1]
    # Reset
    client.post("/api/system/multi-gpu", json={"disabled_devices": []})


# ---------------------------------------------------------------------------
# Jobs
# ---------------------------------------------------------------------------

def test_list_jobs_returns_pagination(client):
    r = client.get("/api/jobs")
    assert r.status_code == 200
    data = r.json()
    assert "jobs" in data
    assert "total" in data


def test_get_nonexistent_job_is_404(client):
    r = client.get("/api/jobs/999999")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Subtitle preview
# ---------------------------------------------------------------------------

def test_preview_subtitles_invalid_format(client):
    r = client.post(
        "/api/preview-subtitles",
        files={"subtitle_file": ("test.txt", b"content", "text/plain")},
    )
    assert r.status_code == 400


def test_preview_subtitles_valid_srt(client):
    srt = b"1\n00:00:01,000 --> 00:00:03,000\nHello world\n"
    r = client.post(
        "/api/preview-subtitles",
        files={"subtitle_file": ("test.srt", srt, "text/plain")},
    )
    assert r.status_code == 200
    data = r.json()
    assert "segments" in data
    assert len(data["segments"]) == 1
    assert data["segments"][0]["text"] == "Hello world"


# ---------------------------------------------------------------------------
# Translation
# ---------------------------------------------------------------------------

def test_translate_segment_missing_text_returns_422(client):
    r = client.post("/api/translate-segment", data={"target_language": "Italian"})
    assert r.status_code == 422


def test_translate_batch(client):
    segments = [{"index": 1, "text": "Hello"}, {"index": 2, "text": "World"}]
    with patch("api.routers.generation.translator") as mock_tr:
        mock_tr.translate_batch.return_value = ["Ciao", "Mondo"]
        r = client.post(
            "/api/translate-batch",
            data={
                "segments_json": json.dumps(segments),
                "target_language": "Italian",
            },
        )
    assert r.status_code == 200
    data = r.json()
    assert len(data["segments"]) == 2
    assert data["segments"][0]["text"] == "Ciao"
    assert data["segments"][0]["is_translated"] is True


# ---------------------------------------------------------------------------
# Maintenance
# ---------------------------------------------------------------------------

def test_maintenance_stats_structure(client):
    r = client.get("/api/maintenance/stats")
    assert r.status_code == 200
    data = r.json()
    assert "db_size_mb" in data
    assert "job_count" in data
    assert "audio_size_mb" in data
