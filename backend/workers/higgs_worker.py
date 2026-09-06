import argparse
import gc
import io
import os
import sys
from pathlib import Path
from typing import Optional

# Force strict offline mode
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_DATASETS_OFFLINE"] = "1"

import numpy as np
import soundfile as sf
import torch
import torchaudio
import uvicorn
from fastapi import FastAPI, HTTPException, Header, Response
from pydantic import BaseModel

# Global state
app = FastAPI(title="Higgs Audio v3 Local Worker", docs_url=None, redoc_url=None)

_backend_dir = Path(__file__).resolve().parent.parent
_repo_dir = _backend_dir.parent
_data_dir = (_repo_dir / "data").resolve()

_model = None
_tokenizer = None
_auth_token: str = ""
_model_dir: Path = Path()
_device: str = "cuda" if torch.cuda.is_available() else "cpu"


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


class SynthesizeRequest(BaseModel):
    text: str
    ref_audio_path: Optional[str] = None
    ref_text: Optional[str] = None
    language: Optional[str] = None
    temperature: float = 0.7
    top_p: float = 0.95


def verify_token(x_session_token: Optional[str] = Header(None)):
    if _auth_token and x_session_token != _auth_token:
        raise HTTPException(status_code=403, detail="Unauthorized: invalid or missing session token")


def _get_model():
    global _model, _tokenizer
    if _model is None or _tokenizer is None:
        from transformers import AutoModelForCausalLM, AutoTokenizer
        if not _model_dir.exists():
            raise HTTPException(status_code=500, detail=f"Model directory does not exist: {_model_dir}")
        print(f"[Higgs Worker] Loading model from {_model_dir} on {_device} (bfloat16)...")
        _tokenizer = AutoTokenizer.from_pretrained(str(_model_dir))
        _model = AutoModelForCausalLM.from_pretrained(
            str(_model_dir),
            trust_remote_code=True,
            dtype=torch.bfloat16
        ).to(_device).eval()

        # Locate local audio codec tokenizer directory to prevent network calls
        local_tok_candidates = [
            _model_dir.parent / "Higgs-Audio-v2-Tokenizer",
            _model_dir / "Higgs-Audio-v2-Tokenizer",
            _data_dir / "model" / "Higgs-Audio-v2-Tokenizer"
        ]
        local_tok = next((p for p in local_tok_candidates if p.exists()), None)
        if local_tok:
            _model.config.audio_tokenizer_id = str(local_tok.resolve())
            print(f"[Higgs Worker] Configured local audio codec from: {local_tok.resolve()}")
        else:
            print("[Higgs Worker] Warning: Local Higgs-Audio-v2-Tokenizer directory not found.")

        print("[Higgs Worker] Model and tokenizer loaded successfully.")
    return _model, _tokenizer


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


@app.post("/load")
def load_model(x_session_token: Optional[str] = Header(None)):
    verify_token(x_session_token)
    try:
        _get_model()
    except HTTPException:
        raise
    except torch.cuda.OutOfMemoryError:
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        raise HTTPException(status_code=507, detail="GPU out of memory while loading Higgs Audio v3 weights.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load Higgs Audio model: {e}")
    return {"status": "loaded"}


@app.post("/synthesize")
def synthesize(req: SynthesizeRequest, x_session_token: Optional[str] = Header(None)):
    verify_token(x_session_token)

    ref_tensor = None
    ref_sr = 24000
    if req.ref_audio_path:
        ref_audio = _validate_data_path(req.ref_audio_path, must_exist=True, label="Reference audio path")
        try:
            audio_np, ref_sr = sf.read(str(ref_audio), dtype="float32")
            if audio_np.ndim > 1:
                # Downmix multichannel/stereo audio to mono for reference cloning
                audio_np = np.mean(audio_np, axis=-1)
            ref_tensor = torch.from_numpy(audio_np).float()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to read reference audio: {e}")

    model, tokenizer = _get_model()

    generate_kwargs = {
        "temperature": req.temperature,
        "top_p": req.top_p,
    }
    if ref_tensor is not None:
        generate_kwargs["reference_audio"] = ref_tensor
        generate_kwargs["reference_sample_rate"] = ref_sr
        if req.ref_text and req.ref_text.strip():
            generate_kwargs["reference_text"] = req.ref_text.strip()

    try:
        raw_audio = model.generate_speech(
            req.text,
            tokenizer,
            **generate_kwargs
        )
    except torch.cuda.OutOfMemoryError:
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        raise HTTPException(status_code=507, detail="GPU out of memory during Higgs Audio generation.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Higgs Audio synthesis error: {e}")

    # Process and normalize audio output
    if isinstance(raw_audio, (list, tuple)):
        raw_audio = raw_audio[0] if len(raw_audio) > 0 else np.array([], dtype=np.float32)

    if isinstance(raw_audio, torch.Tensor):
        audio_data = raw_audio.squeeze().detach().cpu().to(torch.float32).numpy()
    elif isinstance(raw_audio, np.ndarray):
        audio_data = raw_audio.squeeze().astype(np.float32)
    else:
        raise HTTPException(status_code=500, detail=f"Unexpected audio type {type(raw_audio)} from Higgs model")

    if audio_data.size == 0:
        raise HTTPException(status_code=502, detail="Higgs Audio produced empty audio output.")
    if np.isnan(audio_data).any() or np.isinf(audio_data).any():
        raise HTTPException(status_code=502, detail="Higgs Audio produced NaN or Inf audio output.")

    target_sample_rate = getattr(getattr(model, "config", None), "sample_rate", 24000) or 24000

    buf = io.BytesIO()
    sf.write(buf, audio_data, target_sample_rate, format="WAV", subtype="PCM_16")
    wav_bytes = buf.getvalue()

    return Response(content=wav_bytes, media_type="audio/wav")


@app.post("/unload")
def unload(x_session_token: Optional[str] = Header(None)):
    verify_token(x_session_token)
    global _model, _tokenizer
    if _model is not None:
        try:
            if hasattr(_model, "to"):
                _model.to("cpu")
        except Exception:
            pass
        _model = None
    _tokenizer = None
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
    parser = argparse.ArgumentParser(description="Higgs Audio v3 Dedicated Local Worker")
    parser.add_argument("--port", type=int, default=8009, help="Loopback port to bind")
    parser.add_argument("--token", type=str, required=True, help="Session token for loopback authentication")
    parser.add_argument("--model-dir", type=str, required=True, help="Path to local Higgs weights")
    parser.add_argument("--device", type=str, default="cuda", help="Inference device (cuda or cpu)")
    args = parser.parse_args()

    global _auth_token, _model_dir, _device
    _auth_token = args.token
    _model_dir = Path(args.model_dir).resolve()
    _device = args.device

    print(f"[Higgs Worker] Starting on 127.0.0.1:{args.port} (device: {_device})...")
    uvicorn.run(app, host="127.0.0.1", port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
