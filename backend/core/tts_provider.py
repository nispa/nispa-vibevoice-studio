from abc import ABC, abstractmethod
from typing import Optional, Union
import os
import torch
import torchaudio
import io
import numpy as np
import gc
from core.config import get_sox_path, get_ffmpeg_path, config_manager

class TTSProvider(ABC):
    """
    Abstract Base Class for Text-to-Speech engines.
    
    This interface ensures that different TTS models can be integrated 
    without modifying the core application logic.
    """

    def _get_best_gpu(self) -> str:
        """
        Detects the GPU with the most free VRAM.
        Returns a string like 'cuda:0' or 'cuda:1'.
        """
        if not torch.cuda.is_available():
            return "cpu"
        
        gpu_count = torch.cuda.device_count()
        if gpu_count <= 1:
            return "cuda:0"
            
        best_id = 0
        max_free = 0
        for i in range(gpu_count):
            try:
                # Get free memory for each device
                free, total = torch.cuda.mem_get_info(i)
                if free > max_free:
                    max_free = free
                    best_id = i
            except Exception:
                continue
        
        print(f"[TTS] Selecting best GPU: cuda:{best_id} ({max_free / 1024**3:.2f} GB free)")
        return f"cuda:{best_id}"

    @abstractmethod
    def synthesize(self, text: str, model_name: str, reference_audio_path: Optional[str] = None, voice_id: Optional[str] = None, voice_description: Optional[str] = None, language: Optional[str] = None) -> bytes:
        """
        Synthesizes text into audio bytes.

        Args:
            text (str): The text content to be converted to speech.
            model_name (str): The name of the model to use for synthesis.
            reference_audio_path (Optional[str], optional): Path to a reference audio file 
                for voice cloning. Defaults to None.
            voice_id (Optional[str], optional): ID of a predefined voice. Defaults to None.
            voice_description (Optional[str], optional): Natural language description 
                of the voice (Voice Design). Defaults to None.
            language (Optional[str], optional): Target language. Defaults to None.

        Returns:
            bytes: The synthesized audio data in WAV format.
        """
        pass

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
        self.base_model_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "model"))
        self.voices_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "voices"))
        
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

class Qwen3TTSProvider(TTSProvider):
    """
    Implementation of TTSProvider using the Qwen3-TTS model.
    
    Supports high-fidelity synthesis, 3-second voice cloning, 
    and voice design via text descriptions.
    """
    def __init__(self):
        self.base_model_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "model"))
        self.voices_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "voices"))
        
        self.loaded_model_name = None
        self.model = None
        self.processor = None
        
        # Device selection logic
        if torch.cuda.is_available():
            self.device = "cuda"
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
            self.model.to("cpu")
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
            target_device = "cuda:0" if self.device == "cuda" else self.device
            
            # Use flash_attention_2 if on CUDA, otherwise fallback to sdpa
            try:
                self.model = Qwen3TTSModel.from_pretrained(
                    model_dir, 
                    dtype=self.dtype,
                    device_map={"": target_device} if self.device == "cuda" else None,
                    attn_implementation="flash_attention_2" if self.device == "cuda" else "sdpa"
                )
            except Exception as e:
                print(f"[Qwen-TTS] Flash Attention 2 failed or not supported, falling back to sdpa: {e}")
                self.model = Qwen3TTSModel.from_pretrained(
                    model_dir, 
                    dtype=self.dtype,
                    device_map={"": target_device} if self.device == "cuda" else None,
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

    def _load_voice_file(self, voice_id: str) -> str:
        safe_voice_id = os.path.basename(voice_id)
        if not safe_voice_id.endswith(".wav"):
            voice_file = safe_voice_id + ".wav"
        else:
            voice_file = safe_voice_id
        
        voice_path = os.path.join(self.voices_dir, voice_file)
        if not os.path.exists(voice_path):
            raise FileNotFoundError(f"Voice reference '{voice_id}' not found.")
        return voice_path

    def synthesize(self, text: str, model_name: str, reference_audio_path: Optional[str] = None, voice_id: Optional[str] = None, voice_description: Optional[str] = None, language: Optional[str] = None) -> bytes:
        if not text or not text.strip():
            return self._get_silent_wav()

        self._load_model(model_name)
        
        # Use passed language or fallback to detection
        if not language:
            language = "Italian" if any(char in text.lower() for char in "àèéìòù") else "English"
        
        print(f"[Qwen-TTS] Mode: Active [Language: {language}]")

        ref_text = None
        if voice_id:
            try:
                reference_audio_path = self._load_voice_file(voice_id)
                # Check for matching transcription (.txt)
                txt_path = reference_audio_path.replace(".wav", ".txt")
                if os.path.exists(txt_path):
                    with open(txt_path, "r", encoding="utf-8") as f:
                        ref_text = f.read().strip()
                        print(f"[Qwen-TTS] Found associated transcription for ICL mode ({len(ref_text)} chars)")
            except Exception as e:
                print(f"[Qwen-TTS] Warning: Voice reference not found: {e}")
                reference_audio_path = None

        try:
            # Determine capabilities based on model name
            is_design_model = "VoiceDesign" in model_name
            is_custom_model = "CustomVoice" in model_name
            is_base_model = "Base" in model_name

            # 1. VOICE DESIGN MODE
            if voice_description and (is_design_model or is_base_model):
                print(f"[Qwen-TTS] Mode: Voice Design ({language})")
                wavs, sr = self.model.generate_voice_design(
                    text=text,
                    description=voice_description,
                    language=language
                )
            
            # 2. VOICE CLONING MODE (Requires Base model)
            elif reference_audio_path and is_base_model:
                print(f"[Qwen-TTS] Mode: 3s Voice Clone [Transcription: {'Present' if ref_text else 'Missing'}] ({language})")
                try:
                    wavs, sr = self.model.generate_voice_clone(
                        text=text,
                        ref_audio=reference_audio_path,
                        ref_text=ref_text, # Pass transcription if available
                        language=language,
                        x_vector_only_mode=False if ref_text else True # Enable ICL if text present
                    )
                except Exception as e:
                    if "sox" in str(e).lower():
                        print("[Qwen-TTS] ERROR: SoX is required for Voice Cloning.")
                    raise e

            # 3. CUSTOM/BUILT-IN VOICE MODE (Fallback or specific Custom model)
            else:
                if reference_audio_path and is_custom_model:
                    print(f"[Qwen-TTS] Warning: {model_name} does not support cloning. Using a built-in voice instead.")
                
                # Check for built-in speaker names (Standard Qwen speakers)
                speaker = "Vivian" # Default
                if voice_id:
                    potential = voice_id.split('-')[-1].capitalize()
                    if potential in ["Vivian", "Ryan", "Daisy", "Bella"]:
                        speaker = potential

                print(f"[Qwen-TTS] Mode: Custom/Built-in [Speaker: {speaker}] ({language})")
                wavs, sr = self.model.generate_custom_voice(
                    text=text,
                    language=language,
                    speaker=speaker
                )

            # Convert resulting waveform to WAV bytes
            import io
            import torchaudio
            buf = io.BytesIO()
            
            # wavs is usually a list of numpy arrays or tensors
            audio_data = wavs[0]
            if not torch.is_tensor(audio_data):
                audio_tensor = torch.from_numpy(audio_data).float()
            else:
                audio_tensor = audio_data.detach().cpu().float()

            if audio_tensor.dim() == 1:
                audio_tensor = audio_tensor.unsqueeze(0)
            
            torchaudio.save(buf, audio_tensor, sr, format="wav")
            return buf.getvalue()

        except Exception as e:
            print(f"[Qwen-TTS] ✗ Synthesis error: {e}")
            import traceback
            traceback.print_exc()
            raise RuntimeError(f"Qwen3-TTS inference failed: {e}")

class MultiModelProvider(TTSProvider):
    """
    Orchestrator that selects the correct provider based on model prefix.
    """
    def __init__(self):
        self._vibe = None
        self._qwen = None
        self._is_ready = False

    @property
    def vibe(self):
        if self._vibe is None:
            # Only import and instantiate when needed
            print("[TTS] Lazy loading VibeVoiceProvider...")
            self._vibe = VibeVoiceProvider()
        return self._vibe

    @property
    def qwen(self):
        if self._qwen is None:
            # Only import and instantiate when needed
            print("[TTS] Lazy loading Qwen3TTSProvider...")
            self._qwen = Qwen3TTSProvider()
        return self._qwen

    def initialize(self):
        """
        Explicitly initializes both providers in the background.
        Called on startup to pre-warm the engines without blocking the main API thread.
        """
        if not self._is_ready:
            print("[TTS] Warming up providers in background...")
            # Triggering properties to instantiate
            _ = self.vibe
            _ = self.qwen
            self._is_ready = True
            print("[TTS] All engines warmed up and ready.")

    @property
    def is_ready(self) -> bool:
        return self._is_ready

    def clean_vram(self):
        """
        Forcefully clears VRAM by moving models to CPU, deleting references,
        and emptying the CUDA cache.
        """
        print("[TTS] Force cleaning VRAM...")
        if self._vibe and self._vibe.model:
            try:
                self._vibe.model.to("cpu")
                self._vibe.model = None
                self._vibe.processor = None
                self._vibe.loaded_model_name = None
            except: pass
            
        if self._qwen and self._qwen.model:
            try:
                self._qwen.model.to("cpu")
                self._qwen.model = None
                self._qwen.processor = None
                self._qwen.loaded_model_name = None
            except: pass

        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.ipc_collect()
        print("[TTS] VRAM cleaned.")

    def synthesize(self, text: str, model_name: str, reference_audio_path: Optional[str] = None, voice_id: Optional[str] = None, voice_description: Optional[str] = None, language: Optional[str] = None) -> bytes:
        # Ensure we are ready
        if not self._is_ready:
            self.initialize()
            
        # Check if the model name contains "Qwen" to delegate to the Qwen provider
        if "Qwen" in model_name:
            return self.qwen.synthesize(text, model_name, reference_audio_path, voice_id, voice_description, language)
        else:
            return self.vibe.synthesize(text, model_name, reference_audio_path, voice_id, voice_description, language)

# Global provider instance updated to MultiModel orchestrator
tts_engine = MultiModelProvider()
