import os
import pytest
from pathlib import Path
from core.tts.prompt_cache import (
    compute_prompt_cache_key,
    get_voice_prompt_path,
    find_valid_cached_prompt,
    invalidate_voice_cache,
    clear_all_omnivoice_prompts,
)


def test_compute_prompt_cache_key_deterministic():
    wav1 = b"sample wav audio bytes"
    tx1 = "This is a reference transcript."
    
    key1 = compute_prompt_cache_key(wav1, tx1)
    key2 = compute_prompt_cache_key(wav1, tx1)
    assert key1 == key2
    assert len(key1) == 64

    # Different audio -> different key
    key_diff_audio = compute_prompt_cache_key(b"different bytes", tx1)
    assert key_diff_audio != key1

    # Different transcript -> different key
    key_diff_tx = compute_prompt_cache_key(wav1, "Different transcript.")
    assert key_diff_tx != key1

    # Different revision -> different key
    key_diff_rev = compute_prompt_cache_key(wav1, tx1, model_revision="rev2")
    assert key_diff_rev != key1


def test_prompt_cache_lifecycle(tmp_path):
    voice_id = "test_speaker"
    key1 = compute_prompt_cache_key(b"wav1", "tx1")
    
    # Initially no cached prompt exists
    assert find_valid_cached_prompt(voice_id, key1, prompts_dir=tmp_path) is None

    # Simulate saving a prompt
    prompt_path = get_voice_prompt_path(voice_id, key1, prompts_dir=tmp_path)
    prompt_path.write_bytes(b"dummy prompt state")

    # Now find_valid_cached_prompt finds it
    found = find_valid_cached_prompt(voice_id, key1, prompts_dir=tmp_path)
    assert found == prompt_path

    # If key changes (e.g. transcript updated), old prompt should be purged
    key2 = compute_prompt_cache_key(b"wav1", "updated tx")
    assert find_valid_cached_prompt(voice_id, key2, prompts_dir=tmp_path) is None
    # Verify the stale prompt was removed
    assert not prompt_path.exists()


def test_invalidate_voice_cache(tmp_path):
    p1 = tmp_path / "alice_1234567890abcdef.pt"
    p1.write_bytes(b"alice prompt")
    p2 = tmp_path / "bob_1234567890abcdef.pt"
    p2.write_bytes(b"bob prompt")

    removed = invalidate_voice_cache("alice", prompts_dir=tmp_path)
    assert removed == 1
    assert not p1.exists()
    assert p2.exists()


def test_clear_all_omnivoice_prompts(tmp_path):
    (tmp_path / "voice1_abc.pt").write_bytes(b"1")
    (tmp_path / "voice2_def.pt").write_bytes(b"2")
    (tmp_path / "unrelated.txt").write_text("keep", encoding="utf-8")

    cleared = clear_all_omnivoice_prompts(prompts_dir=tmp_path)
    assert cleared == 2
    assert not (tmp_path / "voice1_abc.pt").exists()
    assert not (tmp_path / "voice2_def.pt").exists()
    assert (tmp_path / "unrelated.txt").exists()
