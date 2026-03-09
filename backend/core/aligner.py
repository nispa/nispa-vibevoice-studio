from pydub import AudioSegment
import io
from typing import List, Tuple
from .parser import SubtitleSegment, ScriptLine

def align_subtitles_audio(segments_with_audio: List[Tuple[SubtitleSegment, bytes]], output_format: str = "mp3") -> bytes:
    """
    Aligns synthesized audio segments with their subtitle timestamps using shifting logic.

    If a synthesized audio segment is longer than the original subtitle duration, 
    subsequent segments are shifted forward to prevent overlaps. 
    Silence gaps are added where necessary to maintain the original timing.

    Args:
        segments_with_audio (List[Tuple[SubtitleSegment, bytes]]): A list of tuples, each containing 
            a SubtitleSegment and its corresponding synthesized audio in WAV format (bytes).
        output_format (str, optional): The desired output audio format ("mp3" or "wav"). Defaults to "mp3".

    Returns:
        bytes: The combined and aligned audio as bytes in the requested format.
    """
    if not segments_with_audio:
        return b""
        
    master_audio = AudioSegment.empty()
    
    for segment, audio_bytes in segments_with_audio:
        try:
            tts_audio = AudioSegment.from_wav(io.BytesIO(audio_bytes))
            
            # SHIFTING LOGIC
            current_end_ms = len(master_audio)
            actual_start_ms = max(segment.start_time_ms, current_end_ms)
            
            if actual_start_ms > current_end_ms:
                silence_gap = actual_start_ms - current_end_ms
                master_audio += AudioSegment.silent(duration=silence_gap)
            
            master_audio += tts_audio
                
        except Exception as e:
            print(f"[Aligner] Error processing segment {segment.index}: {e}")
            
    # Export final audio to requested format
    out_buf = io.BytesIO()
    # Ensure format is compatible with pydub (wav or mp3)
    fmt = output_format.lower() if output_format.lower() in ["wav", "mp3"] else "mp3"
    master_audio.export(out_buf, format=fmt)
    return out_buf.getvalue()

def align_script_audio(lines_with_audio: List[bytes], gap_ms: int = 300, output_format: str = "mp3") -> bytes:
    """
    Concatenates synthesized audio for script lines with a configurable silent gap between them.

    Args:
        lines_with_audio (List[bytes]): A list of synthesized audio bytes in WAV format.
        gap_ms (int, optional): The duration of the silent gap between lines in milliseconds. Defaults to 300.
        output_format (str, optional): The desired output audio format ("mp3" or "wav"). Defaults to "mp3".

    Returns:
        bytes: The concatenated audio as bytes in the requested format.
    """
    if not lines_with_audio:
        return b""
        
    master_audio = AudioSegment.empty()
    gap_audio = AudioSegment.silent(duration=gap_ms)
    
    for audio_bytes in lines_with_audio:
        try:
            tts_audio = AudioSegment.from_wav(io.BytesIO(audio_bytes))
            master_audio += tts_audio + gap_audio
        except Exception as e:
            print(f"Error parsing script audio: {e}")
            
    out_buf = io.BytesIO()
    fmt = output_format.lower() if output_format.lower() in ["wav", "mp3"] else "mp3"
    master_audio.export(out_buf, format=fmt)
    return out_buf.getvalue()
