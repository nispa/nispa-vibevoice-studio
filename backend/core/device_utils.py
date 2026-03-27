"""
Utility for selecting the best available compute device.
Single source of truth used across TTS providers and the backend.

Priority: CUDA (multi-GPU: best free VRAM) > MPS (Apple Silicon) > CPU
"""
import torch


def get_default_device() -> str:
    """Returns the best available device string: 'cuda:N', 'mps', or 'cpu'."""
    if torch.cuda.is_available():
        if torch.cuda.device_count() <= 1:
            return "cuda:0"
        best_id, max_free = 0, 0
        for i in range(torch.cuda.device_count()):
            try:
                free, _ = torch.cuda.mem_get_info(i)
                if free > max_free:
                    max_free, best_id = free, i
            except Exception:
                continue
        return f"cuda:{best_id}"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"
