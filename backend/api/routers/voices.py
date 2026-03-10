import os
import io
from typing import Optional, List
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Body
from fastapi.responses import FileResponse
from pydub import AudioSegment
from core.config import VOICES_DIR, MODELS_DIR

router = APIRouter(prefix="/api")

@router.get("/models")
def list_models():
    """
    Lists all available TTS models with enhanced metadata.
    """
    models_metadata = []
    if MODELS_DIR.exists():
        for entry in os.listdir(MODELS_DIR):
            if os.path.isdir(MODELS_DIR / entry):
                is_qwen = "Qwen" in entry
                supports_voice_design = "VoiceDesign" in entry
                
                models_metadata.append({
                    "id": entry,
                    "name": entry,
                    "engine": "qwen" if is_qwen else "vibevoice",
                    "supports_voice_design": supports_voice_design
                })
    return {"models": models_metadata}

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
                    
                    # Check for associated transcription
                    transcription = ""
                    txt_path = VOICES_DIR / f"{voice_id}.txt"
                    if txt_path.exists():
                        with open(txt_path, "r", encoding="utf-8") as f:
                            transcription = f.read()

                    voices.append({
                        "id": voice_id,
                        "filename": filename,
                        "language": lang,
                        "accent": accent,
                        "name": name,
                        "gender": gender,
                        "transcription": transcription
                    })
    
    return {"voices": voices}

@router.delete("/voices/{voice_id}")
def delete_voice(voice_id: str):
    """
    Deletes a voice reference file.
    """
    safe_voice_id = os.path.basename(voice_id)
    voice_path = VOICES_DIR / f"{safe_voice_id}.wav"
    
    if not voice_path.exists():
        raise HTTPException(status_code=404, detail="Voice not found")
    
    try:
        os.remove(voice_path)
        return {"status": "success", "message": f"Voice {voice_id} deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete voice: {str(e)}")

@router.get("/voices/{voice_id}/audio")
def get_voice_audio(voice_id: str):
    """
    Serves the audio file for a voice reference.
    """
    safe_voice_id = os.path.basename(voice_id)
    voice_path = VOICES_DIR / f"{safe_voice_id}.wav"
    
    if not voice_path.exists():
        raise HTTPException(status_code=404, detail="Voice not found")
    
    return FileResponse(voice_path, media_type="audio/wav")

@router.post("/upload-voice")
async def upload_voice(
    voice_file: UploadFile = File(...),
    voice_id: str = Form(...),
    transcription: Optional[str] = Form(None)
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
        
        # Save transcription if provided
        if transcription and transcription.strip():
            txt_path = VOICES_DIR / f"{safe_voice_id}.txt"
            with open(txt_path, "w", encoding="utf-8") as f:
                f.write(transcription.strip())
        
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

@router.post("/voices/{voice_id}/transcription")
def update_voice_transcription(voice_id: str, transcription: str = Body(..., embed=True)):
    """
    Updates the transcription text for an existing voice reference.
    """
    safe_voice_id = os.path.basename(voice_id)
    txt_path = VOICES_DIR / f"{safe_voice_id}.txt"
    
    try:
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(transcription.strip())
        return {"status": "success", "message": "Transcription updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update transcription: {str(e)}")

@router.post("/voices/{voice_id}/reprocess")
async def reprocess_voice(voice_id: str):
    """
    Applies noise reduction and normalization to a voice reference file, 
    saving it as a new 'processed' version.
    """
    safe_voice_id = os.path.basename(voice_id)
    voice_path = VOICES_DIR / f"{safe_voice_id}.wav"
    
    if not voice_path.exists():
        raise HTTPException(status_code=404, detail="Voice not found")
    
    try:
        # Load audio
        audio = AudioSegment.from_wav(voice_path)
        
        # Basic Noise Reduction logic
        import numpy as np
        from scipy.signal import butter, lfilter
        
        samples = np.array(audio.get_array_of_samples()).astype(np.float32)
        
        def butter_bandpass(lowcut, highcut, fs, order=5):
            nyq = 0.5 * fs
            low = lowcut / nyq
            high = highcut / nyq
            b, a = butter(order, [low, high], btype='band')
            return b, a

        fs = audio.frame_rate
        b, a = butter_bandpass(80, min(8000, fs/2 - 1), fs, order=5)
        processed_samples = lfilter(b, a, samples)
        
        max_val = np.max(np.abs(processed_samples))
        if max_val > 0:
            processed_samples = processed_samples / max_val * 32767.0
            
        processed_audio = audio._spawn(processed_samples.astype(np.int16).tobytes())
        
        # New filename logic
        new_voice_id = f"{safe_voice_id}_processed"
        new_path = VOICES_DIR / f"{new_voice_id}.wav"
        
        # Save new WAV
        processed_audio.export(new_path, format="wav")
        
        # Copy transcription if exists
        old_txt = VOICES_DIR / f"{safe_voice_id}.txt"
        if old_txt.exists():
            import shutil
            shutil.copy(old_txt, VOICES_DIR / f"{new_voice_id}.txt")
        
        return {
            "status": "success", 
            "message": f"New processed voice created: {new_voice_id}",
            "new_voice_id": new_voice_id
        }
    except Exception as e:
        print(f"Reprocess error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to reprocess voice: {str(e)}")
