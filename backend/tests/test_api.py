import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    """Verify that the health check endpoint returns 200 OK."""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

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
