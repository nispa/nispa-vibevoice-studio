from fastapi import APIRouter, HTTPException, Query
from typing import List

from db.models import JobCreate, JobUpdate, JobResponse, JobListResponse
from db.database import (
    create_job, get_job, get_all_jobs, update_job, 
    delete_job, update_job_status
)

router = APIRouter(prefix="/api/jobs")

@router.post("/create", response_model=JobResponse)
async def create_new_job(job_data: JobCreate):
    """
    Create a new subtitle job (draft).
    Stores original and modified subtitle segments.
    """
    try:
        job = create_job(job_data)
        return job
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create job: {str(e)}")

@router.get("/{job_id}", response_model=JobResponse)
async def get_job_by_id(job_id: int):
    """Get a specific job by ID"""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return job

@router.get("", response_model=JobListResponse)
async def list_jobs(limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0)):
    """Get all jobs with pagination"""
    jobs, total = get_all_jobs(limit=limit, offset=offset)
    return JobListResponse(jobs=jobs, total=total)

@router.put("/{job_id}", response_model=JobResponse)
async def update_job_by_id(job_id: int, update_data: JobUpdate):
    """Update a job (usually modified segments)"""
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
    """Update job status (draft, processing, completed, failed)"""
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
    """Delete a job"""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    success = delete_job(job_id)
    if success:
        return {"message": f"Job {job_id} deleted successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to delete job")
