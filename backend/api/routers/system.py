from fastapi import APIRouter
import torch
import platform
import psutil
import os
import asyncio
from core.tts_provider import tts_engine
from core.config import MODELS_DIR

router = APIRouter(prefix="/api")

@router.get("/health")
def read_health():
    """
    Checks the health status of the API.

    Returns:
        dict: A simple status message indicating the API is operational.
    """
    return {"status": "ok"}

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
