import io
import json
import asyncio
import re
import os
import base64
import torch
from typing import Optional, List
import requests
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Query, Body
from fastapi.responses import StreamingResponse

from core.parser import parse_subtitles, parse_script, group_subtitles_by_punctuation, SubtitleSegment
from core.tts_provider import tts_engine
from core.gpu_manager import gpu_manager
from core.config import config_manager
from core.vram_config import get_model_config, recommended_batch as vram_recommended_batch
from core.aligner import align_subtitles_audio, align_script_audio
from core.queue_manager import queue_manager, TaskStatus
from core.audio_storage import save_segment_audio, load_segment_audio, is_file_path
from db.database import get_job, update_job
from db.models import JobUpdate

router = APIRouter(prefix="/api")

@router.post("/tasks/generate-subtitles")
async def create_subtitle_task(
    subtitle_file: Optional[UploadFile] = File(None),
    voice_id: str = Form(...),
    model_name: str = Form("Qwen3-TTS-12Hz-1.7B-Base"),
    group_by_punctuation: bool = Form(False),
    subtitle_segments: Optional[str] = Form(None),
    output_format: str = Form("mp3"),
    voice_description: Optional[str] = Form(None),
    language: Optional[str] = Form(None),
    job_id: Optional[int] = Form(None)
):
    """Creates a background task for timed subtitle voiceover generation."""
    
    async def subtitle_job(task_id: str):
        import base64
        import os
        from datetime import datetime
        
        job_segments = []
        
        # 1. Load from Database if job_id is provided (Best practice, prevents 1MB payload limits)
        if job_id:
            try:
                job_record = get_job(job_id)
                if job_record and job_record.modified_segments:
                    print(f"[Tasks] Loading {len(job_record.modified_segments)} segments from DB for Job #{job_id}")
                    for seg in job_record.modified_segments:
                        # Extract audio bytes if present
                        audio_bytes = None
                        if getattr(seg, 'audioBase64', None):
                            try:
                                audio_bytes = base64.b64decode(seg.audioBase64)
                            except:
                                pass
                        elif getattr(seg, 'audioUrl', None):
                            url = seg.audioUrl
                            if url.startswith("data:audio/"):
                                try:
                                    audio_bytes = base64.b64decode(url.split(",")[1])
                                except:
                                    pass
                            elif is_file_path(url):
                                try:
                                    audio_bytes = load_segment_audio(url)
                                except:
                                    pass
                                
                        job_segments.append({
                            "segment": SubtitleSegment(
                                index=getattr(seg, "index", 0),
                                start_time_ms=getattr(seg, "start_ms", 0),
                                end_time_ms=getattr(seg, "end_ms", 0),
                                text=getattr(seg, "text", "")
                            ),
                            "audio_bytes": audio_bytes
                        })
            except Exception as e:
                print(f"[Tasks] Warning: Failed to load from DB for job_id {job_id}: {e}")

        # 2. Fallback to parsing from form data (subtitle_segments JSON or subtitle_file)
        if not job_segments:
            segments = []
            if subtitle_segments:
                try:
                    segments_data = json.loads(subtitle_segments)
                    for seg in segments_data:
                        audio_url = seg.get("audioUrl")
                        audio_base64 = seg.get("audioBase64")
                        audio_bytes = None
                        
                        if audio_base64:
                            try: audio_bytes = base64.b64decode(audio_base64)
                            except: pass
                        elif audio_url and audio_url.startswith("data:audio/"):
                            try: audio_bytes = base64.b64decode(audio_url.split(",")[1])
                            except: pass
                        elif audio_url and is_file_path(audio_url):
                            try: audio_bytes = load_segment_audio(audio_url)
                            except: pass

                        job_segments.append({
                            "segment": SubtitleSegment(
                                index=seg.get("index", 0),
                                start_time_ms=seg.get("start_ms", 0),
                                end_time_ms=seg.get("end_ms", 0),
                                text=seg.get("text", "")
                            ),
                            "audio_bytes": audio_bytes
                        })
                except Exception as e:
                    raise HTTPException(status_code=400, detail=f"Invalid subtitle_segments JSON: {str(e)}")
            elif subtitle_file:
                is_vtt = subtitle_file.filename.endswith(".vtt")
                content = await subtitle_file.read()
                content_str = content.decode("utf-8")
                parsed = parse_subtitles(content_str, is_vtt=is_vtt)
                
                # Apply grouping ONLY if we started from a raw file
                if group_by_punctuation:
                    parsed = group_subtitles_by_punctuation(parsed)
                    
                job_segments = [{"segment": s, "audio_bytes": None} for s in parsed]
            else:
                raise HTTPException(status_code=400, detail="Either job_id, subtitle_file or subtitle_segments is required")

        total_items = len(job_segments)

        def _get_model_config(model_name: str):
            cfg = get_model_config(model_name)
            return cfg.cost_gb, cfg.peak_multiplier, cfg.max_batch

        # Cache of profiled cost per segment (set after first real batch)
        _profiled_cost: dict = {"gb": None}

        _last_logged_batch: dict = {"size": None}

        def calculate_optimal_batch_size(model_name: str, profiled_cost_gb: float | None = None) -> int:
            # Check user override first
            from core.config import config_manager as _cfg
            user_override = _cfg.settings.get("tts", {}).get("batch_overrides", {}).get(model_name)
            if user_override is not None:
                val = int(user_override)
                if _last_logged_batch["size"] != val:
                    print(f"[VRAM] Using user override batch={val} for {model_name}")
                    _last_logged_batch["size"] = val
                return val

            if not torch.cuda.is_available():
                return 1
            try:
                free_vram_bytes, total_vram_bytes = torch.cuda.mem_get_info()
                free_vram_gb = free_vram_bytes / (1024 ** 3)

                estimated_cost, peak_multiplier, max_batch = _get_model_config(model_name)
                cost_per_segment_gb = profiled_cost_gb if profiled_cost_gb else estimated_cost

                # Reserve 40% of free VRAM as headroom for generation peaks
                usable_vram = free_vram_gb * 0.60

                # Effective cost includes peak overhead during model.generate()
                effective_cost = cost_per_segment_gb * peak_multiplier

                calculated_batch = int(usable_vram // effective_cost)
                clamped = max(1, min(calculated_batch, max_batch))

                if _last_logged_batch["size"] != clamped:
                    print(f"[VRAM] free={free_vram_gb:.1f}GB usable={usable_vram:.1f}GB "
                          f"cost={effective_cost:.2f}GB/seg → batch={clamped} (max={max_batch})")
                    _last_logged_batch["size"] = clamped
                return clamped
            except Exception as e:
                print(f"[Sistema] Errore calcolo VRAM: {e}")
                return 2

        BATCH_SIZE = calculate_optimal_batch_size(model_name)
        print(f"[Sistema] Dynamic batch size: {BATCH_SIZE} for model {model_name}")

        segments_with_audio = []
        current_batch_size = BATCH_SIZE
        _first_batch_done = {"done": False}

        i = 0
        while i < total_items:
            # Recalculate using profiled cost if available
            current_batch_size = calculate_optimal_batch_size(model_name, _profiled_cost["gb"])
            batch = job_segments[i:i+current_batch_size]

            task_state = queue_manager.get_task(task_id)
            if task_state.get("status") == TaskStatus.CANCELLED:
                if task_state.get("finalize_on_cancel"):
                    break # Allow finalization
                return

            to_generate = []
            for j, item in enumerate(batch):
                if not item["audio_bytes"]:
                    to_generate.append((j, item["segment"]))
            
            generated_audios = {}
            current_progress = int((i / total_items) * 100)
            
            if to_generate:
                texts = [seg.text for _, seg in to_generate]
                yield {
                    "progress": current_progress, 
                    "total_items": total_items,
                    "current_item": min(i + 1, total_items),
                    "message": f"[TTS] Synthesizing batch of {len(texts)} segments..."
                }
                
                _oom_retry = False
                try:
                    _vram_before = torch.cuda.memory_allocated() if torch.cuda.is_available() else 0

                    # --- Multi-GPU branch ---
                    _disabled = set(config_manager.settings.get("tts", {}).get("multi_gpu", {}).get("disabled_devices", []))
                    gpu_devices = [d for d in gpu_manager.get_devices() if d.index not in _disabled]
                    if len(gpu_devices) >= 2 and len(to_generate) >= 2:
                        splits = gpu_manager.compute_split(len(to_generate), gpu_devices)
                        chunks: list[tuple[list, str]] = []
                        start = 0
                        for size, dev in zip(splits, gpu_devices):
                            if size > 0:
                                chunks.append((to_generate[start:start + size], dev.device_str))
                            start += size

                        if not _first_batch_done["done"]:
                            gpu_manager.log_devices(gpu_devices)
                            print(f"[GPU] Multi-GPU split: {[len(c) for c, _ in chunks]} segs → "
                                  f"{[d for _, d in chunks]}")

                        async def _synth_chunk(items: list, device: str) -> list[bytes]:
                            chunk_texts = [seg.text for _, seg in items]
                            return await asyncio.to_thread(
                                tts_engine.synthesize_batch_on_device,
                                chunk_texts, model_name, device,
                                None, voice_id, voice_description, language
                            )

                        results_per_chunk = await asyncio.gather(
                            *[_synth_chunk(items, dev) for items, dev in chunks]
                        )
                        for (items, _), chunk_results in zip(chunks, results_per_chunk):
                            for (j, _), wav in zip(items, chunk_results):
                                generated_audios[j] = wav
                        wav_bytes_list = None  # already stored above
                    else:
                        # --- Single-GPU branch (original behaviour) ---
                        wav_bytes_list = await asyncio.to_thread(
                            tts_engine.synthesize_batch, texts, model_name, None,
                            voice_id, voice_description, language
                        )
                        for (j, _), wav_bytes in zip(to_generate, wav_bytes_list):
                            generated_audios[j] = wav_bytes

                    # Profile VRAM cost on first real batch (single-GPU only)
                    if not _first_batch_done["done"] and torch.cuda.is_available() and len(texts) > 1:
                        _vram_after = torch.cuda.memory_allocated()
                        _delta_gb = (_vram_after - _vram_before) / (1024 ** 3)
                        if _delta_gb > 0:
                            _profiled_cost["gb"] = _delta_gb / len(texts)
                            print(f"[VRAM] Profiled cost: {_profiled_cost['gb']:.3f}GB/seg "
                                  f"(measured on batch of {len(texts)})")
                    _first_batch_done["done"] = True

                except torch.cuda.OutOfMemoryError as oom_e:
                    print(f"[VRAM] OOM on batch size {len(texts)}, halving and retrying: {oom_e}")
                    import gc as _gc; _gc.collect()
                    torch.cuda.empty_cache()
                    # Halve the effective batch size for future iterations
                    current_batch_size = max(1, current_batch_size // 2)
                    # Also update profiled cost to prevent recurrence
                    _, cfg_cost, _ = _get_model_config(model_name)
                    _profiled_cost["gb"] = (_profiled_cost["gb"] or cfg_cost) * 2.0
                    print(f"[VRAM] Updated cost estimate to {_profiled_cost['gb']:.3f}GB/seg after OOM")
                    _oom_retry = True
                except Exception as e:
                    print(f"[TTS] Batch synthesis failed, falling back to sequential: {e}")
                    _oom_retry = True

                if _oom_retry:
                    # Use skip_cleanup=True for Qwen to avoid N×flush; we flush once after the loop
                    for j, seg in to_generate:
                        try:
                            wav_bytes = await asyncio.to_thread(
                                tts_engine.synthesize, seg.text, model_name, None, voice_id, voice_description, language,
                                True  # skip_cleanup — single flush below
                            )
                            generated_audios[j] = wav_bytes
                        except Exception as inner_e:
                            print(f"[TTS] Fallback synthesis failed for segment {seg.index}: {inner_e}")
                            from pydub import AudioSegment
                            silent = AudioSegment.silent(duration=1000)
                            buf = io.BytesIO()
                            silent.export(buf, format="wav")
                            generated_audios[j] = buf.getvalue()
                    # Single VRAM flush after the entire fallback loop
                    import gc as _gc; _gc.collect()
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()

            # --- BATCH DB SAVE: read job once per batch, not per segment ---
            job_record = get_job(job_id) if job_id else None
            db_segments_by_index: dict = {}
            if job_record and job_record.modified_segments:
                for s in job_record.modified_segments:
                    s_dict = s.dict() if hasattr(s, 'dict') else dict(s)
                    db_segments_by_index[s_dict.get("index")] = s_dict
            batch_had_new_audio = False
            # --------------------------------------------------------------

            # Process the batch and yield updates sequentially to SSE
            for j, item in enumerate(batch):
                global_idx = i + j
                seg = item["segment"]

                if item["audio_bytes"]:
                    wav_bytes = item["audio_bytes"]
                    msg = f"[SKIP] Segment #{seg.index} already has audio."
                else:
                    wav_bytes = generated_audios.get(j)
                    msg = f"✓ Segment #{seg.index} completed."

                segments_with_audio.append((seg, wav_bytes))

                # Encode individual segment for preview
                seg_audio_b64 = base64.b64encode(wav_bytes).decode('utf-8')

                # Accumulate DB changes — file save per-segment, DB write deferred
                if job_id and not item["audio_bytes"] and job_record:
                    try:
                        audio_path = save_segment_audio(
                            job_record.original_filename, job_id, seg.index, wav_bytes
                        )
                        if seg.index in db_segments_by_index:
                            db_segments_by_index[seg.index]["audioUrl"] = audio_path
                            db_segments_by_index[seg.index].pop("audioBase64", None)
                            db_segments_by_index[seg.index]["voice_id"] = voice_id
                            db_segments_by_index[seg.index]["model_name"] = model_name
                            db_segments_by_index[seg.index]["language"] = language
                            batch_had_new_audio = True
                    except Exception as db_e:
                        print(f"[DB] ✗ Failed to save audio file for segment {seg.index}: {db_e}")

                after_progress = int(((global_idx + 1) / total_items) * 100)
                if after_progress >= 100: after_progress = 99

                queue_manager.update_task(task_id, progress=after_progress)

                yield {
                    "progress": after_progress,
                    "total_items": total_items,
                    "current_item": global_idx + 1,
                    "segment_index": seg.index,
                    "segment_text": seg.text,
                    "segment_audio_b64": seg_audio_b64,
                    "voice_id": voice_id,
                    "model_name": model_name,
                    "language": language,
                    "message": msg
                }

            # Single DB write for the entire batch
            if job_id and batch_had_new_audio and db_segments_by_index:
                try:
                    update_job(job_id, JobUpdate(modified_segments=list(db_segments_by_index.values())))
                    new_segs = [item["segment"].index for item in batch if not item["audio_bytes"]]
                    print(f"[DB] Batch saved {len(new_segs)} segment(s) in one write: {new_segs}")
                except Exception as db_e:
                    print(f"[DB] ✗ Batch write failed: {db_e}")

            # Explicit VRAM flush between batches
            import gc as _gc
            _gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()

            i += current_batch_size

        yield {
            "progress": 100, 
            "total_items": total_items, 
            "current_item": total_items, 
            "message": "Finalizing audio file..."
        }
        final_audio_bytes = await asyncio.to_thread(align_subtitles_audio, segments_with_audio, output_format)
        
        # PERSISTENCE
        audio_filename = None
        try:
            output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "outputs"))
            os.makedirs(output_dir, exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            audio_filename = f"subtitle_voiceover_{timestamp}.{output_format.lower()}"
            with open(os.path.join(output_dir, audio_filename), "wb") as f:
                f.write(final_audio_bytes)
        except Exception as e:
            print(f"[Output] Failed to save output file: {e}")

        yield {
            "progress": 100,
            "message": "Completed!",
            "audio_url": f"/outputs/{audio_filename}" if audio_filename else None,
            "format": output_format.lower()
        }

    task_id = queue_manager.submit_task(subtitle_job)
    return {"status": "success", "task_id": task_id}

@router.post("/tasks/generate")
async def create_generation_task(
    script_file: Optional[UploadFile] = File(None),
    script_text: Optional[str] = Form(None),
    speaker_voice_map: str = Form("{}"),
    model_name: str = Form("Qwen3-TTS-12Hz-1.7B-Base"),
    voice_description: Optional[str] = Form(None),
    language: Optional[str] = Form(None)
):
    """Creates a background task for untimed script voiceover generation."""
    content_str = None
    if script_file:
        if not script_file.filename.endswith((".txt", ".md", ".srt", ".vtt")):
            raise HTTPException(status_code=400, detail="Invalid script format.")
        file_content = await script_file.read()
        content_str = file_content.decode("utf-8")
    elif script_text:
        content_str = script_text.strip()
    else:
        raise HTTPException(status_code=400, detail="Either script_file or script_text is required")
        
    try:
        speaker_voice_map_dict = json.loads(speaker_voice_map)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid speaker_voice_map JSON")

    script_lines = parse_script(content_str)
    if not script_lines:
        raise HTTPException(status_code=400, detail="No valid speaker lines found in script")

    # Enforce speaker limits
    unique_speakers = list(set(l.speaker for l in script_lines))
    if model_name == "VibeVoice-Streaming-0.5B" and len(unique_speakers) > 1:
        raise HTTPException(status_code=400, detail="VibeVoice-0.5B model supports only 1 speaker.")
    if len(unique_speakers) > 4:
        raise HTTPException(status_code=400, detail=f"Maximum 4 speakers allowed for {model_name}. Detected: {len(unique_speakers)}")

    async def generation_job(task_id: str):
        import os
        from datetime import datetime

        total_items = len(script_lines)
        lines_with_audio = [None] * total_items

        def _gen_batch_size() -> int:
            user_override = config_manager.settings.get("tts", {}).get("batch_overrides", {}).get(model_name)
            if user_override is not None:
                return int(user_override)
            if not torch.cuda.is_available():
                return 1
            try:
                free_bytes, _ = torch.cuda.mem_get_info()
                return vram_recommended_batch(model_name, free_bytes / (1024 ** 3))
            except Exception:
                return 2

        # Group consecutive lines by same voice_id for efficient batching
        i = 0
        while i < total_items:
            task_state = queue_manager.get_task(task_id)
            if task_state.get("status") == TaskStatus.CANCELLED:
                if task_state.get("finalize_on_cancel"):
                    break
                return

            batch_size = _gen_batch_size()

            # Collect a batch of consecutive lines with the same voice
            voice_id = speaker_voice_map_dict.get(script_lines[i].speaker)
            if not voice_id:
                raise Exception(f"No voice found for {script_lines[i].speaker}")

            batch_indices = [i]
            j = i + 1
            while j < total_items and j - i < batch_size:
                next_voice = speaker_voice_map_dict.get(script_lines[j].speaker)
                if next_voice != voice_id:
                    break
                batch_indices.append(j)
                j += 1

            batch_texts = [script_lines[k].text for k in batch_indices]
            current_progress = int((i / total_items) * 100)
            yield {
                "progress": current_progress,
                "total_items": total_items,
                "current_item": i + 1,
                "message": f"[TTS] Synthesizing {len(batch_texts)} line(s) starting at #{i + 1}..."
            }

            try:
                wav_list = await asyncio.to_thread(
                    tts_engine.synthesize_batch, batch_texts, model_name, None, voice_id, voice_description, language
                )
                for k, wav_bytes in zip(batch_indices, wav_list):
                    lines_with_audio[k] = wav_bytes
            except Exception as e:
                print(f"[TTS] generation_job batch failed, falling back to sequential: {e}")
                for k in batch_indices:
                    try:
                        wav_bytes = await asyncio.to_thread(
                            tts_engine.synthesize, script_lines[k].text, model_name, None, voice_id, voice_description, language
                        )
                        lines_with_audio[k] = wav_bytes
                    except Exception as inner_e:
                        print(f"[TTS] Sequential fallback failed for line {k}: {inner_e}")
                        from pydub import AudioSegment as _AS
                        buf = io.BytesIO()
                        _AS.silent(duration=500).export(buf, format="wav")
                        lines_with_audio[k] = buf.getvalue()

            after_progress = int(((batch_indices[-1] + 1) / total_items) * 100)
            if after_progress >= 100: after_progress = 99
            queue_manager.update_task(task_id, progress=after_progress)
            i = batch_indices[-1] + 1

        yield {"progress": 100, "message": "Finalizing audio file..."}
        # Replace any None entries (cancelled mid-job) with silence
        from pydub import AudioSegment as _AS
        for k in range(len(lines_with_audio)):
            if lines_with_audio[k] is None:
                buf = io.BytesIO()
                _AS.silent(duration=500).export(buf, format="wav")
                lines_with_audio[k] = buf.getvalue()
        final_audio_bytes = await asyncio.to_thread(align_script_audio, lines_with_audio)
        
        # PERSISTENCE
        audio_filename = None
        try:
            output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "outputs"))
            os.makedirs(output_dir, exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            audio_filename = f"script_voiceover_{timestamp}.mp3"
            with open(os.path.join(output_dir, audio_filename), "wb") as f:
                f.write(final_audio_bytes)
        except Exception as e:
            print(f"[Output] Failed to save output file: {e}")

        yield {
            "progress": 100,
            "message": "Completed!",
            "audio_url": f"/outputs/{audio_filename}" if audio_filename else None,
        }
        
    task_id = queue_manager.submit_task(generation_job)
    return {"status": "success", "task_id": task_id}


@router.get("/tasks/active")
async def get_active_task():
    """Returns the currently running or queued task, if any."""
    task = queue_manager.get_active_task()
    if not task:
        return {"active": False}
    return {
        "active": True,
        "task_id": task["id"],
        "status": task["status"],
        "progress": task.get("progress", 0),
        "current_item": task.get("current_item"),
        "total_items": task.get("total_items"),
    }

@router.get("/tasks/{task_id}/stream")
async def stream_task_progress(task_id: str):
    """SSE endpoint to stream progress updates for a background task."""
    task = queue_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    async def event_generator():
        last_progress_val = -1
        last_log_count = 0
        sent_segments_count = 0
        
        while True:
            current_task = queue_manager.get_task(task_id)
            if not current_task:
                yield f"data: {json.dumps({'type': 'error', 'message': 'Task not found'})}\n\n"
                break
                
            status = current_task["status"]
            progress = current_task["progress"]
            logs = current_task["logs"]
            segments = current_task.get("segments", [])
            
            current_item = current_task.get("current_item")
            total_items = current_task.get("total_items")
            
            new_segments = []
            if len(segments) > sent_segments_count:
                new_segments = segments[sent_segments_count:]
                sent_segments_count = len(segments)
            
            if progress != last_progress_val or len(logs) > last_log_count or new_segments:
                status_msg = logs[-1] if len(logs) > 0 else "Initializing..."
                
                payload = {
                    "status": status_msg,
                    "progress": progress,
                    "current_item": current_item,
                    "total_items": total_items,
                    "new_segments": new_segments 
                }
                
                if status == TaskStatus.COMPLETED and current_task.get("audio_url"):
                    payload.update({"type": "complete", "audioUrl": current_task["audio_url"]})
                    yield f"data: {json.dumps(payload)}\n\n"
                    break
                elif status == TaskStatus.FAILED:
                    payload.update({"type": "error", "message": status_msg})
                    yield f"data: {json.dumps(payload)}\n\n"
                    break
                elif status == TaskStatus.CANCELLED:
                    payload.update({"type": "error", "message": "Task was cancelled"})
                    yield f"data: {json.dumps(payload)}\n\n"
                    break
                else: 
                    payload.update({"type": "progress"})
                    yield f"data: {json.dumps(payload)}\n\n"
                
                last_progress_val = progress
                last_log_count = len(logs)
                
            await asyncio.sleep(0.1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )

@router.post("/tasks/{task_id}/cancel")
async def cancel_task(task_id: str, finalize: bool = Query(False)):
    """Cancels a running background task."""
    cancelled = queue_manager.cancel_task(task_id, finalize=finalize)
    if not cancelled:
        raise HTTPException(status_code=400, detail="Task not found or already finished")
    return {"status": "success"}
