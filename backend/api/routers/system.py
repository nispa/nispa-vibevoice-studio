from fastapi import APIRouter, Body, HTTPException
import torch
import platform
import psutil
import os
import asyncio
import uvicorn
import subprocess
from core.tts_provider import tts_engine
from core.config import MODELS_DIR, config_manager

router = APIRouter(prefix="/api")

@router.get("/system/settings")
def get_settings():
    """Returns the current system settings."""
    return config_manager.settings

@router.post("/system/settings")
def update_settings(settings: dict):
    """Updates the system settings."""
    return config_manager.save_settings(settings)

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
    return {"status": "ok", "ready": tts_engine.is_ready}

@router.get("/status")
def get_status():
    """
    Returns the readiness status of the backend.
    Used by the frontend to determine when to stop showing the loading spinner.
    """
    if not tts_engine.is_ready:
        return {"status": "loading"}
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

@router.get("/system-info")
def get_system_info():
    """
    Retrieves detailed information about the system's hardware and environment.

    Includes GPU (CUDA/MPS) availability, CPU statistics, memory usage, 
    and OS/Python environment details.

    Returns:
        dict: A comprehensive nested dictionary containing system, torch, GPU, and CPU information.
    """
    gpu_info = {
        "has_cuda": torch.cuda.is_available(),
        "cuda_version": torch.version.cuda if torch.cuda.is_available() else None,
        "gpu_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
        "gpu_devices": [],
    }
    
    # Get details for each GPU
    if torch.cuda.is_available():
        for i in range(torch.cuda.device_count()):
            try:
                device_name = torch.cuda.get_device_name(i)
                device_capability = torch.cuda.get_device_capability(i)
                gpu_info["gpu_devices"].append({
                    "index": i,
                    "name": device_name,
                    "compute_capability": f"{device_capability[0]}.{device_capability[1]}",
                    "memory_allocated": f"{torch.cuda.memory_allocated(i) / 1024**3:.2f} GB",
                    "memory_reserved": f"{torch.cuda.memory_reserved(i) / 1024**3:.2f} GB",
                    "memory_total": f"{torch.cuda.get_device_properties(i).total_memory / 1024**3:.2f} GB",
                })
            except Exception as e:
                gpu_info["gpu_devices"].append({
                    "index": i,
                    "error": str(e)
                })
    
    # MPS (Apple Silicon)
    mps_available = torch.backends.mps.is_available() if hasattr(torch.backends, 'mps') else False
    
    # CPU info
    cpu_info = {
        "physical_cores": psutil.cpu_count(logical=False),
        "logical_cores": psutil.cpu_count(logical=True),
        "cpu_percent": psutil.cpu_percent(interval=1),
        "memory_total_gb": psutil.virtual_memory().total / (1024**3),
        "memory_available_gb": psutil.virtual_memory().available / (1024**3),
    }
    
    return {
        "system": {
            "platform": platform.system(),
            "platform_release": platform.release(),
            "python_version": platform.python_version(),
        },
        "torch": {
            "version": torch.__version__,
            "cuda_available": gpu_info["has_cuda"],
            "cuda_version": gpu_info["cuda_version"],
            "mps_available": mps_available,
        },
        "gpu": gpu_info,
        "cpu": cpu_info,
    }
