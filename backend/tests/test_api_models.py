import os
import pytest
from fastapi.testclient import TestClient
from main import app
from core.config import MODELS_DIR

client = TestClient(app)


def test_list_models_success():
    """Verify GET /api/models returns installed models with data-driven capabilities."""
    response = client.get("/api/models")
    assert response.status_code == 200
    data = response.json()
    assert "models" in data
    models = data["models"]
    assert isinstance(models, list)
    assert len(models) > 0

    for m in models:
        assert "id" in m
        assert "name" in m
        assert "engine" in m
        assert m["engine"] in ["qwen", "vibevoice", "omnivoice", "higgs"]
        assert "supports_voice_design" in m
        assert "requires_reference" in m
        assert "installed" in m
        assert m["installed"] is True
        # Ensure tokenizer is never exposed as a synthesis model
        assert "Tokenizer" not in m["id"]


def test_list_models_includes_omnivoice_when_installed():
    """Verify that OmniVoice appears in the model list when its weights exist on disk."""
    omnivoice_dir = MODELS_DIR / "OmniVoice"
    if omnivoice_dir.exists():
        response = client.get("/api/models")
        assert response.status_code == 200
        models = response.json()["models"]
        omni = next((m for m in models if m["engine"] == "omnivoice"), None)
        assert omni is not None, "OmniVoice should be listed as an installed model"
        assert omni["requires_transcript"] is True
        assert omni["requires_reference"] is True
        assert omni["supports_voice_design"] is False


def test_list_models_include_all_query():
    """Verify GET /api/models?include_all=true lists all catalog models."""
    response = client.get("/api/models?include_all=true")
    assert response.status_code == 200
    data = response.json()
    models = data["models"]
    
    # Should contain all canonical models from catalog
    engines = {m["engine"] for m in models}
    assert "qwen" in engines
    assert "vibevoice" in engines
    assert "omnivoice" in engines
    assert "higgs" in engines

    higgs = next((m for m in models if m["id"] == "higgs-audio-v3-4b"), None)
    assert higgs is not None
    assert higgs["engine"] == "higgs"
    assert higgs["requires_reference"] is True
    assert higgs["requires_transcript"] is False
    assert higgs["supports_emotion_tags"] is True
    
    for m in models:
        assert isinstance(m["installed"], bool)


def test_inline_tags_are_catalog_driven():
    from core.tts.catalog import resolve_model_capabilities
    caps = resolve_model_capabilities("omnivoice-0.2")
    tokens = [tag.token for tag in caps.inline_tags]
    assert len(tokens) == len(set(tokens)) == 13
    assert "[laughter]" in tokens
    assert "[dissatisfaction-hnn]" in tokens
    assert caps.supports_emotion_tags is False
    assert caps.supports_voice_design is False
    response = client.get("/api/models?include_all=true")
    assert response.status_code == 200
    models = {model["id"]: model for model in response.json()["models"]}
    assert models["omnivoice-0.2"]["inline_tags"] == [tag.model_dump() for tag in caps.inline_tags]
    assert models["omnivoice-0.2"]["inline_tag_guidance"] == caps.inline_tag_guidance
    assert models["higgs-audio-v3-4b"]["supports_emotion_tags"] is True
    assert models["qwen3-1.7b-base"]["inline_tags"] == []
    assert models["vibevoice-1.5b"]["inline_tags"] == []
