import os
import io
import torch
import gc
import torchaudio
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

    def _load_model(self, model_name: str):
        if self.loaded_model_name == model_name and self.model is not None:
            return
        
        # Cleanup if we are switching engines or models to save VRAM
        if self.model is not None:
            print(f"[Qwen-TTS] Unloading previous model {self.loaded_model_name} to free VRAM")
            try:
                if hasattr(self.model, "to"):
                    self.model.to("cpu")
            except:
                pass
            self.model = None
            self.processor = None
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        
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

    @staticmethod
    def _detect_language(text: str, explicit: Optional[str] = None) -> str:
        """Returns explicit language if provided, else heuristic detection."""
        if explicit:
            return explicit
        return "Italian" if any(c in text.lower() for c in "àèéìòù") else "English"

    def _get_silent_wav(self, duration_ms: int = 500) -> bytes:
        """Returns silent WAV bytes."""
        from pydub import AudioSegment
        buf = io.BytesIO()
        AudioSegment.silent(duration=duration_ms).export(buf, format="wav")
        return buf.getvalue()

    def _wav_from_tensor(self, audio_data, sr: int) -> bytes:
        """Converts model output to WAV bytes and frees GPU memory."""
        if not torch.is_tensor(audio_data):
            audio_tensor = torch.from_numpy(audio_data).float()
        else:
            audio_tensor = audio_data.detach().cpu().float()
        if audio_tensor.dim() == 1:
            audio_tensor = audio_tensor.unsqueeze(0)
        buf = io.BytesIO()
        import soundfile as sf
        sf.write(buf, audio_tensor.squeeze(0).numpy(), sr, format="WAV")
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

            if voice_description and (is_design_model or is_base_model):
                print(f"[Qwen-TTS] Mode: Voice Design ({language})")
                _locals["wavs"], sr = self.model.generate_voice_design(
                    text=text, description=voice_description, language=language
                )
            elif reference_audio_path and is_base_model:
                print(f"[Qwen-TTS] Mode: 3s Voice Clone [tx={'yes' if ref_text else 'no'}] ({language})")
                try:
                    _locals["wavs"], sr = self.model.generate_voice_clone(
                        text=text, ref_audio=reference_audio_path, ref_text=ref_text,
                        language=language, x_vector_only_mode=not bool(ref_text)
                    )
                except Exception as e:
                    if "sox" in str(e).lower():
                        print("[Qwen-TTS] ERROR: SoX is required for Voice Cloning.")
                    raise
            else:
                if reference_audio_path and is_custom_model:
                    print(f"[Qwen-TTS] Warning: {model_name} does not support cloning. Using built-in voice.")
                speaker = "Vivian"
                if voice_id:
                    potential = voice_id.split('-')[-1].capitalize()
                    if potential in ["Vivian", "Ryan", "Daisy", "Bella"]:
                        speaker = potential
                print(f"[Qwen-TTS] Mode: Custom/Built-in [Speaker: {speaker}] ({language})")
                _locals["wavs"], sr = self.model.generate_custom_voice(
                    text=text, language=language, speaker=speaker
                )

            return self._wav_from_tensor(_locals["wavs"][0], sr)

        except Exception as e:
            print(f"[Qwen-TTS] ✗ Synthesis error: {e}")
            import traceback; traceback.print_exc()
            raise RuntimeError(f"Qwen3-TTS inference failed: {e}")
        finally:
            if not skip_cleanup:
                self._vram_cleanup(_locals)

    def _call_model_batch(self, model_name: str, texts: list[str], language: str,
                          reference_audio_path: Optional[str], ref_text: Optional[str],
                          voice_id: Optional[str], voice_description: Optional[str]) -> tuple:
        """Issues a single model call for a list of texts with the same language. Returns (wavs, sr)."""
        is_design_model = "VoiceDesign" in model_name
        is_custom_model = "CustomVoice" in model_name
        is_base_model = "Base" in model_name

        if voice_description and (is_design_model or is_base_model):
            return self.model.generate_voice_design(
                text=texts, description=voice_description, language=language
            )
        elif reference_audio_path and is_base_model:
            return self.model.generate_voice_clone(
                text=texts, ref_audio=reference_audio_path, ref_text=ref_text,
                language=language, x_vector_only_mode=not bool(ref_text)
            )
        else:
            if reference_audio_path and is_custom_model:
                print(f"[Qwen-TTS] Warning: {model_name} does not support cloning. Using built-in voice.")
            speaker = "Vivian"
            if voice_id:
                potential = voice_id.split('-')[-1].capitalize()
                if potential in ["Vivian", "Ryan", "Daisy", "Bella"]:
                    speaker = potential
            return self.model.generate_custom_voice(
                text=texts, language=language, speaker=speaker
            )

    def synthesize_batch(self, texts: list[str], model_name: str, reference_audio_path: Optional[str] = None, voice_id: Optional[str] = None, voice_description: Optional[str] = None, language: Optional[str] = None) -> list[bytes]:
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

        # Build groups: list of (lang, [(orig_idx, text), ...])
        groups: list[tuple[str, list[tuple[int, str]]]] = []
        for i, (t, lang) in enumerate(zip(texts, per_text_lang)):
            if groups and groups[-1][0] == lang:
                groups[-1][1].append((i, t))
            else:
                groups.append((lang, [(i, t)]))

        results: list[bytes] = [b""] * len(texts)
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
            print(f"[Qwen-TTS] ✗ Batch Synthesis error: {e}")
            import traceback; traceback.print_exc()
            raise RuntimeError(f"Qwen3-TTS batch inference failed: {e}")
        finally:
            self._vram_cleanup(_locals)

