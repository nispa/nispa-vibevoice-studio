import atexit
import os
import socket
import subprocess
import sys
import time
from pathlib import Path
from typing import Optional, List

import httpx

from core.config import BASE_DIR, MODELS_DIR, VOICES_DIR, setup_offline_environment
from core.device_utils import get_default_device
from core.security import (
    generate_local_session_token,
    validate_voice_transcript,
    validate_contained_path,
    PathSecurityError,
)
from core.tts.base import TTSProvider
from core.tts.capabilities import (
    TranscriptRequiredError,
    VoiceNotFoundError,
    ModelNotFoundError,
    TTSError,
    OutOfMemoryError,
    InvalidAudioOutputError,
)
from core.tts.prompt_cache import (
    compute_prompt_cache_key,
    get_voice_prompt_path,
    find_valid_cached_prompt,
)


def _find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _find_omnivoice_python() -> Path:
    """Finds the python executable inside venv_omnivoice or venv_spike."""
    candidates = [
        BASE_DIR.parent / "venv_omnivoice" / "Scripts" / "python.exe",
        BASE_DIR.parent / "venv_spike" / "Scripts" / "python.exe",
        BASE_DIR.parent / "venv_omnivoice" / "bin" / "python",
        BASE_DIR.parent / "venv_spike" / "bin" / "python",
    ]
    for c in candidates:
        if c.is_file():
            return c.resolve()
    # Fallback to current python if neither exists
    return Path(sys.executable).resolve()


class OmniVoiceProvider(TTSProvider):
    """
    OmniVoice TTS Provider.
    Operates an isolated local worker process communicating strictly over 127.0.0.1
    with token authentication, lazy initialization, biometric prompt caching, and
    strict offline guarantees.
    """
    def __init__(self, device: Optional[str] = None, model_dir: Optional[Path] = None):
        self.device = device or get_default_device()
        self.model_dir = (model_dir or (MODELS_DIR / "OmniVoice")).resolve()
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
                f"OmniVoice weights not found at {self.model_dir}. Please run download_model.py to install OmniVoice."
            )

        python_exe = _find_omnivoice_python()
        worker_script = (BASE_DIR / "workers" / "omnivoice_worker.py").resolve()

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
        self._log_file = open(log_dir / "omnivoice_worker.log", "a", encoding="utf-8")

        print(f"[OmniVoice] Spawning worker on 127.0.0.1:{self.port} (device: {self.device})...")
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
        while time.time() - start_time < 25.0:
            if self.worker_process.poll() is not None:
                raise TTSError("OmniVoice worker failed to start. Check logs/omnivoice_worker.log for details.")
            try:
                r = self._client.get(f"{self.base_url}/health", timeout=1.0)
                if r.status_code == 200:
                    ready = True
                    break
            except Exception:
                time.sleep(0.5)

        if not ready:
            self.shutdown()
            raise TTSError("OmniVoice worker timed out waiting for loopback startup.")

        print(f"[OmniVoice] Worker online and ready at {self.base_url}")

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

        self._ensure_worker()

        ref_wav_path: Optional[Path] = None
        ref_text: Optional[str] = None

        if voice_id:
            ref_wav_path, ref_text = validate_voice_transcript(voice_id)
        elif reference_audio_path:
            # Look for paired .txt
            p = Path(reference_audio_path).resolve()
            txt_p = p.with_suffix(".txt")
            if not txt_p.is_file() or not txt_p.read_text(encoding="utf-8").strip():
                raise TranscriptRequiredError(
                    f"Reference transcript missing or empty for {p.name}. OmniVoice requires a verified transcript."
                )
            ref_wav_path = p
            ref_text = txt_p.read_text(encoding="utf-8").strip()
        else:
            raise VoiceNotFoundError(
                "OmniVoice requires a reference voice and transcript for zero-shot cloning."
            )

        # Calculate prompt cache key
        wav_bytes = ref_wav_path.read_bytes()
        cache_key = compute_prompt_cache_key(wav_bytes, ref_text)
        prompt_path = get_voice_prompt_path(voice_id or ref_wav_path.stem, cache_key)

        # Ensure prompt is created and cached
        prompt_req = {
            "voice_id": voice_id or ref_wav_path.stem,
            "ref_audio_path": str(ref_wav_path),
            "ref_text": ref_text,
            "cache_prompt_path": str(prompt_path),
        }
        try:
            res_prompt = self._client.post(f"{self.base_url}/prompt", json=prompt_req)
        except httpx.TimeoutException:
            raise TTSError("OmniVoice prompt creation timed out.")
        except Exception as e:
            raise TTSError(f"OmniVoice prompt connection error: {e}")

        if res_prompt.status_code != 200:
            raise TTSError(f"OmniVoice prompt creation failed: {res_prompt.text}")

        # Synthesize audio using the cached prompt
        synth_req = {
            "text": text.strip(),
            "prompt_path": str(prompt_path),
            "language": language or "en",
        }
        try:
            res_synth = self._client.post(f"{self.base_url}/synthesize", json=synth_req)
        except httpx.TimeoutException:
            raise TTSError("OmniVoice synthesis timed out.")
        except Exception as e:
            raise TTSError(f"OmniVoice synthesis connection error: {e}")

        if res_synth.status_code == 507:
            raise OutOfMemoryError(f"OmniVoice GPU OOM: {res_synth.text}")
        elif res_synth.status_code == 502:
            raise InvalidAudioOutputError(f"OmniVoice invalid audio output: {res_synth.text}")
        elif res_synth.status_code != 200:
            raise TTSError(f"OmniVoice synthesis failed: {res_synth.text}")

        if not res_synth.content:
            raise InvalidAudioOutputError("OmniVoice produced empty audio content.")

        return res_synth.content

    def synthesize_batch(
        self,
        texts: List[str],
        model_name: str,
        reference_audio_path: Optional[str] = None,
        voice_id: Optional[str] = None,
        voice_description: Optional[str] = None,
        language: Optional[str] = None
    ) -> List[bytes]:
        """Sequential synthesis fallback preserving prompt cache across calls."""
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
        """Unloads weights and shuts down the isolated worker process to reclaim memory."""
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
