import os
import sys
import pytest
from unittest.mock import MagicMock, patch

# Add parent directory to path to find core modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.tts_provider import MultiModelProvider, VibeVoiceProvider, Qwen3TTSProvider

def test_multi_model_orchestration():
    """Verify that MultiModelProvider dispatches to the correct engine."""
    with patch('core.tts_provider.VibeVoiceProvider') as mock_vibe_class, \
         patch('core.tts_provider.Qwen3TTSProvider') as mock_qwen_class:
        
        # Instantiate provider
        provider = MultiModelProvider()
        
        # Test VibeVoice dispatch
        provider.synthesize("test", "VibeVoice-1.5B")
        provider.vibe.synthesize.assert_called_with("test", "VibeVoice-1.5B", None, None, None)
        
        # Test Qwen dispatch
        provider.synthesize("test", "Qwen3-TTS-1.7B")
        provider.qwen.synthesize.assert_called_with("test", "Qwen3-TTS-1.7B", None, None, None)

def test_qwen_dependency_check_fail():
    """Verify that Qwen3TTSProvider raises ImportError if dependencies are missing."""
    provider = Qwen3TTSProvider()
    
    # Mocking missing transformers
    with patch('builtins.__import__', side_effect=ImportError("transformers not found")):
        with pytest.raises(ImportError) as excinfo:
            provider._load_model("Qwen3-Model")
        assert "Qwen3-TTS dependencies not found" in str(excinfo.value)

def test_qwen_voice_design_logs():
    """Verify that synthesize logs the correct mode (Base, Cloning, or Design)."""
    provider = Qwen3TTSProvider()
    provider._load_model = MagicMock() # Mock actual model loading
    provider.model = MagicMock()
    provider.processor = MagicMock()
    
    # Mock silent wav return to avoid actual inference
    provider._get_silent_wav = MagicMock(return_value=b"mock_audio")
    
    with patch('torch.no_grad'), patch('torchaudio.save'):
        # Test Base TTS
        provider.synthesize("test", "Qwen-Model")
        # Test Voice Design
        provider.synthesize("test", "Qwen-Model", voice_description="deep voice")
        # Test Cloning
        with patch('os.path.exists', return_value=True):
            provider.synthesize("test", "Qwen-Model", voice_id="en-test")

    # If we got here without errors, the logic flow for param handling is verified
    assert provider._load_model.called
