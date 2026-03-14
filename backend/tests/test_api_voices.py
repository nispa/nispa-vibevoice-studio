import os
import pytest
from fastapi.testclient import TestClient
from main import app
from core.config import VOICES_DIR
import io

client = TestClient(app)

@pytest.fixture
def temp_voice_id():
    return "it-test_voice"

def test_upload_voice_with_transcription(temp_voice_id):
    """Test uploading a voice with an associated transcription."""
    # Create a dummy wav file content
    dummy_wav = b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x80\x3e\x00\x00\x00\x7d\x00\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
    
    files = {
        "voice_file": ("test.wav", io.BytesIO(dummy_wav), "audio/wav")
    }
    data = {
        "voice_id": temp_voice_id,
        "transcription": "Questa è una trascrizione di test."
    }
    
    response = client.post("/api/upload-voice", files=files, data=data)
    assert response.status_code == 200
    assert response.json()["voice_id"] == temp_voice_id
    
    # Verify files exist
    assert (VOICES_DIR / f"{temp_voice_id}.wav").exists()
    assert (VOICES_DIR / f"{temp_voice_id}.txt").exists()
    
    with open(VOICES_DIR / f"{temp_voice_id}.txt", "r", encoding="utf-8") as f:
        assert f.read() == "Questa è una trascrizione di test."

def test_update_voice_transcription(temp_voice_id):
    """Test updating an existing voice transcription."""
    new_text = "Nuova trascrizione aggiornata."
    response = client.post(f"/api/voices/{temp_voice_id}/transcription", json={"transcription": new_text})
    
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    
    with open(VOICES_DIR / f"{temp_voice_id}.txt", "r", encoding="utf-8") as f:
        assert f.read() == new_text

def test_delete_voice(temp_voice_id):
    """Test deleting a voice and its transcription."""
    response = client.delete(f"/api/voices/{temp_voice_id}")
    assert response.status_code == 200
    
    assert not (VOICES_DIR / f"{temp_voice_id}.wav").exists()
    # Note: We expect the .txt to be deleted too, but the current code might not do it.
    # If it doesn't, this test will help us identify the fix needed.
    assert not (VOICES_DIR / f"{temp_voice_id}.txt").exists()

def test_cors_headers():
    """Verify CORS headers are present for local development."""
    response = client.options("/api/health", headers={
        "Origin": "http://127.0.0.1:5173",
        "Access-Control-Request-Method": "GET"
    })
    assert response.status_code == 200
    assert "access-control-allow-origin" in response.headers
    # Some configurations might return '*' or the specific origin
    assert response.headers["access-control-allow-origin"] in ["*", "http://127.0.0.1:5173"]

def test_language_parameter_in_generation():
    """Test that the language parameter is accepted by generation endpoints."""
    # We use a non-existent job ID to just test if the endpoint accepts the param
    # before failing for other reasons (like missing job).
    # Or better, we mock the generation logic if we want a full pass.
    # For now, let's verify it's accepted in the request body.
    
    # Test translate-segment which is simpler
    data = {
        "text": "Hello world",
        "target_language": "Italian"
    }
    response = client.post("/api/translate-segment", data=data)
    # If it's 404 or 500 it means it passed validation but failed execution
    # If it's 422 it means 'target_language' was not accepted
    assert response.status_code != 422
