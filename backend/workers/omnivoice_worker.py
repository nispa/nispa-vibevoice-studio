import argparse
import gc
import io
import os
import sys
from pathlib import Path
from typing import Optional, Dict

# Force strict offline mode
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_DATASETS_OFFLINE"] = "1"

import numpy as np
import soundfile as sf
import torch
import uvicorn
from fastapi import FastAPI, HTTPException, Header, Response
from pydantic import BaseModel

# Global state
app = FastAPI(title="OmniVoice Local Worker", docs_url=None, redoc_url=None)

_backend_dir = Path(__file__).resolve().parent.parent
_repo_dir = _backend_dir.parent
_data_dir = (_repo_dir / "data").resolve()

_model = None
_auth_token: str = ""
_model_dir: Path = Path()
_device: str = "cuda" if torch.cuda.is_available() else "cpu"
_loaded_prompts: Dict[str, object] = {}


def _validate_data_path(raw_path: str, must_exist: bool = False, label: str = "Path") -> Path:
    """Ensures raw_path resolves strictly within the authorized data/ directory."""
    if not raw_path or not raw_path.strip():
        raise HTTPException(status_code=400, detail=f"{label} cannot be empty.")
    try:
        resolved = Path(raw_path).resolve()
        resolved.relative_to(_data_dir)
    except (ValueError, Exception):
        raise HTTPException(
            status_code=400,
            detail=f"Security violation: {label} '{raw_path}' is outside authorized data directory."
        )
    if must_exist and not resolved.exists():
        raise HTTPException(status_code=404, detail=f"{label} not found: {raw_path}")
    return resolved


class PromptRequest(BaseModel):
    voice_id: str
    ref_audio_path: str
    ref_text: str
    cache_prompt_path: str


class SynthesizeRequest(BaseModel):
    text: str
    prompt_path: Optional[str] = None
    ref_audio_path: Optional[str] = None
    ref_text: Optional[str] = None
    language: Optional[str] = None


def verify_token(x_session_token: Optional[str] = Header(None)):
    if _auth_token and x_session_token != _auth_token:
        raise HTTPException(status_code=403, detail="Unauthorized: invalid or missing session token")


def _get_model():
    global _model
    if _model is None:
        from omnivoice import OmniVoice
        if not _model_dir.exists():
            raise HTTPException(status_code=500, detail=f"Model directory does not exist: {_model_dir}")
        print(f"[OmniVoice Worker] Loading model from {_model_dir} on {_device}...")
        _model = OmniVoice.from_pretrained(
            str(_model_dir),
            device_map=_device
        )
        print("[OmniVoice Worker] Model loaded successfully.")
    return _model


@app.get("/health")
def health(x_session_token: Optional[str] = Header(None)):
    verify_token(x_session_token)
    vram = 0.0
    if torch.cuda.is_available():
        vram = round(torch.cuda.memory_allocated() / (1024 ** 3), 2)
    return {
        "status": "ok",
        "loaded": _model is not None,
        "device": _device,
        "vram_allocated_gb": vram
    }


@app.post("/prompt")
def create_or_load_prompt(req: PromptRequest, x_session_token: Optional[str] = Header(None)):
    verify_token(x_session_token)
    global _loaded_prompts

    cache_path = _validate_data_path(req.cache_prompt_path, must_exist=False, label="Cache prompt path")
    if cache_path.exists() and cache_path.stat().st_size > 0:
        # Load from disk cache
        from omnivoice import VoiceClonePrompt
        prompt = VoiceClonePrompt.load(str(cache_path))
        _loaded_prompts[str(cache_path)] = prompt
        return {"status": "success", "cached": True, "prompt_path": str(cache_path)}

    # Need to generate prompt from audio + text
    if not req.ref_text or not req.ref_text.strip():
        raise HTTPException(status_code=400, detail="Non-empty reference transcript is strictly required for OmniVoice cloning.")

    ref_audio = _validate_data_path(req.ref_audio_path, must_exist=True, label="Reference audio path")

    model = _get_model()
    prompt = model.create_voice_clone_prompt(
        ref_audio=str(ref_audio),
        ref_text=req.ref_text.strip()
    )

    # Save to cache path
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    prompt.save(str(cache_path))
    _loaded_prompts[str(cache_path)] = prompt

    return {"status": "success", "cached": False, "prompt_path": str(cache_path)}


@app.post("/synthesize")
def synthesize(req: SynthesizeRequest, x_session_token: Optional[str] = Header(None)):
    verify_token(x_session_token)
    global _loaded_prompts

    prompt = None
    if req.prompt_path:
        p_path_obj = _validate_data_path(req.prompt_path, must_exist=False, label="Prompt path")
        p_path = str(p_path_obj)
        if p_path in _loaded_prompts:
            prompt = _loaded_prompts[p_path]
        elif p_path_obj.exists():
            from omnivoice import VoiceClonePrompt
            prompt = VoiceClonePrompt.load(p_path)
            _loaded_prompts[p_path] = prompt

    ref_audio = None
    if prompt is None and req.ref_audio_path:
        if not req.ref_text or not req.ref_text.strip():
            raise HTTPException(status_code=400, detail="Non-empty reference transcript required for OmniVoice.")
        ref_audio = _validate_data_path(req.ref_audio_path, must_exist=True, label="Reference audio path")

    model = _get_model()
    if prompt is None and ref_audio is not None:
        prompt = model.create_voice_clone_prompt(
            ref_audio=str(ref_audio),
            ref_text=req.ref_text.strip()
        )

    # Generate speech with explicit language and prompt
    try:
        wavs = model.generate(text=req.text, language=req.language, voice_clone_prompt=prompt)
    except torch.cuda.OutOfMemoryError:
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        raise HTTPException(status_code=507, detail="GPU out of memory during OmniVoice generation.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OmniVoice synthesis error: {e}")

    if isinstance(wavs, (list, tuple)):
        raw_audio = wavs[0] if len(wavs) > 0 else np.array([], dtype=np.float32)
    else:
        raw_audio = wavs
    
    # Normalize array
    if isinstance(raw_audio, torch.Tensor):
        audio_data = raw_audio.squeeze().detach().cpu().to(torch.float32).numpy()
    elif isinstance(raw_audio, np.ndarray):
        audio_data = raw_audio.squeeze().astype(np.float32)
    else:
        raise HTTPException(status_code=500, detail=f"Unexpected audio element type {type(raw_audio)} from OmniVoice model")

    if audio_data.size == 0:
        raise HTTPException(status_code=502, detail="OmniVoice produced empty audio output.")
    if np.isnan(audio_data).any() or np.isinf(audio_data).any():
        raise HTTPException(status_code=502, detail="OmniVoice produced NaN or Inf audio output.")

    buf = io.BytesIO()
    sf.write(buf, audio_data, 24000, format="WAV", subtype="PCM_16")
    wav_bytes = buf.getvalue()

    return Response(content=wav_bytes, media_type="audio/wav")


@app.post("/unload")
def unload(x_session_token: Optional[str] = Header(None)):
    verify_token(x_session_token)
    global _model, _loaded_prompts
    _loaded_prompts.clear()
    if _model is not None:
        try:
            if hasattr(_model, "to"):
                _model.to("cpu")
        except Exception:
            pass
        _model = None
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    return {"status": "unloaded"}


@app.post("/shutdown")
def shutdown(x_session_token: Optional[str] = Header(None)):
    verify_token(x_session_token)
    unload(x_session_token=x_session_token)
    import threading
    def _kill():
        import time
        time.sleep(0.5)
        os._exit(0)
    threading.Thread(target=_kill, daemon=True).start()
    return {"status": "shutting down"}


def main():
    parser = argparse.ArgumentParser(description="OmniVoice Dedicated Local Worker")
    parser.add_argument("--port", type=int, default=8008, help="Loopback port to bind")
    parser.add_argument("--token", type=str, required=True, help="Session token for loopback authentication")
    parser.add_argument("--model-dir", type=str, required=True, help="Path to local OmniVoice weights")
    parser.add_argument("--device", type=str, default="cuda", help="Inference device (cuda or cpu)")
    args = parser.parse_args()

    global _auth_token, _model_dir, _device
    _auth_token = args.token
    _model_dir = Path(args.model_dir).resolve()
    _device = args.device

    print(f"[OmniVoice Worker] Starting on 127.0.0.1:{args.port} (device: {_device})...")
    uvicorn.run(app, host="127.0.0.1", port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
