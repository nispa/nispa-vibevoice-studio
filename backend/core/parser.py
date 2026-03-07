from typing import List, Optional
from pydantic import BaseModel
import srt
import webvtt
import io
import re

class SubtitleSegment(BaseModel):
    index: int
    start_time_ms: int
    end_time_ms: int
    text: str

class ScriptLine(BaseModel):
    speaker: str
    text: str

def parse_subtitles(file_content: str, is_vtt: bool = False) -> List[SubtitleSegment]:
    """
    Parses an SRT or VTT string into a list of SubtitleSegment objects.
    """
    segments = []
    
    if is_vtt:
        # webvtt-py expects a file-like object
        fake_file = io.StringIO(file_content)
        vtt_parser = webvtt.read_buffer(fake_file)
        for idx, caption in enumerate(vtt_parser):
            segments.append(
                SubtitleSegment(
                    index=idx + 1,
                    start_time_ms=int(caption.start_in_seconds * 1000),
                    end_time_ms=int(caption.end_in_seconds * 1000),
                    text=caption.text.strip().replace('\n', ' ')
                )
            )
    else:
        # srt parsing
        subs = list(srt.parse(file_content))
        for sub in subs:
            segments.append(
                SubtitleSegment(
                    index=sub.index,
                    start_time_ms=int(sub.start.total_seconds() * 1000),
                    end_time_ms=int(sub.end.total_seconds() * 1000),
                    text=sub.content.strip().replace('\n', ' ')
                )
            )
            
    return segments

def parse_script(file_content: str) -> List[ScriptLine]:
    """
    Parses an untimed script where each line is expected to have a speaker label.
    Example:
    Speaker 1: Hello World!
    Speaker 2: How are you?
    """
    lines = []
    
    # Optional speaker brackets/colon + dialogue
    speaker_pattern = re.compile(r'^(?:\[?([^\]:]+)\]?:)\s*(.*)$')
    
    current_speaker = "Speaker1"
    
    for line in file_content.split('\n'):
        line = line.strip()
        if not line:
            continue
            
        match = speaker_pattern.match(line)
        if match:
            speaker_name = match.group(1).strip()
            dialogue = match.group(2).strip()
            
            # If the extracted speaker is reasonably short, accept it
            if len(speaker_name) < 30 and dialogue:
                current_speaker = speaker_name
            else:
                dialogue = line # treat entire line as dialogue if speaker name is too long
        else:
            dialogue = line
            
        if dialogue:
            lines.append(ScriptLine(speaker=current_speaker, text=dialogue))
            
    return lines

def group_subtitles_by_punctuation(segments: List[SubtitleSegment]) -> List[SubtitleSegment]:
    """
    Groups subtitle segments together when they are split mid-sentence.
    Only creates new groups at sentence endings (. ! ? ; :).
    
    Maintains:
    - start_time_ms from the first subtitle in the group
    - end_time_ms from the last subtitle in the group
    - Combines text with spaces
    """
    if not segments:
        return []
    
    grouped = []
    current_group = [segments[0]]
    punctuation_pattern = re.compile(r'[.!?;:]+$')
    
    for i in range(1, len(segments)):
        segment = segments[i]
        last_text = current_group[-1].text
        
        # Check if the last segment in current group ends with punctuation
        if punctuation_pattern.search(last_text):
            # Start a new group
            merged_segment = SubtitleSegment(
                index=current_group[0].index,
                start_time_ms=current_group[0].start_time_ms,
                end_time_ms=current_group[-1].end_time_ms,
                text=' '.join([s.text for s in current_group])
            )
            grouped.append(merged_segment)
            current_group = [segment]
        else:
            # Add to current group
            current_group.append(segment)
    
    # Don't forget the last group
    if current_group:
        merged_segment = SubtitleSegment(
            index=current_group[0].index,
            start_time_ms=current_group[0].start_time_ms,
            end_time_ms=current_group[-1].end_time_ms,
            text=' '.join([s.text for s in current_group])
        )
        grouped.append(merged_segment)
    
    return grouped
