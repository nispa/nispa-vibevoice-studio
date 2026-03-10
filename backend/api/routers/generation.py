import io
import json
import asyncio
import aiohttp
import re
from typing import Optional, List
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Query, Body
from fastapi.responses import StreamingResponse

from core.parser import parse_subtitles, parse_script, group_subtitles_by_punctuation, SubtitleSegment
from core.tts_provider import tts_engine
from core.aligner import align_subtitles_audio, align_script_audio
from core.queue_manager import queue_manager, TaskStatus

router = APIRouter(prefix="/api")

@router.get("/ollama/models")
async def get_ollama_models():
    """
    Fetches available models from the local Ollama instance.

    Returns:
        dict: A dictionary containing a list of available model names.
    """
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get("http://localhost:11434/api/tags") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    models = [m.get("name") for m in data.get("models", [])]
                    return {"models": models}
                else:
                    return {"models": []}
    except Exception:
        return {"models": []}

@router.post("/translate-segment")
async def translate_segment(
    text: str = Form(...),
    target_language: str = Form("English"),
    model_name: str = Form("llama3"),
    prompt: Optional[str] = Form(None)
):
    """
    Translates a single text segment using local Ollama.

    Args:
        text (str): The text to translate.
        target_language (str, optional): The language to translate into. Defaults to "English".
        model_name (str, optional): The Ollama model to use. Defaults to "llama3".
        prompt (Optional[str], optional): Custom prompt for translation. Defaults to None.

    Returns:
        dict: A dictionary containing the translated text.

    Raises:
        HTTPException: If translation fails or Ollama is unreachable.
    """
    try:
        async with aiohttp.ClientSession() as session:
            if prompt:
                final_prompt = prompt.replace("{target_language}", target_language).replace("{text}", text)
            else:
                final_prompt = f"Translation prompt: Translate the following subtitle text to {target_language}. Keep the same tone. Return ONLY the translation, no extra text, no quotes, no explanations:\n{text}"
                
            payload = {
                "model": model_name,
                "prompt": final_prompt,
                "stream": False
            }
            async with session.post("http://localhost:11434/api/generate", json=payload) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    translated_text = data.get("response", "").strip()
                    translated_text = re.sub(r'<think>.*?</think>', '', translated_text, flags=re.DOTALL).strip()
                    if translated_text.startswith('"') and translated_text.endswith('"'):
                        translated_text = translated_text[1:-1].strip()
                    return {"translated_text": translated_text}
                else:
                    raise HTTPException(status_code=502, detail=f"Ollama translation failed with status {resp.status}")
    except aiohttp.ClientError:
         raise HTTPException(status_code=503, detail="Could not connect to local Ollama on port 11434.")
    except Exception as e:
         raise HTTPException(status_code=500, detail=f"Translation error: {str(e)}")

@router.post("/preview-subtitles")
async def preview_subtitles(
    subtitle_file: UploadFile = File(...),
    group_by_punctuation: bool = Query(False)
):
    """
    Preview subtitle segments with optional grouping by punctuation.

    Args:
        subtitle_file (UploadFile): The .srt or .vtt file to preview.
        group_by_punctuation (bool, optional): Whether to group segments by sentence. Defaults to False.

    Returns:
        dict: A summary and list of processed subtitle segments.

    Raises:
        HTTPException: If the file format is invalid or parsing fails.
    """
    if not subtitle_file.filename.endswith((".srt", ".vtt")):
        raise HTTPException(status_code=400, detail="Invalid subtitle format. Use .srt or .vtt")
    
    is_vtt = subtitle_file.filename.endswith(".vtt")
    content = await subtitle_file.read()
    content_str = content.decode("utf-8")
    
    try:
        segments = parse_subtitles(content_str, is_vtt=is_vtt)
        
        if group_by_punctuation:
            segments = group_subtitles_by_punctuation(segments)
        
        # Return segments as JSON
        return {
            "original_count": len(segments),
            "final_count": len(segments),
            "segments": [
                {
                    "index": seg.index,
                    "start_ms": seg.start_time_ms,
                    "end_ms": seg.end_time_ms,
                    "text": seg.text,
                    "duration_sec": (seg.end_time_ms - seg.start_time_ms) / 1000
                }
                for seg in segments
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing subtitles: {str(e)}")


@router.post("/translate-subtitles")
async def translate_subtitles(
    subtitle_file: UploadFile = File(...),
    target_language: str = Form("English"),
    model_name: str = Form("llama3")
):
    """
    Translates all segments of a subtitle file into the target language.

    Args:
        subtitle_file (UploadFile): The .srt or .vtt file to translate.
        target_language (str, optional): The destination language. Defaults to "English".
        model_name (str, optional): The Ollama model to use. Defaults to "llama3".

    Returns:
        dict: A dictionary containing the translated segments.

    Raises:
        HTTPException: If the file format is invalid, parsing fails, or translation errors occur.
    """
    if not subtitle_file.filename.endswith((".srt", ".vtt")):
        raise HTTPException(status_code=400, detail="Invalid subtitle format. Use .srt or .vtt")
        
    is_vtt = subtitle_file.filename.endswith(".vtt")
    content = await subtitle_file.read()
    content_str = content.decode("utf-8")
    
    try:
        segments = parse_subtitles(content_str, is_vtt=is_vtt)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing subtitles: {str(e)}")
        
    translated_segments = []
    
    # We will use a aiohttp ClientSession to perform async requests to Ollama
    try:
        async with aiohttp.ClientSession() as session:
            for seg in segments:
                prompt = f"You are a professional subtitle translator. Translate the following subtitle text to {target_language}. Keep the same tone. Return ONLY the translation, no extra text, no quotes, no explanations and don't add any additional information, and don't think:\n{seg.text}"
                
                payload = {
                    "model": model_name,
                    "prompt": prompt,
                    "stream": False
                }
                
                async with session.post("http://localhost:11434/api/generate", json=payload) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        translated_text = data.get("response", "").strip()
                        translated_text = re.sub(r'<think>.*?</think>', '', translated_text, flags=re.DOTALL).strip()
                        # If ollama returned something wrapped in quotes, maybe strip them
                        if translated_text.startswith('"') and translated_text.endswith('"'):
                            translated_text = translated_text[1:-1].strip()
                            
                        translated_segments.append({
                            "index": seg.index,
                            "start_ms": seg.start_time_ms,
                            "end_ms": seg.end_time_ms,
                            "text": translated_text,
                            "duration_sec": (seg.end_time_ms - seg.start_time_ms) / 1000
                        })
                    else:
                        raise HTTPException(status_code=502, detail=f"Ollama translation failed with status {resp.status}")
    except aiohttp.ClientError:
         raise HTTPException(status_code=503, detail="Could not connect to local Ollama on port 11434.")
    except Exception as e:
         raise HTTPException(status_code=500, detail=f"Translation error: {str(e)}")

    return {
        "original_count": len(segments),
        "final_count": len(translated_segments),
        "segments": translated_segments
    }


@router.post("/generate-audio")
async def generate_audio(
    subtitle_file: Optional[UploadFile] = File(None),
    voice_id: str = Form(...),
    model_name: str = Form("VibeVoice-1.5B"),
    group_by_punctuation: bool = Form(False),
    subtitle_segments: Optional[str] = Form(None),
    voice_description: Optional[str] = Form(None),
    language: Optional[str] = Form(None)
):
    """
    Synchronously generates and aligns audio for subtitle segments.

    Args:
        subtitle_file (Optional[UploadFile], optional): Subtitle file. Defaults to None.
        voice_id (str): Reference voice ID for synthesis.
        model_name (str, optional): TTS model to use. Defaults to "VibeVoice-1.5B".
        group_by_punctuation (bool, optional): Group segments by sentence. Defaults to False.
        subtitle_segments (Optional[str], optional): JSON string of segments. Defaults to None.

    Returns:
        StreamingResponse: The combined audio file (MP3).

    Raises:
        HTTPException: If inputs are missing or invalid, or if synthesis fails.
    """
    segments = []

    if subtitle_segments:
        try:
            segments_data = json.loads(subtitle_segments)
            for seg in segments_data:
                # Map frontend keys to SubtitleSegment (start_ms -> start_time_ms)
                segments.append(SubtitleSegment(
                    index=seg.get("index", 0),
                    start_time_ms=seg.get("start_ms", 0),
                    end_time_ms=seg.get("end_ms", 0),
                    text=seg.get("text", "")
                ))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid subtitle_segments JSON: {str(e)}")
    elif subtitle_file:
        if not subtitle_file.filename.endswith((".srt", ".vtt")):
            raise HTTPException(status_code=400, detail="Invalid subtitle format. Use .srt or .vtt")
        
        is_vtt = subtitle_file.filename.endswith(".vtt")
        content = await subtitle_file.read()
        content_str = content.decode("utf-8")
        try:
            segments = parse_subtitles(content_str, is_vtt=is_vtt)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error parsing subtitles: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Either subtitle_file or subtitle_segments is required")

    if not voice_id or voice_id.strip() == "":
        raise HTTPException(status_code=400, detail="voice_id is required")

    try:
        # Apply grouping if requested
        if group_by_punctuation:
            segments = group_subtitles_by_punctuation(segments)
        
        segments_with_audio = []
        for seg in segments:
            wav_bytes = await asyncio.to_thread(
                tts_engine.synthesize, seg.text, model_name, None, voice_id, voice_description, language
            )
            segments_with_audio.append((seg, wav_bytes))
            
        final_mp3_bytes = align_subtitles_audio(segments_with_audio)
        
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating audio: {str(e)}")

    return StreamingResponse(
        io.BytesIO(final_mp3_bytes), 
        media_type="audio/mpeg", 
        headers={"Content-Disposition": f"attachment; filename=generated_audio.mp3"}
    )
@router.post("/generate-script")
async def generate_script(
    script_file: Optional[UploadFile] = File(None),
    script_text: Optional[str] = Form(None),
    speaker_voice_map: str = Form("{}"),
    model_name: str = Form("VibeVoice-1.5B"),
    voice_description: Optional[str] = Form(None),
    language: Optional[str] = Form(None)
):
    """
    Synchronously generates audio for an untimed script.

    Args:
        script_file (Optional[UploadFile], optional): Script file (.txt, .md). Defaults to None.
        script_text (Optional[str], optional): Raw script text. Defaults to None.
        speaker_voice_map (str, optional): JSON mapping of speakers to voice IDs. Defaults to "{}".
        model_name (str, optional): TTS model to use. Defaults to "VibeVoice-1.5B".

    Returns:
        StreamingResponse: The combined audio file (MP3).

    Raises:
        HTTPException: If inputs are invalid or voice mappings are missing.
    """
    content_str = None
    if script_file:
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

    lines_with_audio = []
    for line in script_lines:
        voice_id = speaker_voice_map_dict.get(line.speaker)
        if not voice_id:
            available = list(set(l.speaker for l in script_lines))
            raise HTTPException(
                status_code=400, 
                detail=f"No voice mapping found for speaker '{line.speaker}'. Available: {available}"
            )
        
        wav_bytes = await asyncio.to_thread(
            tts_engine.synthesize, line.text, model_name, None, voice_id, voice_description, language
        )
        lines_with_audio.append(wav_bytes)
        
    final_mp3_bytes = align_script_audio(lines_with_audio)

    return StreamingResponse(
        io.BytesIO(final_mp3_bytes), 
        media_type="audio/mpeg", 
        headers={"Content-Disposition": f"attachment; filename=generated_script.mp3"}
    )


@router.post("/tasks/generate-subtitles")
async def create_subtitle_task(
    subtitle_file: Optional[UploadFile] = File(None),
    voice_id: str = Form(...),
    model_name: str = Form("VibeVoice-1.5B"),
    group_by_punctuation: bool = Form(False),
    subtitle_segments: Optional[str] = Form(None),
    output_format: str = Form("mp3"),
    voice_description: Optional[str] = Form(None),
    language: Optional[str] = Form(None)
):
    """
    Creates a background task for timed subtitle voiceover generation.

    Args:
        subtitle_file (Optional[UploadFile], optional): Subtitle file. Defaults to None.
        voice_id (str): Reference voice ID.
        model_name (str, optional): TTS model. Defaults to "VibeVoice-1.5B".
        group_by_punctuation (bool, optional): Group segments. Defaults to False.
        subtitle_segments (Optional[str], optional): JSON segments. Defaults to None.
        output_format (str, optional): Output format ("mp3" or "wav"). Defaults to "mp3".
        voice_description (Optional[str], optional): Voice Design description. Defaults to None.

    Returns:
        dict: success status and task_id.
    """
    segments = []

    if subtitle_segments:
        try:
            segments_data = json.loads(subtitle_segments)
            for seg in segments_data:
                segments.append(SubtitleSegment(
                    index=seg.get("index", 0),
                    start_time_ms=seg.get("start_ms", 0),
                    end_time_ms=seg.get("end_ms", 0),
                    text=seg.get("text", "")
                ))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid subtitle_segments JSON: {str(e)}")
    elif subtitle_file:
        is_vtt = subtitle_file.filename.endswith(".vtt")
        content = await subtitle_file.read()
        content_str = content.decode("utf-8")
        segments = parse_subtitles(content_str, is_vtt=is_vtt)
    else:
        raise HTTPException(status_code=400, detail="Either subtitle_file or subtitle_segments is required")

    async def subtitle_job(task_id: str):
        import base64
        import os
        from datetime import datetime
        
        # Apply grouping if requested
        job_segments = segments
        if group_by_punctuation:
            job_segments = group_subtitles_by_punctuation(segments)
        
        total_items = len(job_segments)
        segments_with_audio = []
        
        for idx, seg in enumerate(job_segments):
            task_state = queue_manager.get_task(task_id)
            if task_state.get("status") == TaskStatus.CANCELLED:
                if task_state.get("finalize_on_cancel"):
                    break # Allow finalization
                return

            # Update progress BEFORE synthesis to show which item is active
            # We use (idx / total) * 100
            current_progress = int((idx / total_items) * 100)
            yield {
                "progress": current_progress, 
                "total_items": total_items,
                "current_item": idx + 1,
                "message": f"[TTS] Synthesizing text #{seg.index} ({len(seg.text)} chars): '{seg.text}'"
            }

            wav_bytes = await asyncio.to_thread(
                tts_engine.synthesize, seg.text, model_name, None, voice_id, voice_description, language
            )
            segments_with_audio.append((seg, wav_bytes))
            
            # Update progress AFTER synthesis to show completion of that item
            # If it's the last item, we'll set 95% to leave room for finalization
            after_progress = int(((idx + 1) / total_items) * 100)
            if after_progress >= 100: after_progress = 99
            
            queue_manager.update_task(task_id, progress=after_progress)

        # Final jump after all items are done
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
    """
    Creates a background task for untimed script voiceover generation.

    Args:
        script_file (Optional[UploadFile], optional): Script file. Defaults to None.
        script_text (Optional[str], optional): Raw script text. Defaults to None.
        speaker_voice_map (str, optional): JSON speaker-voice mapping. Defaults to "{}".
        model_name (str, optional): TTS model. Defaults to "VibeVoice-1.5B".
        voice_description (Optional[str], optional): Voice Design description. Defaults to None.

    Returns:
        dict: success status and task_id.
    """
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
                
            # Report progress BEFORE synthesis
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

            # Report progress AFTER synthesis
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
    """
    SSE endpoint to stream progress updates for a background task.

    Args:
        task_id (str): The ID of the task to track.

    Returns:
        StreamingResponse: Event stream of task updates.

    Raises:
        HTTPException: If the task ID is not found.
    """
    task = queue_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    async def event_generator():
        last_progress_val = -1
        last_log_count = 0
        
        while True:
            current_task = queue_manager.get_task(task_id)
            if not current_task:
                yield f"data: {json.dumps({'type': 'error', 'message': 'Task not found'})}\n\n"
                break
                
            status = current_task["status"]
            progress = current_task["progress"]
            logs = current_task["logs"]
            
            # Extract additional metadata from the task if available
            # This is critical for accurate progress tracking in the UI
            current_item = current_task.get("current_item")
            total_items = current_task.get("total_items")
            
            if progress != last_progress_val or len(logs) > last_log_count:
                status_msg = logs[-1] if len(logs) > 0 else "Initializing..."
                
                # CRITICAL: Always include current_item and total_items in SSE payload
                # to allow precise frontend progress calculation based on segment count.
                payload = {
                    "status": status_msg,
                    "progress": progress,
                    "current_item": current_item,
                    "total_items": total_items
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
    """
    Cancels a running background task.

    Args:
        task_id (str): ID of the task to cancel.
        finalize (bool, optional): Whether to finalize partial results. Defaults to False.

    Returns:
        dict: success status.

    Raises:
        HTTPException: If task is not found or already completed.
    """
    cancelled = queue_manager.cancel_task(task_id, finalize=finalize)
    if not cancelled:
        raise HTTPException(status_code=400, detail="Task not found or already finished")
    return {"status": "success"}
