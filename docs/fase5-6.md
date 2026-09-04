# Fasi 5 & 6 — Cache Biometrica dei Prompt, OmniVoice Worker Isolato e Provider

## Riepilogo degli Obiettivi Raggiunti

Abbiamo integrato con successo OmniVoice nel backend di Nispa Voiceover come terzo provider locale a pieno titolo, risolvendo tutti i requisiti di isolamento e privacy:

### 1. Gestione della Cache Biometrica (`backend/core/tts/prompt_cache.py`)
- **Calcolo deterministico della chiave hash**: SHA-256 combinato dell'audio reference WAV, della trascrizione di testo `.txt`, della revisione del modello e del formato.
- **Salvataggio protetto**: directory protetta `data/voice-prompts/omnivoice/`, esclusa da git.
- **Ciclo di vita & Invalidazione automatica**:
  - `find_valid_cached_prompt`: riutilizza istantaneamente le impronte vocali già calcolate eliminando quelle obsolete.
  - `invalidate_voice_cache`: integrato nelle API di cancellazione voce (`DELETE /api/voices/{voice_id}`) e di aggiornamento trascrizione (`POST /api/voices/{voice_id}/transcription`).
  - `clear_all_omnivoice_prompts`: esposto tramite l'endpoint dedicato `DELETE /api/voices/cache/omnivoice`.

### 2. Worker Isolato Locale (`backend/workers/omnivoice_worker.py`)
- **Risoluzione del conflitto di dipendenze**: opera in un processo subprocess separato che sfrutta `venv_omnivoice` (con PyTorch 2.10.0+cu130 e Transformers 5.16.1), isolando completamente Qwen e VibeVoice che richiedono Transformers 4.57.3.
- **Sicurezza**: bind rigoroso su `127.0.0.1` con token crittografico di sessione (`X-Session-Token`).
- **Offline forzato**: impone `HF_HUB_OFFLINE=1`, `TRANSFORMERS_OFFLINE=1`, `HF_DATASETS_OFFLINE=1`.
- **Nessun fallback occulto ASR**: rifiuta tassativamente reference privi di trascrizione non vuota.
- **Gestione VRAM**: endpoint `/unload` per liberare la memoria GPU e `/shutdown` per evitare processi orfani.

### 3. OmniVoiceProvider & Registrazione nel Registry (`backend/core/tts/omnivoice_provider.py` & `tts_provider.py`)
- Eredita da `TTSProvider` e implementa `synthesize()`, `synthesize_batch()`, `unload()` e `shutdown()`.
- Gestisce l'avvio on-demand del worker con handshake di salute (`/health`), gestione della porta dinamica e cleanup garantito con `atexit`.
- Registrato nel `ProviderRegistry` tramite `self.registry.register_factory("omnivoice", self._create_omnivoice)`.

### 4. Risultati della Verifica
- **Test Unitari e di Regressione**:
  - `backend/tests/test_prompt_cache.py`: **4 passed**
  - `backend/tests/test_omnivoice_provider.py`: **5 passed**
  - **Suite Globale**: **129 backend tests passed**, **28 frontend tests passed** (0 errori, 0 regressioni).
- **Smoke Test Reale su GPU (RTX 4500 Ada)**:
  - Generato audio reale di test (265.004 bytes, 5.52s, 24kHz mono 16-bit PCM).
  - Creata e salvata l'impronta vocale biometrica in `data/voice-prompts/omnivoice/it-panebianco_woman_df42a06b9e3e6f8f.pt` (16.3 KB).
  - Pulizia della VRAM verificata con successo post-sintesi.
