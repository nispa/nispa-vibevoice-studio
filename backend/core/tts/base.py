from abc import ABC, abstractmethod
from typing import Optional, Union
import torch

class TTSProvider(ABC):
    """
    Abstract Base Class for Text-to-Speech engines.
    
    This interface ensures that different TTS models can be integrated 
    without modifying the core application logic.
    """

    def _get_best_gpu(self) -> str:
        """
        Detects the best available compute device.
        Returns 'cuda:N' (best free VRAM), 'mps' (Apple Silicon), or 'cpu'.
        """
        from core.device_utils import get_default_device
        device = get_default_device()
        if device.startswith("cuda:") and torch.cuda.device_count() > 1:
            try:
                idx = int(device.split(":")[1])
                free, _ = torch.cuda.mem_get_info(idx)
                print(f"[TTS] Selecting best GPU: {device} ({free / 1024**3:.2f} GB free)")
            except Exception:
                pass
        return device

    def unload(self) -> None:
        """
        Unloads loaded model weights from memory and releases GPU resources.
        Subclasses should override this method to perform clean resource disposal.
        """
        pass

    @abstractmethod
    def synthesize(self, text: str, model_name: str, reference_audio_path: Optional[str] = None,
                   voice_id: Optional[str] = None, voice_description: Optional[str] = None,
                   language: Optional[str] = None) -> bytes:
        """
        Synthesizes text into audio bytes.

        Args:
            text (str): The text content to be converted to speech.
            model_name (str): The name of the model to use for synthesis.
            reference_audio_path (Optional[str], optional): Path to a reference audio file 
                for voice cloning. Defaults to None.
            voice_id (Optional[str], optional): ID of a predefined voice. Defaults to None.
            voice_description (Optional[str], optional): Natural language description 
                of the voice (Voice Design). Defaults to None.
            language (Optional[str], optional): Target language. Defaults to None.

        Returns:
            bytes: The synthesized audio data in WAV format.
        """
        pass

    def synthesize_batch(self, texts: list[str], model_name: str,
                         reference_audio_path: Optional[str] = None,
                         voice_id: Optional[str] = None,
                         voice_description: Optional[str] = None,
                         language: Optional[str] = None) -> list[bytes]:
        """
        Synthesizes a batch of texts into a list of audio bytes.
        Default base implementation sequentially calls synthesize() for each text.
        Providers supporting native batching should override this method.
        """
        return [
            self.synthesize(
                text=t,
                model_name=model_name,
                reference_audio_path=reference_audio_path,
                voice_id=voice_id,
                voice_description=voice_description,
                language=language
            )
            for t in texts
        ]

    def synthesize_dialogue(self, turns: list, model_name: str, **kwargs) -> list[bytes]:
        """
        Optional contract for native multi-speaker dialogue generation.
        Raises NotImplementedError if the provider does not support single-shot dialogue.
        """
        raise NotImplementedError(
            f"Provider '{self.__class__.__name__}' does not support native dialogue synthesis."
        )


