import pytest
import io
from pydub import AudioSegment
from core.aligner import align_subtitles_audio, align_script_audio
from core.parser import SubtitleSegment

def create_dummy_wav(duration_ms: int) -> bytes:
    """Helper to create a silent WAV file of specific duration."""
    audio = AudioSegment.silent(duration=duration_ms)
    buf = io.BytesIO()
    audio.export(buf, format="wav")
    return buf.getvalue()

def test_align_subtitles_audio_empty():
    """Verify that empty input returns empty bytes."""
    assert align_subtitles_audio([]) == b""

def test_align_subtitles_audio_with_gap():
    """Verify silence padding between segments."""
    # Segment 1: 0-1000ms
    # Segment 2: 2000-3000ms
    # Gap should be 1000ms
    wav1 = create_dummy_wav(500) # Synthesized is shorter than slot
    wav2 = create_dummy_wav(500)
    
    seg1 = SubtitleSegment(index=1, start_time_ms=0, end_time_ms=1000, text="First")
    seg2 = SubtitleSegment(index=2, start_time_ms=2000, end_time_ms=3000, text="Second")
    
    # We use wav format for easier duration checking
    result_bytes = align_subtitles_audio([(seg1, wav1), (seg2, wav2)], output_format="wav")
    result_audio = AudioSegment.from_wav(io.BytesIO(result_bytes))
    
    # Duration should be: start of seg2 (2000) + duration of wav2 (500) = 2500ms
    assert len(result_audio) == 2500

def test_align_subtitles_audio_shifting():
    """Verify shifting logic when synthesized audio is longer than original duration."""
    # Segment 1: 0-1000ms, but synthesized is 1500ms
    # Segment 2: 1200-2000ms (originally starts at 1200)
    # Shifting should move Segment 2 to start at 1500ms
    wav1 = create_dummy_wav(1500)
    wav2 = create_dummy_wav(500)
    
    seg1 = SubtitleSegment(index=1, start_time_ms=0, end_time_ms=1000, text="Long")
    seg2 = SubtitleSegment(index=2, start_time_ms=1200, end_time_ms=2000, text="Next")
    
    result_bytes = align_subtitles_audio([(seg1, wav1), (seg2, wav2)], output_format="wav")
    result_audio = AudioSegment.from_wav(io.BytesIO(result_bytes))
    
    # Expected duration: 1500 (wav1) + 500 (wav2) = 2000ms
    assert len(result_audio) == 2000

def test_align_script_audio():
    """Verify script audio concatenation with gaps."""
    wav1 = create_dummy_wav(500)
    wav2 = create_dummy_wav(500)
    gap_ms = 300
    
    result_bytes = align_script_audio([wav1, wav2], gap_ms=gap_ms, output_format="wav")
    result_audio = AudioSegment.from_wav(io.BytesIO(result_bytes))
    
    # Expected duration: 500 + 300 + 500 + 300 = 1600ms
    assert len(result_audio) == 1600
