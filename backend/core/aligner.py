from pydub import AudioSegment
import io
from typing import List, Tuple
from .parser import SubtitleSegment, ScriptLine

def align_subtitles_audio(segments_with_audio: List[Tuple[SubtitleSegment, bytes]]) -> bytes:
    """
    Takes a list of SubtitleSegments paired with their corresponding synthesized raw WAV bytes.
    Places them onto a master track exactly at their start_time_ms.
    Allows for natural overlap if the synthesized audio exceeds the time gap.
    """
    if not segments_with_audio:
        return b""
        
    master_audio = AudioSegment.empty()
    
    for segment, audio_bytes in segments_with_audio:
        # Load the synthesized audio from bytes
        try:
            tts_audio = AudioSegment.from_wav(io.BytesIO(audio_bytes))
        except Exception as e:
            print(f"Error parsing generated audio for segment {segment.index}: {e}")
            continue

        # If the master audio is shorter than the desired start time, pad it with silence
        current_len_ms = len(master_audio)
        if current_len_ms < segment.start_time_ms:
            silence_gap = segment.start_time_ms - current_len_ms
            master_audio += AudioSegment.silent(duration=silence_gap)
            master_audio += tts_audio
        else:
            # The audio generated from the PREVIOUS segment ran longer than the gap!
            # Fundamental Tension: We allow "natural overlap" as agreed.
            # We overlay the new audio onto the master track starting at exactly `start_time_ms`
            master_audio = master_audio.overlay(tts_audio, position=segment.start_time_ms)
            
    # Export final audio to MP3 format for the frontend
    out_buf = io.BytesIO()
    master_audio.export(out_buf, format="mp3")
    return out_buf.getvalue()

def align_script_audio(lines_with_audio: List[bytes], gap_ms: int = 300) -> bytes:
    """
    Concatenates untimed script audio bytes back-to-back with a small configurable gap.
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
    master_audio.export(out_buf, format="mp3")
    return out_buf.getvalue()
