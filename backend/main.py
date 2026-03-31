import os
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

# Import routers (minimal impact because routers themselves use lazy imports now)
from api.routers import system, voices, generation, jobs, translation, tasks

app = FastAPI(title="Nispa Voiceover API")
# Startup checks
try:
    from pydub.utils import which
    _ffmpeg = which("ffmpeg")
    if _ffmpeg:
        print(f"[Startup] ffmpeg found: {_ffmpeg}")
    else:
        print("[Startup] WARNING: ffmpeg NOT found in PATH.")
        print("[Startup] MP3 export will produce silent files. Install: brew install ffmpeg")
except Exception:
    pass


_audio_rendering_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "audio-rendering"))
os.makedirs(_audio_rendering_dir, exist_ok=True)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Ensure CORS headers are present even on unhandled errors."""
    status = exc.status_code if hasattr(exc, "status_code") else 500
    detail = exc.detail if hasattr(exc, "detail") else str(exc)
    return JSONResponse(
        status_code=status,
        content={"detail": detail},
        headers={"Access-Control-Allow-Origin": "*"},
    )

_outputs_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "outputs"))
os.makedirs(_outputs_dir, exist_ok=True)

@app.get("/outputs/{filename}")
async def serve_output_file(filename: str):
    """Serves final rendered output audio files."""
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    file_path = os.path.join(_outputs_dir, filename)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Output file not found")
    ext = filename.rsplit(".", 1)[-1].lower()
    media_type = "audio/mpeg" if ext == "mp3" else "audio/wav"
    return FileResponse(file_path, media_type=media_type, headers={
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
    })

@app.get("/audio-files/{job_folder}/{filename}")
async def serve_audio_file(job_folder: str, filename: str):
    """Serves generated segment audio files with proper CORS headers."""
    if ".." in job_folder or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid path")
    file_path = os.path.join(_audio_rendering_dir, job_folder, filename)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(file_path, media_type="audio/wav", headers={
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
    })

# Register API routers
app.include_router(system.router)
app.include_router(voices.router)
app.include_router(translation.router)
app.include_router(generation.router)
app.include_router(tasks.router)
app.include_router(jobs.router)

@app.on_event("startup")
async def startup_event():
    """
    Background worker and TTS engine initialization on application startup.
    """
    # Ensure database is initialized (import db triggers init_db)
    import db
    
    # Start the background task worker loop
    from core.queue_manager import queue_manager
    await queue_manager.start_worker()

if __name__ == "__main__":
    """
    Main entry point for running the FastAPI server using Uvicorn.
    """
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
