from fastapi import APIRouter, Body, HTTPException
import torch
import platform
import psutil
import os
import asyncio
import uvicorn
import subprocess
import shutil
from pathlib import Path
from core.tts_provider import tts_engine
from core.config import MODELS_DIR, config_manager
from core.gpu_manager import gpu_manager
from core.vram_config import recommended_batch as vram_recommended_batch
from core.audio_storage import AUDIO_RENDERING_ROOT
from db.database import DB_PATH, get_all_jobs

router = APIRouter(prefix="/api")

@router.get("/system/settings")
def get_settings():
    """Returns the current system settings."""
    return config_manager.settings

@router.post("/system/settings")
def update_settings(settings: dict):
    """Updates the system settings."""
    return config_manager.save_settings(settings)

@router.get("/system/vram-info")
def get_vram_info():
    """
    Returns current VRAM status and recommended/configured batch sizes per installed model.
    Used by the Generation settings tab.
    """
    # VRAM snapshot
    vram_free_gb = None
    vram_total_gb = None
    if torch.cuda.is_available():
        try:
            free_bytes, total_bytes = torch.cuda.mem_get_info()
            vram_free_gb = round(free_bytes / (1024 ** 3), 2)
            vram_total_gb = round(total_bytes / (1024 ** 3), 2)
        except Exception:
            pass

    def recommended_batch(model_name: str) -> int:
        if vram_free_gb is None:
            return 1
        return vram_recommended_batch(model_name, vram_free_gb)

    overrides = config_manager.settings.get("tts", {}).get("batch_overrides", {})

    models_info = []
    if MODELS_DIR.exists():
        for entry in os.listdir(MODELS_DIR):
            if os.path.isdir(MODELS_DIR / entry):
                rec = recommended_batch(entry)
                override = overrides.get(entry)
                models_info.append({
                    "id": entry,
                    "recommended_batch": rec,
                    "user_batch": override,
                    "effective_batch": override if override is not None else rec,
                })

    return {
        "vram_free_gb": vram_free_gb,
        "vram_total_gb": vram_total_gb,
        "cuda_available": torch.cuda.is_available(),
        "models": models_info,
    }

@router.post("/system/batch-override")
def set_batch_override(model_id: str = Body(...), batch_size: int | None = Body(...)):
    """Sets or clears a user batch size override for a specific model."""
    settings = config_manager.settings
    settings.setdefault("tts", {}).setdefault("batch_overrides", {})
    if batch_size is None:
        settings["tts"]["batch_overrides"].pop(model_id, None)
    else:
        if batch_size < 1 or batch_size > 32:
            raise HTTPException(status_code=400, detail="batch_size must be between 1 and 32")
        settings["tts"]["batch_overrides"][model_id] = batch_size
    config_manager.save_settings(settings)
    return {"ok": True, "overrides": settings["tts"]["batch_overrides"]}

@router.get("/system/multi-gpu")
def get_multi_gpu():
    """
    Returns all detected CUDA GPUs with current VRAM and the list of
    user-disabled device indices from settings.json.
    """
    devices = gpu_manager.get_devices()
    disabled = config_manager.settings.get("tts", {}).get("multi_gpu", {}).get("disabled_devices", [])
    return {
        "gpu_count": len(devices),
        "devices": [
            {
                "index": d.index,
                "device_str": d.device_str,
                "name": d.name,
                "total_gb": round(d.total_gb, 1),
                "free_gb": round(d.free_gb, 1),
            }
            for d in devices
        ],
        "enabled": True,
        "disabled_devices": disabled,
    }


@router.post("/system/multi-gpu")
def set_multi_gpu(
    enabled: bool = Body(default=True),
    disabled_devices: list[int] = Body(default=[]),
):
    """Saves the list of disabled GPU device indices to settings.json."""
    settings = config_manager.settings
    settings.setdefault("tts", {})["multi_gpu"] = {"disabled_devices": disabled_devices}
    config_manager.save_settings(settings)
    return {"ok": True, "disabled_devices": disabled_devices}


@router.get("/system/check-tools")
def check_tools():
    """Verifies if system tools (SoX, FFmpeg) are accessible."""
    results = {}
    for tool in ["sox", "ffmpeg", "ffprobe"]:
        path = config_manager.get_path(tool)
        try:
            # Try running the tool with --version or similar
            cmd = [path, "--version" if tool != "sox" else "--help"]
            subprocess.check_call(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            results[tool] = {"status": "ok", "path": path}
        except Exception:
            results[tool] = {"status": "error", "path": path}
    return results

@router.post("/system/trim-audio")
async def trim_audio(
    audio_base64: str = Body(...),
    start_sec: float = Body(...),
    end_sec: float = Body(...)
):
    """
    Trims a base64 encoded audio string using FFmpeg.
    Returns the trimmed audio as a base64 string.
    """
    import base64
    import tempfile
    from core.config import get_ffmpeg_path

    # Create temporary files
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as in_file:
        in_file.write(base64.b64decode(audio_base64))
        in_path = in_file.name

    out_path = in_path + "_trimmed.wav"
    
    try:
        duration = end_sec - start_sec
        cmd = [
            get_ffmpeg_path(),
            "-y",
            "-ss", str(start_sec),
            "-i", in_path,
            "-t", str(duration),
            "-c", "copy",
            out_path
        ]
        
        subprocess.check_call(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        with open(out_path, "rb") as f:
            trimmed_bytes = f.read()
            
        return {"audio_base64": base64.b64encode(trimmed_bytes).decode("utf-8")}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Trimming failed: {str(e)}")
    finally:
        # Cleanup
        if os.path.exists(in_path): os.unlink(in_path)
        if os.path.exists(out_path): os.unlink(out_path)

@router.get("/health")
def read_health():
    """
    Checks the health status of the API.

    Returns:
        dict: A simple status message indicating the API is operational.
    """
    return {"status": "ok", "ready": True}

@router.get("/status")
def get_status():
    """
    Returns the readiness status of the backend.
    Used by the frontend to determine when to stop showing the loading spinner.
    """
    return {"status": "ready"}

@router.post("/system/test-qwen")
async def test_qwen_integration():
    """
    Performs a diagnostic test of the Qwen3-TTS engine and model weights.
    """
    results = []
    qwen_models = ["Qwen3-TTS-0.6B-CustomVoice", "Qwen3-TTS-1.7B-VoiceDesign"]
    
    for model_name in qwen_models:
        model_path = MODELS_DIR / model_name
        if not model_path.exists():
            results.append({"model": model_name, "status": "missing", "message": "Weights not found in data/model"})
            continue
            
        try:
            # Perform a very short synthesis test
            test_text = "Test"
            # Use asyncio.to_thread to not block the main loop
            await asyncio.to_thread(
                tts_engine.synthesize, 
                text=test_text, 
                model_name=model_name,
                voice_description="A calm voice" if "VoiceDesign" in model_name else None
            )
            results.append({"model": model_name, "status": "success", "message": "Inference successful"})
        except Exception as e:
            results.append({"model": model_name, "status": "error", "message": str(e)})
            
    return {"results": results}

def _collect_system_info() -> dict:
    """
    Collect CPU/RAM/platform info only — zero CUDA calls.
    Safe to call automatically on startup without risk of GPU driver conflicts.
    """
    has_cuda = torch.cuda.is_available()   # safe: only checks library presence
    mps_available = (
        torch.backends.mps.is_available()
        if hasattr(torch.backends, "mps")
        else False
    )
    vm = psutil.virtual_memory()
    cpu_percent = psutil.cpu_percent(interval=1)

    return {
        "system": {
            "platform": platform.system(),
            "platform_release": platform.release(),
            "python_version": platform.python_version(),
        },
        "torch": {
            "version": torch.__version__,
            "cuda_available": has_cuda,
            "cuda_version": torch.version.cuda if has_cuda else None,
            "mps_available": mps_available,
        },
        "gpu": {
            "has_cuda": has_cuda,
            "cuda_version": torch.version.cuda if has_cuda else None,
            "gpu_count": 0,      # populated only via /system/gpu-details
            "gpu_devices": [],   # populated only via /system/gpu-details
        },
        "cpu": {
            "physical_cores": psutil.cpu_count(logical=False),
            "logical_cores": psutil.cpu_count(logical=True),
            "cpu_percent": cpu_percent,
            "memory_total_gb": vm.total / (1024 ** 3),
            "memory_available_gb": vm.available / (1024 ** 3),
        },
    }


def _collect_gpu_details() -> list:
    """
    Query per-device CUDA info. Called only on explicit user request.
    Runs in a threadpool thread to keep the event loop free.
    """
    devices = []
    if not torch.cuda.is_available():
        return devices
    for i in range(torch.cuda.device_count()):
        try:
            props = torch.cuda.get_device_properties(i)
            cap = torch.cuda.get_device_capability(i)
            devices.append({
                "index": i,
                "name": props.name,
                "compute_capability": f"{cap[0]}.{cap[1]}",
                "memory_allocated": "N/A",
                "memory_reserved": "N/A",
                "memory_total": f"{props.total_memory / 1024**3:.2f} GB",
            })
        except Exception as e:
            devices.append({"index": i, "error": str(e)})
    return devices


@router.get("/system-info")
async def get_system_info():
    """CPU/RAM/platform info — no CUDA device queries, safe for auto-call on startup."""
    return await asyncio.to_thread(_collect_system_info)


@router.get("/system/gpu-details")
async def get_gpu_details():
    """Per-device GPU details. Called only on explicit user request to avoid GPU driver conflicts."""
    devices = await asyncio.to_thread(_collect_gpu_details)
    return {"gpu_devices": devices}


# ---------------------------------------------------------------------------
# Maintenance endpoints
# ---------------------------------------------------------------------------

def _get_dir_size_mb(path: Path) -> float:
    """Returns directory size in MB, or 0.0 if not exists."""
    if not path.exists():
        return 0.0
    total = sum(f.stat().st_size for f in path.rglob("*") if f.is_file())
    return round(total / (1024 * 1024), 2)


@router.get("/maintenance/stats")
async def get_maintenance_stats():
    """
    Returns DB size, job count, and audio rendering folder size.
    """
    import sqlite3

    db_size_mb = round(DB_PATH.stat().st_size / (1024 * 1024), 2) if DB_PATH.exists() else 0.0
    audio_size_mb = await asyncio.to_thread(_get_dir_size_mb, AUDIO_RENDERING_ROOT)

    conn = sqlite3.connect(DB_PATH)
    try:
        job_count = conn.execute("SELECT COUNT(*) FROM subtitle_jobs").fetchone()[0]
    finally:
        conn.close()

    # Count audio folders on disk
    audio_folders = list(AUDIO_RENDERING_ROOT.iterdir()) if AUDIO_RENDERING_ROOT.exists() else []
    audio_folder_count = sum(1 for f in audio_folders if f.is_dir())

    return {
        "db_size_mb": db_size_mb,
        "job_count": job_count,
        "audio_size_mb": audio_size_mb,
        "audio_folder_count": audio_folder_count,
    }


@router.post("/maintenance/vacuum")
async def vacuum_database():
    """
    Runs SQLite VACUUM to reclaim disk space after deletions.
    Returns DB size before and after.
    """
    import sqlite3

    if not DB_PATH.exists():
        raise HTTPException(status_code=404, detail="Database not found")

    size_before_mb = round(DB_PATH.stat().st_size / (1024 * 1024), 2)

    def _vacuum():
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("VACUUM")
            conn.commit()
        finally:
            conn.close()

    await asyncio.to_thread(_vacuum)

    size_after_mb = round(DB_PATH.stat().st_size / (1024 * 1024), 2)
    saved_mb = round(size_before_mb - size_after_mb, 2)

    return {
        "size_before_mb": size_before_mb,
        "size_after_mb": size_after_mb,
        "saved_mb": saved_mb,
    }


def _find_orphan_folders() -> list[dict]:
    """
    Returns audio folders that have no corresponding job in the DB.
    Expected folder naming: {slug}_{job_id}
    """
    if not AUDIO_RENDERING_ROOT.exists():
        return []

    # Collect all existing job IDs
    jobs, _ = get_all_jobs(limit=10000, offset=0)
    existing_ids = {job.id for job in jobs}

    orphans = []
    for folder in AUDIO_RENDERING_ROOT.iterdir():
        if not folder.is_dir():
            continue
        # Extract job_id from last "_<number>" suffix
        name = folder.name
        parts = name.rsplit("_", 1)
        if len(parts) == 2 and parts[1].isdigit():
            job_id = int(parts[1])
            if job_id not in existing_ids:
                size_mb = round(
                    sum(f.stat().st_size for f in folder.rglob("*") if f.is_file()) / (1024 * 1024),
                    2
                )
                orphans.append({"folder": name, "job_id": job_id, "size_mb": size_mb})
        else:
            # Folder doesn't match naming convention — list as unknown orphan
            size_mb = round(
                sum(f.stat().st_size for f in folder.rglob("*") if f.is_file()) / (1024 * 1024),
                2
            )
            orphans.append({"folder": name, "job_id": None, "size_mb": size_mb})

    return orphans


@router.get("/maintenance/orphan-audio")
async def list_orphan_audio():
    """
    Lists audio folders in data/audio-rendering/ that have no corresponding job in the DB.
    """
    orphans = await asyncio.to_thread(_find_orphan_folders)
    total_mb = round(sum(o["size_mb"] for o in orphans), 2)
    return {"orphans": orphans, "total_mb": total_mb}


@router.delete("/maintenance/orphan-audio")
async def delete_orphan_audio():
    """
    Deletes all orphaned audio folders (those without a corresponding job).
    Returns the list of deleted folders and total space freed.
    """
    orphans = await asyncio.to_thread(_find_orphan_folders)

    deleted = []
    errors = []
    for orphan in orphans:
        folder_path = AUDIO_RENDERING_ROOT / orphan["folder"]
        try:
            shutil.rmtree(folder_path)
            deleted.append(orphan)
        except Exception as e:
            errors.append({"folder": orphan["folder"], "error": str(e)})

    total_freed_mb = round(sum(o["size_mb"] for o in deleted), 2)
    return {"deleted": deleted, "errors": errors, "total_freed_mb": total_freed_mb}
