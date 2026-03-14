import asyncio
import uuid
import time
import sys
import re
from typing import Dict, Any, Optional, AsyncGenerator

class TaskStatus:
    """Enumeration of possible task states."""
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    
class OutputRedirector:
    """
    Redirects stdout and stderr to capture log messages for a specific task.
    
    This class acts as a context manager that intercepts print statements and other 
    standard output/error streams, allowing them to be associated with a task's logs.
    """
    def __init__(self, queue_manager: 'TTSQueueManager', task_id: str):
        """
        Initializes the OutputRedirector.

        Args:
            queue_manager (TTSQueueManager): The instance of the queue manager.
            task_id (str): The unique identifier of the task.
        """
        self.qm = queue_manager
        self.task_id = task_id
        self.original_stderr = sys.stderr
        self.original_stdout = sys.stdout
        self.current_line = ""

    def write(self, s: str):
        """Writes data to the original stdout and captures it for logging."""
        self.original_stdout.write(s)
        self.current_line += s
        if '\r' in self.current_line or '\n' in self.current_line:
            lines = self.current_line.replace('\r', '\n').split('\n')
            for line in lines[:-1]:
                line = line.strip()
                if line:
                    if self.task_id in self.qm.tasks:
                        # We no longer parse tqdm progress or append raw output to logs.
                        # This prevents the progress bar from jumping due to underlying library output.
                        pass
            self.current_line = lines[-1]

    def flush(self):
        """Flushes the original stdout and stderr streams."""
        self.original_stdout.flush()
        self.original_stderr.flush()

    def __enter__(self):
        """Starts redirecting stdout and stderr."""
        sys.stderr = self
        sys.stdout = self
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Stops redirecting and restores original streams."""
        if self.current_line.strip() and self.task_id in self.qm.tasks:
            self.qm.tasks[self.task_id]["logs"].append(self.current_line.strip())
        sys.stderr = self.original_stderr
        sys.stdout = self.original_stdout

class TTSQueueManager:
    """
    Manages a queue of Text-to-Speech (TTS) generation tasks.
    
    Handles task submission, worker loop for processing tasks, task status updates, 
    and task cancellation.
    """
    def __init__(self):
        """Initializes the TTSQueueManager with an empty queue and task registry."""
        self.queue = asyncio.Queue()
        self.tasks: Dict[str, Dict[str, Any]] = {}
        self.worker_task: Optional[asyncio.Task] = None

    async def start_worker(self):
        """
        Starts the background worker loop if it is not already running.
        """
        if self.worker_task is None or self.worker_task.done():
            self.worker_task = asyncio.create_task(self._worker_loop())

    async def _worker_loop(self):
        """
        Internal worker loop that processes tasks from the queue sequentially.
        """
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
                        task_state = self.tasks.get(task_id, {})
                        if task_state.get("status") == TaskStatus.CANCELLED:
                            # If finalize_on_cancel is FALSE, we break immediately.
                            # If TRUE, the generator (payload_func) itself is responsible 
                            # for checking this and yielding the final audio.
                            if not task_state.get("finalize_on_cancel"):
                                break
                            # If finalizing, we let the generator continue its next yield 
                            # (which should be the completion)
                            
                        progress = update.get("progress", self.tasks[task_id]["progress"])
                        message = update.get("message", "")
                        audio_b64 = update.get("audio_b64", None)
                        
                        # Store additional metadata if provided (e.g. for progress bar or previews)
                        if "current_item" in update:
                            self.tasks[task_id]["current_item"] = update["current_item"]
                        if "total_items" in update:
                            self.tasks[task_id]["total_items"] = update["total_items"]
                        
                        # Handle individual segment previews
                        if "segment_audio_b64" in update:
                            if "segments" not in self.tasks[task_id]:
                                self.tasks[task_id]["segments"] = []
                            
                            self.tasks[task_id]["segments"].append({
                                "index": update.get("segment_index"),
                                "text": update.get("segment_text"),
                                "audio_b64": update["segment_audio_b64"]
                            })

                        if audio_b64:
                            self.update_task(task_id, status=TaskStatus.COMPLETED, progress=100, message=message, audio_b64=audio_b64)
                        else:
                            self.add_log(task_id, message, progress)
                        
            except Exception as e:
                self.update_task(task_id, status=TaskStatus.FAILED, message=f"Error: {str(e)}")
            finally:
                self.queue.task_done()

    def submit_task(self, payload_func: AsyncGenerator) -> str:
        """
        Submits a new generation task to the queue.

        Args:
            payload_func (AsyncGenerator): An async generator function that performs 
                the task and yields progress updates.

        Returns:
            str: The unique task ID.
        """
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
        """
        Retrieves the current state of a task.

        Args:
            task_id (str): The unique identifier of the task.

        Returns:
            Optional[Dict[str, Any]]: The task state dictionary, or None if not found.
        """
        return self.tasks.get(task_id)

    def update_task(self, task_id: str, status: str = None, progress: int = None, message: str = None, audio_b64: str = None):
        """
        Updates the status and progress of an existing task.

        Args:
            task_id (str): The unique identifier of the task.
            status (str, optional): The new status. Defaults to None.
            progress (int, optional): The new progress percentage. Defaults to None.
            message (str, optional): A log message to add. Defaults to None.
            audio_b64 (str, optional): Base64 encoded audio string for completed tasks. Defaults to None.
        """
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
        """
        Adds a timestamped log message to a task.

        Args:
            task_id (str): The unique identifier of the task.
            message (str): The log message content.
            progress (int, optional): The updated progress percentage. Defaults to None.
        """
        if task_id in self.tasks:
            timestamp = time.strftime("%H:%M:%S")
            self.tasks[task_id]["logs"].append(f"[{timestamp}] {message}")
            if progress is not None:
                self.tasks[task_id]["progress"] = progress

    def cancel_task(self, task_id: str, finalize: bool = False) -> bool:
        """
        Attempts to cancel a task.

        Args:
            task_id (str): The unique identifier of the task.
            finalize (bool, optional): Whether to attempt to finalize partial work 
                before stopping. Defaults to False.

        Returns:
            bool: True if the task was successfully marked for cancellation, False otherwise.
        """
        if task_id in self.tasks:
            current_status = self.tasks[task_id]["status"]
            if current_status in [TaskStatus.QUEUED, TaskStatus.PROCESSING]:
                self.tasks[task_id]["status"] = TaskStatus.CANCELLED
                self.tasks[task_id]["finalize_on_cancel"] = finalize
                self.add_log(task_id, f"✗ Generation cancelled by user.{' Finalizing partial audio...' if finalize else ''}")
                return True
        return False

# Global instance
queue_manager = TTSQueueManager()
