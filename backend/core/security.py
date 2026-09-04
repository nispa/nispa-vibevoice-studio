import os
import secrets
from pathlib import Path
from typing import Union, Optional, Tuple

from core.config import VOICES_DIR, DATA_DIR
from core.tts.capabilities import TranscriptRequiredError, VoiceNotFoundError


class PathSecurityError(ValueError):
    """Raised when an attempt to access a path outside authorized directories is detected."""
    pass


def validate_contained_path(path: Union[str, Path], allowed_root: Union[str, Path]) -> Path:
    """
    Validates that a given path resolves strictly within the allowed_root directory.
    Prevents directory traversal vulnerabilities (e.g. '../', symlinks targeting external locations).
    
    Args:
        path: Path to validate (can be relative or absolute).
        allowed_root: Root directory that `path` must be contained within.
        
    Returns:
        Path: The resolved, canonical Path object.
        
    Raises:
        PathSecurityError: If the resolved path is outside allowed_root.
    """
    root = Path(allowed_root).resolve()
    p = Path(path)
    if not p.is_absolute():
        resolved_path = (root / p).resolve()
    else:
        resolved_path = p.resolve()

    try:
        if not resolved_path.is_relative_to(root):
            raise PathSecurityError(
                f"Security violation: path '{path}' resolves outside allowed directory '{allowed_root}'."
            )
    except AttributeError:
        try:
            resolved_path.relative_to(root)
        except ValueError:
            raise PathSecurityError(
                f"Security violation: path '{path}' resolves outside allowed directory '{allowed_root}'."
            )

    return resolved_path


def generate_local_session_token() -> str:
    """
    Generates a cryptographically strong random token for internal loopback communication
    between the main backend and isolated local worker processes.
    
    Returns:
        str: 64-character hexadecimal token.
    """
    return secrets.token_hex(32)


def validate_voice_transcript(
    voice_id: str,
    voices_dir: Optional[Union[str, Path]] = None
) -> Tuple[Path, str]:
    """
    Validates that both the voice audio file (.wav) and its corresponding reference transcript (.txt)
    exist in voices_dir, are strictly contained within allowed directories, and that the transcript is non-empty.
    
    This ensures OmniVoice (and any model requiring reference transcripts) operates strictly
    offline and never falls back to implicit Whisper ASR inference or downloads.
    
    Args:
        voice_id: Name or ID of the voice (e.g., 'george', 'alice').
        voices_dir: Directory containing voices. Defaults to VOICES_DIR.
        
    Returns:
        Tuple[Path, str]: (resolved_wav_path, stripped_transcript_text)
        
    Raises:
        VoiceNotFoundError: If audio WAV file does not exist.
        TranscriptRequiredError: If transcript file is missing or empty.
        PathSecurityError: If voice_id contains traversal sequences.
    """
    target_dir = Path(voices_dir).resolve() if voices_dir else VOICES_DIR.resolve()

    # Guard against traversal in voice_id
    wav_candidate = target_dir / f"{voice_id}.wav"
    resolved_wav = validate_contained_path(wav_candidate, target_dir)

    txt_candidate = target_dir / f"{voice_id}.txt"
    resolved_txt = validate_contained_path(txt_candidate, target_dir)

    if not resolved_wav.is_file():
        raise VoiceNotFoundError(
            f"Voice reference audio not found for voice '{voice_id}': {resolved_wav}"
        )

    if not resolved_txt.is_file():
        raise TranscriptRequiredError(
            f"Reference transcript missing for voice '{voice_id}' ({resolved_txt.name}). "
            f"OmniVoice requires a verified local transcript to prevent unauthorized ASR fallback."
        )

    try:
        content = resolved_txt.read_text(encoding="utf-8").strip()
    except Exception as exc:
        raise TranscriptRequiredError(
            f"Failed to read reference transcript for voice '{voice_id}': {exc}"
        ) from exc

    if not content:
        raise TranscriptRequiredError(
            f"Reference transcript for voice '{voice_id}' is empty ({resolved_txt.name}). "
            f"OmniVoice requires a non-empty local transcript to prevent unauthorized ASR fallback."
        )

    return resolved_wav, content
