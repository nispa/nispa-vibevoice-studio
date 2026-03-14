import os
import torch
import gc
import numpy as np
from typing import Optional, Union, List
from core.tts.base import TTSProvider

class Qwen3TTSProvider(TTSProvider):
    """
    Implementation of TTSProvider using the Qwen3-TTS model.
    
    Supports high-fidelity synthesis, 3-second voice cloning, 
    and voice design via text descriptions.
    """
    def __init__(self):
        self.base_model_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "model"))
        self.voices_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "voices"))
        
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
        finally:
            # --- CRITICAL: Aggressive VRAM cleanup after single synthesis ---
            # PyTorch tensors returned by the model reside in the GPU's VRAM.
            # If we don't explicitly delete these local variables, the Python Garbage Collector
            # might keep them alive between iterations, causing VRAM usage to double or accumulate 
            # until an Out Of Memory (OOM) crash occurs.
            
            # 1. Delete references to heavy tensors
            if 'wavs' in locals():
                del wavs
            if 'audio_data' in locals():
                del audio_data
            if 'audio_tensor' in locals():
                del audio_tensor
                
            # 2. Force Python to run Garbage Collection immediately
            gc.collect()
            
            # 3. Force PyTorch to release the freed VRAM blocks back to the OS
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            # ----------------------------------------------------------------

    def synthesize_batch(self, texts: list[str], model_name: str, reference_audio_path: Optional[str] = None, voice_id: Optional[str] = None, voice_description: Optional[str] = None, language: Optional[str] = None) -> list[bytes]:
        if not texts:
            return []

        self._load_model(model_name)
        
        # Use passed language or fallback to detection based on the first text
        if not language:
            first_text = texts[0]
            language = "Italian" if any(char in first_text.lower() for char in "àèéìòù") else "English"
        
        print(f"[Qwen-TTS] Mode: Batch Active [Language: {language}, Batch Size: {len(texts)}]")

        ref_text = None
        if voice_id:
            try:
                reference_audio_path = self._load_voice_file(voice_id)
                txt_path = reference_audio_path.replace(".wav", ".txt")
                if os.path.exists(txt_path):
                    with open(txt_path, "r", encoding="utf-8") as f:
                        ref_text = f.read().strip()
            except Exception as e:
                print(f"[Qwen-TTS] Warning: Voice reference not found: {e}")
                reference_audio_path = None

        try:
            is_design_model = "VoiceDesign" in model_name
            is_custom_model = "CustomVoice" in model_name
            is_base_model = "Base" in model_name

            # qwen_tts methods accept List[str] natively!
            if voice_description and (is_design_model or is_base_model):
                print(f"[Qwen-TTS] Mode: Batch Voice Design")
                wavs, sr = self.model.generate_voice_design(
                    text=texts,
                    description=voice_description,
                    language=language
                )
            elif reference_audio_path and is_base_model:
                print(f"[Qwen-TTS] Mode: Batch Voice Clone")
                wavs, sr = self.model.generate_voice_clone(
                    text=texts,
                    ref_audio=reference_audio_path,
                    ref_text=ref_text,
                    language=language,
                    x_vector_only_mode=False if ref_text else True
                )
            else:
                speaker = "Vivian"
                if voice_id:
                    potential = voice_id.split('-')[-1].capitalize()
                    if potential in ["Vivian", "Ryan", "Daisy", "Bella"]:
                        speaker = potential

                print(f"[Qwen-TTS] Mode: Batch Custom/Built-in [Speaker: {speaker}]")
                wavs, sr = self.model.generate_custom_voice(
                    text=texts,
                    language=language,
                    speaker=speaker
                )

            # Convert resulting waveforms to WAV bytes
            import io
            import torchaudio
            
            result_bytes = []
            for audio_data in wavs:
                buf = io.BytesIO()
                if not torch.is_tensor(audio_data):
                    audio_tensor = torch.from_numpy(audio_data).float()
                else:
                    audio_tensor = audio_data.detach().cpu().float()

                if audio_tensor.dim() == 1:
                    audio_tensor = audio_tensor.unsqueeze(0)
                
                torchaudio.save(buf, audio_tensor, sr, format="wav")
                result_bytes.append(buf.getvalue())
                
            return result_bytes

        except Exception as e:
            print(f"[Qwen-TTS] ✗ Batch Synthesis error: {e}")
            import traceback
            traceback.print_exc()
            raise RuntimeError(f"Qwen3-TTS batch inference failed: {e}")
        finally:
            # --- CRITICAL: Aggressive VRAM cleanup after batch synthesis ---
            # Similar to single synthesis, batch synthesis generates multiple large tensors
            # that must be explicitly destroyed and collected to prevent VRAM memory leaks.
            
            # 1. Delete references to heavy tensors
            if 'wavs' in locals():
                del wavs
            if 'audio_data' in locals():
                del audio_data
            if 'audio_tensor' in locals():
                del audio_tensor
                
            # 2. Force Python Garbage Collection
            gc.collect()
            
            # 3. Force PyTorch to release VRAM cache
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            # ---------------------------------------------------------------

