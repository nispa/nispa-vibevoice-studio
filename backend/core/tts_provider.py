import gc
import torch
from typing import Optional, Union, List
from core.tts.base import TTSProvider
from core.tts.vibe_provider import VibeVoiceProvider
from core.tts.qwen_provider import Qwen3TTSProvider

class MultiModelProvider(TTSProvider):
    """
    Orchestrator that selects the correct provider based on model prefix.
    """
    def __init__(self):
        self._vibe = None
        self._qwen = None
        self._is_ready = False

    @property
    def vibe(self):
        if self._vibe is None:
            # Only import and instantiate when needed
            print("[TTS] Lazy loading VibeVoiceProvider...")
            self._vibe = VibeVoiceProvider()
        return self._vibe

    @property
    def qwen(self):
        if self._qwen is None:
            # Only import and instantiate when needed
            print("[TTS] Lazy loading Qwen3TTSProvider...")
            self._qwen = Qwen3TTSProvider()
        return self._qwen

    def initialize(self):
        """
        Explicitly initializes both providers in the background.
        Called on startup to pre-warm the engines without blocking the main API thread.
        """
        if not self._is_ready:
            print("[TTS] Warming up providers in background...")
            # Triggering properties to instantiate
            _ = self.vibe
            _ = self.qwen
            self._is_ready = True
            print("[TTS] All engines warmed up and ready.")

    @property
    def is_ready(self) -> bool:
        return self._is_ready

    def clean_vram(self):
        """
        Forcefully clears VRAM by moving models to CPU, deleting references,
        and emptying the CUDA cache.
        """
        print("[TTS] Force cleaning VRAM...")
        if self._vibe and self._vibe.model:
            try:
                self._vibe.model.to("cpu")
                self._vibe.model = None
                self._vibe.processor = None
                self._vibe.loaded_model_name = None
            except: pass
            
        if self._qwen and self._qwen.model:
            try:
                self._qwen.model.to("cpu")
                self._qwen.model = None
                self._qwen.processor = None
                self._qwen.loaded_model_name = None
            except: pass

        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.ipc_collect()
        print("[TTS] VRAM cleaned.")

    def synthesize(self, text: str, model_name: str, reference_audio_path: Optional[str] = None, voice_id: Optional[str] = None, voice_description: Optional[str] = None, language: Optional[str] = None) -> bytes:
        # Ensure we are ready
        if not self._is_ready:
            self.initialize()
            
        # Check if the model name contains "Qwen" to delegate to the Qwen provider
        if "Qwen" in model_name:
            return self.qwen.synthesize(text, model_name, reference_audio_path, voice_id, voice_description, language)
        else:
            return self.vibe.synthesize(text, model_name, reference_audio_path, voice_id, voice_description, language)

    def synthesize_batch(self, texts: list[str], model_name: str, reference_audio_path: Optional[str] = None, voice_id: Optional[str] = None, voice_description: Optional[str] = None, language: Optional[str] = None) -> list[bytes]:
        if not self._is_ready:
            self.initialize()
            
        if "Qwen" in model_name:
            return self.qwen.synthesize_batch(texts, model_name, reference_audio_path, voice_id, voice_description, language)
        else:
            return self.vibe.synthesize_batch(texts, model_name, reference_audio_path, voice_id, voice_description, language)

# Global provider instance updated to MultiModel orchestrator
tts_engine = MultiModelProvider()
