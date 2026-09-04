import os
import sys
import json
import datetime
from huggingface_hub import snapshot_download

# Mapping of models to their official repositories and pinned revisions
MODELS = {
    "1": {
        "name": "VibeVoice-Realtime-0.5B",
        "repo": "microsoft/VibeVoice-Realtime-0.5B",
        "description": "VibeVoice 0.5B (Streaming, 1 speaker)",
        "essential_files": ["config.json"]
    },
    "2": {
        "name": "VibeVoice-1.5B",
        "repo": "vibevoice/VibeVoice-1.5B",
        "description": "VibeVoice 1.5B (Stable, 64K context)",
        "essential_files": ["config.json"]
    },
    "3": {
        "name": "VibeVoice-7B",
        "repo": "vibevoice/VibeVoice-7B",
        "description": "VibeVoice Large 7B (High Fidelity)",
        "essential_files": ["config.json"]
    },
    "4": {
        "name": "Qwen3-TTS-Tokenizer-12Hz",
        "repo": "Qwen/Qwen3-TTS-Tokenizer-12Hz",
        "description": "CRITICAL: Required for all Qwen3 models",
        "essential_files": ["config.json"]
    },
    "5": {
        "name": "Qwen3-TTS-12Hz-1.7B-Base",
        "repo": "Qwen/Qwen3-TTS-12Hz-1.7B-Base",
        "description": "Qwen3 1.7B Base (Best for Voice Cloning)",
        "essential_files": ["config.json", "model.safetensors"]
    },
    "6": {
        "name": "Qwen3-TTS-12Hz-1.7B-CustomVoice",
        "repo": "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice",
        "description": "Qwen3 1.7B Custom (High-quality built-in voices)",
        "essential_files": ["config.json", "model.safetensors"]
    },
    "7": {
        "name": "Qwen3-TTS-12Hz-1.7B-VoiceDesign",
        "repo": "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign",
        "description": "Qwen3 1.7B Design (Text-to-Voice description)",
        "essential_files": ["config.json", "model.safetensors"]
    },
    "8": {
        "name": "Qwen3-TTS-12Hz-0.6B-Base",
        "repo": "Qwen/Qwen3-TTS-12Hz-0.6B-Base",
        "description": "Qwen3 0.6B Base (Fast Cloning, Low VRAM)",
        "essential_files": ["config.json", "model.safetensors"]
    },
    "9": {
        "name": "Qwen3-TTS-12Hz-0.6B-CustomVoice",
        "repo": "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice",
        "description": "Qwen3 0.6B Custom (Fast Built-in, Low VRAM)",
        "essential_files": ["config.json", "model.safetensors"]
    },
    "10": {
        "name": "NLLB-200-Distilled-600M",
        "repo": "facebook/nllb-200-distilled-600M",
        "description": "Internal Offline Translator (Supports 200 languages)",
        "essential_files": ["config.json", "model.safetensors"]
    },
    "11": {
        "name": "OmniVoice",
        "repo": "k2-fsa/OmniVoice",
        "revision": "c5fdb5ccb189668d56333f77ba2629f4cd7535f4",
        "description": "OmniVoice (Fast Voice Cloning & Design, 600+ languages)",
        "essential_files": [
            "config.json",
            "model.safetensors",
            "tokenizer.json",
            os.path.join("audio_tokenizer", "config.json"),
            os.path.join("audio_tokenizer", "model.safetensors")
        ]
    }
}


def verify_installation(target_path: str, model_spec: dict) -> bool:
    """
    Checks that the model directory exists and that all declared essential files
    are present and non-empty. Prevents partial downloads from being considered installed.
    """
    if not os.path.exists(target_path):
        return False
    essential = model_spec.get("essential_files", ["config.json"])
    for ef in essential:
        fp = os.path.join(target_path, ef)
        if not os.path.exists(fp) or os.path.getsize(fp) == 0:
            return False
    return True


def write_manifest(target_path: str, model_spec: dict):
    """Writes a manifest.json recording repository, pinned revision, and timestamp."""
    manifest = {
        "name": model_spec["name"],
        "repo": model_spec["repo"],
        "revision": model_spec.get("revision", "latest"),
        "download_timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "verified": True,
        "files": sorted(os.listdir(target_path))
    }
    manifest_path = os.path.join(target_path, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"[OK] Manifest recorded at {manifest_path}")


def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    models_dir = os.path.join(base_dir, "data", "model")
    translation_dir = os.path.join(base_dir, "data", "model-translation")
    
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
            current_dest = translation_dir if "NLLB" in model['name'] else models_dir
            target_path = os.path.join(current_dest, model['name'])
            is_installed = verify_installation(target_path, model)
            
            status_mark = "[*] [ALREADY INSTALLED]" if is_installed else "[ ]"
            rev_info = f" (rev: {model['revision'][:8]})" if 'revision' in model else ""
            print(f"{key}) {status_mark} {model['name']}{rev_info} - {model['description']}")
        
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
            if not verify_installation(tokenizer_path, tokenizer_model):
                print(f"\n[!] Qwen3 Tokenizer is required but missing. Downloading it first...")
                try:
                    snapshot_download(
                        repo_id=tokenizer_model['repo'],
                        local_dir=tokenizer_path,
                        local_dir_use_symlinks=False
                    )
                    write_manifest(tokenizer_path, tokenizer_model)
                    print("[OK] Tokenizer downloaded successfully.")
                except Exception as e:
                    print(f"[ERR] Failed to download tokenizer: {e}. Synthesis might fail.")

        revision = selected.get("revision")
        print(f"\n[+] Downloading {selected['repo']} ({f'revision {revision[:8]}' if revision else 'latest'}) to {target_path}...")
        print("This may take several minutes depending on your connection...")
        
        try:
            download_kwargs = {
                "repo_id": selected['repo'],
                "local_dir": target_path,
                "local_dir_use_symlinks": False
            }
            if revision:
                download_kwargs["revision"] = revision

            snapshot_download(**download_kwargs)
            
            if verify_installation(target_path, selected):
                write_manifest(target_path, selected)
                print("\n[OK] Download Complete and Verified!")
                print(f"Model saved to: {target_path}")
            else:
                print("\n[!] Download finished but essential files appear missing or incomplete.")
        except Exception as e:
            print(f"\n[ERR] An error occurred during download: {e}")
        
        print("\nReturning to menu...")

if __name__ == "__main__":
    main()
