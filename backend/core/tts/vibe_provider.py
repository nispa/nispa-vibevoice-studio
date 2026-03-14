import os
import torch
import torchaudio
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
    def __init__(self):
        """
        Initializes the VibeVoiceProvider, detects available hardware (CUDA, MPS, or CPU), 
        and sets up directory paths.
        """
        # Paths
        self.base_model_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "model"))
        self.voices_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "voices"))
        
        # Model cache
        self.loaded_model_name = None
        self.model = None
        self.processor = None
        
        # Device selection
        if torch.cuda.is_available():
            self.device = "cuda"
            self.dtype = torch.float16
            # Check if flash-attn is actually installed to avoid warning spam
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
        
        print(f"[TTS] Device: {self.device}, dtype: {self.dtype}")

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
        core_dir = os.path.dirname(os.path.abspath(__file__))
        backend_dir = os.path.dirname(core_dir)
        vendors_dir = os.path.join(backend_dir, "vendors")
        
        # IMPORTANT: Force Python to find our vendored version first
        # and remove any existing reference to 'vibevoice' in sys.modules
        # to ensure it reloads from our local path.
        if "vibevoice" in sys.modules:
            del sys.modules["vibevoice"]
            
        for d in [backend_dir, vendors_dir]:
            if d not in sys.path:
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
            target_device = self._get_best_gpu() if self.device == "cuda" else self.device
            
            try:
                if self.device == "mps":
                    self.model = VibeVoiceForConditionalGenerationInference.from_pretrained(
                        model_dir,
                        dtype=self.dtype,
                        attn_implementation=self.attn_impl,
                        device_map=None,
                    )
                    self.model.to("mps")
                elif self.device == "cuda":
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
                    device_map=(self.device if self.device in ("cuda", "cpu") else None),
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
                audio_data = outputs.speech_outputs[0]
                
                buf = io.BytesIO()
                
                if torch.is_tensor(audio_data):
                    audio_np = audio_data.cpu().numpy()
                else:
                    audio_np = audio_data
                
                if len(audio_np.shape) > 1:
                    audio_np = audio_np.squeeze()
                
                try:
                    sample_rate = self.processor.audio_processor.sampling_rate
                except AttributeError:
                    sample_rate = 24000
                
                audio_tensor = torch.from_numpy(audio_np).float()
                if audio_tensor.dim() == 1:
                    audio_tensor = audio_tensor.unsqueeze(0)
                
                torchaudio.save(buf, audio_tensor, sample_rate, format="wav")
                buf.seek(0)
                wav_bytes = buf.getvalue()
                
                return wav_bytes
            else:
                raise RuntimeError("No audio output generated by the model")
                
        except Exception as e:
            print(f"[TTS] Error during synthesis: {e}")
            raise RuntimeError(f"Error generating audio with VibeVoice: {e}")

    def synthesize_batch(self, texts: list[str], model_name: str, reference_audio_path: Optional[str] = None, voice_id: Optional[str] = None, voice_description: Optional[str] = None, language: Optional[str] = None) -> list[bytes]:
        """
        Fallback implementation for VibeVoice that processes texts sequentially,
        as native batching is not explicitly confirmed for this model wrapper.
        """
        print(f"[TTS] VibeVoice processing batch of {len(texts)} segments sequentially...")
        results = []
        for i, text in enumerate(texts):
            try:
                # VibeVoice doesn't use voice_description, and language is optional
                audio = self.synthesize(text, model_name, reference_audio_path, voice_id, voice_description, language)
                results.append(audio)
            except Exception as e:
                print(f"[TTS] Error processing segment {i} in batch: {e}")
                # Append empty/silent audio on failure to maintain alignment length
                from pydub import AudioSegment
                silent = AudioSegment.silent(duration=1000)
                buf = io.BytesIO()
                silent.export(buf, format="wav")
                results.append(buf.getvalue())
        return results

