from fastapi import APIRouter, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from typing import List
import io
import base64
import asyncio

from db.models import JobCreate, JobUpdate, JobResponse, JobListResponse
from db.database import (
    create_job, get_job, get_all_jobs, update_job, 
    delete_job, update_job_status
)
from core.parser import SubtitleSegment
from core.aligner import align_subtitles_audio

router = APIRouter(prefix="/api/jobs")

def format_ms_to_srt_time(ms: int) -> str:
    """Helper to format milliseconds to SRT time string HH:MM:SS,mmm"""
    seconds = ms // 1000
    milliseconds = ms % 1000
    minutes = seconds // 60
    seconds = seconds % 60
    hours = minutes // 60
    minutes = minutes % 60
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"

@router.post("/{job_id}/finalize")
async def finalize_job_audio(job_id: int, output_format: str = Query("mp3")):
    """
    Retrieves all segments for a job from the database, extracts their 
    embedded audio (Base64), and joins them into a single file.
    """
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    # We use modified_segments if they exist, otherwise subtitle_segments
    segments = job.modified_segments if job.modified_segments else job.subtitle_segments
    
    if not segments:
        raise HTTPException(status_code=400, detail="No segments found for this job")
        
    segments_with_audio = []
    
    for seg in segments:
        audio_url = getattr(seg, "audioUrl", None) or seg.get("audioUrl") if isinstance(seg, dict) else seg.audioUrl
        
        if not audio_url or not audio_url.startswith("data:audio/"):
            # If a segment is missing audio, we can't finalize properly
            continue
            
        try:
            # Extract base64 data
            b64_data = audio_url.split(",")[1]
            wav_bytes = base64.b64decode(b64_data)
            
            # Map database model to SubtitleSegment expected by aligner
            segments_with_audio.append((
                SubtitleSegment(
                    index=getattr(seg, "index", 0),
                    start_time_ms=getattr(seg, "start_ms", 0),
                    end_time_ms=getattr(seg, "end_ms", 0),
                    text=getattr(seg, "text", "")
                ),
                wav_bytes
            ))
        except Exception as e:
            print(f"Error decoding audio for segment {getattr(seg, 'index', 'unknown')}: {e}")
            continue
            
    if not segments_with_audio:
        raise HTTPException(
            status_code=400, 
            detail="No segments with valid audio found. Please generate audio for segments first."
        )
        
    try:
        # Join audio segments
        final_audio_bytes = await asyncio.to_thread(
            align_subtitles_audio, segments_with_audio, output_format
        )
        
        filename = f"job_{job_id}_final.{output_format.lower()}"
        media_type = "audio/mpeg" if output_format.lower() == "mp3" else "audio/wav"
        
        return StreamingResponse(
            io.BytesIO(final_audio_bytes),
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Finalization failed: {str(e)}")

@router.get("/{job_id}/export-srt")
async def export_job_srt(job_id: int):
    """
    Exports the modified (translated) segments of a job as an SRT file.
    """
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # We use modified_segments if they exist, otherwise subtitle_segments
    segments = job.modified_segments if job.modified_segments else job.subtitle_segments
    
    if not segments:
        raise HTTPException(status_code=400, detail="No subtitle segments found for this job")

    srt_content = ""
    for i, seg in enumerate(segments):
        idx = seg.index if hasattr(seg, "index") else i + 1
        start = seg.start_ms if hasattr(seg, "start_ms") else 0
        end = seg.end_ms if hasattr(seg, "end_ms") else 0
        text = seg.text if hasattr(seg, "text") else ""
            
        start_time = format_ms_to_srt_time(start)
        end_time = format_ms_to_srt_time(end)
        srt_content += f"{idx}\n{start_time} --> {end_time}\n{text}\n\n"

    # Ensure filename is clean
    base_name = job.original_filename if job.original_filename else "subtitles.srt"
    if base_name.endswith(".srt"):
        filename = f"translated_{base_name}"
    else:
        filename = f"translated_{base_name}.srt"

    return Response(
        content=srt_content,
        media_type="text/plain",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.post("/create", response_model=JobResponse)
async def create_new_job(job_data: JobCreate):
    """
    Creates a new voiceover job draft in the database.

    Stores original and modified subtitle segments for later processing.

    Args:
        job_data (JobCreate): The initial data for the new job.

    Returns:
        JobResponse: The created job record.

    Raises:
        HTTPException: If the job creation fails.
    """
    try:
        job = create_job(job_data)
        return job
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create job: {str(e)}")

@router.get("/{job_id}", response_model=JobResponse)
async def get_job_by_id(job_id: int):
    """
    Retrieves a specific job by its unique ID.

    Args:
        job_id (int): The ID of the job to retrieve.

    Returns:
        JobResponse: The job record.

    Raises:
        HTTPException: If the job is not found.
    """
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return job

@router.get("", response_model=JobListResponse)
async def list_jobs(limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0)):
    """
    Lists all voiceover jobs with pagination support.

    Args:
        limit (int, optional): Maximum number of jobs to return. Defaults to 50.
        offset (int, optional): Number of jobs to skip. Defaults to 0.

    Returns:
        JobListResponse: A list of jobs and the total count.
    """
    jobs, total = get_all_jobs(limit=limit, offset=offset)
    return JobListResponse(jobs=jobs, total=total)

@router.put("/{job_id}", response_model=JobResponse)
async def update_job_by_id(job_id: int, update_data: JobUpdate):
    """
    Updates the content or segments of an existing job.

    Args:
        job_id (int): The ID of the job to update.
        update_data (JobUpdate): The updated job data.

    Returns:
        JobResponse: The updated job record.

    Raises:
        HTTPException: If the job is not found or update fails.
    """
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    try:
        updated_job = update_job(job_id, update_data)
        return updated_job
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update job: {str(e)}")

@router.patch("/{job_id}/status")
async def update_job_status_endpoint(job_id: int, status: str = Query(...), audio_url: str = Query(None)):
    """
    Updates the execution status and optionally the audio URL of a job.

    Args:
        job_id (int): The ID of the job.
        status (str): The new status ('draft', 'processing', 'completed', 'failed').
        audio_url (str, optional): The URL to the generated audio file. Defaults to None.

    Returns:
        JobResponse: The updated job record.

    Raises:
        HTTPException: If the job is not found or the status is invalid.
    """
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    valid_statuses = ['draft', 'processing', 'completed', 'failed']
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    try:
        updated_job = update_job_status(job_id, status, audio_url)
        return updated_job
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update status: {str(e)}")

@router.delete("/{job_id}")
async def delete_job_by_id(job_id: int):
    """
    Permanently deletes a job from the database.

    Args:
        job_id (int): The ID of the job to delete.

    Returns:
        dict: A confirmation message.

    Raises:
        HTTPException: If the job is not found or deletion fails.
    """
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    success = delete_job(job_id)
    if success:
        return {"message": f"Job {job_id} deleted successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to delete job")
