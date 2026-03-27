import gc
import torch
from typing import Optional
from core.tts.base import TTSProvider
from core.tts.vibe_provider import VibeVoiceProvider
from core.tts.qwen_provider import Qwen3TTSProvider
from core.device_utils import get_default_device

class MultiModelProvider(TTSProvider):
    """
    Orchestrator that selects the correct provider based on model prefix.
    Providers are instantiated lazily on first use, keyed by device.
    """
    def __init__(self):
        self._vibe_pool: dict[str, VibeVoiceProvider] = {}
        self._qwen_pool: dict[str, Qwen3TTSProvider] = {}

    def _get_vibe(self, device: str = None) -> VibeVoiceProvider:
        dev = device or get_default_device()
        if dev not in self._vibe_pool:
            self._vibe_pool[dev] = VibeVoiceProvider(device=dev)
        return self._vibe_pool[dev]

    def _get_qwen(self, device: str = None) -> Qwen3TTSProvider:
        dev = device or get_default_device()
        if dev not in self._qwen_pool:
            self._qwen_pool[dev] = Qwen3TTSProvider(device=dev)
        return self._qwen_pool[dev]

    # Backward-compatible properties — point to the default device
    @property
    def vibe(self) -> VibeVoiceProvider:
        return self._get_vibe()

    @property
    def qwen(self) -> Qwen3TTSProvider:
        return self._get_qwen()

    def clean_vram(self):
        """
        Forcefully clears VRAM by moving all pooled models to CPU,
        deleting references, and emptying the CUDA cache.
        """
        print("[TTS] Force cleaning VRAM...")
        all_providers = list(self._vibe_pool.values()) + list(self._qwen_pool.values())
        for provider in all_providers:
            if provider.model:
                try:
                    provider.model.to("cpu")
                    provider.model = None
                    provider.processor = None
                    provider.loaded_model_name = None
                except Exception:
                    pass

        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.ipc_collect()
        print("[TTS] VRAM cleaned.")

    def synthesize(self, text: str, model_name: str, reference_audio_path: Optional[str] = None,
                   voice_id: Optional[str] = None, voice_description: Optional[str] = None,
                   language: Optional[str] = None, skip_cleanup: bool = False) -> bytes:
        if "Qwen" in model_name:
            return self.qwen.synthesize(text, model_name, reference_audio_path, voice_id,
                                        voice_description, language, skip_cleanup=skip_cleanup)
        else:
            return self.vibe.synthesize(text, model_name, reference_audio_path, voice_id,
                                        voice_description, language)

    def synthesize_batch(self, texts: list[str], model_name: str,
                         reference_audio_path: Optional[str] = None,
                         voice_id: Optional[str] = None, voice_description: Optional[str] = None,
                         language: Optional[str] = None) -> list[bytes]:
        if "Qwen" in model_name:
            return self.qwen.synthesize_batch(texts, model_name, reference_audio_path, voice_id,
                                              voice_description, language)
        else:
            return self.vibe.synthesize_batch(texts, model_name, reference_audio_path, voice_id,
                                              voice_description, language)

    def synthesize_batch_on_device(self, texts: list[str], model_name: str, device: str,
                                   reference_audio_path: Optional[str] = None,
                                   voice_id: Optional[str] = None,
                                   voice_description: Optional[str] = None,
                                   language: Optional[str] = None) -> list[bytes]:
        """
        Runs synthesize_batch on the provider bound to the specified device.
        Used by multi-GPU parallelism in tasks.py.
        """
        if "Qwen" in model_name:
            return self._get_qwen(device).synthesize_batch(texts, model_name, reference_audio_path,
                                                           voice_id, voice_description, language)
        else:
            return self._get_vibe(device).synthesize_batch(texts, model_name, reference_audio_path,
                                                           voice_id, voice_description, language)


# Global provider instance
tts_engine = MultiModelProvider()
