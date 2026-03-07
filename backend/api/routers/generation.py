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
    Helps users see how subtitles will be processed before generation.
    
    group_by_punctuation: If True, groups segments separated mid-sentence back together
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
    Translates subtitle segments into the target language using local Ollama.
    Returns the JSON representation of the translated segments.
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
    subtitle_file: UploadFile = File(...),
    voice_id: str = Form(...),
    model_name: str = Form("VibeVoice-1.5B"),
    group_by_punctuation: bool = Form(False)
):
    """
    Timed Subtitles Workflow: Parses .srt/.vtt and aligns synthesized audio to timestamps.
    
    group_by_punctuation: If True, groups segments separated mid-sentence back together
    """
    if not subtitle_file.filename.endswith((".srt", ".vtt")):
        raise HTTPException(status_code=400, detail="Invalid subtitle format. Use .srt or .vtt")
    
    if not voice_id or voice_id.strip() == "":
        raise HTTPException(status_code=400, detail="voice_id is required")
        
    is_vtt = subtitle_file.filename.endswith(".vtt")
    content = await subtitle_file.read()
    content_str = content.decode("utf-8")

    try:
        segments = parse_subtitles(content_str, is_vtt=is_vtt)
        
        # Apply grouping if requested
        if group_by_punctuation:
            segments = group_subtitles_by_punctuation(segments)
        
        segments_with_audio = []
        for seg in segments:
            wav_bytes = await asyncio.to_thread(
                tts_engine.synthesize, seg.text, model_name, None, voice_id
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
    model_name: str = Form("VibeVoice-1.5B")
):
    """
    Untimed Script Workflow: Synchronous generation.
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
            tts_engine.synthesize, line.text, model_name, None, voice_id
        )
        lines_with_audio.append(wav_bytes)
        
    final_mp3_bytes = align_script_audio(lines_with_audio)

    return StreamingResponse(
        io.BytesIO(final_mp3_bytes), 
        media_type="audio/mpeg", 
        headers={"Content-Disposition": f"attachment; filename=generated_script.mp3"}
    )


@router.post("/tasks/generate")
async def create_generation_task(
    script_file: Optional[UploadFile] = File(None),
    script_text: Optional[str] = Form(None),
    speaker_voice_map: str = Form("{}"),
    model_name: str = Form("VibeVoice-1.5B")
):
    """
    Creates a new background task for untimed script generation.
    Returns the task_id.
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

    async def generation_job(task_id: str):
        import base64
        
        yield {"progress": 10, "message": "Parsing script..."}
        script_lines = parse_script(content_str)
        
        if not script_lines:
            raise Exception("No valid speaker lines found in script")
            
        total_lines = len(script_lines)
        yield {"progress": 15, "message": f"Found {total_lines} dialogue lines."}
        
        lines_with_audio = []
        for idx, line in enumerate(script_lines):
            await asyncio.sleep(0.01)
            
            voice_id = speaker_voice_map_dict.get(line.speaker)
            if not voice_id:
                available = list(set(l.speaker for l in script_lines))
                raise Exception(f"No voice found for {line.speaker}. (Available: {available})")
                
            progress = 20 + int((idx / total_lines) * 70)
            yield {"progress": progress, "message": f"Synthesizing [{line.speaker}] ({idx+1}/{total_lines}): {line.text[:40]}..."}
            
            # Send an explicit log that the model is generating
            yield {"progress": progress + 2, "message": f"Loading TTS Engine and computing audio for [{line.speaker}]..."}

            wav_bytes = await asyncio.to_thread(
                tts_engine.synthesize, line.text, model_name, None, voice_id
            )
            
            yield {"progress": progress + 5, "message": f"Audio for [{line.speaker}] generated successfully."}
            lines_with_audio.append(wav_bytes)

        yield {"progress": 90, "message": "Aligning final audio stream..."}
        final_mp3_bytes = await asyncio.to_thread(align_script_audio, lines_with_audio)
        
        audio_b64 = base64.b64encode(final_mp3_bytes).decode('utf-8')
        yield {"progress": 100, "message": "Completed!", "audio_b64": audio_b64}
        
    task_id = queue_manager.submit_task(generation_job)
    return {"status": "success", "task_id": task_id}


@router.get("/tasks/{task_id}/stream")
async def stream_task_progress(task_id: str):
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
            
            if progress != last_progress_val or len(logs) > last_log_count:
                status_msg = logs[-1] if len(logs) > 0 else "Initializing..."
                
                if status == TaskStatus.COMPLETED and current_task["audio_b64"]:
                    yield f"data: {json.dumps({'type': 'complete', 'audioBase64': current_task['audio_b64'], 'status': status_msg, 'progress': 100})}\n\n"
                    break
                elif status == TaskStatus.FAILED:
                    yield f"data: {json.dumps({'type': 'error', 'message': status_msg})}\n\n"
                    break
                elif status == TaskStatus.CANCELLED:
                    yield f"data: {json.dumps({'type': 'error', 'message': 'Task was cancelled'})}\n\n"
                    break
                else: 
                    yield f"data: {json.dumps({'type': 'progress', 'status': status_msg, 'progress': progress})}\n\n"
                
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
async def cancel_task(task_id: str):
    cancelled = queue_manager.cancel_task(task_id)
    if not cancelled:
        raise HTTPException(status_code=400, detail="Task not found or already finished")
    return {"status": "success"}
