"""
Tests for core/gpu_manager.py — device discovery and proportional segment splitting.
Split logic is pure math: no GPU required.
Device discovery tests mock torch to avoid hardware dependency.
"""
import pytest
from unittest.mock import patch, MagicMock
from core.gpu_manager import GPUManager, GPUDevice


def make_device(index: int, free_gb: float, total_gb: float = 16.0) -> GPUDevice:
    return GPUDevice(
        index=index,
        device_str=f"cuda:{index}",
        name=f"Test GPU {index}",
        total_gb=total_gb,
        free_gb=free_gb,
    )


class TestComputeSplit:
    def setup_method(self):
        self.gm = GPUManager()

    def test_single_device_gets_all(self):
        devices = [make_device(0, free_gb=10.0)]
        assert self.gm.compute_split(100, devices) == [100]

    def test_empty_devices_returns_all_on_first(self):
        assert self.gm.compute_split(50, []) == [50]

    def test_equal_vram_splits_evenly(self):
        devices = [make_device(0, free_gb=10.0), make_device(1, free_gb=10.0)]
        splits = self.gm.compute_split(100, devices)
        assert sum(splits) == 100
        assert splits[0] == splits[1] == 50

    def test_proportional_split(self):
        # GPU0: 10 GB, GPU1: 6 GB → ~62.5% / ~37.5%
        devices = [make_device(0, free_gb=10.0), make_device(1, free_gb=6.0)]
        splits = self.gm.compute_split(16, devices)
        assert sum(splits) == 16
        assert splits[0] > splits[1]  # GPU0 gets more

    def test_rounding_preserves_total(self):
        devices = [make_device(0, free_gb=7.0), make_device(1, free_gb=3.0)]
        for n in range(1, 50):
            splits = self.gm.compute_split(n, devices)
            assert sum(splits) == n, f"sum mismatch for n={n}"

    def test_zero_free_vram_device_gets_nothing(self):
        devices = [make_device(0, free_gb=10.0), make_device(1, free_gb=0.0)]
        splits = self.gm.compute_split(10, devices)
        assert sum(splits) == 10
        assert splits[1] == 0

    def test_single_item_goes_to_best_device(self):
        devices = [make_device(0, free_gb=4.0), make_device(1, free_gb=12.0)]
        splits = self.gm.compute_split(1, devices)
        assert sum(splits) == 1
        assert splits[1] == 1  # best device gets the single item

    def test_three_devices(self):
        devices = [
            make_device(0, free_gb=6.0),
            make_device(1, free_gb=6.0),
            make_device(2, free_gb=6.0),
        ]
        splits = self.gm.compute_split(9, devices)
        assert sum(splits) == 9
        assert splits == [3, 3, 3]


class TestGetDevices:
    def test_no_cuda_returns_empty(self):
        gm = GPUManager()
        with patch("core.gpu_manager.torch.cuda.is_available", return_value=False):
            assert gm.get_devices() == []

    def test_single_gpu_detected(self):
        gm = GPUManager()
        mock_props = MagicMock()
        mock_props.name = "RTX 5070 Ti"
        with patch("core.gpu_manager.torch.cuda.is_available", return_value=True), \
             patch("core.gpu_manager.torch.cuda.device_count", return_value=1), \
             patch("core.gpu_manager.torch.cuda.mem_get_info", return_value=(8 * 1024**3, 16 * 1024**3)), \
             patch("core.gpu_manager.torch.cuda.get_device_name", return_value="RTX 5070 Ti"):
            devices = gm.get_devices()
        assert len(devices) == 1
        assert devices[0].device_str == "cuda:0"
        assert devices[0].name == "RTX 5070 Ti"
        assert abs(devices[0].free_gb - 8.0) < 0.1
        assert abs(devices[0].total_gb - 16.0) < 0.1

    def test_two_gpus_detected(self):
        gm = GPUManager()
        vram_map = {
            0: (10 * 1024**3, 12 * 1024**3),
            1: (20 * 1024**3, 24 * 1024**3),
        }
        with patch("core.gpu_manager.torch.cuda.is_available", return_value=True), \
             patch("core.gpu_manager.torch.cuda.device_count", return_value=2), \
             patch("core.gpu_manager.torch.cuda.mem_get_info", side_effect=lambda i: vram_map[i]), \
             patch("core.gpu_manager.torch.cuda.get_device_name", side_effect=lambda i: f"GPU {i}"):
            devices = gm.get_devices()
        assert len(devices) == 2
        assert devices[0].device_str == "cuda:0"
        assert devices[1].device_str == "cuda:1"
        assert devices[1].free_gb > devices[0].free_gb
