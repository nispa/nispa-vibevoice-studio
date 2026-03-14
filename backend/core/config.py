import os
import json
from pathlib import Path
from typing import Dict, Any

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR.parent / "data"
SETTINGS_FILE = DATA_DIR / "settings.json"

VOICES_DIR = DATA_DIR / "voices"
MODELS_DIR = DATA_DIR / "model"
TRANSLATION_MODELS_DIR = DATA_DIR / "model-translation"
OUTPUTS_DIR = DATA_DIR / "outputs"

# Ensure directories exist
for d in [VOICES_DIR, MODELS_DIR, TRANSLATION_MODELS_DIR, OUTPUTS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

class ConfigManager:
    """
    Manages system-wide settings and paths, with persistence in a JSON file.
    """
    DEFAULT_SETTINGS = {
        "paths": {
            "sox": "sox",      # Default assumes it's in PATH
            "ffmpeg": "ffmpeg", # Default assumes it's in PATH
            "ffprobe": "ffprobe"
        },
        "audio": {
            "default_format": "mp3",
            "sample_rate_asr": 16000,
            "sample_rate_tts": 24000
        },
        "ui": {
            "theme": "dark"
        }
    }

    def __init__(self):
        self.settings = self.load_settings()

    def load_settings(self) -> Dict[str, Any]:
        if not SETTINGS_FILE.exists():
            return self.save_settings(self.DEFAULT_SETTINGS)
        
        try:
            with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
                loaded = json.load(f)
                # Merge with defaults to ensure all keys exist
                return self._merge_dicts(self.DEFAULT_SETTINGS, loaded)
        except Exception as e:
            print(f"[Config] Error loading settings: {e}")
            return self.DEFAULT_SETTINGS

    def save_settings(self, settings: Dict[str, Any]) -> Dict[str, Any]:
        try:
            with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
                json.dump(settings, f, indent=4)
            self.settings = settings
            return settings
        except Exception as e:
            print(f"[Config] Error saving settings: {e}")
            return settings

    def _merge_dicts(self, default: Dict, override: Dict) -> Dict:
        result = default.copy()
        for key, value in override.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._merge_dicts(result[key], value)
            else:
                result[key] = value
        return result

    def get_path(self, key: str) -> str:
        return self.settings.get("paths", {}).get(key, key)

# Global instances
config_manager = ConfigManager()

# Export paths for convenience
def get_sox_path(): return config_manager.get_path("sox")
def get_ffmpeg_path(): return config_manager.get_path("ffmpeg")
