import hashlib
import os
from pathlib import Path
from typing import Optional, Union

from core.config import OMNIVOICE_PROMPTS_DIR
from core.security import validate_contained_path


DEFAULT_OMNIVOICE_REVISION = "c5fdb5ccb189668d56333f77ba2629f4cd7535f4"
PROMPT_FORMAT_VERSION = "v1"


def compute_prompt_cache_key(
    wav_bytes: bytes,
    transcript: str,
    model_revision: str = DEFAULT_OMNIVOICE_REVISION,
    format_version: str = PROMPT_FORMAT_VERSION
) -> str:
    """
    Computes a deterministic cryptographic hash (SHA-256) of all inputs that define
    a biometric voice clone prompt. Any alteration to audio, transcript, or model revision
    produces a completely different key, preventing stale or mismatched prompt reuse.
    """
    audio_hash = hashlib.sha256(wav_bytes).hexdigest()
    text_hash = hashlib.sha256(transcript.strip().encode("utf-8")).hexdigest()
    
    meta_combiner = hashlib.sha256()
    meta_combiner.update(audio_hash.encode("ascii"))
    meta_combiner.update(text_hash.encode("ascii"))
    meta_combiner.update(model_revision.strip().encode("ascii"))
    meta_combiner.update(format_version.strip().encode("ascii"))
    return meta_combiner.hexdigest()


def get_voice_prompt_path(
    voice_id: str,
    cache_key: str,
    prompts_dir: Optional[Union[str, Path]] = None
) -> Path:
    """
    Constructs and security-validates the destination file path for a cached prompt.
    """
    target_dir = Path(prompts_dir).resolve() if prompts_dir else OMNIVOICE_PROMPTS_DIR.resolve()
    # Use short key suffix to keep filenames manageable
    filename = f"{voice_id}_{cache_key[:16]}.pt"
    candidate = target_dir / filename
    return validate_contained_path(candidate, target_dir)


def find_valid_cached_prompt(
    voice_id: str,
    expected_key: str,
    prompts_dir: Optional[Union[str, Path]] = None
) -> Optional[Path]:
    """
    Finds a valid cached prompt file for the specified voice.
    Automatically purges any stale/outdated cached prompts for this voice if found.
    """
    target_dir = Path(prompts_dir).resolve() if prompts_dir else OMNIVOICE_PROMPTS_DIR.resolve()
    expected_path = get_voice_prompt_path(voice_id, expected_key, target_dir)
    
    # Check if expected prompt exists and is non-empty
    has_valid = expected_path.is_file() and expected_path.stat().st_size > 0

    # Clean up any stale prompts for this voice
    if target_dir.exists():
        prefix = f"{voice_id}_"
        for item in target_dir.iterdir():
            if item.is_file() and item.name.startswith(prefix) and item.name.endswith(".pt"):
                if item != expected_path:
                    try:
                        item.unlink()
                    except Exception as e:
                        print(f"[PromptCache] Failed to remove stale prompt {item.name}: {e}")

    return expected_path if has_valid else None


def invalidate_voice_cache(
    voice_id: str,
    prompts_dir: Optional[Union[str, Path]] = None
) -> int:
    """
    Purges all cached prompt files for a specific voice.
    Called when a voice reference audio or transcript is updated or deleted.
    """
    target_dir = Path(prompts_dir).resolve() if prompts_dir else OMNIVOICE_PROMPTS_DIR.resolve()
    if not target_dir.exists():
        return 0

    removed = 0
    prefix = f"{voice_id}_"
    for item in target_dir.iterdir():
        if item.is_file() and item.name.startswith(prefix) and item.name.endswith(".pt"):
            try:
                valid_path = validate_contained_path(item, target_dir)
                valid_path.unlink()
                removed += 1
            except Exception as e:
                print(f"[PromptCache] Error removing cached prompt {item.name}: {e}")
    return removed


def clear_all_omnivoice_prompts(prompts_dir: Optional[Union[str, Path]] = None) -> int:
    """
    Purges all cached prompts in the directory.
    Useful for maintenance or when rebuilding the biometric cache.
    """
    target_dir = Path(prompts_dir).resolve() if prompts_dir else OMNIVOICE_PROMPTS_DIR.resolve()
    if not target_dir.exists():
        return 0

    removed = 0
    for item in target_dir.iterdir():
        if item.is_file() and item.name.endswith(".pt"):
            try:
                valid_path = validate_contained_path(item, target_dir)
                valid_path.unlink()
                removed += 1
            except Exception as e:
                print(f"[PromptCache] Error clearing prompt {item.name}: {e}")
    return removed
