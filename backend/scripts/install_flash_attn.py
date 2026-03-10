import sys
import subprocess
import torch

def get_flash_attn_link():
    # Detect Python version
    py_ver = f"cp{sys.version_info.major}{sys.version_info.minor}"
    
    # Detect Torch version
    torch_ver = torch.__version__.split('+')[0]
    
    # Detect CUDA version
    if not torch.cuda.is_available():
        return None, "CUDA is not available. Flash Attention requires an NVIDIA GPU."
    
    cuda_ver = torch.version.cuda.replace('.', '')
    
    # Base URL for lldacing wheels
    base_url = "https://huggingface.co/lldacing/flash-attention-windows-wheel/resolve/main"
    
    # Logic for current known wheels (standardized naming)
    # Example: flash_attn-2.7.0.post2+cu124torch2.5.1cxx11abiFALSE-cp311-cp311-win_amd64.whl
    wheel_name = f"flash_attn-2.7.0.post2+cu{cuda_ver}torch{torch_ver}cxx11abiFALSE-{py_ver}-{py_ver}-win_amd64.whl"
    
    return f"{base_url}/{wheel_name}", None

def main():
    print("=======================================")
    print("   Flash Attention 2 Auto-Installer")
    print("=======================================")
    
    if sys.platform != "win32":
        print("[!] This script is specifically for Windows wheels.")
        return

    link, error = get_flash_attn_link()
    if error:
        print(f"[!] {error}")
        return

    print(f"[i] Detected: Python {sys.version.split()[0]}, Torch {torch.__version__}")
    print(f"[i] Target Wheel: {link.split('/')[-1]}")
    
    choice = input("\nDo you want to attempt installation? (y/n): ")
    if choice.lower() != 'y':
        print("Installation cancelled.")
        return

    print("\n[+] Installing Flash Attention via pip...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", link])
        print("\n[✓] Flash Attention installed successfully!")
    except Exception as e:
        print(f"\n[✗] Installation failed: {e}")
        print("\nNote: Flash Attention 2 requires an NVIDIA GPU (RTX 30-series or newer).")
        print("If your GPU is older, you can ignore this and use the standard PyTorch mode.")

if __name__ == "__main__":
    main()
