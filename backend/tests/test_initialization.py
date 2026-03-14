import pytest
from core.tts_provider import MultiModelProvider
from unittest.mock import MagicMock, patch

def test_tts_engine_lazy_initialization():
    """
    Verify that MultiModelProvider starts in a non-ready state 
    and only becomes ready after initialize() is called.
    """
    # Create a fresh instance for testing
    engine = MultiModelProvider()
    
    assert engine.is_ready is False
    assert engine._vibe is None
    assert engine._qwen is None
    
    # Mock the underlying providers to avoid heavy initialization
    with patch('core.tts_provider.VibeVoiceProvider', return_value=MagicMock()):
        with patch('core.tts_provider.Qwen3TTSProvider', return_value=MagicMock()):
            engine.initialize()
            
    assert engine.is_ready is True
    assert engine._vibe is not None
    assert engine._qwen is not None

def test_synthesize_triggers_initialization():
    """
    Verify that calling synthesize() triggers initialization if not already ready.
    """
    engine = MultiModelProvider()
    assert engine.is_ready is False
    
    with patch('core.tts_provider.VibeVoiceProvider') as MockVibe:
        mock_vibe_instance = MagicMock()
        MockVibe.return_value = mock_vibe_instance
        
        with patch('core.tts_provider.Qwen3TTSProvider', return_value=MagicMock()):
            # Simulate synthesis
            engine.synthesize("test", "VibeVoice-1.5B")
            
    assert engine.is_ready is True
    mock_vibe_instance.synthesize.assert_called_once()
