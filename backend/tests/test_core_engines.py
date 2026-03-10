import os
import sys
import pytest
import torch
import numpy as np
from unittest.mock import MagicMock, patch, mock_open
from pydub import AudioSegment
import io

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.tts_provider import MultiModelProvider, VibeVoiceProvider, Qwen3TTSProvider

# --- 1. Multi-Model Orchestration Tests ---

def test_multimodel_dispatching():
    """Verify that MultiModelProvider dispatches to the correct engine based on name."""
    provider = MultiModelProvider()
    provider.vibe = MagicMock()
    provider.qwen = MagicMock()
    
    # Test VibeVoice
    provider.synthesize("Hello", "VibeVoice-1.5B")
    provider.vibe.synthesize.assert_called_once()
    
    # Test Qwen
    provider.synthesize("Hello", "Qwen3-TTS-1.7B-Base")
    provider.qwen.synthesize.assert_called_once()

# --- 2. GPU Auto-Selection Tests ---

@patch('torch.cuda.is_available', return_value=True)
@patch('torch.cuda.device_count', return_value=2)
@patch('torch.cuda.mem_get_info')
def test_gpu_auto_selection(mock_mem, mock_count, mock_avail):
    """Verify that _get_best_gpu selects the GPU with most free VRAM."""
    # Mocking: GPU 0 has 2GB free, GPU 1 has 8GB free
    mock_mem.side_effect = [(2*1024**3, 10*1024**3), (8*1024**3, 10*1024**3)]
    
    provider = Qwen3TTSProvider()
    best_gpu = provider._get_best_gpu()
    
    assert best_gpu == "cuda:1"

# --- 3. Qwen3 Logic Switching Tests ---

def test_qwen3_logic_switching():
    """Verify that Qwen3Provider uses the correct inference method based on model type."""
    provider = Qwen3TTSProvider()
    provider.model = MagicMock()
    provider._load_model = MagicMock()
    
    # Mock return values for Qwen3 methods (wavs, sr)
    mock_wav = [np.zeros(1000)]
    mock_sr = 24000
    provider.model.generate_voice_design.return_value = (mock_wav, mock_sr)
    provider.model.generate_voice_clone.return_value = (mock_wav, mock_sr)
    provider.model.generate_custom_voice.return_value = (mock_wav, mock_sr)

    with patch('torchaudio.save'):
        # A. Test Voice Design
        provider.synthesize("text", "Qwen3-TTS-1.7B-VoiceDesign", voice_description="Deep voice")
        provider.model.generate_voice_design.assert_called_once()

        # B. Test Voice Cloning (Base Model)
        # Mocking BOTH .wav and .txt existence to ensure it doesn't fallback
        with patch('os.path.exists', return_value=True), \
             patch('builtins.open', mock_open(read_data="test transcription")), \
             patch('torchaudio.load', return_value=(torch.zeros(1, 1000), 16000)):
            
            provider.synthesize("text", "Qwen3-TTS-Base", voice_id="it-marco")
            # Should call generate_voice_clone
            assert provider.model.generate_voice_clone.called

        # C. Test Custom Voice (CustomVoice Model)
        provider.synthesize("text", "Qwen3-TTS-CustomVoice")
        provider.model.generate_custom_voice.assert_called_once()

# --- 4. Reprocess Audio (Noise Reduction) Logic ---

def test_audio_reprocess_logic():
    """Verify the bandpass filter and normalization logic (Unit level)."""
    # Create a dummy 1s sine wave audio
    duration_ms = 1000
    freq = 440
    sample_rate = 22050
    t = np.linspace(0, duration_ms/1000, int(sample_rate * duration_ms/1000), endpoint=False)
    samples = (np.sin(2 * np.pi * freq * t) * 32767).astype(np.int16)
    
    audio = AudioSegment(
        samples.tobytes(), 
        frame_rate=sample_rate,
        sample_width=2, 
        channels=1
    )
    
    # Manual execution of the filter logic from voices.py
    from scipy.signal import butter, lfilter
    
    raw_samples = np.array(audio.get_array_of_samples()).astype(np.float32)
    
    def butter_bandpass(lowcut, highcut, fs, order=5):
        nyq = 0.5 * fs
        low = lowcut / nyq
        high = highcut / nyq
        b, a = butter(order, [low, high], btype='band')
        return b, a

    fs = audio.frame_rate
    b, a = butter_bandpass(80, min(8000, fs/2 - 1), fs, order=5)
    processed = lfilter(b, a, raw_samples)
    
    # Normalization check
    max_val = np.max(np.abs(processed))
    assert max_val > 0
    normalized = processed / max_val * 32767.0
    
    assert len(normalized) == len(raw_samples)
    assert np.max(np.abs(normalized)) <= 32767.1
