import sqlite3
import json
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Tuple
from db.models import JobCreate, JobUpdate, JobResponse, SubtitleSegmentData

DB_PATH = Path(__file__).parent.parent / "jobs.db"

def init_db():
    """
    Initializes the SQLite database and creates the necessary tables if they don't exist.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS subtitle_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            original_filename TEXT NOT NULL,
            subtitle_segments TEXT NOT NULL,  -- JSON
            modified_segments TEXT NOT NULL,  -- JSON
            voice_id TEXT NOT NULL,
            voice_name TEXT NOT NULL,
            model_name TEXT NOT NULL,
            group_by_punctuation INTEGER DEFAULT 0,
            notes TEXT,
            audio_url TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            status TEXT DEFAULT 'draft'  -- draft, processing, completed, failed
        )
    ''')
    
    conn.commit()
    conn.close()

def create_job(job_data: JobCreate) -> JobResponse:
    """
    Creates a new voiceover job entry in the database.

    Args:
        job_data (JobCreate): The job configuration and subtitle segments.

    Returns:
        JobResponse: The newly created job as a Pydantic model.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    now = datetime.now().isoformat()
    
    cursor.execute('''
        INSERT INTO subtitle_jobs (
            original_filename, subtitle_segments, modified_segments,
            voice_id, voice_name, model_name, group_by_punctuation,
            notes, created_at, updated_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        job_data.original_filename,
        json.dumps([seg.dict() for seg in job_data.subtitle_segments]),
        json.dumps([seg.dict() for seg in job_data.modified_segments]),
        job_data.voice_id,
        job_data.voice_name,
        job_data.model_name,
        1 if job_data.group_by_punctuation else 0,
        job_data.notes,
        now,
        now,
        'draft'
    ))
    
    job_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return get_job(job_id)

def get_job(job_id: int) -> Optional[JobResponse]:
    """
    Retrieves a single job by its ID.

    Args:
        job_id (int): The unique ID of the job.

    Returns:
        Optional[JobResponse]: The job data if found, otherwise None.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM subtitle_jobs WHERE id = ?', (job_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return None
    
    return _row_to_job(row)

def get_all_jobs(limit: int = 50, offset: int = 0) -> Tuple[List[JobResponse], int]:
    """
    Retrieves a paginated list of all jobs.

    Args:
        limit (int, optional): Maximum number of jobs to return. Defaults to 50.
        offset (int, optional): Number of jobs to skip. Defaults to 0.

    Returns:
        Tuple[List[JobResponse], int]: A tuple containing the list of jobs and the total count.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('SELECT COUNT(*) FROM subtitle_jobs')
    total = cursor.fetchone()[0]
    
    cursor.execute('''
        SELECT * FROM subtitle_jobs 
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    ''', (limit, offset))
    rows = cursor.fetchall()
    conn.close()
    
    jobs = [_row_to_job(row) for row in rows]
    return jobs, total

def update_job(job_id: int, update_data: JobUpdate) -> JobResponse:
    """
    Updates an existing job's segments or notes.

    Args:
        job_id (int): The ID of the job to update.
        update_data (JobUpdate): The new data for the job.

    Returns:
        JobResponse: The updated job data.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    updates = []
    params = []
    
    if update_data.modified_segments is not None:
        updates.append('modified_segments = ?')
        params.append(json.dumps([seg.dict() for seg in update_data.modified_segments]))
    
    if update_data.notes is not None:
        updates.append('notes = ?')
        params.append(update_data.notes)
    
    if updates:
        updates.append('updated_at = ?')
        params.append(datetime.now().isoformat())
        
        params.append(job_id)
        
        query = f"UPDATE subtitle_jobs SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(query, params)
        conn.commit()
    
    conn.close()
    return get_job(job_id)

def update_job_status(job_id: int, status: str, audio_url: Optional[str] = None) -> JobResponse:
    """
    Updates the status and optionally the audio URL of a job.

    Args:
        job_id (int): The ID of the job.
        status (str): The new status string.
        audio_url (Optional[str], optional): The URL of the generated audio file. Defaults to None.

    Returns:
        JobResponse: The updated job data.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    now = datetime.now().isoformat()
    
    if audio_url:
        cursor.execute('''
            UPDATE subtitle_jobs 
            SET status = ?, audio_url = ?, updated_at = ?
            WHERE id = ?
        ''', (status, audio_url, now, job_id))
    else:
        cursor.execute('''
            UPDATE subtitle_jobs 
            SET status = ?, updated_at = ?
            WHERE id = ?
        ''', (status, now, job_id))
    
    conn.commit()
    conn.close()
    return get_job(job_id)

def delete_job(job_id: int) -> bool:
    """
    Deletes a job from the database.

    Args:
        job_id (int): The unique ID of the job to delete.

    Returns:
        bool: True if the job was successfully deleted, otherwise False.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('DELETE FROM subtitle_jobs WHERE id = ?', (job_id,))
    conn.commit()
    success = cursor.rowcount > 0
    conn.close()
    
    return success

def _row_to_job(row: tuple) -> JobResponse:
    """
    Helper function to convert a raw SQLite row into a JobResponse model.

    Args:
        row (tuple): The raw database row.

    Returns:
        JobResponse: The parsed Pydantic model.
    """
    return JobResponse(
        id=row[0],
        original_filename=row[1],
        subtitle_segments=[SubtitleSegmentData(**seg) for seg in json.loads(row[2])],
        modified_segments=[SubtitleSegmentData(**seg) for seg in json.loads(row[3])],
        voice_id=row[4],
        voice_name=row[5],
        model_name=row[6],
        group_by_punctuation=bool(row[7]),
        notes=row[8],
        audio_url=row[9],
        created_at=row[10],
        updated_at=row[11],
        status=row[12]
    )
