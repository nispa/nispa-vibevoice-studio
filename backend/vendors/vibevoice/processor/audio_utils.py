import subprocess
import numpy as np
import os
import warnings
from core.config import get_ffmpeg_path

def load_audio_use_ffmpeg(file_path, target_sr=16000, resample=True):
    """
    Loads an audio file using FFmpeg and converts it to a numpy array.
    This is more robust for various audio formats (MP3, AAC, etc.) 
    than standard soundfile loading.
    
    Args:
        file_path (str): Path to the audio file.
        target_sr (int): Target sampling rate.
        resample (bool): Whether to resample to target_sr.
        
    Returns:
        tuple: (audio_array, sampling_rate)
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Audio file not found: {file_path}")

    # Build ffmpeg command
    # -i: input file
    # -f f32le: output format 32-bit float little endian
    # -ac 1: convert to mono
    # -ar: set audio rate
    # -acodec pcm_f32le: use PCM 32-bit float codec
    # pipe:1: output to stdout
    
    cmd = [
        get_ffmpeg_path(),
        '-v', 'error',
        '-i', file_path,
        '-f', 'f32le',
        '-ac', '1'
    ]
    
    if resample:
        cmd.extend(['-ar', str(target_sr)])
        sr = target_sr
    else:
        # If not resampling, we'd need to probe first to know the SR,
        # but VibeVoice usually wants a fixed SR (16k for ASR, 24k for TTS).
        # For simplicity in this utility, we default to 16k if not specified.
        sr = 16000 
        cmd.extend(['-ar', str(sr)])

    cmd.extend(['-acodec', 'pcm_f32le', 'pipe:1'])

    try:
        # Run ffmpeg and capture stdout
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        out, err = process.communicate()
        
        if process.returncode != 0:
            raise RuntimeError(f"FFmpeg error: {err.decode()}")

        # Convert raw bytes to numpy array
        audio_array = np.frombuffer(out, dtype=np.float32)
        
        return audio_array, sr

    except FileNotFoundError:
        raise FileNotFoundError(
            "FFmpeg executable not found. Please install FFmpeg and add it to your PATH."
        )
    except Exception as e:
        raise RuntimeError(f"Failed to load audio with FFmpeg: {e}")
