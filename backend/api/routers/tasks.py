import io
import json
import asyncio
import re
import os
import base64
from typing import Optional, List
import requests
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Query, Body
from fastapi.responses import StreamingResponse

from core.parser import parse_subtitles, parse_script, group_subtitles_by_punctuation, SubtitleSegment
from core.tts_provider import tts_engine
from core.aligner import align_subtitles_audio, align_script_audio
from core.queue_manager import queue_manager, TaskStatus
from db.database import get_job, update_job
from db.models import JobUpdate

router = APIRouter(prefix="/api")

@router.post("/tasks/generate-subtitles")
async def create_subtitle_task(
    subtitle_file: Optional[UploadFile] = File(None),
    voice_id: str = Form(...),
    model_name: str = Form("VibeVoice-1.5B"),
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
                        elif getattr(seg, 'audioUrl', None) and seg.audioUrl.startswith("data:audio/"):
                            try:
                                audio_bytes = base64.b64decode(seg.audioUrl.split(",")[1])
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

        def calculate_optimal_batch_size(model_name: str) -> int:
            import torch
            if not torch.cuda.is_available():
                return 1 # Fallback for CPU or MPS
            try:
                free_vram_bytes, _ = torch.cuda.mem_get_info()
                free_vram_gb = free_vram_bytes / (1024 ** 3)
                
                # Estimated VRAM cost per segment
                if "1.7B" in model_name:
                    cost_per_segment_gb = 1.8
                elif "0.6B" in model_name:
                    cost_per_segment_gb = 1.0
                else:
                    cost_per_segment_gb = 1.5
                    
                # 1GB absolute safety margin
                usable_vram = max(0, free_vram_gb - 1.0)
                calculated_batch = int(usable_vram // cost_per_segment_gb)
                
                # Clamp between 1 and 8
                return max(1, min(calculated_batch, 8))
            except Exception as e:
                print(f"[Sistema] Errore calcolo VRAM: {e}")
                return 2

        BATCH_SIZE = calculate_optimal_batch_size(model_name)
        print(f"[Sistema] VRAM analizzata. Batch Size dinamico impostato a: {BATCH_SIZE} per modello {model_name}")

        segments_with_audio = []
        
        for i in range(0, total_items, BATCH_SIZE):
            batch = job_segments[i:i+BATCH_SIZE]
            
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
                
                try:
                    wav_bytes_list = await asyncio.to_thread(
                        tts_engine.synthesize_batch, texts, model_name, None, voice_id, voice_description, language
                    )
                    for (j, _), wav_bytes in zip(to_generate, wav_bytes_list):
                        generated_audios[j] = wav_bytes
                except Exception as e:
                    print(f"[TTS] Batch synthesis failed, falling back to sequential: {e}")
                    for j, seg in to_generate:
                        try:
                            wav_bytes = await asyncio.to_thread(
                                tts_engine.synthesize, seg.text, model_name, None, voice_id, voice_description, language
                            )
                            generated_audios[j] = wav_bytes
                        except Exception as inner_e:
                            print(f"[TTS] Fallback synthesis failed for segment {seg.index}: {inner_e}")
                            from pydub import AudioSegment
                            silent = AudioSegment.silent(duration=1000)
                            buf = io.BytesIO()
                            silent.export(buf, format="wav")
                            generated_audios[j] = buf.getvalue()

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
                
                # --- REAL-TIME DB SAVE ---
                if job_id and not item["audio_bytes"]:
                    try:
                        job_record = get_job(job_id)
                        if job_record and job_record.modified_segments:
                            updated_segments = []
                            for s in job_record.modified_segments:
                                # Convert to dict if it's a Pydantic model
                                s_dict = s.dict() if hasattr(s, 'dict') else dict(s)
                                if s_dict.get("index") == seg.index:
                                    s_dict["audioBase64"] = seg_audio_b64
                                    s_dict["audioUrl"] = f"data:audio/wav;base64,{seg_audio_b64}"
                                    s_dict["voice_id"] = voice_id
                                    s_dict["model_name"] = model_name
                                    s_dict["language"] = language
                                updated_segments.append(s_dict)
                            
                            update_job(job_id, JobUpdate(modified_segments=updated_segments))
                            print(f"[DB] Real-time saved segment {seg.index} for job {job_id}")
                    except Exception as db_e:
                        print(f"[DB] ✗ Real-time save failed for segment {seg.index}: {db_e}")
                # -------------------------

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

        yield {
            "progress": 100, 
            "total_items": total_items, 
            "current_item": total_items, 
            "message": "Finalizing audio file..."
        }
        final_audio_bytes = await asyncio.to_thread(align_subtitles_audio, segments_with_audio, output_format)
        
        # PERSISTENCE
        try:
            output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "outputs"))
            os.makedirs(output_dir, exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"subtitle_voiceover_{timestamp}.{output_format.lower()}"
            with open(os.path.join(output_dir, filename), "wb") as f:
                f.write(final_audio_bytes)
        except:
            pass

        audio_b64 = base64.b64encode(final_audio_bytes).decode('utf-8')
        yield {
            "progress": 100, 
            "message": "Completed!", 
            "audio_b64": audio_b64,
            "format": output_format.lower()
        }

    task_id = queue_manager.submit_task(subtitle_job)
    return {"status": "success", "task_id": task_id}

@router.post("/tasks/generate")
async def create_generation_task(
    script_file: Optional[UploadFile] = File(None),
    script_text: Optional[str] = Form(None),
    speaker_voice_map: str = Form("{}"),
    model_name: str = Form("VibeVoice-1.5B"),
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
        import base64
        import os
        from datetime import datetime
        
        total_items = len(script_lines)
        lines_with_audio = []
        
        for idx, line in enumerate(script_lines):
            task_state = queue_manager.get_task(task_id)
            if task_state.get("status") == TaskStatus.CANCELLED:
                if task_state.get("finalize_on_cancel"):
                    break # Allow finalization
                return
                
            voice_id = speaker_voice_map_dict.get(line.speaker)
            if not voice_id:
                raise Exception(f"No voice found for {line.speaker}")
                
            current_progress = int((idx / total_items) * 100)
            yield {
                "progress": current_progress, 
                "total_items": total_items,
                "current_item": idx + 1,
                "message": f"[TTS] Synthesizing text #{idx + 1} ({len(line.text)} chars): '{line.text}'"
            }
            
            wav_bytes = await asyncio.to_thread(
                tts_engine.synthesize, line.text, model_name, None, voice_id, voice_description, language
            )

            lines_with_audio.append(wav_bytes)

            after_progress = int(((idx + 1) / total_items) * 100)
            if after_progress >= 100: after_progress = 99
            queue_manager.update_task(task_id, progress=after_progress)

        yield {"progress": 100, "message": "Finalizing audio file..."}
        final_audio_bytes = await asyncio.to_thread(align_script_audio, lines_with_audio)
        
        # PERSISTENCE
        try:
            output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "outputs"))
            os.makedirs(output_dir, exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"script_voiceover_{timestamp}.mp3"
            with open(os.path.join(output_dir, filename), "wb") as f:
                f.write(final_audio_bytes)
        except:
            pass

        audio_b64 = base64.b64encode(final_audio_bytes).decode('utf-8')
        yield {"progress": 100, "message": "Completed!", "audio_b64": audio_b64}
        
    task_id = queue_manager.submit_task(generation_job)
    return {"status": "success", "task_id": task_id}


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
                
                if status == TaskStatus.COMPLETED and current_task["audio_b64"]:
                    payload.update({"type": "complete", "audioBase64": current_task["audio_b64"]})
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
                
            await asyncio.sleep(0.5)

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
