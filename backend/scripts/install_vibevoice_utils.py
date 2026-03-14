import sys
import subprocess
import os

def check_ffmpeg():
    print("[+] Checking for FFmpeg...")
    try:
        subprocess.check_call(['ffmpeg', '-version'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print("[✓] FFmpeg is installed and accessible.")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("[!] FFmpeg not found in PATH.")
        if sys.platform == "win32":
            print("    Recommendation: Install via winget: 'winget install ffmpeg'")
            print("    Or download from: https://ffmpeg.org/download.html")
        else:
            print("    Recommendation: Install via your package manager (e.g., 'sudo apt install ffmpeg')")
        return False

def install_audio_deps():
    print("[+] Installing audio processing dependencies...")
    deps = ["librosa", "resampy", "soundfile"]
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install"] + deps)
        print("[✓] Audio dependencies installed successfully.")
    except Exception as e:
        print(f"[✗] Failed to install dependencies: {e}")

def main():
    print("=======================================")
    print("   VibeVoice Utils Auto-Installer")
    print("=======================================")
    
    # 1. Check FFmpeg
    ffmpeg_ready = check_ffmpeg()
    
    # 2. Install Python deps
    install_audio_deps()
    
    print("\n[i] VibeVoice audio_utils module has been created manually.")
    print("    This resolves the 'audio_utils' warning and enables better format support.")
    
    if not ffmpeg_ready:
        print("\n[!] WARNING: FFmpeg is missing. VibeVoice will fall back to 'soundfile',")
        print("    which only supports standard WAV files. Install FFmpeg for MP3/AAC support.")
    
    print("\n=======================================")
    print("   Setup Complete")
    print("=======================================")

if __name__ == "__main__":
    main()
