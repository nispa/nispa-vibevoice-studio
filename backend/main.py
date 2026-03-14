import uvicorn
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routers (minimal impact because routers themselves use lazy imports now)
from api.routers import system, voices, generation, jobs

app = FastAPI(title="Nispa Voiceover API")

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for local dev, or specify origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(system.router)
app.include_router(voices.router)
app.include_router(generation.router)
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

    # Initialize TTS engines in a separate thread to not block startup
    # This allows the API to start responding to status checks immediately
    from core.tts_provider import tts_engine
    asyncio.create_task(asyncio.to_thread(tts_engine.initialize))
    
if __name__ == "__main__":
    """
    Main entry point for running the FastAPI server using Uvicorn.
    """
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
