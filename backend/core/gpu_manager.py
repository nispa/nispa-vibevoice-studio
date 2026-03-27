import torch
from dataclasses import dataclass
from typing import List


@dataclass
class GPUDevice:
    index: int
    device_str: str   # "cuda:0", "cuda:1"
    name: str
    total_gb: float
    free_gb: float


class GPUManager:
    """Discovers available CUDA GPUs and computes proportional segment splits."""

    def get_devices(self) -> List[GPUDevice]:
        """Returns all available CUDA GPUs with current free VRAM."""
        if not torch.cuda.is_available():
            return []
        devices = []
        for i in range(torch.cuda.device_count()):
            try:
                free, total = torch.cuda.mem_get_info(i)
                devices.append(GPUDevice(
                    index=i,
                    device_str=f"cuda:{i}",
                    name=torch.cuda.get_device_name(i),
                    total_gb=total / 1024 ** 3,
                    free_gb=free / 1024 ** 3,
                ))
            except Exception as e:
                print(f"[GPU] Warning: could not query GPU {i}: {e}")
        return devices

    def compute_split(self, n_items: int, devices: List[GPUDevice]) -> List[int]:
        """
        Splits n_items across devices proportional to each device's free VRAM.
        Returns a list of item counts (one per device), summing to n_items.
        Devices with 0 free VRAM receive 0 items.
        """
        if not devices:
            return [n_items]
        if len(devices) == 1:
            return [n_items]

        total_free = sum(d.free_gb for d in devices)
        if total_free == 0:
            return [n_items] + [0] * (len(devices) - 1)

        splits = [max(0, int(n_items * d.free_gb / total_free)) for d in devices]
        # Assign remaining items (from rounding) to the device with most free VRAM
        deficit = n_items - sum(splits)
        if deficit != 0:
            best = max(range(len(devices)), key=lambda i: devices[i].free_gb)
            splits[best] += deficit
        return splits

    def log_devices(self, devices: List[GPUDevice]) -> None:
        for d in devices:
            print(f"[GPU] {d.device_str} — {d.name} | free={d.free_gb:.1f}GB / total={d.total_gb:.1f}GB")


gpu_manager = GPUManager()
