import atexit
import os
import socket
import subprocess
import sys
import time
from pathlib import Path
from typing import Optional, List

import httpx

from core.config import BASE_DIR, MODELS_DIR, VOICES_DIR
from core.device_utils import get_default_device
from core.security import (
    generate_local_session_token,
    validate_contained_path,
    PathSecurityError,
)
from core.tts.base import TTSProvider
from core.tts.capabilities import (
    VoiceNotFoundError,
    ModelNotFoundError,
    TTSError,
    OutOfMemoryError,
    InvalidAudioOutputError,
)


def _find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _find_higgs_python() -> Path:
    """Finds the python executable inside modern engines venv (venv_omnivoice / venv_spike / venv)."""
    candidates = [
        BASE_DIR.parent / "venv_omnivoice" / "Scripts" / "python.exe",
        BASE_DIR.parent / "venv_spike" / "Scripts" / "python.exe",
        BASE_DIR.parent / "venv" / "Scripts" / "python.exe",
        BASE_DIR.parent / "venv_omnivoice" / "bin" / "python",
        BASE_DIR.parent / "venv_spike" / "bin" / "python",
        BASE_DIR.parent / "venv" / "bin" / "python",
    ]
    for c in candidates:
        if c.is_file():
            return c.resolve()
    return Path(sys.executable).resolve()


class HiggsProvider(TTSProvider):
    """
    Higgs Audio v3 TTS Provider.
    Operates an isolated local worker process communicating strictly over 127.0.0.1
    with token authentication, lazy initialization, voice cloning, and strict offline guarantees.
    """
    def __init__(self, device: Optional[str] = None, model_dir: Optional[Path] = None):
        self.device = device or get_default_device()
        self.model_dir = (model_dir or (MODELS_DIR / "Higgs-Audio-v3")).resolve()
        self.worker_process: Optional[subprocess.Popen] = None
        self.port: Optional[int] = None
        self.token: Optional[str] = None
        self.base_url: Optional[str] = None
        self._client: Optional[httpx.Client] = None
        self._log_file = None

        # Register atexit handler to ensure worker is never orphaned
        atexit.register(self.shutdown)

    def _ensure_worker(self):
        """Starts the dedicated local worker if not running or unhealthy."""
        if self.worker_process is not None and self.worker_process.poll() is None:
            # Check if responsive
            try:
                res = self._client.get(f"{self.base_url}/health", timeout=3.0)
                if res.status_code == 200:
                    return
            except Exception:
                pass
            self.shutdown()

        if not self.model_dir.exists():
            raise ModelNotFoundError(
                f"Higgs Audio v3 weights not found at {self.model_dir}. "
                f"Please run download_model.py to install Higgs Audio v3."
            )

        python_exe = _find_higgs_python()
        worker_script = (BASE_DIR / "workers" / "higgs_worker.py").resolve()

        self.port = _find_free_port()
        self.token = generate_local_session_token()
        self.base_url = f"http://127.0.0.1:{self.port}"
        self._client = httpx.Client(
            headers={"X-Session-Token": self.token},
            timeout=httpx.Timeout(180.0, connect=10.0)
        )

        env = os.environ.copy()
        env["HF_HUB_OFFLINE"] = "1"
        env["TRANSFORMERS_OFFLINE"] = "1"
        env["HF_DATASETS_OFFLINE"] = "1"

        cmd = [
            str(python_exe),
            str(worker_script),
            "--port", str(self.port),
            "--token", self.token,
            "--model-dir", str(self.model_dir),
            "--device", self.device,
        ]

        log_dir = BASE_DIR.parent / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        if self._log_file and not self._log_file.closed:
            try:
                self._log_file.close()
            except Exception:
                pass
        self._log_file = open(log_dir / "higgs_worker.log", "a", encoding="utf-8")

        print(f"[Higgs] Spawning worker on 127.0.0.1:{self.port} (device: {self.device})...")
        self.worker_process = subprocess.Popen(
            cmd,
            env=env,
            stdout=self._log_file,
            stderr=self._log_file,
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
        )

        # Wait for worker health readiness
        start_time = time.time()
        ready = False
        while time.time() - start_time < 30.0:
            if self.worker_process.poll() is not None:
                raise TTSError("Higgs Audio worker failed to start. Check logs/higgs_worker.log for details.")
            try:
                r = self._client.get(f"{self.base_url}/health", timeout=1.0)
                if r.status_code == 200:
                    ready = True
                    break
            except Exception:
                time.sleep(0.5)

        if not ready:
            self.shutdown()
            raise TTSError("Higgs Audio worker timed out waiting for loopback startup.")

        print(f"[Higgs] Worker online and ready at {self.base_url}")

    def synthesize(
        self,
        text: str,
        model_name: str,
        reference_audio_path: Optional[str] = None,
        voice_id: Optional[str] = None,
        voice_description: Optional[str] = None,
        language: Optional[str] = None,
        skip_cleanup: bool = False
    ) -> bytes:
        if not text or not text.strip():
            return b""

        ref_wav_path: Optional[Path] = None
        ref_text: Optional[str] = None

        if voice_id:
            safe_voice = Path(voice_id).name
            wav_candidate = VOICES_DIR / f"{safe_voice}.wav"
            if not wav_candidate.exists():
                wav_candidate = VOICES_DIR / safe_voice
            if not wav_candidate.exists():
                raise VoiceNotFoundError(f"Voice reference file '{voice_id}' not found in {VOICES_DIR}")
            ref_wav_path = wav_candidate
            txt_candidate = wav_candidate.with_suffix(".txt")
            if txt_candidate.is_file():
                content = txt_candidate.read_text(encoding="utf-8").strip()
                if content:
                    ref_text = content
        elif reference_audio_path:
            p = Path(reference_audio_path).resolve()
            if not p.is_file():
                raise VoiceNotFoundError(f"Reference audio path does not exist: {reference_audio_path}")
            ref_wav_path = p
            txt_p = p.with_suffix(".txt")
            if txt_p.is_file():
                content = txt_p.read_text(encoding="utf-8").strip()
                if content:
                    ref_text = content
        else:
            raise VoiceNotFoundError(
                "Higgs Audio requires a reference voice for zero-shot cloning."
            )

        self._ensure_worker()

        synth_req = {
            "text": text.strip(),
            "ref_audio_path": str(ref_wav_path),
            "ref_text": ref_text,
            "language": language,
            "temperature": 0.7,
            "top_p": 0.95,
        }

        try:
            res = self._client.post(f"{self.base_url}/synthesize", json=synth_req)
        except httpx.TimeoutException:
            raise TTSError("Higgs Audio synthesis timed out.")
        except Exception as e:
            raise TTSError(f"Higgs Audio synthesis connection error: {e}")

        if res.status_code == 507:
            raise OutOfMemoryError(f"Higgs Audio GPU OOM: {res.text}")
        elif res.status_code == 502:
            raise InvalidAudioOutputError(f"Higgs Audio invalid audio output: {res.text}")
        elif res.status_code != 200:
            raise TTSError(f"Higgs Audio synthesis failed: {res.text}")

        if not res.content:
            raise InvalidAudioOutputError("Higgs Audio produced empty audio content.")

        return res.content

    def synthesize_batch(
        self,
        texts: List[str],
        model_name: str,
        reference_audio_path: Optional[str] = None,
        voice_id: Optional[str] = None,
        voice_description: Optional[str] = None,
        language: Optional[str] = None
    ) -> List[bytes]:
        """Sequential synthesis fallback preserving voice reference across calls."""
        results = []
        for t in texts:
            wav = self.synthesize(
                text=t,
                model_name=model_name,
                reference_audio_path=reference_audio_path,
                voice_id=voice_id,
                voice_description=voice_description,
                language=language
            )
            results.append(wav)
        return results

    def unload(self):
        """Unloads weights and shuts down the isolated worker process to reclaim GPU memory."""
        self.shutdown()

    def __del__(self):
        try:
            self.shutdown()
        except Exception:
            pass

    def shutdown(self):
        """Terminates the worker process cleanly."""
        if self._client and self.base_url and self.worker_process and self.worker_process.poll() is None:
            try:
                self._client.post(f"{self.base_url}/shutdown", timeout=2.0)
            except Exception:
                pass
        if self.worker_process is not None:
            try:
                self.worker_process.terminate()
                self.worker_process.wait(timeout=2.0)
            except Exception:
                try:
                    self.worker_process.kill()
                except Exception:
                    pass
            self.worker_process = None
        if self._client:
            try:
                self._client.close()
            except Exception:
                pass
            self._client = None
        if self._log_file and not self._log_file.closed:
            try:
                self._log_file.close()
            except Exception:
                pass
            self._log_file = None
