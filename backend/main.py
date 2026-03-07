import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.queue_manager import queue_manager
from api.routers import system, voices, generation, jobs
import db  # Initialize database

app = FastAPI(title="TTS Audio Generation System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(system.router)
app.include_router(voices.router)
app.include_router(generation.router)
app.include_router(jobs.router)

@app.on_event("startup")
async def startup_event():
    # Start the queue worker in the background
    await queue_manager.start_worker()

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
