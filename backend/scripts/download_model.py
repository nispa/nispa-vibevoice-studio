import os
import sys
import json
import datetime
from pathlib import Path
from huggingface_hub import snapshot_download

# Add backend directory to sys.path to access core catalog
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.tts.catalog import (
    list_supported_models,
    is_model_installed,
    get_model_target_dir,
    resolve_model_capabilities,
    ModelCapabilities
)
from core.config import MODELS_DIR, TRANSLATION_MODELS_DIR


def write_manifest(target_path: str, caps: ModelCapabilities):
    """Writes a manifest.json recording repository, pinned revision, and timestamp."""
    manifest = {
        "name": caps.folder_name or caps.model_id,
        "repo": caps.upstream_repo,
        "revision": caps.pinned_revision or "latest",
        "download_timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "verified": True,
        "files": sorted(os.listdir(target_path))
    }
    manifest_path = os.path.join(target_path, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"[OK] Manifest recorded at {manifest_path}")


# Preserved for backward compatibility with legacy callers and unit tests
MODELS = {
    str(i + 1): {
        "name": m.folder_name or m.model_id,
        "repo": m.upstream_repo,
        "revision": m.pinned_revision or "latest",
        "description": m.description or m.display_name,
        "essential_files": m.essential_files,
    }
    for i, m in enumerate([m for m in list_supported_models() if m.upstream_repo])
}

def verify_installation(target_path: str, model_spec: dict) -> bool:
    """Legacy helper preserved for backward compatibility."""
    if not os.path.exists(target_path):
        return False
    essential = model_spec.get("essential_files", ["config.json"])
    for ef in essential:
        fp = os.path.join(target_path, ef)
        if not os.path.exists(fp) or os.path.getsize(fp) == 0:
            return False
    return True


def main():
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    TRANSLATION_MODELS_DIR.mkdir(parents=True, exist_ok=True)

    all_models = list_supported_models()
    # Filter only models that have an upstream repository declared
    downloadable = [m for m in all_models if m.upstream_repo]

    # Map numeric strings "1", "2", ... to ModelCapabilities
    menu_map: dict[str, ModelCapabilities] = {
        str(i + 1): m for i, m in enumerate(downloadable)
    }

    while True:
        print("\n=======================================")
        print("   Nispa Studio Weights Downloader")
        print("=======================================")
        print(f"Main Destination: {MODELS_DIR}")
        print(f"Translation Destination: {TRANSLATION_MODELS_DIR}")
        print("")

        for key, caps in menu_map.items():
            installed = is_model_installed(caps)
            status_mark = "[*] [ALREADY INSTALLED]" if installed else "[ ]"
            rev_info = f" (rev: {caps.pinned_revision[:8]})" if caps.pinned_revision else ""
            desc = caps.description or caps.display_name
            name = caps.folder_name or caps.model_id
            print(f"{key:>2}) {status_mark} {name}{rev_info} - {desc}")

        choice = input("\nSelect model to download (or 'q' to quit): ").strip()

        if choice.lower() == 'q':
            break

        if choice not in menu_map:
            print("\n[!] Invalid choice. Please try again.")
            continue

        selected = menu_map[choice]
        target_path = str(get_model_target_dir(selected))
        os.makedirs(target_path, exist_ok=True)

        # Auto-download Tokenizer if a Qwen model is chosen and tokenizer is missing
        if selected.provider_id == "qwen" and selected.model_id != "qwen3-tokenizer-12hz":
            try:
                tok_caps = resolve_model_capabilities("qwen3-tokenizer-12hz")
                tok_target = str(get_model_target_dir(tok_caps))
                if not is_model_installed(tok_caps):
                    print("\n[!] Qwen3 Tokenizer is required but missing. Downloading it first...")
                    snapshot_download(
                        repo_id=tok_caps.upstream_repo,
                        local_dir=tok_target,
                        local_dir_use_symlinks=False
                    )
                    write_manifest(tok_target, tok_caps)
                    print("[OK] Tokenizer downloaded successfully.")
            except Exception as e:
                print(f"[ERR] Failed to download tokenizer: {e}. Synthesis might fail.")

        # Auto-download Audio Codec Tokenizer if a Higgs model is chosen and codec is missing
        if selected.provider_id == "higgs" and selected.model_id != "higgs-audio-v2-tokenizer":
            try:
                tok_caps = resolve_model_capabilities("higgs-audio-v2-tokenizer")
                tok_target = str(get_model_target_dir(tok_caps))
                if not is_model_installed(tok_caps):
                    print("\n[!] Higgs Audio Tokenizer/Codec is required but missing. Downloading it first...")
                    snapshot_download(
                        repo_id=tok_caps.upstream_repo,
                        local_dir=tok_target,
                        local_dir_use_symlinks=False
                    )
                    write_manifest(tok_target, tok_caps)
                    print("[OK] Higgs Audio Tokenizer downloaded successfully.")
            except Exception as e:
                print(f"[ERR] Failed to download Higgs audio codec: {e}. Synthesis might fail.")

        rev = selected.pinned_revision
        print(f"\n[+] Downloading {selected.upstream_repo} ({f'revision {rev[:8]}' if rev else 'latest'}) to {target_path}...")
        print("This may take several minutes depending on your connection...")

        try:
            download_kwargs = {
                "repo_id": selected.upstream_repo,
                "local_dir": target_path,
                "local_dir_use_symlinks": False
            }
            if rev:
                download_kwargs["revision"] = rev

            snapshot_download(**download_kwargs)

            if is_model_installed(selected):
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
