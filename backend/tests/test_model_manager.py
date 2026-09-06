import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app
from core.tts.catalog import resolve_model_capabilities
from core.model_manager import delete_model_weights, download_manager

client = TestClient(app)


def test_list_models_for_management():
    response = client.get("/api/models/manage")
    assert response.status_code == 200
    data = response.json()
    assert "models" in data
    assert len(data["models"]) > 0

    # Verify expected fields
    m0 = data["models"][0]
    for key in ("id", "name", "engine", "folder_name", "installed", "disk_size_gb", "vram_cost_gb"):
        assert key in m0


def test_system_health_endpoint():
    response = client.get("/api/system/health")
    assert response.status_code == 200
    data = response.json()
    assert "gpu" in data
    assert "tools" in data
    assert "ffmpeg" in data["tools"]
    assert "sox" in data["tools"]
    assert "worker_env" in data["tools"] or "worker_env" in data
    assert "storage" in data


def test_start_download_unknown_model():
    response = client.post("/api/models/non-existent-model-xyz/download")
    assert response.status_code == 404


def test_delete_model_path_safety():
    # Attempting to delete an uninstalled model should return 400
    response = client.delete("/api/models/non-existent-model-xyz")
    assert response.status_code == 404


def test_cancel_when_no_active_download():
    response = client.post("/api/models/download/cancel")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "noop"
