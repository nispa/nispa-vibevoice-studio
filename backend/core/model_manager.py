import os
import sys
import time
import shutil
import asyncio
import threading
from pathlib import Path
from typing import Optional, Dict, Any, Generator
from tqdm.auto import tqdm
from huggingface_hub import snapshot_download

from core.tts.catalog import (
    resolve_model_capabilities,
    list_supported_models,
    is_model_installed,
    get_model_target_dir,
    get_installed_model_size_bytes,
    ModelCapabilities,
    ModelNotFoundError
)
from core.config import MODELS_DIR, TRANSLATION_MODELS_DIR


class DownloadCancelledError(Exception):
    """Raised when an in-progress download is cancelled by the user."""
    pass


class ModelDownloadManager:
    """
    Thread-safe model download orchestrator.
    Manages background downloading from HuggingFace Hub with real-time SSE progress,
    cancellation, post-download verification, and atomic manifest generation.
    """
    def __init__(self):
        self._lock = threading.RLock()
        self._cancel_requested = False
        self._active_download: Optional[Dict[str, Any]] = None
        self._subscribers: list[asyncio.Queue] = []
        self._main_loop: Optional[asyncio.AbstractEventLoop] = None

    @property
    def is_downloading(self) -> bool:
        with self._lock:
            return self._active_download is not None and self._active_download.get("status") in ("downloading", "verifying")

    @property
    def active_state(self) -> Optional[Dict[str, Any]]:
        with self._lock:
            if self._active_download:
                return dict(self._active_download)
            return None

    def _update_state(self, **kwargs):
        with self._lock:
            if self._active_download is None:
                self._active_download = {}
            self._active_download.update(kwargs)
            state_copy = dict(self._active_download)

        # Dispatch to async event queues if loop is available
        if self._main_loop and self._subscribers:
            for q in list(self._subscribers):
                try:
                    self._main_loop.call_soon_threadsafe(q.put_nowait, state_copy)
                except Exception:
                    pass

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        self._subscribers.append(q)
        # Send current state immediately if active
        state = self.active_state
        if state:
            q.put_nowait(state)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        if q in self._subscribers:
            self._subscribers.remove(q)

    def cancel_current_download(self) -> bool:
        with self._lock:
            if not self.is_downloading:
                return False
            self._cancel_requested = True
            self._update_state(status="cancelling", message="Cancelling download...")
            return True

    def _make_tqdm_class(self, model_id: str):
        manager = self

        class ModelProgressTqdm(tqdm):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, **kwargs)
                self._file_name = kwargs.get("desc", "file")
                self._start_time = time.time()
                self._downloaded = 0
                self._total = self.total or 0

            def update(self, n=1):
                super().update(n)
                if manager._cancel_requested:
                    raise DownloadCancelledError("Download cancelled by user")
                self._downloaded += n
                elapsed = max(0.001, time.time() - self._start_time)
                speed_mb = (self._downloaded / (1024 * 1024)) / elapsed
                percent = round((self._downloaded / self._total) * 100, 1) if self._total > 0 else 0.0

                manager._update_state(
                    model_id=model_id,
                    status="downloading",
                    progress_percent=percent,
                    downloaded_bytes=self._downloaded,
                    total_bytes=self._total,
                    speed_mb_s=round(speed_mb, 2),
                    current_file=os.path.basename(self._file_name or ""),
                    message=f"Downloading {os.path.basename(self._file_name or '')} ({percent}%)"
                )

        return ModelProgressTqdm

    def run_download_sync(self, caps: ModelCapabilities, loop: asyncio.AbstractEventLoop):
        self._main_loop = loop
        self._cancel_requested = False
        model_id = caps.model_id
        target_dir = get_model_target_dir(caps)
        target_dir.mkdir(parents=True, exist_ok=True)

        self._update_state(
            model_id=model_id,
            status="downloading",
            progress_percent=0.0,
            downloaded_bytes=0,
            total_bytes=int(caps.disk_size_gb * 1024 * 1024 * 1024),
            speed_mb_s=0.0,
            current_file="Initializing",
            message=f"Starting download of {caps.display_name}..."
        )

        try:
            # 1. Prerequisite check (e.g. Qwen Tokenizer or Higgs Codec)
            if caps.provider_id == "qwen" and caps.model_id != "qwen3-tokenizer-12hz":
                tok_caps = resolve_model_capabilities("qwen3-tokenizer-12hz")
                if not is_model_installed(tok_caps):
                    self._update_state(
                        current_file="Tokenizer",
                        message="Downloading required Qwen3 Tokenizer prerequisite..."
                    )
                    tok_target = get_model_target_dir(tok_caps)
                    tok_target.mkdir(parents=True, exist_ok=True)
                    snapshot_download(
                        repo_id=tok_caps.upstream_repo,
                        local_dir=str(tok_target),
                        local_dir_use_symlinks=False,
                        tqdm_class=self._make_tqdm_class("qwen3-tokenizer-12hz")
                    )

            if caps.provider_id == "higgs" and caps.model_id != "higgs-audio-v2-tokenizer":
                tok_caps = resolve_model_capabilities("higgs-audio-v2-tokenizer")
                if not is_model_installed(tok_caps):
                    self._update_state(
                        current_file="Higgs Codec",
                        message="Downloading required Higgs Audio Codec prerequisite..."
                    )
                    tok_target = get_model_target_dir(tok_caps)
                    tok_target.mkdir(parents=True, exist_ok=True)
                    snapshot_download(
                        repo_id=tok_caps.upstream_repo,
                        local_dir=str(tok_target),
                        local_dir_use_symlinks=False,
                        tqdm_class=self._make_tqdm_class("higgs-audio-v2-tokenizer")
                    )

            # 2. Main Model Download
            tqdm_cls = self._make_tqdm_class(model_id)
            download_kwargs = {
                "repo_id": caps.upstream_repo,
                "local_dir": str(target_dir),
                "local_dir_use_symlinks": False,
                "tqdm_class": tqdm_cls,
            }
            if caps.pinned_revision:
                download_kwargs["revision"] = caps.pinned_revision

            snapshot_download(**download_kwargs)

            # 3. Verification
            self._update_state(status="verifying", progress_percent=99.0, message="Verifying installation files...")
            if not is_model_installed(caps):
                raise RuntimeError("Essential model files are missing or incomplete after download.")

            # 4. Manifest recording
            from scripts.download_model import write_manifest
            write_manifest(str(target_dir), caps)

            self._update_state(
                status="completed",
                progress_percent=100.0,
                message=f"{caps.display_name} successfully installed!"
            )

        except DownloadCancelledError:
            self._update_state(
                status="cancelled",
                message="Download was cancelled."
            )
        except Exception as e:
            self._update_state(
                status="error",
                message=f"Download failed: {str(e)}"
            )
        finally:
            self._cancel_requested = False


def delete_model_weights(caps: ModelCapabilities) -> bool:
    """
    Safely deletes an installed model's directory from disk.
    Enforces strict path containment under data/model or data/model-translation.
    """
    target_dir = get_model_target_dir(caps).resolve()
    models_base = MODELS_DIR.resolve()
    translation_base = TRANSLATION_MODELS_DIR.resolve()

    # Path safety check
    is_safe = (models_base in target_dir.parents) or (translation_base in target_dir.parents)
    if not is_safe or target_dir in (models_base, translation_base):
        raise ValueError(f"Unsafe deletion path: {target_dir}")

    if target_dir.exists():
        shutil.rmtree(target_dir)
        return True
    return False


def get_system_health() -> Dict[str, Any]:
    """
    Diagnostics endpoint reporting hardware, acceleration, critical tools,
    and isolated worker health.
    """
    import torch
    from core.config import config_manager
    from pydub.utils import which

    # 1. GPU & CUDA
    has_cuda = torch.cuda.is_available()
    gpu_info: Dict[str, Any] = {
        "available": has_cuda,
        "device_name": torch.cuda.get_device_name(0) if has_cuda else "None",
        "cuda_version": torch.version.cuda if has_cuda else None,
        "vram_total_gb": 0.0,
        "vram_free_gb": 0.0,
        "vram_allocated_gb": 0.0,
    }
    if has_cuda:
        free_bytes, total_bytes = torch.cuda.mem_get_info()
        gpu_info["vram_total_gb"] = round(total_bytes / (1024 ** 3), 2)
        gpu_info["vram_free_gb"] = round(free_bytes / (1024 ** 3), 2)
        gpu_info["vram_allocated_gb"] = round(torch.cuda.memory_allocated() / (1024 ** 3), 2)

    # 2. Critical Tools
    ffmpeg_path = which("ffmpeg") or config_manager.get_path("ffmpeg")
    sox_path = config_manager.get_path("sox") if config_manager else None
    if not sox_path or not os.path.exists(sox_path):
        sox_path = which("sox")

    # 3. Modern Engines Worker Environment
    root_dir = Path(__file__).resolve().parent.parent.parent
    worker_py = root_dir / "venv_omnivoice" / "Scripts" / "python.exe"
    if not worker_py.exists():
        worker_py = root_dir / "venv_omnivoice" / "bin" / "python"
    worker_ready = worker_py.exists()

    # 4. Storage Info
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    total_disk, used_disk, free_disk = shutil.disk_usage(str(MODELS_DIR))

    return {
        "gpu": gpu_info,
        "tools": {
            "ffmpeg": {
                "available": bool(ffmpeg_path),
                "path": str(ffmpeg_path) if ffmpeg_path else None
            },
            "sox": {
                "available": bool(sox_path and os.path.exists(str(sox_path))),
                "path": str(sox_path) if sox_path else None
            }
        },
        "worker_env": {
            "name": "Modern Engines (OmniVoice + Higgs)",
            "available": worker_ready,
            "path": str(worker_py) if worker_ready else None
        },
        "storage": {
            "total_gb": round(total_disk / (1024 ** 3), 2),
            "free_gb": round(free_disk / (1024 ** 3), 2),
            "used_gb": round(used_disk / (1024 ** 3), 2)
        }
    }


# Singleton instance
download_manager = ModelDownloadManager()
