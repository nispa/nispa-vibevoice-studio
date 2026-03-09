from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class SubtitleSegmentData(BaseModel):
    """
    Data model for an individual subtitle segment.

    Attributes:
        index (int): Sequence number.
        start_ms (int): Start time in milliseconds.
        end_ms (int): End time in milliseconds.
        text (str): Subtitle text.
        is_translated (Optional[bool]): Whether the segment has been translated. Defaults to False.
        original_text (Optional[str]): The source text if translated. Defaults to None.
    """
    index: int
    start_ms: int
    end_ms: int
    text: str
    is_translated: Optional[bool] = False
    original_text: Optional[str] = None

class JobCreate(BaseModel):
    """
    Data model for creating a new voiceover job.

    Attributes:
        original_filename (str): Name of the source subtitle file.
        subtitle_segments (List[SubtitleSegmentData]): Original subtitle segments.
        modified_segments (List[SubtitleSegmentData]): Subtitles after editing or grouping.
        voice_id (str): Reference ID for the TTS voice.
        voice_name (str): Human-readable name of the voice.
        model_name (str): TTS model to use.
        group_by_punctuation (bool): Whether punctuation grouping was applied. Defaults to False.
        notes (Optional[str]): Optional user notes for the job.
    """
    original_filename: str
    subtitle_segments: List[SubtitleSegmentData]
    modified_segments: List[SubtitleSegmentData]
    voice_id: str
    voice_name: str
    model_name: str
    group_by_punctuation: bool = False
    notes: Optional[str] = None

class JobUpdate(BaseModel):
    """
    Data model for updating an existing voiceover job.

    Attributes:
        modified_segments (Optional[List[SubtitleSegmentData]]): Updated subtitle segments.
        notes (Optional[str]): Updated user notes.
    """
    modified_segments: Optional[List[SubtitleSegmentData]] = None
    notes: Optional[str] = None

class JobResponse(BaseModel):
    """
    Data model for a voiceover job response from the database.

    Attributes:
        id (int): Unique job ID.
        original_filename (str): Name of the source file.
        subtitle_segments (List[SubtitleSegmentData]): Initial segments.
        modified_segments (List[SubtitleSegmentData]): Final segments used for TTS.
        voice_id (str): Voice identifier.
        voice_name (str): Voice name.
        model_name (str): TTS model name.
        group_by_punctuation (bool): Grouping status.
        notes (Optional[str]): Job notes.
        audio_url (Optional[str]): URL to the generated audio file.
        created_at (str): ISO timestamp of creation.
        updated_at (str): ISO timestamp of last update.
        status (str): Current status ('draft', 'processing', 'completed', 'failed').
    """
    id: int
    original_filename: str
    subtitle_segments: List[SubtitleSegmentData]
    modified_segments: List[SubtitleSegmentData]
    voice_id: str
    voice_name: str
    model_name: str
    group_by_punctuation: bool
    notes: Optional[str]
    audio_url: Optional[str]
    created_at: str
    updated_at: str
    status: str

class JobListResponse(BaseModel):
    """
    Data model for a paginated list of jobs.

    Attributes:
        jobs (List[JobResponse]): The list of job records.
        total (int): Total number of jobs in the database.
    """
    jobs: List[JobResponse]
    total: int
