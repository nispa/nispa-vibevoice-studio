import os
import torch
import io
import gc
from typing import Optional, Union
from core.tts.base import TTSProvider

class VibeVoiceProvider(TTSProvider):
    """
    Implementation of TTSProvider using the VibeVoice model.

    Supports high-quality text-to-speech synthesis with zero-shot voice cloning
    capabilities using reference audio files.
    """
    def __init__(self, device: str = None):
        """
        Initializes the VibeVoiceProvider.

        Args:
            device: Explicit device string (e.g. "cuda:0", "cuda:1").
                    If None, auto-detects the best available device.
        """
        # Paths
        self.base_model_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "model"))
        self.voices_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "voices"))

        # Model cache
        self.loaded_model_name = None
        self.model = None
        self.processor = None

        # Device selection
        if device:
            self.device = device
            self.dtype = torch.float16
            try:
                import flash_attn
                self.attn_impl = "flash_attention_2"
            except ImportError:
                self.attn_impl = "sdpa"
        elif torch.cuda.is_available():
            self.device = "cuda:0"
            self.dtype = torch.float16
            try:
                import flash_attn
                self.attn_impl = "flash_attention_2"
            except ImportError:
                self.attn_impl = "sdpa"
        elif torch.backends.mps.is_available():
            self.device = "mps"
            self.dtype = torch.float32
            self.attn_impl = "sdpa"
        else:
            self.device = "cpu"
            self.dtype = torch.float32
            self.attn_impl = "sdpa"

        print(f"[VibeVoice] Device: {self.device}, dtype: {self.dtype}")

    def _load_model(self, model_name: str):
        """
        Loads the specified VibeVoice model into memory or retrieves it from cache.
        """
        if self.loaded_model_name == model_name and self.model is not None:
            return
        
        # Cleanup if we are switching engines or models to save VRAM
        if self.model is not None:
            print(f"[TTS] Unloading previous model {self.loaded_model_name} to free VRAM")
            self.model.to("cpu")
            self.model = None
            self.processor = None
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        
        # Add backend and vendors to sys.path
        import sys
        # __file__ is backend/core/tts/vibe_provider.py
        current_dir = os.path.dirname(os.path.abspath(__file__)) # backend/core/tts
        core_dir = os.path.dirname(current_dir) # backend/core
        backend_dir = os.path.dirname(core_dir) # backend
        vendors_dir = os.path.join(backend_dir, "vendors")
        
        # IMPORTANT: Force Python to find our vendored version first
        # and remove any existing reference to 'vibevoice' in sys.modules
        # to ensure it reloads from our local path.
        if "vibevoice" in sys.modules:
            del sys.modules["vibevoice"]
            
        for d in [backend_dir, vendors_dir]:
            if os.path.exists(d) and d not in sys.path:
                sys.path.insert(0, d)
                print(f"[TTS] Added to sys.path: {d}")
            
        # Dependency Check
        try:
            # We now import specifically from vendors to avoid any ambiguity
            # 'import vibevoice' should now resolve to vendors/vibevoice
            import vibevoice
            print(f"[TTS] VibeVoice module located at: {vibevoice.__file__}")
            
            from vendors.vibevoice.modular.modeling_vibevoice_inference import VibeVoiceForConditionalGenerationInference
            from vendors.vibevoice.processor.vibevoice_processor import VibeVoiceProcessor
        except ImportError as e:
            print(f"[TTS] Vendored import failed: {e}")
            raise ImportError(
                f"Vendored VibeVoice source not found or internal imports failing. Error: {e}"
            )

        model_dir = os.path.join(self.base_model_dir, model_name)
        if not os.path.exists(model_dir):
            raise FileNotFoundError(f"Model directory not found: {model_dir}")
        
        print(f"[TTS] Loading VibeVoice model '{model_name}' from {model_dir}...")
        
        try:
            # Load processor
            self.processor = VibeVoiceProcessor.from_pretrained(model_dir)
            
            # Load model with device-specific optimizations
            target_device = self.device
            
            try:
                if self.device == "mps":
                    self.model = VibeVoiceForConditionalGenerationInference.from_pretrained(
                        model_dir,
                        dtype=self.dtype,
                        attn_implementation=self.attn_impl,
                        device_map=None,
                    )
                    self.model.to("mps")
                elif self.device.startswith("cuda"):
                    self.model = VibeVoiceForConditionalGenerationInference.from_pretrained(
                        model_dir,
                        torch_dtype=self.dtype,
                        device_map={"": target_device},
                        attn_implementation=self.attn_impl,
                    )
                    self.model.to(target_device)
                else:
                    self.model = VibeVoiceForConditionalGenerationInference.from_pretrained(
                        model_dir,
                        torch_dtype=self.dtype,
                        device_map="cpu",
                        attn_implementation=self.attn_impl,
                    )
            except Exception as e:
                # Only log the fallback warning if we actually tried to use flash_attention_2
                if self.attn_impl == "flash_attention_2":
                    print(f"[TTS] Attention implementation {self.attn_impl} failed, falling back to sdpa")
                self.model = VibeVoiceForConditionalGenerationInference.from_pretrained(
                    model_dir,
                    torch_dtype=self.dtype,
                    device_map=({"": target_device} if self.device.startswith("cuda") else
                                (self.device if self.device == "cpu" else None)),
                    attn_implementation='sdpa'
                )
                if self.device == "mps":
                    self.model.to("mps")
            
            self.model.eval()
            self.model.set_ddpm_inference_steps(num_steps=10)
            self.loaded_model_name = model_name
            print(f"[TTS] Model '{model_name}' loaded successfully")
            
        except ImportError as e:
            raise ImportError(
                f"VibeVoice library not found. Install it with: pip install vibevoice\nError: {e}"
            )
        except Exception as e:
            raise RuntimeError(f"Error loading VibeVoice model: {e}")

    def _load_voice_file(self, voice_id: str) -> str:
        """
        Locates the path for a voice reference file based on its ID.

        Args:
            voice_id (str): The ID of the voice (e.g., "it-davide_man").

        Returns:
            str: The absolute path to the .wav voice reference file.

        Raises:
            FileNotFoundError: If the voice file cannot be found in the voices directory.
        """
        # Sanitize voice_id to prevent path traversal
        safe_voice_id = os.path.basename(voice_id)
        
        if not safe_voice_id.endswith(".wav"):
            voice_file = safe_voice_id + ".wav"
        else:
            voice_file = safe_voice_id
        
        voice_path = os.path.join(self.voices_dir, voice_file)
        
        if not os.path.exists(voice_path):
            available_voices = [f[:-4] for f in os.listdir(self.voices_dir) if f.endswith('.wav')] if os.path.exists(self.voices_dir) else []
            raise FileNotFoundError(
                f"Voice '{voice_id}' not found in {self.voices_dir}. "
                f"Available voices: {available_voices}"
            )
        
        print(f"[TTS] Found voice reference: {voice_id}")
        return voice_path

    def synthesize(self, text: str, model_name: str, reference_audio_path: Optional[str] = None, voice_id: Optional[str] = None, voice_description: Optional[str] = None, language: Optional[str] = None) -> bytes:
        """
        Synthesizes text using VibeVoice with optional voice cloning.

        Args:
            text (str): The text to synthesize.
            model_name (str): The name of the VibeVoice model to use.
            reference_audio_path (Optional[str], optional): Direct path to a reference WAV. Defaults to None.
            voice_id (Optional[str], optional): ID of a pre-recorded voice in data/voices/. Defaults to None.
            voice_description (Optional[str], optional): Not supported by VibeVoice.
            language (Optional[str], optional): Not explicitly used by VibeVoice engine but accepted for interface compatibility.

        Returns:
            bytes: WAV audio data as bytes.
        """
        if voice_description:
            print("[TTS] Warning: VibeVoice does not support voice_description (Voice Design). Ignoring.")

        if not text or not text.strip():
            print(f"[TTS] Warning: Empty text provided")
            from pydub import AudioSegment
            silent_audio = AudioSegment.silent(duration=1000)
            buf = io.BytesIO()
            silent_audio.export(buf, format="wav")
            return buf.getvalue()
        
        # Load model if not already cached
        self._load_model(model_name)
        
        # Determine reference audio path
        if voice_id:
            reference_audio_path = self._load_voice_file(voice_id)
        
        if not reference_audio_path or not os.path.exists(reference_audio_path):
            raise ValueError(
                f"No valid reference audio provided. Either voice_id or reference_audio_path must be specified and exist."
            )
        
        try:
            # Prepare inputs for VibeVoice
            formatted_text = f"Speaker 0: {text}"
            
            inputs = self.processor(
                text=[formatted_text],
                voice_samples=[[reference_audio_path]],
                padding=True,
                return_tensors="pt",
                return_attention_mask=True,
            )
            
            # Move tensors to device
            for k, v in inputs.items():
                if torch.is_tensor(v):
                    inputs[k] = v.to(self.device)
            
            # Generate audio
            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=None,
                    cfg_scale=1.3,
                    tokenizer=self.processor.tokenizer,
                    generation_config={'do_sample': True, 'temperature': 0.1},
                    verbose=False,
                    is_prefill=True,
                )
            
            # Extract audio
            if outputs.speech_outputs and len(outputs.speech_outputs) > 0:
                try:
                    sample_rate = self.processor.audio_processor.sampling_rate
                except AttributeError:
                    sample_rate = 24000
                return self._wav_bytes_from_tensor(outputs.speech_outputs[0], sample_rate)
            else:
                raise RuntimeError("No audio output generated by the model")
                
        except Exception as e:
            print(f"[TTS] Error during synthesis: {e}")
            raise RuntimeError(f"Error generating audio with VibeVoice: {e}")

    def _wav_bytes_from_tensor(self, audio_data, sample_rate: int) -> bytes:
        """Converts a model output tensor or numpy array to WAV bytes."""
        if torch.is_tensor(audio_data):
            # Move to CPU and convert to float32 numpy array
            audio_np = audio_data.detach().cpu().float().numpy()
        else:
            audio_np = audio_data
        
        if len(audio_np.shape) > 1:
            audio_np = audio_np.squeeze()
            
        buf = io.BytesIO()
        import soundfile as sf
        sf.write(buf, audio_np, sample_rate, format="WAV")
        buf.seek(0)
        return buf.getvalue()

    def _silent_wav(self, duration_ms: int = 1000) -> bytes:
        """Returns silent WAV bytes of the given duration."""
        from pydub import AudioSegment
        silent = AudioSegment.silent(duration=duration_ms)
        buf = io.BytesIO()
        silent.export(buf, format="wav")
        return buf.getvalue()

    def synthesize_batch(self, texts: list[str], model_name: str, reference_audio_path: Optional[str] = None, voice_id: Optional[str] = None, voice_description: Optional[str] = None, language: Optional[str] = None) -> list[bytes]:
        """
        Batched synthesis: runs a single processor + model.generate() call for all
        texts, exploiting GPU parallelism. Falls back to sequential on failure.
        """
        if not texts:
            return []

        # Filter empty texts to silent placeholders, track positions
        results: list[bytes | None] = [None] * len(texts)
        active_indices = []
        for i, text in enumerate(texts):
            if not text or not text.strip():
                results[i] = self._silent_wav()
            else:
                active_indices.append(i)

        if not active_indices:
            return results  # type: ignore[return-value]

        active_texts = [texts[i] for i in active_indices]

        self._load_model(model_name)

        if voice_id and not reference_audio_path:
            reference_audio_path = self._load_voice_file(voice_id)

        if not reference_audio_path or not os.path.exists(reference_audio_path):
            raise ValueError("No valid reference audio provided for VibeVoice batch synthesis.")

        try:
            sample_rate = self.processor.audio_processor.sampling_rate
        except AttributeError:
            sample_rate = 24000

        # Attempt true batched inference
        try:
            formatted_texts = [f"Speaker 0: {t}" for t in active_texts]
            voice_samples = [[reference_audio_path]] * len(active_texts)

            inputs = self.processor(
                text=formatted_texts,
                voice_samples=voice_samples,
                padding=True,
                return_tensors="pt",
                return_attention_mask=True,
            )
            for k, v in inputs.items():
                if torch.is_tensor(v):
                    inputs[k] = v.to(self.device)

            print(f"[TTS] VibeVoice batched generate: {len(active_texts)} segments")
            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=None,
                    cfg_scale=1.3,
                    tokenizer=self.processor.tokenizer,
                    generation_config={'do_sample': True, 'temperature': 0.1},
                    verbose=False,
                    is_prefill=True,
                )

            if not outputs.speech_outputs or len(outputs.speech_outputs) != len(active_texts):
                raise RuntimeError(
                    f"Expected {len(active_texts)} outputs, got "
                    f"{len(outputs.speech_outputs) if outputs.speech_outputs else 0}"
                )

            for idx, orig_i in enumerate(active_indices):
                results[orig_i] = self._wav_bytes_from_tensor(outputs.speech_outputs[idx], sample_rate)

            print(f"[TTS] VibeVoice batch complete ({len(active_texts)} segments)")
            return results  # type: ignore[return-value]

        except Exception as e:
            print(f"[TTS] VibeVoice batched inference failed ({e}), falling back to sequential")

        # Sequential fallback
        for i, text in zip(active_indices, active_texts):
            try:
                results[i] = self.synthesize(text, model_name, reference_audio_path, None, voice_description, language)
            except Exception as inner_e:
                print(f"[TTS] Sequential fallback failed for segment {i}: {inner_e}")
                results[i] = self._silent_wav()

        return results  # type: ignore[return-value]

