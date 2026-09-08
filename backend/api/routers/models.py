import json
import asyncio
from typing import Optional, List
from fastapi import APIRouter, HTTPException, BackgroundTasks, status
from fastapi.responses import StreamingResponse

from core.tts.catalog import (
    list_supported_models,
    resolve_model_capabilities,
    is_model_installed,
    get_installed_model_size_bytes,
    get_model_target_dir,
    ModelNotFoundError
)
from core.model_manager import (
    download_manager,
    delete_model_weights,
    get_system_health
)

router = APIRouter(prefix="/api")


@router.get("/models/manage")
def list_models_for_management():
    """
    Returns full metadata, installation status, actual disk space, and VRAM profile
    for all models in the catalog. Used by the WebUI Model & Engine Manager.
    """
    models_data = []
    for caps in list_supported_models():
        installed = is_model_installed(caps)
        actual_bytes = get_installed_model_size_bytes(caps) if installed else 0
        actual_gb = round(actual_bytes / (1024 ** 3), 2) if actual_bytes > 0 else 0.0

        models_data.append({
            "id": caps.model_id,
            "name": caps.display_name,
            "engine": caps.provider_id,
            "description": caps.description or caps.display_name,
            "folder_name": caps.folder_name or caps.model_id,
            "destination_folder": caps.destination_folder,
            "upstream_repo": caps.upstream_repo,
            "pinned_revision": caps.pinned_revision,
            "disk_size_gb": caps.disk_size_gb,
            "actual_size_gb": actual_gb,
            "actual_size_bytes": actual_bytes,
            "vram_cost_gb": caps.vram_cost_gb,
            "vram_peak_multiplier": caps.vram_peak_multiplier,
            "max_batch_size": caps.max_batch_size,
            "supports_voice_clone": caps.supports_voice_clone,
            "supports_voice_design": caps.supports_voice_design,
            "supports_emotion_tags": caps.supports_emotion_tags,
            "inline_tags": [tag.model_dump() for tag in caps.inline_tags],
            "inline_tag_guidance": caps.inline_tag_guidance,
            "requires_reference_audio": caps.requires_reference_audio,
            "requires_reference_transcript": caps.requires_reference_transcript,
            "sample_rate": caps.sample_rate,
            "execution": caps.execution,
            "installed": installed,
            "can_download": bool(caps.upstream_repo),
            "can_delete": installed and (caps.model_id != "qwen3-tokenizer-12hz" or True),
        })

    return {"models": models_data}


@router.post("/models/{model_id}/download")
async def start_model_download(model_id: str):
    """
    Initiates explicit background download for a supported catalog model.
    Returns 409 Conflict if another download is already in progress.
    """
    if download_manager.is_downloading:
        active = download_manager.active_state
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Another download is already in progress: {active.get('model_id') if active else 'unknown'}"
        )

    try:
        caps = resolve_model_capabilities(model_id)
    except ModelNotFoundError:
        raise HTTPException(status_code=404, detail=f"Model '{model_id}' not found in catalog.")

    if not caps.upstream_repo:
        raise HTTPException(status_code=400, detail=f"Model '{caps.display_name}' does not have a downloadable repository.")

    loop = asyncio.get_running_loop()
    # Launch download in background thread
    asyncio.create_task(asyncio.to_thread(download_manager.run_download_sync, caps, loop))

    return {
        "status": "started",
        "model_id": caps.model_id,
        "name": caps.display_name,
        "message": f"Download initiated for {caps.display_name}."
    }


@router.get("/models/download/progress")
async def stream_download_progress():
    """
    Server-Sent Events (SSE) streaming endpoint delivering real-time download progress,
    current file, speed in MB/s, and completion/error events.
    """
    queue = download_manager.subscribe()

    async def event_generator():
        try:
            # Emit initial heartbeat / state
            initial_state = download_manager.active_state or {
                "status": "idle",
                "progress_percent": 0.0,
                "message": "No active download."
            }
            yield f"data: {json.dumps(initial_state)}\n\n"

            while True:
                try:
                    state = await asyncio.wait_for(queue.get(), timeout=1.0)
                    yield f"data: {json.dumps(state)}\n\n"
                    if state.get("status") in ("completed", "error", "cancelled"):
                        # Keep connection briefly so frontend registers final event
                        await asyncio.sleep(0.5)
                except asyncio.TimeoutError:
                    # Send periodic keepalive heartbeat
                    current = download_manager.active_state or {"status": "idle"}
                    yield f"data: {json.dumps(current)}\n\n"
        finally:
            download_manager.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/models/download/cancel")
def cancel_download():
    """Cancels the active model download."""
    cancelled = download_manager.cancel_current_download()
    if not cancelled:
        return {"status": "noop", "message": "No active download to cancel."}
    return {"status": "success", "message": "Download cancellation requested."}


@router.delete("/models/{model_id}")
def delete_model(model_id: str):
    """
    Deletes installed weights for the specified model from data/model or data/model-translation.
    Enforces strict path containment.
    """
    try:
        caps = resolve_model_capabilities(model_id)
    except ModelNotFoundError:
        raise HTTPException(status_code=404, detail=f"Model '{model_id}' not found in catalog.")

    if not is_model_installed(caps):
        raise HTTPException(status_code=400, detail=f"Model '{caps.display_name}' is not currently installed.")

    if download_manager.is_downloading and download_manager.active_state.get("model_id") == caps.model_id:
        raise HTTPException(status_code=409, detail="Cannot delete model while it is currently downloading.")

    try:
        deleted = delete_model_weights(caps)
        return {
            "status": "success",
            "model_id": caps.model_id,
            "name": caps.display_name,
            "message": f"Successfully removed weights for {caps.display_name}."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete model weights: {str(e)}")


@router.get("/system/health")
def system_health_status():
    """
    Returns system diagnostic status: GPU & VRAM metrics, FFmpeg, SoX,
    modern engines worker, and disk usage.
    """
    return get_system_health()
