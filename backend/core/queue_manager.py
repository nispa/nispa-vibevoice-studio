import asyncio
import uuid
import time
import sys
import re
import time
import sys
from typing import Dict, Any, Optional

class TaskStatus:
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    
class OutputRedirector:
    def __init__(self, queue_manager, task_id):
        self.qm = queue_manager
        self.task_id = task_id
        self.original_stderr = sys.stderr
        self.original_stdout = sys.stdout
        self.current_line = ""

    def write(self, s):
        self.original_stdout.write(s)
        self.current_line += s
        if '\r' in self.current_line or '\n' in self.current_line:
            lines = self.current_line.replace('\r', '\n').split('\n')
            for line in lines[:-1]:
                line = line.strip()
                if line:
                    # Append strictly to logs array directly without timestamp so it looks like raw output
                    if self.task_id in self.qm.tasks:
                        # Try to parse tqdm progress e.g. "15%|..."
                        match = re.search(r'(\d+)%', line)
                        if match:
                            try:
                                # Map 0-100% of tqdm to roughly 22-90% of the overall task progress
                                inner_prog = int(match.group(1))
                                overall_prog = 22 + int((inner_prog / 100) * 68)
                                self.qm.tasks[self.task_id]["progress"] = overall_prog
                            except ValueError:
                                pass
                        
                        self.qm.tasks[self.task_id]["logs"].append(line)
            self.current_line = lines[-1]

    def flush(self):
        self.original_stdout.flush()
        self.original_stderr.flush()

    def __enter__(self):
        sys.stderr = self
        sys.stdout = self
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.current_line.strip() and self.task_id in self.qm.tasks:
            self.qm.tasks[self.task_id]["logs"].append(self.current_line.strip())
        sys.stderr = self.original_stderr
        sys.stdout = self.original_stdout

class TTSQueueManager:
    def __init__(self):
        self.queue = asyncio.Queue()
        self.tasks: Dict[str, Dict[str, Any]] = {}
        self.worker_task: Optional[asyncio.Task] = None

    async def start_worker(self):
        """Starts the background worker if not already running."""
        if self.worker_task is None or self.worker_task.done():
            self.worker_task = asyncio.create_task(self._worker_loop())

    async def _worker_loop(self):
        while True:
            # Wait for a task from the queue
            task_id, payload_func = await self.queue.get()
            
            # If task was cancelled while in queue, skip it
            if self.tasks.get(task_id, {}).get("status") == TaskStatus.CANCELLED:
                self.queue.task_done()
                continue
                
            self.update_task(task_id, status=TaskStatus.PROCESSING, progress=0, message="Starting generation...")
            
            try:
                # payload_func is an async generic function that takes the task_id 
                # and yields progress updates (progress_int, message_str, optional_base64_audio)
                with OutputRedirector(self, task_id):
                    async for update in payload_func(task_id):
                        # Check if cancelled during generation
                        if self.tasks.get(task_id, {}).get("status") == TaskStatus.CANCELLED:
                            break
                            
                        progress = update.get("progress", self.tasks[task_id]["progress"])
                        message = update.get("message", "")
                        audio_b64 = update.get("audio_b64", None)
                        
                        if audio_b64:
                            self.update_task(task_id, status=TaskStatus.COMPLETED, progress=100, message=message, audio_b64=audio_b64)
                        else:
                            self.add_log(task_id, message, progress)
                        
            except Exception as e:
                self.update_task(task_id, status=TaskStatus.FAILED, message=f"Error: {str(e)}")
            finally:
                self.queue.task_done()

    def submit_task(self, payload_func) -> str:
        """Submit a new generation task. Returns the task_id."""
        task_id = str(uuid.uuid4())
        self.tasks[task_id] = {
            "id": task_id,
            "status": TaskStatus.QUEUED,
            "progress": 0,
            "logs": ["Task queued. Waiting for available resources..."],
            "audio_b64": None,
            "created_at": time.time()
        }
        
        self.queue.put_nowait((task_id, payload_func))
        return task_id

    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        return self.tasks.get(task_id)

    def update_task(self, task_id: str, status: str = None, progress: int = None, message: str = None, audio_b64: str = None):
        if task_id in self.tasks:
            if status:
                self.tasks[task_id]["status"] = status
            if progress is not None:
                self.tasks[task_id]["progress"] = progress
            if message:
                self.add_log(task_id, message, progress)
            if audio_b64:
                self.tasks[task_id]["audio_b64"] = audio_b64

    def add_log(self, task_id: str, message: str, progress: int = None):
        if task_id in self.tasks:
            timestamp = time.strftime("%H:%M:%S")
            self.tasks[task_id]["logs"].append(f"[{timestamp}] {message}")
            if progress is not None:
                self.tasks[task_id]["progress"] = progress

    def cancel_task(self, task_id: str) -> bool:
        if task_id in self.tasks:
            current_status = self.tasks[task_id]["status"]
            if current_status in [TaskStatus.QUEUED, TaskStatus.PROCESSING]:
                self.tasks[task_id]["status"] = TaskStatus.CANCELLED
                self.add_log(task_id, "✗ Generation cancelled by user.")
                return True
        return False

# Global instance
queue_manager = TTSQueueManager()
