"""
Shared pytest fixtures for the backend test suite.
"""
import io
import sys
import os
import pytest
from pydub import AudioSegment

# Ensure backend/ is on sys.path so all core imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def make_silent_wav(duration_ms: int = 500) -> bytes:
    """Returns WAV bytes for a silent audio clip of the given duration."""
    buf = io.BytesIO()
    AudioSegment.silent(duration=duration_ms).export(buf, format="wav")
    return buf.getvalue()


@pytest.fixture
def silent_wav():
    """Factory fixture: call with duration_ms to get silent WAV bytes."""
    return make_silent_wav


@pytest.fixture
def app_client():
    """FastAPI TestClient with TTS engine and heavy models mocked out."""
    from unittest.mock import MagicMock, patch
    from fastapi.testclient import TestClient

    mock_engine = MagicMock()
    mock_engine.synthesize.return_value = make_silent_wav(500)
    mock_engine.synthesize_batch.return_value = [make_silent_wav(500)]

    with patch("core.tts_provider.tts_engine", mock_engine):
        from main import app
        yield TestClient(app)
