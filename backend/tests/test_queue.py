"""
Tests for core/queue_manager.py — task lifecycle, cancellation, error handling.
No GPU required.
"""
import asyncio
import pytest
from core.queue_manager import TTSQueueManager, TaskStatus


@pytest.fixture
def anyio_backend():
    return "asyncio"


async def _wait_for_status(qm, task_id, status, timeout=2.0):
    """Poll until task reaches the expected status or timeout."""
    elapsed = 0.0
    while elapsed < timeout:
        if qm.tasks[task_id]["status"] == status:
            return True
        await asyncio.sleep(0.05)
        elapsed += 0.05
    return False


@pytest.mark.anyio
async def test_submit_creates_queued_task():
    qm = TTSQueueManager()

    async def dummy_job(task_id):
        yield {"progress": 100, "message": "Done", "audio_url": "/outputs/test.mp3"}

    task_id = qm.submit_task(dummy_job)
    assert task_id in qm.tasks
    assert qm.tasks[task_id]["status"] == TaskStatus.QUEUED


@pytest.mark.anyio
async def test_worker_completes_task():
    qm = TTSQueueManager()

    async def dummy_job(task_id):
        yield {"progress": 50, "message": "Halfway"}
        yield {"progress": 100, "message": "Done", "audio_url": "/outputs/test.mp3"}

    task_id = qm.submit_task(dummy_job)
    worker = asyncio.create_task(qm._worker_loop())

    reached = await _wait_for_status(qm, task_id, TaskStatus.COMPLETED)
    assert reached, "Task did not complete in time"
    assert qm.tasks[task_id]["progress"] == 100
    assert qm.tasks[task_id]["audio_url"] == "/outputs/test.mp3"
    worker.cancel()


@pytest.mark.anyio
async def test_cancel_queued_task_is_not_executed():
    qm = TTSQueueManager()
    executed = False

    async def dummy_job(task_id):
        nonlocal executed
        executed = True
        yield {"progress": 100, "message": "Done"}

    task_id = qm.submit_task(dummy_job)
    qm.cancel_task(task_id)
    assert qm.tasks[task_id]["status"] == TaskStatus.CANCELLED

    worker = asyncio.create_task(qm._worker_loop())
    await asyncio.sleep(0.3)
    assert executed is False
    worker.cancel()


@pytest.mark.anyio
async def test_cancel_processing_task_stops_processing():
    qm = TTSQueueManager()

    async def slow_job(task_id):
        yield {"progress": 10, "message": "Step 1"}
        for _ in range(20):
            await asyncio.sleep(0.05)
        yield {"progress": 100, "message": "Step 2", "audio_url": "/outputs/x.mp3"}

    task_id = qm.submit_task(slow_job)
    worker = asyncio.create_task(qm._worker_loop())

    await _wait_for_status(qm, task_id, TaskStatus.PROCESSING)
    qm.cancel_task(task_id)
    assert qm.tasks[task_id]["status"] == TaskStatus.CANCELLED

    # After full wait, must not have been promoted to COMPLETED
    await asyncio.sleep(1.5)
    assert qm.tasks[task_id]["status"] == TaskStatus.CANCELLED
    worker.cancel()


@pytest.mark.anyio
async def test_worker_records_failed_status_on_exception():
    qm = TTSQueueManager()

    async def failing_job(task_id):
        yield {"progress": 10}
        raise RuntimeError("Boom!")

    task_id = qm.submit_task(failing_job)
    worker = asyncio.create_task(qm._worker_loop())

    reached = await _wait_for_status(qm, task_id, TaskStatus.FAILED)
    assert reached, "Task did not reach FAILED status"
    assert any("Boom!" in log for log in qm.tasks[task_id]["logs"])
    worker.cancel()


@pytest.mark.anyio
async def test_get_active_task_returns_none_when_idle():
    qm = TTSQueueManager()
    assert qm.get_active_task() is None


@pytest.mark.anyio
async def test_get_active_task_returns_queued_task():
    qm = TTSQueueManager()

    async def dummy_job(task_id):
        yield {"progress": 100, "message": "Done"}

    task_id = qm.submit_task(dummy_job)
    active = qm.get_active_task()
    assert active is not None
    assert active["id"] == task_id


@pytest.mark.anyio
async def test_get_active_task_none_after_completion():
    qm = TTSQueueManager()

    async def dummy_job(task_id):
        yield {"progress": 100, "message": "Done", "audio_url": "/outputs/x.mp3"}

    task_id = qm.submit_task(dummy_job)
    worker = asyncio.create_task(qm._worker_loop())

    await _wait_for_status(qm, task_id, TaskStatus.COMPLETED)
    assert qm.get_active_task() is None
    worker.cancel()


@pytest.mark.anyio
async def test_worker_records_segments_with_metadata():
    qm = TTSQueueManager()

    async def segment_job(task_id):
        yield {
            "progress": 50,
            "segment_index": 1,
            "segment_text": "Hello world",
            "segment_audio_b64": "UklGRg==",
            "voice_id": "Alice (en-emma)",
            "speaker": "Alice",
            "model_name": "qwen3-tts-1.7b",
            "language": "en",
            "message": "✓ Line #1 completed."
        }
        yield {"progress": 100, "message": "Done", "audio_url": "/outputs/test.mp3"}

    task_id = qm.submit_task(segment_job)
    worker = asyncio.create_task(qm._worker_loop())

    await _wait_for_status(qm, task_id, TaskStatus.COMPLETED)
    segments = qm.tasks[task_id].get("segments", [])
    assert len(segments) == 1
    assert segments[0]["index"] == 1
    assert segments[0]["text"] == "Hello world"
    assert segments[0]["audio_b64"] == "UklGRg=="
    assert segments[0]["voice_id"] == "Alice (en-emma)"
    assert segments[0]["speaker"] == "Alice"
    assert segments[0]["model_name"] == "qwen3-tts-1.7b"
    assert segments[0]["language"] == "en"
    worker.cancel()
