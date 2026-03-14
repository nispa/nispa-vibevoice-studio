import io
import json
import asyncio
import re
from typing import Optional, List
import requests
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Query, Body
from fastapi.responses import StreamingResponse

from core.parser import parse_subtitles, parse_script, group_subtitles_by_punctuation, SubtitleSegment
from core.tts_provider import tts_engine
from core.translator import translator
from core.aligner import align_subtitles_audio, align_script_audio
from core.queue_manager import queue_manager, TaskStatus

from core.config import TRANSLATION_MODELS_DIR
import os

router = APIRouter(prefix="/api")

# Global translator instance (lazy)
_translator = None

def get_translator():
    global _translator
    if _translator is None:
        from core.translator import translator as trans_instance
        _translator = trans_instance
    return _translator

OLLAMA_URL = "http://127.0.0.1:11434"

def get_ollama_local_models():
    """Helper to fetch models from local Ollama instance."""
    try:
        response = requests.get(f"{OLLAMA_URL}/api/tags", timeout=2)
        if response.status_code == 200:
            data = response.json()
            return [m["name"] for m in data.get("models", [])]
    except Exception:
        pass
    return []

@router.get("/ollama/models")
async def get_ollama_models():
    """
    Scans TRANSLATION_MODELS_DIR for available NLLB models AND fetches local Ollama models.
    """
    # 1. Get NLLB models
    nllb_models = []
    try:
        if os.path.exists(TRANSLATION_MODELS_DIR):
            nllb_models = [f for f in os.listdir(TRANSLATION_MODELS_DIR) 
                         if os.path.isdir(os.path.join(TRANSLATION_MODELS_DIR, f))]
        
        # Add default if missing and folder doesn't exist but we want to allow fallback
        if not nllb_models:
            nllb_models = ["NLLB-200-Distilled-600M"]
    except Exception:
        nllb_models = ["NLLB-200-Distilled-600M"]

    # 2. Get Ollama models
    ollama_models = await asyncio.to_thread(get_ollama_local_models)
    
    # Merge and return
    return {"models": nllb_models + ollama_models}

async def translate_with_ollama(text: str, model_name: str, target_language: str, source_language: str, prompt: Optional[str] = None):
    """Translates text using Ollama."""
    if not prompt:
        prompt = (f"Translate the following text from {source_language} to {target_language}. "
                 f"Output ONLY the translated text, no explanation, no quotes.\n\nText: {text}")
    else:
        # Fill placeholders if present
        prompt = prompt.replace("{target_language}", target_language)
        prompt = prompt.replace("{source_language}", source_language)
        prompt = prompt.replace("{text}", text)

    try:
        payload = {
            "model": model_name,
            "prompt": prompt,
            "stream": False
        }
        response = await asyncio.to_thread(requests.post, f"{OLLAMA_URL}/api/generate", json=payload, timeout=30)
        if response.status_code == 200:
            return response.json().get("response", "").strip()
        else:
            raise Exception(f"Ollama returned error {response.status_code}: {response.text}")
    except Exception as e:
        raise Exception(f"Ollama translation failed: {str(e)}")

@router.post("/translate-segment")
async def translate_segment(
    text: str = Form(...),
    target_language: str = Form("English"),
    source_language: str = Form("English"),
    model_name: str = Form("NLLB-200-Distilled-600M"),
    prompt: Optional[str] = Form(None)
):
    """
    Translates a single text segment using either the internal NLLB-200 engine or Ollama.
    """
    try:
        # Check if it's an NLLB model (exists in TRANSLATION_MODELS_DIR or is the default)
        is_nllb = model_name.startswith("NLLB") or os.path.exists(os.path.join(TRANSLATION_MODELS_DIR, model_name))
        
        if is_nllb:
            # Internal NLLB translation
            translated_text = await asyncio.to_thread(
                get_translator().translate, text, target_language, source_language, model_name
            )
        else:
            # External Ollama translation
            translated_text = await translate_with_ollama(text, model_name, target_language, source_language, prompt)
            
        return {"translated_text": translated_text}
    except Exception as e:
         raise HTTPException(status_code=500, detail=f"Translation error: {str(e)}")

@router.post("/translate-batch")
async def translate_batch(
    segments_json: str = Form(...),
    target_language: str = Form("English"),
    source_language: str = Form("English"),
    model_name: str = Form("NLLB-200-Distilled-600M"),
    prompt: Optional[str] = Form(None)
):
    """
    Translates multiple subtitle segments in a single batch.
    """
    try:
        segments_data = json.loads(segments_json)
        texts = [seg.get("text", "") for seg in segments_data]
        
        # Check if it's an NLLB model
        is_nllb = model_name.startswith("NLLB") or os.path.exists(os.path.join(TRANSLATION_MODELS_DIR, model_name))
        
        if is_nllb:
            # Internal NLLB translation
            translated_texts = await asyncio.to_thread(
                get_translator().translate_batch, texts, target_language, source_language, model_name
            )
        else:
            # External Ollama translation (one by one for now since /api/generate doesn't batch naturally like NLLB)
            # Alternatively, we could send a single prompt for all segments, but it's risky for large chunks.
            translated_texts = []
            for text in texts:
                trans = await translate_with_ollama(text, model_name, target_language, source_language, prompt)
                translated_texts.append(trans)
        
        # Reconstruct segments
        for i, seg in enumerate(segments_data):
            seg["original_text"] = seg.get("original_text") or seg.get("text")
            seg["text"] = translated_texts[i]
            seg["is_translated"] = True
            
        return {"segments": segments_data}
    except Exception as e:
         raise HTTPException(status_code=500, detail=f"Batch translation error: {str(e)}")

@router.post("/preview-subtitles")
async def preview_subtitles(
    subtitle_file: UploadFile = File(...),
    group_by_punctuation: bool = Query(False)
):
    """
    Preview subtitle segments with optional grouping by punctuation.
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
    source_language: str = Form("English"),
    model_name: str = Form("nllb-200")
):
    """
    Translates all segments of a subtitle file using the internal NLLB-200 engine.
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
        
    try:
        # Extract all texts for batch translation
        texts = [seg.text for seg in segments]
        
        # Translate in batch (more efficient)
        translated_texts = await asyncio.to_thread(
            get_translator().translate_batch, texts, target_language, source_language
        )
        
        translated_segments = []
        for i, seg in enumerate(segments):
            translated_segments.append({
                "index": seg.index,
                "start_ms": seg.start_time_ms,
                "end_ms": seg.end_time_ms,
                "text": translated_texts[i],
                "duration_sec": (seg.end_time_ms - seg.start_time_ms) / 1000
            })
            
        return {
            "original_count": len(segments),
            "final_count": len(translated_segments),
            "segments": translated_segments
        }
    except Exception as e:
         raise HTTPException(status_code=500, detail=f"Internal batch translation error: {str(e)}")


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


@router.post("/generate-segment")
async def generate_single_segment(
    text: str = Form(...),
    voice_id: str = Form(...),
    model_name: str = Form("VibeVoice-1.5B"),
    voice_description: Optional[str] = Form(None),
    language: Optional[str] = Form(None)
):
    """Generates audio for a single text segment."""
    try:
        import base64
        wav_bytes = await asyncio.to_thread(
            tts_engine.synthesize, text, model_name, None, voice_id, voice_description, language
        )
        audio_b64 = base64.b64encode(wav_bytes).decode('utf-8')
        return {"audio_base64": audio_b64}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Synthesis failed: {str(e)}")

@router.post("/finalize-audio")
async def finalize_audio(
    segments_json: str = Form(...),
    output_format: str = Form("mp3")
):
    """Joins specifically provided segments with audio URLs into a single file."""
    try:
        import base64
        segments_data = json.loads(segments_json)
        segments_with_audio = []
        
        for seg in segments_data:
            audio_url = seg.get("audioUrl", "")
            if not audio_url or not audio_url.startswith("data:audio/"):
                continue
                
            # Extract base64
            b64_data = audio_url.split(",")[1]
            wav_bytes = base64.b64decode(b64_data)
            
            segments_with_audio.append((
                SubtitleSegment(
                    index=seg.get("index", 0),
                    start_time_ms=seg.get("start_ms", 0),
                    end_time_ms=seg.get("end_ms", 0),
                    text=seg.get("text", "")
                ),
                wav_bytes
            ))
            
        if not segments_with_audio:
            raise HTTPException(status_code=400, detail="No segments with audio found")
            
        final_audio_bytes = await asyncio.to_thread(align_subtitles_audio, segments_with_audio, output_format)
        audio_b64 = base64.b64encode(final_audio_bytes).decode('utf-8')
        
        return {
            "audio_base64": audio_b64,
            "format": output_format.lower()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Finalization failed: {str(e)}")

@router.post("/export-audio-segments")
async def export_audio_segments(
    segments_json: str = Form(...)
):
    """Creates a ZIP archive containing individual audio segments."""
    import base64
    import zipfile
    from datetime import datetime
    
    try:
        segments_data = json.loads(segments_json)
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            for idx, seg in enumerate(segments_data):
                audio_url = seg.get("audioUrl", "")
                if not audio_url or not audio_url.startswith("data:audio/"):
                    continue
                
                # Extract base64
                b64_data = audio_url.split(",")[1]
                audio_bytes = base64.b64decode(b64_data)
                
                # Format: 001_text_snippet.wav
                safe_text = re.sub(r'[^\w\s-]', '', seg.get("text", "segment")[:20]).strip().replace(" ", "_")
                filename = f"{str(idx+1).zfill(3)}_{safe_text}.wav"
                
                zip_file.writestr(filename, audio_bytes)
        
        zip_buffer.seek(0)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        return StreamingResponse(
            zip_buffer,
            media_type="application/x-zip-compressed",
            headers={"Content-Disposition": f"attachment; filename=audio_segments_{timestamp}.zip"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

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
    """Creates a background task for timed subtitle voiceover generation."""
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
        
        # We need to re-parse potential audioUrls from subtitle_segments JSON
        job_segments = []
        if subtitle_segments:
            try:
                segments_data = json.loads(subtitle_segments)
                for seg in segments_data:
                    audio_url = seg.get("audioUrl")
                    audio_bytes = None
                    if audio_url and audio_url.startswith("data:audio/"):
                        try:
                            # Extract base64 part
                            b64_part = audio_url.split(",")[1]
                            audio_bytes = base64.b64decode(b64_part)
                        except:
                            pass
                    
                    job_segments.append({
                        "segment": SubtitleSegment(
                            index=seg.get("index", 0),
                            start_time_ms=seg.get("start_ms", 0),
                            end_time_ms=seg.get("end_ms", 0),
                            text=seg.get("text", "")
                        ),
                        "audio_bytes": audio_bytes
                    })
            except:
                # Fallback to segments list created above if JSON parsing fails here
                job_segments = [{"segment": s, "audio_bytes": None} for s in segments]
        else:
            job_segments = [{"segment": s, "audio_bytes": None} for s in segments]

        # Apply grouping ONLY if we started from a raw file (not segments from UI)
        if group_by_punctuation and not subtitle_segments:
            parsed_only = [s["segment"] for s in job_segments]
            grouped = group_subtitles_by_punctuation(parsed_only)
            job_segments = [{"segment": s, "audio_bytes": None} for s in grouped]
        
        total_items = len(job_segments)
        segments_with_audio = []
        
        for idx, item in enumerate(job_segments):
            seg = item["segment"]
            existing_audio = item["audio_bytes"]

            task_state = queue_manager.get_task(task_id)
            if task_state.get("status") == TaskStatus.CANCELLED:
                if task_state.get("finalize_on_cancel"):
                    break # Allow finalization
                return

            current_progress = int((idx / total_items) * 100)
            
            if existing_audio:
                yield {
                    "progress": current_progress, 
                    "total_items": total_items,
                    "current_item": idx + 1,
                    "message": f"[SKIP] Segment #{seg.index} already has audio."
                }
                wav_bytes = existing_audio
            else:
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
            
            # Encode individual segment for preview
            seg_audio_b64 = base64.b64encode(wav_bytes).decode('utf-8')

            after_progress = int(((idx + 1) / total_items) * 100)
            if after_progress >= 100: after_progress = 99
            
            queue_manager.update_task(task_id, progress=after_progress)
            
            yield {
                "progress": after_progress, 
                "total_items": total_items,
                "current_item": idx + 1,
                "segment_index": seg.index,
                "segment_text": seg.text,
                "segment_audio_b64": seg_audio_b64,
                "message": f"✓ Segment #{seg.index} completed."
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
