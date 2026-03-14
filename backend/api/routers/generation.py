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

router = APIRouter(prefix="/api")

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

