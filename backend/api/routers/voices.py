import os
import io
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from pydub import AudioSegment
from core.config import VOICES_DIR, MODELS_DIR

router = APIRouter(prefix="/api")

@router.get("/models")
def list_models():
    """
    Lists all available TTS models in the models directory.

    Returns:
        dict: A dictionary containing a list of model names.
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
    Lists all available voices in the voices directory.

    Parses voice filenames following the convention: {lang}-{name}_{gender}.wav
    or {lang}-{accent}-{name}_{gender}.wav.

    Returns:
        dict: A dictionary containing a list of voice metadata objects.
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
    Uploads and processes a new voice reference file.

    Converts the uploaded file (MP3 or WAV) to a standard WAV format 
    compatible with the TTS engine and saves it to the voices directory.

    Args:
        voice_file (UploadFile): The audio file to upload.
        voice_id (str): The desired ID for the voice (must include language prefix).

    Returns:
        dict: Metadata about the saved voice file and its audio specifications.

    Raises:
        HTTPException: If the format is unsupported, the ID is invalid, or processing fails.
    """
    _, ext = os.path.splitext(voice_file.filename)
    if ext.lower() not in ['.mp3', '.wav']:
        raise HTTPException(status_code=400, detail="Only MP3 and WAV files are supported")
    
    if '-' not in voice_id:
        raise HTTPException(status_code=400, detail="voice_id must contain language prefix (e.g., 'en-myvoice')")
    
    # Sanitize voice_id to prevent path traversal
    safe_voice_id = os.path.basename(voice_id)
    
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
        
        output_filename = f"{safe_voice_id}.wav"
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
