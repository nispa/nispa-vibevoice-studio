import os
import io
import torch
import gc
import numpy as np
import functools
from typing import Optional, Union, List
from core.tts.base import TTSProvider

class Qwen3TTSProvider(TTSProvider):
    """
    Implementation of TTSProvider using the Qwen3-TTS model.
    
    Supports high-fidelity synthesis, 3-second voice cloning, 
    and voice design via text descriptions.
    """
    def __init__(self, device: str = None):
        """
        Args:
            device: Explicit device string (e.g. "cuda:0", "cuda:1").
                    If None, auto-detects the best available device.
        """
        self.base_model_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "model"))
        self.voices_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "voices"))

        self.loaded_model_name = None
        self.model = None
        self.processor = None

        # Device selection logic
        if device:
            self.device = device
            self.dtype = torch.bfloat16
        elif torch.cuda.is_available():
            self.device = "cuda:0"
            self.dtype = torch.bfloat16
        elif torch.backends.mps.is_available():
            self.device = "mps"
            self.dtype = torch.float32
        else:
            self.device = "cpu"
            self.dtype = torch.float32

        print(f"[Qwen-TTS] Device: {self.device}, dtype: {self.dtype}")

    def unload(self) -> None:
        """Explicitly unloads the model, deletes references, and clears CUDA memory."""
        if self.model is not None:
            print(f"[Qwen-TTS] Unloading model '{self.loaded_model_name}' to free VRAM")
            try:
                if hasattr(self.model, "to"):
                    self.model.to("cpu")
            except Exception:
                pass
            self.model = None
            self.processor = None
            self.loaded_model_name = None
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.ipc_collect()

    def _load_model(self, model_name: str):
        if self.loaded_model_name == model_name and self.model is not None:
            return
        
        # Cleanup if we are switching engines or models to save VRAM
        if self.model is not None:
            self.unload()

        
        # Dependency Check
        try:
            import transformers
            import accelerate
        except ImportError:
            raise ImportError(
                "Required dependencies (transformers, accelerate) not found. "
                "Please run the installer again."
            )

        model_dir = os.path.join(self.base_model_dir, model_name)
        if not os.path.exists(model_dir):
            from core.tts.catalog import _ALIASES
            for folder, canonical in _ALIASES.items():
                if canonical == model_name or folder.lower() == model_name.lower():
                    candidate = os.path.join(self.base_model_dir, folder)
                    if os.path.exists(candidate):
                        model_dir = candidate
                        break

        if not os.path.exists(model_dir):
            raise FileNotFoundError(f"Qwen3-TTS weights not found at: {model_dir}")

        print(f"[Qwen-TTS] Loading model '{model_name}' from {model_dir}...")
        try:
            # We use Qwen3TTSModel from the qwen_tts package
            from qwen_tts import Qwen3TTSModel
            target_device = self.device
            is_cuda = self.device.startswith("cuda")

            # Use flash_attention_2 if on CUDA, otherwise fallback to sdpa
            try:
                self.model = Qwen3TTSModel.from_pretrained(
                    model_dir,
                    dtype=self.dtype,
                    device_map={"": target_device} if is_cuda else None,
                    attn_implementation="flash_attention_2" if is_cuda else "sdpa"
                )
            except Exception as e:
                print(f"[Qwen-TTS] Flash Attention 2 failed or not supported, falling back to sdpa: {e}")
                self.model = Qwen3TTSModel.from_pretrained(
                    model_dir,
                    dtype=self.dtype,
                    device_map={"": target_device} if is_cuda else None,
                    attn_implementation="sdpa"
                )

            # Suppress pad_token_id warnings
            if hasattr(self.model, "config"):
                self.model.config.pad_token_id = self.model.config.eos_token_id

            self.loaded_model_name = model_name
            self.actual_device = target_device 
        except Exception as e:
            print(f"[Qwen-TTS] Error loading model: {e}")
            raise RuntimeError(f"Error loading Qwen3-TTS weights: {e}")

    LANGUAGE_MAP = {
        "en": "english",
        "english": "english",
        "it": "italian",
        "italian": "italian",
        "zh": "chinese",
        "chinese": "chinese",
        "ja": "japanese",
        "japanese": "japanese",
        "ko": "korean",
        "korean": "korean",
        "de": "german",
        "german": "german",
        "fr": "french",
        "french": "french",
        "es": "spanish",
        "spanish": "spanish",
        "pt": "portuguese",
        "portuguese": "portuguese",
        "ru": "russian",
        "russian": "russian",
        "auto": "auto",
    }

    @classmethod
    def _detect_language(cls, text: str, explicit: Optional[str] = None) -> str:
        """Returns normalized language name required by qwen_tts ('english', 'italian', etc.)."""
        if explicit:
            return cls.LANGUAGE_MAP.get(explicit.lower(), explicit.lower())
        return "italian" if any(c in text.lower() for c in "àèéìòù") else "english"

    def _get_silent_wav(self, duration_ms: int = 500) -> bytes:
        """Returns silent WAV bytes."""
        from pydub import AudioSegment
        buf = io.BytesIO()
        AudioSegment.silent(duration=duration_ms).export(buf, format="wav")
        return buf.getvalue()

    def _wav_from_tensor(self, audio_data, sr: int) -> bytes:
        """Converts model output to WAV bytes. Handles MPS sync to avoid silent output."""
        if not torch.is_tensor(audio_data):
            audio_tensor = torch.from_numpy(audio_data).float()
        else:
            # On MPS, synchronize before moving to CPU —
            # otherwise the tensor may be all-zeros (silent audio)
            if hasattr(audio_data, 'device') and str(audio_data.device) == 'mps':
                torch.mps.synchronize()
            audio_tensor = audio_data.detach().cpu().float()
        if audio_tensor.dim() == 1:
            audio_tensor = audio_tensor.unsqueeze(0)
        arr = audio_tensor.squeeze(0).numpy()
        if arr.size == 0 or (arr.max() == 0.0 and arr.min() == 0.0):
            print(f"[Qwen-TTS] WARNING: silent audio tensor (size={arr.size}, sr={sr})")
        buf = io.BytesIO()
        import soundfile as sf
        sf.write(buf, arr, sr, format="WAV")
        buf.seek(0)
        return buf.getvalue()

    @functools.lru_cache(maxsize=64)
    def _get_voice_ref(self, voice_id: str):
        """Cached: returns (voice_path, ref_text | None) for a voice_id."""
        safe_id = os.path.basename(voice_id)
        voice_file = safe_id if safe_id.endswith(".wav") else safe_id + ".wav"
        voice_path = os.path.join(self.voices_dir, voice_file)
        if not os.path.exists(voice_path):
            raise FileNotFoundError(f"Voice reference '{voice_id}' not found.")
        ref_text = None
        txt_path = voice_path.replace(".wav", ".txt")
        if os.path.exists(txt_path):
            with open(txt_path, "r", encoding="utf-8") as f:
                ref_text = f.read().strip()
            print(f"[Qwen-TTS] Cached transcription for '{voice_id}' ({len(ref_text)} chars)")
        return voice_path, ref_text

    def _load_voice_file(self, voice_id: str) -> str:
        """Legacy compatibility — returns just the path."""
        path, _ = self._get_voice_ref(voice_id)
        return path

    def _vram_cleanup(self, local_vars: dict):
        """Frees heavy tensors and releases VRAM cache."""
        for name in ("wavs", "audio_data", "audio_tensor"):
            if name in local_vars:
                del local_vars[name]
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

    def synthesize(self, text: str, model_name: str, reference_audio_path: Optional[str] = None, voice_id: Optional[str] = None, voice_description: Optional[str] = None, language: Optional[str] = None, skip_cleanup: bool = False) -> bytes:
        if not text or not text.strip():
            return self._get_silent_wav()

        self._load_model(model_name)
        language = self._detect_language(text, language)
        print(f"[Qwen-TTS] synthesize [lang={language}]")

        ref_text = None
        if voice_id:
            try:
                reference_audio_path, ref_text = self._get_voice_ref(voice_id)
            except Exception as e:
                print(f"[Qwen-TTS] Warning: Voice reference not found: {e}")
                reference_audio_path = None

        _locals: dict = {}
        try:
            is_design_model = "VoiceDesign" in model_name
            is_custom_model = "CustomVoice" in model_name
            is_base_model = "Base" in model_name

            # Priority 1: Voice Cloning if reference audio is provided
            if reference_audio_path and (is_base_model or is_custom_model or not is_design_model):
                print(f"[Qwen-TTS] Mode: Voice Clone [voice_id={voice_id or 'unknown'}] [tx={'yes' if ref_text else 'no'}] ({language})")
                try:
                    _locals["wavs"], sr = self.model.generate_voice_clone(
                        text=text, ref_audio=reference_audio_path, ref_text=ref_text,
                        language=language, x_vector_only_mode=not bool(ref_text)
                    )
                except Exception as e:
                    if "sox" in str(e).lower():
                        print("[Qwen-TTS] ERROR: SoX is required for Voice Cloning. Install: brew install sox")
                    raise
            # Priority 2: Voice Design if text description is provided and no reference audio
            elif voice_description and (is_design_model or is_base_model):
                print(f"[Qwen-TTS] Mode: Voice Design [voice_id={voice_id or 'none'}] ({language})")
                _locals["wavs"], sr = self.model.generate_voice_design(
                    text=text, description=voice_description, language=language
                )
            elif is_custom_model:
                speaker = "Vivian"
                if voice_id:
                    potential = voice_id.split('-')[-1].capitalize()
                    if potential in ["Vivian", "Ryan", "Daisy", "Bella"]:
                        speaker = potential
                print(f"[Qwen-TTS] Mode: Custom Built-in [Speaker: {speaker}] ({language})")
                _locals["wavs"], sr = self.model.generate_custom_voice(
                    text=text, language=language, speaker=speaker
                )
            elif is_base_model:
                raise ValueError(
                    f"Model '{model_name}' is a Base model and requires a reference audio (Voice Cloning). "
                    f"Select a voice in the dropdown or install a CustomVoice model."
                )
            else:
                raise ValueError(f"Unsupported configuration for model '{model_name}'.")

            return self._wav_from_tensor(_locals["wavs"][0], sr)

        except Exception as e:
            print(f"[Qwen-TTS] Synthesis error: {e}")
            import traceback; traceback.print_exc()
            raise RuntimeError(f"Qwen3-TTS inference failed: {e}")
        finally:
            if not skip_cleanup:
                self._vram_cleanup(_locals)

    def _call_model_batch(self, model_name: str, texts: list, language: str,
                          reference_audio_path: Optional[str], ref_text: Optional[str],
                          voice_id: Optional[str], voice_description: Optional[str]) -> tuple:
        is_design_model = "VoiceDesign" in model_name
        is_custom_model = "CustomVoice" in model_name
        is_base_model = "Base" in model_name

        # Priority 1: Voice Cloning if reference audio is provided
        if reference_audio_path and (is_base_model or is_custom_model or not is_design_model):
            return self.model.generate_voice_clone(
                text=texts, ref_audio=reference_audio_path, ref_text=ref_text,
                language=language, x_vector_only_mode=not bool(ref_text)
            )
        # Priority 2: Voice Design if text description is provided and no reference audio
        elif voice_description and (is_design_model or is_base_model):
            return self.model.generate_voice_design(
                text=texts, description=voice_description, language=language
            )
        elif is_custom_model:
            speaker = "Vivian"
            if voice_id:
                potential = voice_id.split('-')[-1].capitalize()
                if potential in ["Vivian", "Ryan", "Daisy", "Bella"]:
                    speaker = potential
            return self.model.generate_custom_voice(
                text=texts, language=language, speaker=speaker
            )
        else:
            raise ValueError(
                f"Model '{model_name}' is a Base model and requires a reference audio."
            )

    def synthesize_batch(self, texts: list, model_name: str, reference_audio_path: Optional[str] = None, voice_id: Optional[str] = None, voice_description: Optional[str] = None, language: Optional[str] = None) -> list:
        if not texts:
            return []

        self._load_model(model_name)

        # Resolve voice ref once (cached)
        ref_text = None
        if voice_id:
            try:
                reference_audio_path, ref_text = self._get_voice_ref(voice_id)
            except Exception as e:
                print(f"[Qwen-TTS] Warning: Voice reference not found: {e}")
                reference_audio_path = None

        # Per-segment language detection — group consecutive segments by language
        # to issue one model call per language group
        per_text_lang = [self._detect_language(t, language) for t in texts]

        groups = []
        for i, (t, lang) in enumerate(zip(texts, per_text_lang)):
            if groups and groups[-1][0] == lang:
                groups[-1][1].append((i, t))
            else:
                groups.append((lang, [(i, t)]))

        results = [b""] * len(texts)
        _locals: dict = {}

        try:
            for lang, group_items in groups:
                orig_indices = [idx for idx, _ in group_items]
                group_texts = [t for _, t in group_items]
                print(f"[Qwen-TTS] Batch [{lang}]: {len(group_texts)} segment(s)")

                _locals["wavs"], sr = self._call_model_batch(
                    model_name, group_texts, lang,
                    reference_audio_path, ref_text, voice_id, voice_description
                )

                for pos, wav in enumerate(_locals["wavs"]):
                    results[orig_indices[pos]] = self._wav_from_tensor(wav, sr)
                    del wav

                del _locals["wavs"]

            return results

        except Exception as e:
            print(f"[Qwen-TTS] Batch Synthesis error: {e}")
            import traceback; traceback.print_exc()
            raise RuntimeError(f"Qwen3-TTS batch inference failed: {e}")
        finally:
            self._vram_cleanup(_locals)

