import os
import sys
import torch
import torchaudio
import io

# Add backend and vendors to path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
vendors_dir = os.path.join(backend_dir, "vendors")
sys.path.insert(0, backend_dir)
sys.path.insert(0, vendors_dir)

from vendors.vibevoice.modular.modeling_vibevoice_inference import VibeVoiceForConditionalGenerationInference
from vendors.vibevoice.processor.vibevoice_processor import VibeVoiceProcessor

def test_synthesis():
    model_name = "VibeVoice-1.5B" # Change if needed
    model_dir = os.path.join(backend_dir, "..", "data", "model", model_name)
    
    if not os.path.exists(model_dir):
        print(f"Error: Model not found at {model_dir}")
        return

    print(f"Loading model from {model_dir}...")
    processor = VibeVoiceProcessor.from_pretrained(model_dir)
    model = VibeVoiceForConditionalGenerationInference.from_pretrained(
        model_dir,
        dtype=torch.float16,
        device_map="cuda"
    )
    model.eval()
    model.set_ddpm_inference_steps(num_steps=10)
    print("Model loaded.")

    text = "Speaker 0: Hello, this is a test of the VibeVoice synthesis system."
    # Use a dummy reference audio or a real one if available
    ref_audio = os.path.join(backend_dir, "..", "data", "voices", "it-davide_man.wav")
    
    if not os.path.exists(ref_audio):
        print(f"Warning: Reference audio not found at {ref_audio}. Using silence placeholder (MIGHT FAIL).")
        # Creating a 1s silent wav for testing
        import numpy as np
        import soundfile as sf
        ref_audio = "temp_ref.wav"
        sf.write(ref_audio, np.zeros(16000), 16000)

    print(f"Processing synthesis for: {text}")
    inputs = processor(
        text=[text],
        voice_samples=[[ref_audio]],
        padding=True,
        return_tensors="pt",
        return_attention_mask=True,
    ).to("cuda")

    try:
        print("Generating...")
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=None,
                cfg_scale=1.3,
                tokenizer=processor.tokenizer,
                generation_config={'do_sample': True, 'temperature': 0.1},
                verbose=True,
                is_prefill=True,
            )
        print("Success! Audio generated.")
        
        if outputs.speech_outputs:
            audio = outputs.speech_outputs[0]
            print(f"Output shape: {audio.shape}")
            
    except Exception as e:
        print(f"Synthesis FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_synthesis()
