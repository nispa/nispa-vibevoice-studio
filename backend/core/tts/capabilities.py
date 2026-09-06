from dataclasses import dataclass
from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class ModelCapabilities(BaseModel):
    """
    Data-driven description of a model's capabilities and operational requirements.
    Eliminates the need for substring checks on model names across the codebase.
    """
    provider_id: str = Field(..., description="TTS provider ID, e.g. 'qwen', 'vibevoice', 'omnivoice'")
    model_id: str = Field(..., description="Unique canonical model identifier")
    display_name: str = Field(..., description="Human-readable label for UI and logs")
    supports_voice_clone: bool = Field(default=False, description="Whether zero-shot voice cloning is supported")
    supports_voice_design: bool = Field(default=False, description="Whether voice description/design is supported")
    supports_emotion_tags: bool = Field(default=False, description="Whether inline emotion and style tags are supported")
    supports_batch: bool = Field(default=False, description="Whether native batch inference is supported")
    supports_native_dialogue: bool = Field(default=False, description="Whether multi-speaker dialogue can be generated natively in one shot")
    max_speakers: int = Field(default=1, description="Maximum number of distinct speakers supported in a single generation")
    requires_reference_audio: bool = Field(default=False, description="Whether a reference audio clip is mandatory for synthesis")
    requires_reference_transcript: bool = Field(default=False, description="Whether a text transcript of the reference audio is required")
    supported_languages: List[str] = Field(default_factory=list, description="List of supported language codes or names")
    sample_rate: int = Field(default=24000, description="Output sample rate in Hz (e.g. 24000)")
    execution: Literal["local_in_process", "local_worker"] = Field(
        default="local_in_process",
        description="Runtime execution model: in-process PyTorch or isolated local worker process"
    )


@dataclass
class DialogueTurn:
    """
    Typed container for a single line in a multi-turn dialogue.
    Prepares the contract for future native-dialogue providers without requiring it today.
    """
    speaker: str
    text: str
    voice_id: Optional[str] = None
    reference_audio_path: Optional[str] = None
    language: Optional[str] = None


# ==============================================================================
# Domain Exceptions
# ==============================================================================

class TTSError(Exception):
    """Base exception for all TTS-related domain errors."""
    pass


class ModelNotFoundError(TTSError):
    """Raised when a requested model ID or alias cannot be resolved."""
    pass


class ProviderNotFoundError(TTSError):
    """Raised when no provider factory is registered for a provider ID."""
    pass


class VoiceNotFoundError(TTSError):
    """Raised when a specified voice ID or reference audio file does not exist."""
    pass


class TranscriptRequiredError(TTSError):
    """Raised when a reference transcript (.txt) is required but missing or empty."""
    pass


class OutOfMemoryError(TTSError):
    """Raised when GPU or system memory is exhausted during synthesis."""
    pass


class SynthesisCancelledError(TTSError):
    """Raised when an ongoing synthesis job has been cancelled by the user."""
    pass


class InvalidAudioOutputError(TTSError):
    """Raised when synthesis completes but produces empty, corrupted, or invalid audio bytes."""
    pass
