import gc
from typing import Optional, Dict
import torch

from core.tts.base import TTSProvider
from core.tts.vibe_provider import VibeVoiceProvider
from core.tts.qwen_provider import Qwen3TTSProvider
from core.tts.omnivoice_provider import OmniVoiceProvider
from core.tts.higgs_provider import HiggsProvider
from core.device_utils import get_default_device
from core.tts.capabilities import ModelCapabilities, ModelNotFoundError
from core.tts.catalog import resolve_model_capabilities
from core.tts.registry import ProviderRegistry


class MultiModelProvider(TTSProvider):
    """
    Data-driven TTS orchestrator.
    Resolves models through the ModelCatalog and delegates to registered providers.
    Maintains backward compatibility with legacy properties and pools.
    """
    def __init__(self, registry: Optional[ProviderRegistry] = None):
        self.registry = registry or ProviderRegistry()
        
        # Legacy pool references preserved for backward compatibility
        self._vibe_pool: Dict[str, VibeVoiceProvider] = {}
        self._qwen_pool: Dict[str, Qwen3TTSProvider] = {}
        self._omnivoice_pool: Dict[str, OmniVoiceProvider] = {}
        self._higgs_pool: Dict[str, HiggsProvider] = {}

        # Register provider factories if default registry
        if registry is None:
            self.registry.register_factory("vibevoice", self._create_vibe)
            self.registry.register_factory("qwen", self._create_qwen)
            self.registry.register_factory("omnivoice", self._create_omnivoice)
            self.registry.register_factory("higgs", self._create_higgs)

    def _create_vibe(self, device: Optional[str] = None) -> VibeVoiceProvider:
        dev = device or get_default_device()
        instance = VibeVoiceProvider(device=dev)
        self._vibe_pool[dev] = instance
        return instance

    def _create_qwen(self, device: Optional[str] = None) -> Qwen3TTSProvider:
        dev = device or get_default_device()
        instance = Qwen3TTSProvider(device=dev)
        self._qwen_pool[dev] = instance
        return instance

    def _get_vibe(self, device: Optional[str] = None) -> VibeVoiceProvider:
        dev = device or get_default_device()
        if dev not in self._vibe_pool:
            return self.registry.get_provider("vibevoice", device=dev)  # triggers _create_vibe
        return self._vibe_pool[dev]

    def _get_qwen(self, device: Optional[str] = None) -> Qwen3TTSProvider:
        dev = device or get_default_device()
        if dev not in self._qwen_pool:
            return self.registry.get_provider("qwen", device=dev)  # triggers _create_qwen
        return self._qwen_pool[dev]

    def _create_omnivoice(self, device: Optional[str] = None) -> OmniVoiceProvider:
        dev = device or get_default_device()
        instance = OmniVoiceProvider(device=dev)
        self._omnivoice_pool[dev] = instance
        return instance

    def _get_omnivoice(self, device: Optional[str] = None) -> OmniVoiceProvider:
        dev = device or get_default_device()
        if dev not in self._omnivoice_pool:
            return self.registry.get_provider("omnivoice", device=dev)  # triggers _create_omnivoice
        return self._omnivoice_pool[dev]

    def _create_higgs(self, device: Optional[str] = None) -> HiggsProvider:
        dev = device or get_default_device()
        instance = HiggsProvider(device=dev)
        self._higgs_pool[dev] = instance
        return instance

    def _get_higgs(self, device: Optional[str] = None) -> HiggsProvider:
        dev = device or get_default_device()
        if dev not in self._higgs_pool:
            return self.registry.get_provider("higgs", device=dev)  # triggers _create_higgs
        return self._higgs_pool[dev]

    # Backward-compatible properties — point to default device
    @property
    def vibe(self) -> VibeVoiceProvider:
        return self._get_vibe()

    @property
    def qwen(self) -> Qwen3TTSProvider:
        return self._get_qwen()

    @property
    def omnivoice(self) -> OmniVoiceProvider:
        return self._get_omnivoice()

    @property
    def higgs(self) -> HiggsProvider:
        return self._get_higgs()

    def clean_vram(self) -> None:
        """
        Cleans VRAM by calling public unload() on all active providers
        in the registry, clearing pools, and emptying CUDA cache.
        """
        print("[TTS] Cleaning VRAM across all providers...")
        # Unload through registry
        self.registry.clean_vram()
        # Also ensure legacy pool dicts are unloaded and cleared
        for pool in [self._vibe_pool, self._qwen_pool, self._omnivoice_pool, self._higgs_pool]:
            for p in list(pool.values()):
                try:
                    p.unload()
                except Exception:
                    pass
            pool.clear()
        print("[TTS] VRAM cleaned.")

    def unload(self) -> None:
        """Alias for clean_vram()."""
        self.clean_vram()

    def get_capabilities(self, model_name: str) -> ModelCapabilities:
        """Returns the capabilities descriptor for a model name or alias."""
        return resolve_model_capabilities(model_name)

    def _resolve_provider(self, model_name: str, device: Optional[str] = None) -> tuple[TTSProvider, ModelCapabilities]:
        """
        Data-driven model resolution.
        Resolves model via catalog capabilities; never falls back to a default provider.
        """
        caps = resolve_model_capabilities(model_name)
        dev = device or get_default_device()
        
        # Route to provider via registered pool / factory
        if caps.provider_id == "qwen":
            provider = self._get_qwen(dev)
        elif caps.provider_id == "vibevoice":
            provider = self._get_vibe(dev)
        elif caps.provider_id == "omnivoice":
            provider = self._get_omnivoice(dev)
        elif caps.provider_id == "higgs":
            provider = self._get_higgs(dev)
        else:
            provider = self.registry.get_provider(caps.provider_id, device=dev)

        return provider, caps

    def synthesize(self, text: str, model_name: str, reference_audio_path: Optional[str] = None,
                   voice_id: Optional[str] = None, voice_description: Optional[str] = None,
                   language: Optional[str] = None, skip_cleanup: bool = False) -> bytes:
        provider, caps = self._resolve_provider(model_name)
        if caps.provider_id == "qwen":
            return provider.synthesize(text, model_name, reference_audio_path, voice_id,
                                       voice_description, language, skip_cleanup=skip_cleanup)
        return provider.synthesize(text, model_name, reference_audio_path, voice_id,
                                   voice_description, language)

    def synthesize_batch(self, texts: list[str], model_name: str,
                         reference_audio_path: Optional[str] = None,
                         voice_id: Optional[str] = None, voice_description: Optional[str] = None,
                         language: Optional[str] = None) -> list[bytes]:
        provider, _ = self._resolve_provider(model_name)
        return provider.synthesize_batch(texts, model_name, reference_audio_path, voice_id,
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
        provider, _ = self._resolve_provider(model_name, device=device)
        return provider.synthesize_batch(texts, model_name, reference_audio_path,
                                         voice_id, voice_description, language)


# Global provider instance
tts_engine = MultiModelProvider()
