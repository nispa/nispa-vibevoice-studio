import asyncio
import pytest
from core.queue_manager import TTSQueueManager, TaskStatus

@pytest.fixture
def anyio_backend():
    return 'asyncio'

@pytest.mark.anyio
async def test_submit_task():
    """Verify that task submission works and status is queued."""
    qm = TTSQueueManager()
    
    async def dummy_job(task_id):
        yield {"progress": 100, "message": "Done"}
        
    task_id = qm.submit_task(dummy_job)
    assert task_id in qm.tasks
    assert qm.tasks[task_id]["status"] == TaskStatus.QUEUED

@pytest.mark.anyio
async def test_worker_processing():
    """Verify that the worker processes a task and updates status."""
    qm = TTSQueueManager()
    
    async def dummy_job(task_id):
        yield {"progress": 50, "message": "Halfway"}
        yield {"progress": 100, "message": "Finished", "audio_b64": "dummy"}
        
    task_id = qm.submit_task(dummy_job)
    
    # Start worker and wait for task to complete
    worker = asyncio.create_task(qm._worker_loop())
    
    # Poll for completion (with timeout)
    for _ in range(20):
        if qm.tasks[task_id]["status"] == TaskStatus.COMPLETED:
            break
        await asyncio.sleep(0.1)
        
    assert qm.tasks[task_id]["status"] == TaskStatus.COMPLETED
    assert qm.tasks[task_id]["progress"] == 100
    assert qm.tasks[task_id]["audio_b64"] == "dummy"
    
    worker.cancel()

@pytest.mark.anyio
async def test_cancel_queued_task():
    """Verify that a task cancelled while in queue is skipped by the worker."""
    qm = TTSQueueManager()
    
    job_run = False
    async def dummy_job(task_id):
        nonlocal job_run
        job_run = True
        yield {"progress": 100}
        
    task_id = qm.submit_task(dummy_job)
    qm.cancel_task(task_id)
    
    assert qm.tasks[task_id]["status"] == TaskStatus.CANCELLED
    
    # Start worker - it should skip the cancelled task
    worker = asyncio.create_task(qm._worker_loop())
    await asyncio.sleep(0.2)
    
    assert job_run is False
    worker.cancel()

@pytest.mark.anyio
async def test_cancel_processing_task():
    """Verify that a task can be cancelled while processing."""
    qm = TTSQueueManager()
    
    second_step_reached = False
    async def slow_job(task_id):
        nonlocal second_step_reached
        yield {"progress": 10, "message": "Step 1"}
        # Simulate long processing
        for _ in range(10):
            await asyncio.sleep(0.1)
        second_step_reached = True
        yield {"progress": 100, "message": "Step 2"}
        
    task_id = qm.submit_task(slow_job)
    worker = asyncio.create_task(qm._worker_loop())
    
    # Wait for processing to start
    await asyncio.sleep(0.2)
    assert qm.tasks[task_id]["status"] == TaskStatus.PROCESSING
    
    # Cancel it
    qm.cancel_task(task_id)
    assert qm.tasks[task_id]["status"] == TaskStatus.CANCELLED
    
    # Wait to see if it finishes (the worker loop should break after next yield)
    # But wait, slow_job is NOT checking for cancellation itself.
    # The worker loop checks AFTER each yield.
    # So it will finish the sleep loop, set second_step_reached = True, yield Step 2,
    # and THEN the worker will break.
    
    # Let's verify that the task doesn't get updated to COMPLETED
    await asyncio.sleep(1.2)
    assert qm.tasks[task_id]["status"] == TaskStatus.CANCELLED
    assert qm.tasks[task_id]["progress"] != 100
    
    worker.cancel()

@pytest.mark.anyio
async def test_worker_error_handling():
    """Verify that worker handles exceptions in the job generator."""
    qm = TTSQueueManager()
    
    async def failing_job(task_id):
        yield {"progress": 10}
        raise RuntimeError("Boom!")
        
    task_id = qm.submit_task(failing_job)
    worker = asyncio.create_task(qm._worker_loop())
    
    for _ in range(20):
        if qm.tasks[task_id]["status"] == TaskStatus.FAILED:
            break
        await asyncio.sleep(0.1)
        
    assert qm.tasks[task_id]["status"] == TaskStatus.FAILED
    # Check logs for error message
    assert any("Error: Boom!" in log for log in qm.tasks[task_id]["logs"])
    
    worker.cancel()
