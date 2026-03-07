import os
from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR.parent / "data"

VOICES_DIR = DATA_DIR / "voices"
MODELS_DIR = DATA_DIR / "model"

# Ensure directories exist
VOICES_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)
