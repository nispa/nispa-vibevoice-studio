from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class SubtitleSegmentData(BaseModel):
    """Individual subtitle segment data"""
    index: int
    start_ms: int
    end_ms: int
    text: str
    is_translated: Optional[bool] = False
    original_text: Optional[str] = None

class JobCreate(BaseModel):
    """Request model for creating a new job"""
    original_filename: str
    subtitle_segments: List[SubtitleSegmentData]
    modified_segments: List[SubtitleSegmentData]
    voice_id: str
    voice_name: str
    model_name: str
    group_by_punctuation: bool = False
    notes: Optional[str] = None

class JobUpdate(BaseModel):
    """Request model for updating a job"""
    modified_segments: Optional[List[SubtitleSegmentData]] = None
    notes: Optional[str] = None

class JobResponse(BaseModel):
    """Response model for a job"""
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
    status: str  # 'draft', 'processing', 'completed', 'failed'

class JobListResponse(BaseModel):
    """List of jobs"""
    jobs: List[JobResponse]
    total: int
