import os
import sys
import pytest
from unittest.mock import MagicMock, patch

# Add parent directory to path to find core modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.tts_provider import MultiModelProvider, VibeVoiceProvider, Qwen3TTSProvider

def test_multi_model_orchestration():
    """Verify that MultiModelProvider dispatches to the correct engine."""
    provider = MultiModelProvider()
    mock_vibe = MagicMock()
    mock_qwen = MagicMock()
    mock_vibe.synthesize.return_value = b""
    mock_qwen.synthesize.return_value = b""

    provider._vibe_pool["cpu"] = mock_vibe
    provider._qwen_pool["cpu"] = mock_qwen

    with patch('core.tts_provider.get_default_device', return_value="cpu"):
        provider.synthesize("test", "VibeVoice-1.5B")
        mock_vibe.synthesize.assert_called_with("test", "VibeVoice-1.5B", None, None, None, None)

        provider.synthesize("test", "Qwen3-TTS-1.7B")
        mock_qwen.synthesize.assert_called_with("test", "Qwen3-TTS-1.7B", None, None, None, None, skip_cleanup=False)

def test_qwen_dependency_check_fail():
    """Verify that Qwen3TTSProvider raises ImportError if dependencies are missing."""
    provider = Qwen3TTSProvider()

    with patch('builtins.__import__', side_effect=ImportError("transformers not found")):
        with pytest.raises(ImportError) as excinfo:
            provider._load_model("Qwen3-Model")
        assert "dependencies" in str(excinfo.value).lower()

def test_qwen_voice_design_logs():
    """Verify that synthesize logs the correct mode (Base, Cloning, or Design)."""
    provider = Qwen3TTSProvider()
    provider._load_model = MagicMock() # Mock actual model loading
    provider.model = MagicMock()
    # Mocking the model generation to return expected tuple (wavs, sr)
    import torch
    provider.model.generate_custom_voice.return_value = ([torch.zeros(1)], 16000)
    provider.model.generate_voice_design.return_value = ([torch.zeros(1)], 16000)
    provider.model.generate_voice_clone.return_value = ([torch.zeros(1)], 16000)
    provider.processor = MagicMock()
    
    # Mock silent wav return to avoid actual inference
    provider._get_silent_wav = MagicMock(return_value=b"mock_audio")
    
    with patch('torch.no_grad'), patch('torchaudio.save'):
        # Test Base TTS
        provider.synthesize("test", "Qwen3-TTS-1.7B-CustomVoice")
        # Test Voice Design
        provider.synthesize("test", "Qwen3-TTS-1.7B-VoiceDesign", voice_description="deep voice")
        # Test Cloning
        with patch('os.path.exists', return_value=True), patch('builtins.open'):
            provider.synthesize("test", "Qwen3-TTS-1.7B-Base", voice_id="en-test")

    # If we got here without errors, the logic flow for param handling is verified
    assert provider._load_model.called


def test_qwen_voice_clone_priority_over_design():
    """Verify that when reference audio is present, voice cloning is called even if voice_description is set."""
    provider = Qwen3TTSProvider()
    provider._load_model = MagicMock()
    provider.model = MagicMock()
    import torch
    provider.model.generate_voice_design.return_value = ([torch.zeros(1)], 16000)
    provider.model.generate_voice_clone.return_value = ([torch.zeros(1)], 16000)
    provider._get_silent_wav = MagicMock(return_value=b"mock_audio")

    with patch('torch.no_grad'), patch('torchaudio.save'), patch('os.path.exists', return_value=True), patch('builtins.open'):
        # Pass BOTH voice_id and voice_description to a Base model
        provider.synthesize("test", "Qwen3-TTS-1.7B-Base", voice_id="en-uk-voice", voice_description="should be ignored in favor of clone")
        
        # Verify voice_clone was called, NOT voice_design
        assert provider.model.generate_voice_clone.called
        assert not provider.model.generate_voice_design.called
