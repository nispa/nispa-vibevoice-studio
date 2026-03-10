import sys
import os
import pytest
from fastapi.testclient import TestClient

# Add parent directory to path to find main.py
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import app

client = TestClient(app)

def test_script_limit_05b_model():
    """Verify that a script with 2 speakers fails for 0.5B model."""
    data = {
        "script_text": "Speaker1: Hello\nSpeaker2: Hi",
        "speaker_voice_map": '{"Speaker1": "v1", "Speaker2": "v2"}',
        "model_name": "VibeVoice-Streaming-0.5B"
    }
    response = client.post("/api/tasks/generate", data=data)
    assert response.status_code == 400
    assert "VibeVoice-0.5B model supports only 1 speaker" in response.json()["detail"]

def test_script_limit_15b_model_too_many():
    """Verify that a script with 5 speakers fails for 1.5B model."""
    script = (
        "Speaker1: Line 1\n"
        "Speaker2: Line 2\n"
        "Speaker3: Line 3\n"
        "Speaker4: Line 4\n"
        "Speaker5: Line 5"
    )
    voice_map = '{"Speaker1": "v1", "Speaker2": "v2", "Speaker3": "v3", "Speaker4": "v4", "Speaker5": "v5"}'
    data = {
        "script_text": script,
        "speaker_voice_map": voice_map,
        "model_name": "VibeVoice-1.5B"
    }
    response = client.post("/api/tasks/generate", data=data)
    assert response.status_code == 400
    assert "Maximum 4 speakers allowed" in response.json()["detail"]

def test_script_limit_within_bounds():
    """Verify that a script with 2 speakers works for 1.5B model."""
    data = {
        "script_text": "Speaker1: Hello\nSpeaker2: Hi",
        "speaker_voice_map": '{"Speaker1": "v1", "Speaker2": "v2"}',
        "model_name": "VibeVoice-1.5B"
    }
    # Note: This might still return 400 if voices don't exist in the tts_engine,
    # but the speaker limit check happens before the background task starts.
    # However, since we are testing the validation, let's see the error.
    response = client.post("/api/tasks/generate", data=data)
    
    # If it passes validation, it might fail later because 'v1' is not a real voice
    # but the status should NOT be "Maximum 4 speakers allowed" or "supports only 1 speaker"
    if response.status_code == 400:
        detail = response.json()["detail"]
        assert "Maximum 4 speakers allowed" not in detail
        assert "supports only 1 speaker" not in detail
    else:
        assert response.status_code == 200
