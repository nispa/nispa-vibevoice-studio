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

from core.config import TRANSLATION_MODELS_DIR

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


