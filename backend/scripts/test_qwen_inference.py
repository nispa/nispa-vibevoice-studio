import os
import sys
import torch
import torchaudio
import time

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.tts_provider import Qwen3TTSProvider

def test_model(model_name, text, description=None, voice_id=None):
    print(f"\n--- Testing Model: {model_name} ---")
    provider = Qwen3TTSProvider()
    
    start_time = time.time()
    try:
        wav_bytes = provider.synthesize(
            text=text,
            model_name=model_name,
            voice_description=description,
            voice_id=voice_id
        )
        duration = time.time() - start_time
        print(f"[✓] Success! Generated {len(wav_bytes)} bytes in {duration:.2f}s")
        
        # Save sample
        output_path = f"test_qwen_{model_name.lower().replace('-', '_')}.wav"
        with open(output_path, "wb") as f:
            f.write(wav_bytes)
        print(f"[i] Sample saved to: {output_path}")
        
    except Exception as e:
        print(f"[✗] Failed: {e}")

if __name__ == "__main__":
    print("Starting Qwen3-TTS Diagnostic Test...")
    
    # 1. Check folder presence
    models_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "model"))
    qwen_06 = "Qwen3-TTS-0.6B-CustomVoice"
    qwen_17 = "Qwen3-TTS-1.7B-VoiceDesign"
    
    has_06 = os.path.exists(os.path.join(models_dir, qwen_06))
    has_17 = os.path.exists(os.path.join(models_dir, qwen_17))
    
    print(f"Models directory: {models_dir}")
    print(f"Qwen 0.6B present: {has_06}")
    print(f"Qwen 1.7B present: {has_17}")
    
    if has_06:
        test_model(
            model_name=qwen_06,
            text="This is a test of the Qwen 3 zero-shot voice cloning capabilities.",
            # Note: requires a wav file in data/voices to test cloning, using base for now
        )
        
    if has_17:
        test_model(
            model_name=qwen_17,
            text="I am a new voice designed entirely from a text description.",
            description="A deep, authoritative male voice with a slight British accent."
        )
    
    if not has_06 and not has_17:
        print("\n[!] No Qwen3 models found in data/model. Please download weights first.")
