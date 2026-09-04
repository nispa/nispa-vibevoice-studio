import sys
import subprocess
import os
import torch
from pathlib import Path

# Add backend to sys.path to access core config
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
try:
    from core.config import config_manager
    HAS_CONFIG = True
except ImportError:
    HAS_CONFIG = False

def print_header(text):
    print(f"\n{'='*50}")
    print(f"   {text}")
    print(f"{'='*50}")

def check_tool(name, version_cmd, install_help):
    print(f"[+] Checking {name}...")
    path = config_manager.get_path(name.lower()) if HAS_CONFIG else name.lower()
    try:
        subprocess.check_call([path] + version_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"[✓] {name} is installed and accessible at: {path}")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print(f"[!] {name} not found or not working correctly.")
        print(f"    {install_help}")
        return False

import argparse


def main():
    parser = argparse.ArgumentParser(description="Nispa Studio Environment Optimizer")
    parser.add_argument(
        "--engines",
        type=str,
        default="all",
        help="Comma-separated list of engines to check (e.g. 'vibevoice,qwen,omnivoice' or 'all')"
    )
    args = parser.parse_args()
    
    raw_engines = args.engines.strip().lower()
    if raw_engines == "all":
        selected_engines = {"vibevoice", "qwen", "omnivoice"}
    else:
        selected_engines = {e.strip() for e in raw_engines.split(",") if e.strip()}

    print_header(f"Nispa Studio Environment Optimizer (Engines: {', '.join(sorted(selected_engines))})")
    
    # 1. Check Hardware
    print(f"[i] OS: {sys.platform}")
    print(f"[i] Python: {sys.version.split()[0]}")
    has_cuda = torch.cuda.is_available()
    print(f"[i] CUDA Available: {'Yes' if has_cuda else 'No'}")
    if has_cuda:
        print(f"    - Version: {torch.version.cuda}")
        print(f"    - Device: {torch.cuda.get_device_name(0)}")

    # 2. Check Critical Tools
    ffmpeg_help = "Install via winget: 'winget install ffmpeg' or visit ffmpeg.org"
    sox_help = "Install via winget: 'winget install sox' or visit sox.sourceforge.net"
    
    check_tool("FFmpeg", ["-version"], ffmpeg_help)
    check_tool("SoX", ["--help"], sox_help)

    # 3. Check Flash Attention (NVIDIA only)
    if has_cuda:
        print("\n[+] Checking Flash Attention...")
        try:
            import flash_attn
            print(f"[✓] Flash Attention is already installed.")
        except ImportError:
            print("[i] Flash Attention not found. Running dynamic installer...")
            try:
                subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), "install_flash_attn.py")],
                               input=b"y\n", check=True)
            except Exception as e:
                print(f"[!] Flash Attention installation attempt failed: {e}")

    # 4. Check Engine-Specific Dependencies
    if "vibevoice" in selected_engines:
        print("\n[+] Checking VibeVoice utilities...")
        try:
            subprocess.check_call([sys.executable, os.path.join(os.path.dirname(__file__), "install_vibevoice_utils.py")])
        except Exception as e:
            print(f"[!] VibeVoice utils setup failed: {e}")

    if "omnivoice" in selected_engines:
        print("\n[+] Checking OmniVoice worker environment...")
        root_dir = Path(__file__).resolve().parent.parent.parent
        worker_py = root_dir / "venv_omnivoice" / "Scripts" / "python.exe"
        if not worker_py.exists():
            worker_py = root_dir / "venv_omnivoice" / "bin" / "python"
        
        if worker_py.exists():
            try:
                res = subprocess.run(
                    [str(worker_py), "-c", "import torch, omnivoice; print('OmniVoice venv ready')"],
                    capture_output=True,
                    text=True,
                    check=True
                )
                print(f"[✓] OmniVoice isolated environment verified ({res.stdout.strip()})")
            except Exception as e:
                print(f"[!] OmniVoice isolated environment check failed: {e}")
        else:
            print(f"[i] venv_omnivoice not found. It will be created when OmniVoice is installed.")

    print_header("Optimization Check Complete")
    print("If all tools are [✓], Nispa Studio is ready for high-performance synthesis.")

if __name__ == "__main__":
    main()
