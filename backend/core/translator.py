import os
import torch
from typing import Optional, List
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
from core.config import TRANSLATION_MODELS_DIR

# Map user-friendly names to NLLB language codes
# See: https://github.com/facebookresearch/flores/blob/main/flores200/README.md#languages-in-flores-200
NLLB_LANG_MAP = {
    "English": "eng_Latn",
    "Italian": "ita_Latn",
    "French": "fra_Latn",
    "German": "deu_Latn",
    "Spanish": "spa_Latn",
    "Portuguese": "por_Latn",
    "Chinese": "zho_Hans",
    "Japanese": "jpn_Jpan",
    "Korean": "kor_Hang",
    "Russian": "rus_Cyrl",
    "Arabic": "ara_Arab"
}

class InternalTranslator:
    """
    Internal Translation Engine using Facebook's NLLB-200.
    Provides high-quality offline translation without external dependencies.
    """
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(InternalTranslator, cls).__new__(cls)
            cls._instance.model = None
            cls._instance.tokenizer = None
            cls._instance.current_model_name = None
            cls._instance.device = None # Delay detection
        return cls._instance

    def _get_device(self):
        if self.device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            print(f"[Translator] Using device: {self.device}")
        return self.device

    def _load_model(self, model_folder: str = "NLLB-200-Distilled-600M"):
        """Loads the NLLB-200 model if not already loaded or if a different model is requested."""
        device = self._get_device()
        if self.model is not None and self.current_model_name == model_folder:
            return

        model_path = TRANSLATION_MODELS_DIR / model_folder
        
        # Check if model exists locally, otherwise use the repo name as fallback for default
        if not model_path.exists() and model_folder == "NLLB-200-Distilled-600M":
            model_name = "facebook/nllb-200-distilled-600M"
        else:
            model_name = str(model_path)
        
        print(f"[Translator] Loading NLLB-200 engine ({model_folder}) on {device}...")
        try:
            # Clear old model from VRAM if exists
            if self.model is not None:
                del self.model
                del self.tokenizer
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()

            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.model = AutoModelForSeq2SeqLM.from_pretrained(
                model_name,
                dtype=torch.float16 if device == "cuda" else torch.float32,
            ).to(device)
            self.current_model_name = model_folder
            print(f"[Translator] Engine {model_folder} ready.")
        except Exception as e:
            print(f"[Translator] Error loading engine: {e}")
            raise RuntimeError(f"Failed to load translation model: {e}")

    def translate(self, text: str, target_lang: str, source_lang: str = "English", model_name: str = "NLLB-200-Distilled-600M") -> str:
        """
        Translates text from source_lang to target_lang.
        target_lang/source_lang can be a friendly name (mapped) or a raw NLLB code (e.g. 'ita_Latn').
        """
        if not text or not text.strip():
            return text

        self._load_model(model_name)
        device = self._get_device()
        
        # Get NLLB codes: check map first, otherwise assume it's already a code
        src_code = NLLB_LANG_MAP.get(source_lang, source_lang)
        tgt_code = NLLB_LANG_MAP.get(target_lang, target_lang)
        
        try:
            # IMPORTANT: For NLLB, you must set the source language on the tokenizer
            self.tokenizer.src_lang = src_code
            
            # Prepare input
            inputs = self.tokenizer(text, return_tensors="pt").to(device)
            
            # Use convert_tokens_to_ids to safely get the language token ID
            tgt_lang_id = self.tokenizer.convert_tokens_to_ids(tgt_code)
            
            # Generate translation
            # forced_bos_token_id is the target language code for NLLB
            translated_tokens = self.model.generate(
                **inputs,
                forced_bos_token_id=tgt_lang_id,
                max_length=512
            )
            
            # Decode result
            result = self.tokenizer.batch_decode(translated_tokens, skip_special_tokens=True)[0]
            return result
        except Exception as e:
            print(f"[Translator] Translation error: {e}")
            return text

    def translate_batch(self, texts: List[str], target_lang: str, source_lang: str = "English", model_name: str = "NLLB-200-Distilled-600M") -> List[str]:
        """
        Translates a list of texts in a single pass.
        target_lang/source_lang can be a friendly name (mapped) or a raw NLLB code.
        """
        if not texts:
            return []

        self._load_model(model_name)
        device = self._get_device()
        src_code = NLLB_LANG_MAP.get(source_lang, source_lang)
        tgt_code = NLLB_LANG_MAP.get(target_lang, target_lang)
        
        try:
            # IMPORTANT: For NLLB, you must set the source language on the tokenizer
            self.tokenizer.src_lang = src_code
            
            inputs = self.tokenizer(texts, padding=True, return_tensors="pt").to(device)
            
            # Use convert_tokens_to_ids to safely get the language token ID
            tgt_lang_id = self.tokenizer.convert_tokens_to_ids(tgt_code)
            
            translated_tokens = self.model.generate(
                **inputs,
                forced_bos_token_id=tgt_lang_id,
                max_length=512
            )
            return self.tokenizer.batch_decode(translated_tokens, skip_special_tokens=True)
        except Exception as e:
            print(f"[Translator] Batch translation error: {e}")
            return texts

# Global instance for easy access
translator = InternalTranslator()

