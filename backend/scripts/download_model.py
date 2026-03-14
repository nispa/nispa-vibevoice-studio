import os
import sys
from huggingface_hub import snapshot_download

# Mapping of models to their official Hugging Face weight repositories
MODELS = {
    "1": {
        "name": "VibeVoice-Realtime-0.5B",
        "repo": "microsoft/VibeVoice-Realtime-0.5B",
        "description": "VibeVoice 0.5B (Streaming, 1 speaker)"
    },
    "2": {
        "name": "VibeVoice-1.5B",
        "repo": "vibevoice/VibeVoice-1.5B",
        "description": "VibeVoice 1.5B (Stable, 64K context)"
    },
    "3": {
        "name": "VibeVoice-7B",
        "repo": "vibevoice/VibeVoice-7B",
        "description": "VibeVoice Large 7B (High Fidelity)"
    },
    "4": {
        "name": "Qwen3-TTS-Tokenizer-12Hz",
        "repo": "Qwen/Qwen3-TTS-Tokenizer-12Hz",
        "description": "CRITICAL: Required for all Qwen3 models"
    },
    "5": {
        "name": "Qwen3-TTS-12Hz-1.7B-Base",
        "repo": "Qwen/Qwen3-TTS-12Hz-1.7B-Base",
        "description": "Qwen3 1.7B Base (Best for Voice Cloning)"
    },
    "6": {
        "name": "Qwen3-TTS-12Hz-1.7B-CustomVoice",
        "repo": "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice",
        "description": "Qwen3 1.7B Custom (High-quality built-in voices)"
    },
    "7": {
        "name": "Qwen3-TTS-12Hz-1.7B-VoiceDesign",
        "repo": "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign",
        "description": "Qwen3 1.7B Design (Text-to-Voice description)"
    },
    "8": {
        "name": "Qwen3-TTS-12Hz-0.6B-Base",
        "repo": "Qwen/Qwen3-TTS-12Hz-0.6B-Base",
        "description": "Qwen3 0.6B Base (Fast Cloning, Low VRAM)"
    },
    "9": {
        "name": "Qwen3-TTS-12Hz-0.6B-CustomVoice",
        "repo": "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice",
        "description": "Qwen3 0.6B Custom (Fast Built-in, Low VRAM)"
    },
    "10": {
        "name": "NLLB-200-Distilled-600M",
        "repo": "facebook/nllb-200-distilled-600M",
        "description": "Internal Offline Translator (Supports 200 languages)"
    }
}

def main():
    # Set the local models directory
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    models_dir = os.path.join(base_dir, "data", "model")
    translation_dir = os.path.join(base_dir, "data", "model-translation")
    
    # Ensure directories exist
    os.makedirs(models_dir, exist_ok=True)
    os.makedirs(translation_dir, exist_ok=True)

    while True:
        print("\n=======================================")
        print("   Nispa Studio Weights Downloader")
        print("=======================================")
        print(f"Main Destination: {models_dir}")
        print(f"Translation Destination: {translation_dir}")
        print("")
        
        for key, model in MODELS.items():
            # Choose destination based on model type
            current_dest = translation_dir if "NLLB" in model['name'] else models_dir
            
            # Check if model directory exists and is not empty
            target_path = os.path.join(current_dest, model['name'])
            is_installed = os.path.exists(target_path) and len(os.listdir(target_path)) > 0
            
            status_mark = "[*] [ALREADY INSTALLED]" if is_installed else "[ ]"
            print(f"{key}) {status_mark} {model['name']} - {model['description']}")
        
        choice = input("\nSelect model to download (or 'q' to quit): ").strip()
        
        if choice.lower() == 'q':
            break

        if choice not in MODELS:
            print("\n[!] Invalid choice. Please try again.")
            continue

        selected = MODELS[choice]
        current_dest = translation_dir if "NLLB" in selected['name'] else models_dir
        target_path = os.path.join(current_dest, selected['name'])
        
        # Auto-download Tokenizer if a Qwen model is chosen and tokenizer is missing
        if "Qwen" in selected['name'] and selected['name'] != "Qwen3-TTS-Tokenizer-12Hz":
            tokenizer_model = MODELS["4"]
            tokenizer_path = os.path.join(models_dir, tokenizer_model['name'])
            if not os.path.exists(tokenizer_path) or len(os.listdir(tokenizer_path)) == 0:
                print(f"\n[!] Qwen3 Tokenizer is required but missing. Downloading it first...")
                try:
                    snapshot_download(
                        repo_id=tokenizer_model['repo'],
                        local_dir=tokenizer_path,
                        local_dir_use_symlinks=False
                    )
                    print("[✓] Tokenizer downloaded successfully.")
                except Exception as e:
                    print(f"[✗] Failed to download tokenizer: {e}. Synthesis might fail.")

        print(f"\n[+] Downloading {selected['repo']} to {target_path}...")
        print("This may take several minutes depending on your connection...")
        
        try:
            snapshot_download(
                repo_id=selected['repo'],
                local_dir=target_path,
                local_dir_use_symlinks=False
            )
            print("\n[✓] Download Complete!")
            print(f"Model saved to: {target_path}")
        except Exception as e:
            print(f"\n[✗] An error occurred during download: {e}")
        
        print("\nReturning to menu...")

if __name__ == "__main__":
    main()
