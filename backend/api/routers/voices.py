import os
import io
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from pydub import AudioSegment
from core.config import VOICES_DIR, MODELS_DIR

router = APIRouter(prefix="/api")

@router.get("/models")
def list_models():
    """
    Returns a list of available models from the data/model directory.
    """
    models = []
    if MODELS_DIR.exists():
        for entry in os.listdir(MODELS_DIR):
            if os.path.isdir(MODELS_DIR / entry):
                models.append(entry)
    return {"models": models}

@router.get("/voices")
def list_voices():
    """
    Returns a list of available voices from data/voices/ directory.
    Each voice is a pre-recorded WAV file with format: {lang}-{name}_{gender}.wav
    Example: it-davide_man.wav -> {id: "it-davide_man", lang: "it", name: "davide", gender: "man"}
    """
    voices = []
    
    if VOICES_DIR.exists():
        for filename in sorted(os.listdir(VOICES_DIR)):
            if filename.endswith('.wav'):
                voice_id = filename[:-4]  # Remove .wav extension
                parts = voice_id.split('-', 1)  # Split by first dash
                
                if len(parts) == 2:
                    lang = parts[0]
                    name_gender = parts[1]  # e.g., "davide_man"
                    
                    # Extract name, accent, and gender from "name_gender"
                    if '_' in name_gender:
                        name_part, gender = name_gender.rsplit('_', 1)
                    else:
                        name_part = name_gender
                        gender = "unknown"
                    # Determine accent if name_part contains '-'
                    if '-' in name_part:
                        accent, name = name_part.split('-', 1)
                    else:
                        accent = ""
                        name = name_part
                    voices.append({
                        "id": voice_id,
                        "filename": filename,
                        "language": lang,
                        "accent": accent,
                        "name": name,
                        "gender": gender
                    })
    
    return {"voices": voices}

@router.post("/upload-voice")
async def upload_voice(
    voice_file: UploadFile = File(...),
    voice_id: str = Form(...)
):
    """
    Upload a voice file (MP3 or WAV) and convert it to WAV format compatible with the voices directory.
    The voice will be saved as {voice_id}.wav in data/voices/
    """
    _, ext = os.path.splitext(voice_file.filename)
    if ext.lower() not in ['.mp3', '.wav']:
        raise HTTPException(status_code=400, detail="Only MP3 and WAV files are supported")
    
    if '-' not in voice_id:
        raise HTTPException(status_code=400, detail="voice_id must contain language prefix (e.g., 'en-myvoice')")
    
    try:
        file_content = await voice_file.read()
        
        if ext.lower() == '.mp3':
            audio = AudioSegment.from_mp3(io.BytesIO(file_content))
        else:
            audio = AudioSegment.from_wav(io.BytesIO(file_content))
        
        reference_audio = None
        reference_specs = {"sample_rate": 16000, "channels": 1}
        
        if VOICES_DIR.exists():
            for filename in os.listdir(VOICES_DIR):
                if filename.endswith('.wav'):
                    try:
                        reference_audio = AudioSegment.from_wav(VOICES_DIR / filename)
                        reference_specs = {
                            "sample_rate": reference_audio.frame_rate,
                            "channels": reference_audio.channels
                        }
                        break
                    except Exception:
                        continue
        
        if audio.frame_rate != reference_specs["sample_rate"]:
            audio = audio.set_frame_rate(reference_specs["sample_rate"])
        
        if audio.channels != reference_specs["channels"]:
            audio = audio.set_channels(reference_specs["channels"])
        
        output_filename = f"{voice_id}.wav"
        output_path = VOICES_DIR / output_filename
        
        audio.export(output_path, format="wav")
        
        return {
            "status": "success",
            "voice_id": voice_id,
            "filename": output_filename,
            "path": str(output_path),
            "specs": {
                "sample_rate": audio.frame_rate,
                "channels": audio.channels,
                "duration_ms": len(audio)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing voice file: {str(e)}")
