import gc
from typing import Callable, Dict, Optional, Tuple
import torch

from core.device_utils import get_default_device
from core.tts.base import TTSProvider
from core.tts.capabilities import (
    ModelCapabilities,
    ProviderNotFoundError,
    ModelNotFoundError,
)
from core.tts.catalog import resolve_model_capabilities


class ProviderRegistry:
    """
    Central registry managing TTS provider factories, lazy instantiation,
    and pooling by (provider_id, device).
    
    Eliminates hardcoded provider pools and substring-based routing.
    """
    def __init__(self):
        self._factories: Dict[str, Callable[[Optional[str]], TTSProvider]] = {}
        # Key: (provider_id, device) -> TTSProvider instance
        self._pool: Dict[Tuple[str, str], TTSProvider] = {}

    def register_factory(self, provider_id: str, factory: Callable[[Optional[str]], TTSProvider]) -> None:
        """Registers a factory function for a provider ID."""
        self._factories[provider_id.lower()] = factory

    def has_provider(self, provider_id: str) -> bool:
        """Checks if a provider factory is registered."""
        return provider_id.lower() in self._factories

    def get_provider(self, provider_id: str, device: Optional[str] = None) -> TTSProvider:
        """
        Retrieves or lazily instantiates a TTSProvider for the given provider_id and device.
        Raises ProviderNotFoundError if no factory exists for provider_id.
        """
        pid = provider_id.lower()
        if pid not in self._factories:
            raise ProviderNotFoundError(
                f"No provider factory registered for provider '{provider_id}'. "
                f"Registered providers: {list(self._factories.keys())}"
            )

        dev = device or get_default_device()
        key = (pid, dev)
        if key not in self._pool:
            factory = self._factories[pid]
            self._pool[key] = factory(dev)

        return self._pool[key]

    def get_provider_for_model(self, model_name_or_id: str, device: Optional[str] = None) -> Tuple[TTSProvider, ModelCapabilities]:
        """
        Resolves model capabilities through the catalog and returns the appropriate provider.
        Never guesses or defaults to another provider if unknown.
        """
        caps = resolve_model_capabilities(model_name_or_id)
        provider = self.get_provider(caps.provider_id, device=device)
        return provider, caps

    def clean_vram(self) -> None:
        """
        Calls public unload() on every active provider instance in the pool,
        clears the pool references, and reclaims CUDA memory.
        """
        print("[TTS Registry] Unloading all providers and cleaning VRAM...")
        for (pid, dev), provider in list(self._pool.items()):
            try:
                provider.unload()
                if hasattr(provider, "shutdown"):
                    provider.shutdown()
            except Exception as e:
                print(f"[TTS Registry] Warning unloading {pid} on {dev}: {e}")

        self._pool.clear()
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.ipc_collect()
        print("[TTS Registry] VRAM cleaned.")

    @property
    def active_instances(self) -> Dict[Tuple[str, str], TTSProvider]:
        """Returns a snapshot of currently loaded (provider_id, device) instances."""
        return dict(self._pool)
