from fastapi import APIRouter
import torch
import platform

router = APIRouter(prefix="/api")

@router.get("/health")
def read_health():
    return {"status": "ok"}

@router.get("/system-info")
def get_system_info():
    """
    Returns system information including GPU availability and details.
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
    import psutil
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
