import os
import pytest
from pathlib import Path

from core.config import (
    VOICES_DIR,
    DATA_DIR,
    VOICE_PROMPTS_DIR,
    OMNIVOICE_PROMPTS_DIR,
    setup_offline_environment,
    config_manager,
)
from core.security import (
    validate_contained_path,
    generate_local_session_token,
    validate_voice_transcript,
    PathSecurityError,
)
from core.tts.capabilities import TranscriptRequiredError, VoiceNotFoundError


def test_voice_prompts_directories_created():
    assert VOICE_PROMPTS_DIR.exists()
    assert OMNIVOICE_PROMPTS_DIR.exists()
    assert OMNIVOICE_PROMPTS_DIR.is_relative_to(VOICE_PROMPTS_DIR)


def test_validate_contained_path_success(tmp_path):
    sub = tmp_path / "sub"
    sub.mkdir()
    f = sub / "test.txt"
    f.touch()

    res = validate_contained_path(f, tmp_path)
    assert res == f.resolve()

    res_rel = validate_contained_path(Path("sub") / "test.txt", tmp_path)
    # Relative path from cwd won't necessarily be inside tmp_path unless resolved carefully,
    # but sub / "test.txt" is inside tmp_path:
    res2 = validate_contained_path(tmp_path / "sub" / "test.txt", tmp_path)
    assert res2 == f.resolve()


def test_validate_contained_path_traversal(tmp_path):
    allowed_root = tmp_path / "safe"
    allowed_root.mkdir()
    malicious = allowed_root / ".." / "outside.txt"

    with pytest.raises(PathSecurityError) as exc_info:
        validate_contained_path(malicious, allowed_root)
    assert "Security violation" in str(exc_info.value)


def test_generate_local_session_token():
    token1 = generate_local_session_token()
    token2 = generate_local_session_token()

    assert isinstance(token1, str)
    assert len(token1) == 64
    # All hex characters
    int(token1, 16)
    assert token1 != token2


def test_validate_voice_transcript_success(tmp_path):
    wav = tmp_path / "speaker1.wav"
    wav.write_bytes(b"dummy wav data")
    txt = tmp_path / "speaker1.txt"
    txt.write_text("Hello this is a UK reference.", encoding="utf-8")

    resolved_wav, transcript = validate_voice_transcript("speaker1", voices_dir=tmp_path)
    assert resolved_wav == wav.resolve()
    assert transcript == "Hello this is a UK reference."


def test_validate_voice_transcript_wav_not_found(tmp_path):
    txt = tmp_path / "missing_wav.txt"
    txt.write_text("Hello", encoding="utf-8")

    with pytest.raises(VoiceNotFoundError):
        validate_voice_transcript("missing_wav", voices_dir=tmp_path)


def test_validate_voice_transcript_missing_txt(tmp_path):
    wav = tmp_path / "notxt.wav"
    wav.write_bytes(b"dummy wav")

    with pytest.raises(TranscriptRequiredError) as exc_info:
        validate_voice_transcript("notxt", voices_dir=tmp_path)
    assert "Reference transcript missing" in str(exc_info.value)


def test_validate_voice_transcript_empty_txt(tmp_path):
    wav = tmp_path / "empty.wav"
    wav.write_bytes(b"dummy wav")
    txt = tmp_path / "empty.txt"
    txt.write_text("   \n\t  ", encoding="utf-8")

    with pytest.raises(TranscriptRequiredError) as exc_info:
        validate_voice_transcript("empty", voices_dir=tmp_path)
    assert "is empty" in str(exc_info.value)


def test_validate_voice_transcript_traversal_blocked(tmp_path):
    with pytest.raises(PathSecurityError):
        validate_voice_transcript("../../escape", voices_dir=tmp_path)


def test_setup_offline_environment():
    # Clear environment variables first
    for var in ["HF_HUB_OFFLINE", "TRANSFORMERS_OFFLINE", "HF_DATASETS_OFFLINE"]:
        os.environ.pop(var, None)

    setup_offline_environment(force=True)

    assert os.environ.get("HF_HUB_OFFLINE") == "1"
    assert os.environ.get("TRANSFORMERS_OFFLINE") == "1"
    assert os.environ.get("HF_DATASETS_OFFLINE") == "1"
