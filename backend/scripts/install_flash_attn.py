import sys
import subprocess
import torch
import requests
import re

def get_install_command():
    # Detect Python version
    py_ver = f"cp{sys.version_info.major}{sys.version_info.minor}"
    
    # Detect Torch version
    torch_full_ver = torch.__version__.split('+')[0]
    # Remove any trailing .0 if present in some contexts, but usually we want exact major.minor.patch
    
    # Detect CUDA version
    if not torch.cuda.is_available():
        return None, "CUDA is not available. Flash Attention requires an NVIDIA GPU."
    
    cuda_ver_raw = torch.version.cuda
    cuda_ver = cuda_ver_raw.replace('.', '')
    
    print(f"[i] Environment detected:")
    print(f"    - Python: {py_ver}")
    print(f"    - Torch:  {torch_full_ver}")
    print(f"    - CUDA:   {cuda_ver_raw} (Target: cu{cuda_ver})")

    # Fetch available wheels from Hugging Face API
    api_url = "https://huggingface.co/api/models/lldacing/flash-attention-windows-wheel/tree/main"
    try:
        print("[+] Fetching available wheels from Hugging Face...")
        response = requests.get(api_url, timeout=10)
        response.raise_for_status()
        files = response.json()
    except Exception as e:
        return None, f"Failed to fetch file list: {e}"

    # Filter wheels matching our environment
    # Pattern: flash_attn-[VER]+cu[CUDA]torch[TORCH]cxx11abi[ABI]-cp[PY]-cp[PY]-win_amd64.whl
    matches = []
    
    # We look for:
    # 1. Matching CUDA version (e.g. cu124)
    # 2. Matching Python version (e.g. cp311)
    # 3. Matching Torch version (e.g. torch2.6.0)
    
    cuda_tag = f"cu{cuda_ver}"
    torch_tag = f"torch{torch_full_ver}"
    
    for f in files:
        if f['type'] != 'file' or not f['path'].endswith('.whl'):
            continue
        
        path = f['path']
        
        # Check Python version
        if py_ver not in path:
            continue
            
        # Check CUDA version
        if cuda_tag not in path:
            continue
            
        # Check Torch version
        # Try exact match first
        if torch_tag in path:
            matches.append(path)
            
    # If no exact torch match, try matching just major.minor
    if not matches:
        print(f"[!] No exact match for torch {torch_full_ver}. Trying major.minor match...")
        torch_major_minor = ".".join(torch_full_ver.split('.')[:2])
        torch_tag_mm = f"torch{torch_major_minor}"
        for f in files:
            path = f['path']
            if f['type'] == 'file' and path.endswith('.whl') and py_ver in path and cuda_tag in path and torch_tag_mm in path:
                matches.append(path)

    if not matches:
        return None, f"No compatible wheel found for cu{cuda_ver}, {py_ver}, and {torch_tag}."

    # Sort matches to get the latest Flash Attention version
    # Filenames start with flash_attn-X.Y.Z
    def get_fa_ver(name):
        match = re.search(r'flash_attn-(\d+\.\d+\.\d+(\.post\d+)?)', name)
        return match.group(1) if match else "0.0.0"

    matches.sort(key=get_fa_ver, reverse=True)
    best_match = matches[0]
    
    base_url = "https://huggingface.co/lldacing/flash-attention-windows-wheel/resolve/main"
    return f"{base_url}/{best_match}", None

def main():
    print("=======================================")
    print("   Flash Attention Auto-Installer")
    print("=======================================")
    
    if sys.platform != "win32":
        print("[!] This script is specifically for Windows community wheels.")
        print("On Linux, use the official: pip install flash-attn --no-build-isolation")
        return

    link, error = get_install_command()
    if error:
        print(f"[!] {error}")
        print("\nNote: Flash Attention 2 requires an NVIDIA GPU (RTX 30-series or newer).")
        print("You can manually check for wheels at: https://huggingface.co/lldacing/flash-attention-windows-wheel")
        return

    print(f"\n[i] Found compatible wheel: {link.split('/')[-1]}")
    
    choice = input("\nDo you want to attempt installation? (y/n): ")
    if choice.lower() != 'y':
        print("Installation cancelled.")
        return

    print("\n[+] Installing Flash Attention via pip...")
    try:
        # Using -m pip ensures we use the same python interpreter
        subprocess.check_call([sys.executable, "-m", "pip", "install", link])
        print("\n[✓] Flash Attention installed successfully!")
    except Exception as e:
        print(f"\n[✗] Installation failed: {e}")
        print("\nTry running the command manually in your terminal:")
        print(f"pip install {link}")

if __name__ == "__main__":
    main()
