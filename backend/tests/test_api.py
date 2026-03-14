import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

from unittest.mock import patch

def test_health_check():
    """Verify that the health check endpoint returns 200 OK and readiness status."""
    with patch('api.routers.system.tts_engine') as mock_engine:
        mock_engine.is_ready = True
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok", "ready": True}

def test_get_status_loading():
    """Verify status endpoint returns loading when engine is not ready."""
    with patch('api.routers.system.tts_engine') as mock_engine:
        mock_engine.is_ready = False
        response = client.get("/api/status")
        assert response.status_code == 200
        assert response.json() == {"status": "loading"}

def test_get_status_ready():
    """Verify status endpoint returns ready when engine is ready."""
    with patch('api.routers.system.tts_engine') as mock_engine:
        mock_engine.is_ready = True
        response = client.get("/api/status")
        assert response.status_code == 200
        assert response.json() == {"status": "ready"}

def test_preview_subtitles_invalid_format():
    """Verify that uploading an invalid file format returns 400."""
    files = {'subtitle_file': ('test.txt', b'some text', 'text/plain')}
    response = client.post("/api/preview-subtitles", files=files)
    assert response.status_code == 400
    assert "Invalid subtitle format" in response.json()["detail"]

def test_translate_segment_missing_data():
    """Verify that missing required form data returns 422."""
    # missing 'text' field
    data = {'target_language': 'Italian'}
    response = client.post("/api/translate-segment", data=data)
    assert response.status_code == 422

def test_list_jobs():
    """Verify that listing jobs returns a 200 response."""
    response = client.get("/api/jobs")
    assert response.status_code == 200
    data = response.json()
    assert "jobs" in data
    assert "total" in data

def test_get_nonexistent_job():
    """Verify that requesting a nonexistent job returns 404."""
    response = client.get("/api/jobs/999999")
    assert response.status_code == 404

def test_get_translator_models():
    """Verify legacy endpoint returns internal translator name."""
    response = client.get("/api/ollama/models")
    assert response.status_code == 200
    assert "NLLB-200-Internal" in response.json()["models"][0]

def test_translate_batch():
    """Verify batch translation endpoint structure."""
    import json
    from unittest.mock import patch
    segments = [
        {"index": 1, "text": "Hello"},
        {"index": 2, "text": "World"}
    ]
    # We mock the actual translator to avoid loading the model during API tests
    with patch('api.routers.generation.translator.translate_batch') as mock_batch:
        mock_batch.return_value = ["Ciao", "Mondo"]
        
        response = client.post("/api/translate-batch", data={
            "segments_json": json.dumps(segments),
            "target_language": "Italian"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["segments"]) == 2
        assert data["segments"][0]["text"] == "Ciao"
        assert data["segments"][0]["is_translated"] is True
