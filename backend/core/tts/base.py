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
        Detects the GPU with the most free VRAM.
        Returns a string like 'cuda:0' or 'cuda:1'.
        """
        if not torch.cuda.is_available():
            return "cpu"
        
        gpu_count = torch.cuda.device_count()
        if gpu_count <= 1:
            return "cuda:0"
            
        best_id = 0
        max_free = 0
        for i in range(gpu_count):
            try:
                # Get free memory for each device
                free, total = torch.cuda.mem_get_info(i)
                if free > max_free:
                    max_free = free
                    best_id = i
            except Exception:
                continue
        
        print(f"[TTS] Selecting best GPU: cuda:{best_id} ({max_free / 1024**3:.2f} GB free)")
        return f"cuda:{best_id}"

    @abstractmethod
    def synthesize(self, text: str, model_name: str, reference_audio_path: Optional[str] = None, voice_id: Optional[str] = None, voice_description: Optional[str] = None, language: Optional[str] = None) -> bytes:
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

    @abstractmethod
    def synthesize_batch(self, texts: list[str], model_name: str, reference_audio_path: Optional[str] = None, voice_id: Optional[str] = None, voice_description: Optional[str] = None, language: Optional[str] = None) -> list[bytes]:
        """
        Synthesizes a batch of texts into a list of audio bytes.
        Base fallback implementation should loop through texts.

        Args:
            texts (list[str]): List of texts to synthesize.
            model_name (str): Model name.
            reference_audio_path (str, optional): Path to reference audio.
            voice_id (str, optional): Voice ID.
            voice_description (str, optional): Voice description.
            language (str, optional): Target language.

        Returns:
            list[bytes]: List of synthesized audio data in WAV format.
        """
        pass

