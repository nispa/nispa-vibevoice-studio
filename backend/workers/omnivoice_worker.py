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

_model = None
_auth_token: str = ""
_model_dir: Path = Path()
_device: str = "cuda" if torch.cuda.is_available() else "cpu"
_loaded_prompts: Dict[str, object] = {}


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

    cache_path = Path(req.cache_prompt_path)
    if cache_path.exists() and cache_path.stat().st_size > 0:
        # Load from disk cache
        from omnivoice import VoiceClonePrompt
        prompt = VoiceClonePrompt.load(str(cache_path))
        _loaded_prompts[str(cache_path)] = prompt
        return {"status": "success", "cached": True, "prompt_path": str(cache_path)}

    # Need to generate prompt from audio + text
    if not req.ref_text or not req.ref_text.strip():
        raise HTTPException(status_code=400, detail="Non-empty reference transcript is strictly required for OmniVoice cloning.")

    ref_audio = Path(req.ref_audio_path)
    if not ref_audio.exists():
        raise HTTPException(status_code=404, detail=f"Reference audio not found: {ref_audio}")

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

    model = _get_model()
    prompt = None

    if req.prompt_path:
        p_path = str(Path(req.prompt_path))
        if p_path in _loaded_prompts:
            prompt = _loaded_prompts[p_path]
        elif Path(p_path).exists():
            from omnivoice import VoiceClonePrompt
            prompt = VoiceClonePrompt.load(p_path)
            _loaded_prompts[p_path] = prompt

    if prompt is None and req.ref_audio_path:
        if not req.ref_text or not req.ref_text.strip():
            raise HTTPException(status_code=400, detail="Non-empty reference transcript required for OmniVoice.")
        prompt = model.create_voice_clone_prompt(
            ref_audio=str(req.ref_audio_path),
            ref_text=req.ref_text.strip()
        )

    # Generate speech
    wavs = model.generate(text=req.text, voice_clone_prompt=prompt)
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
