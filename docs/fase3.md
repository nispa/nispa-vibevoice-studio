# Walkthrough: Integrazione OmniVoice & Refactoring Provider

## Fase 0 — Protezione della Baseline (Completata)

Abbiamo congelato lo stato iniziale dell'ambiente, eseguito l'intera suite di test e validato le prestazioni e l'integrità dei modelli TTS attualmente installati (`Qwen3-TTS` e `VibeVoice`).

### 1. Inventario dell'Ambiente di Esecuzione

- **Sistema Operativo**: Windows 11 (`Windows-10-10.0.26200-SP0`)
- **Python**: `3.11.9` (64-bit AMD64)
- **Git Branch attivo**: `omnivoice`
- **Git Commit**: `9e86fa60e50251b037e4c90e084c937e0fec41ff`
- **GPU Primaria**: NVIDIA RTX 4500 Ada Generation
  - Compute Capability: `(8, 9)`
  - VRAM Totale: `23.99 GB`
  - Device Count: 2
- **PyTorch**: `2.10.0+cu130`
- **CUDA (PyTorch)**: `13.0`
- **Dipendenze Chiave**:
  - `torchaudio`: `2.11.0+cu130`
  - `transformers`: `4.57.3`
  - `qwen_tts`: installato
  - `soundfile`: `0.13.1`
  - `flash_attn`: `2.8.3`
  - `fastapi`: `0.135.1`
  - `pydantic`: `2.12.5`
  - `numpy`: `2.4.3`
  - `SoX`: `14.4.2` presente in `C:\Program Files (x86)\sox-14-4-2`

### 2. Esito Suite di Test (`run_tests.py`)

- **Backend (`pytest backend/tests`)**: **97 passed** in 20.64s (0 fallimenti)
- **Frontend (`npm run test -- --run` via Vitest)**: **28 passed** in 1.98s (0 fallimenti)
- **Risultato complessivo**: `backend: PASSED`, `frontend: PASSED`.
- **Miglioramento apportato**: corretto [run_tests.py](file:///f:/nispa-voiceover/run_tests.py#L34-L35) con supporto a `npm.cmd` su Windows.

### 3. Baseline Smoke Test Reali su GPU

| Metrica | Qwen3-TTS (`Qwen3-TTS-12Hz-0.6B-Base`) | VibeVoice (`VibeVoice-1.5B`) |
| :--- | :--- | :--- |
| **Tempo caricamento + 1ª sintesi (cold)** | 36.58 s | 33.50 s |
| **Tempo sintesi successiva (warm)** | 8.10 s | 5.09 s |
| **VRAM Allocata a riposo (post-load)** | 2.06 GB | 7.10 GB |
| **Picco VRAM durante sintesi** | 2.95 GB | 8.03 GB |
| **Sample Rate audio generato** | 24,000 Hz | 24,000 Hz |
| **Canali audio** | 1 (Mono) | 1 (Mono) |
| **Durata audio generato** | 10.08 s | 5.07 s |
| **Integrità WAV** | Valido (16-bit PCM, 483,884 bytes) | Valido (16-bit PCM, 243,244 bytes) |
| **Pulizia VRAM post-test** | Completata con successo (0 GB alloc) | Completata con successo (0 GB alloc) |

---

## Fase 1 — Spike Compatibilità OmniVoice (Completata)

Abbiamo eseguito lo spike completo di OmniVoice, scaricato i pesi locali, eseguito i test di inferenza in strict-offline e testato la matrice di dipendenze incrociata con Qwen e VibeVoice.

### 1. Download e Pesi Locali
- **Modello upstream**: `k2-fsa/OmniVoice`
- **Revisione SHA pinnata**: `c5fdb5ccb189668d56333f77ba2629f4cd7535f4`
- **Destinazione locale**: `data/model/OmniVoice` (3.04 GB totali: `model.safetensors` 2.34 GB, `audio_tokenizer/model.safetensors` 768 MB).

### 2. Risultati Benchmark Spike OmniVoice (Strict-Offline su GPU)
- **Modalità di rete**: `HF_HUB_OFFLINE=1`, `TRANSFORMERS_OFFLINE=1` (zero chiamate di rete o download impliciti).
- **Tempo di caricamento pesi (cold)**: **2.50 s** (eccezionalmente veloce).
- **VRAM a riposo post-load**: **3.03 GB** (Peak iniziale: 3.05 GB).
- **Sintesi testo (Voice Design / Text-only)**:
  - Tempo: **1.88 s** per 4.4 s di audio (Real-Time Factor ~0.42).
  - Picco VRAM: **3.12 GB**.
  - Audio: 24,000 Hz, 16-bit PCM WAV, 1 canale (mono).
- **Creazione prompt vocale (`VoiceClonePrompt`)**:
  - Tempo di estrazione e tokenizzazione: **0.24 s**.
  - Dimensione cache su disco: **15.7 KB** (salvataggio e ricaricamento verificati).
- **Sintesi con Voice Cloning**:
  - Tempo: **2.05 s** per 4.09 s di audio.
  - Picco VRAM: **3.28 GB**.
- **Pulizia VRAM**: rilascio CUDA verificato.

### 3. Matrice di Compatibilità e Conflitto Dipendenze

| Pacchetto | OmniVoice 0.2.1 | Qwen3-TTS 0.1.1 | VibeVoice (vendored) | Esito Convivenza |
| :--- | :--- | :--- | :--- | :--- |
| **`transformers`** | `>=5.3.0` (richiede `5.16.1`) | `==4.57.3` (stretto) | `~4.48-4.57` | **CONFLITTO FATALE** |
| **Comportamento con Transformers 5.16.1** | Funziona perfettamente | Fallisce all'import (`TypeError: check_model_inputs() missing 1 required positional argument: 'func'`) | Fallisce all'import (`ValueError: 'VibeVoiceAcousticTokenizerConfig' is already used by a Transformers model`) | **CRASH IMMEDIATO** di Qwen e VibeVoice |

### 4. Decisione Architetturale di Runtime

**Adottato il PERCORSO B — Worker locale isolato.**
- **Motivazione**: Nessun ambiente Python unico può far coesistere contemporaneamente `transformers 4.57.3` e `transformers 5.16.1` senza rompere o Qwen o VibeVoice.
- **Architettura del Worker**:
  - Il worker girerà in un venv dedicato (es. `venv_omnivoice`), gestito automaticamente da `install.bat` / `install.sh`.
  - Ascolterà unicamente su loopback `127.0.0.1` con autenticazione locale, timeout bounded e gestione del processo genitore (nessun processo orfano).
  - Interfaccia REST pulita comunicante con un nuovo `OmniVoiceProvider` nel backend principale.
  - Se OmniVoice non è installato o non viene avviato, il backend principale e tutti gli altri provider continuano a funzionare regolarmente.

---

## Fase 2 — Refactoring del Contratto Provider (Completata)

Abbiamo eliminato il routing hardcoded basato su sottostringhe del nome (`"Qwen" in model_name`) e la ricaduta silenziosa su VibeVoice in caso di modello sconosciuto, introducendo un'architettura dati pulita ed estensibile.

### 1. Nuovi Moduli Introdotti
1. **[capabilities.py](file:///f:/nispa-voiceover/backend/core/tts/capabilities.py)**:
   - Schema Pydantic `ModelCapabilities` con attributi tipizzati.
   - Eccezioni di dominio specifiche (`ModelNotFoundError`, `ProviderNotFoundError`, ecc.).
   - Struttura `DialogueTurn` per l'estendibilità a futuri dialoghi nativi.
2. **[catalog.py](file:///f:/nispa-voiceover/backend/core/tts/catalog.py)**:
   - Catalogo dichiarativo che mappa tutti i modelli e le loro varianti.
   - Mappa di alias retrocompatibile per directory su disco e abbreviazioni.
   - `resolve_model_capabilities(model_id)` solleva `ModelNotFoundError` se il modello non esiste.
3. **[registry.py](file:///f:/nispa-voiceover/backend/core/tts/registry.py)**:
   - `ProviderRegistry` con gestione lazy factory e pooling per `(provider_id, device)`.
   - Risoluzione modello data-driven tramite catalogo.
   - Pulizia VRAM centralizzata chiamando il metodo pubblico `unload()` su ogni istanza attiva.

### 2. Modifiche al Contratto Provider e Implementazioni
- **[base.py](file:///f:/nispa-voiceover/backend/core/tts/base.py)**: aggiunto `unload()`, fallback sequenziale comune in `synthesize_batch()`, stub `synthesize_dialogue()`.
- **[qwen_provider.py](file:///f:/nispa-voiceover/backend/core/tts/qwen_provider.py)** & **[vibe_provider.py](file:///f:/nispa-voiceover/backend/core/tts/vibe_provider.py)**: implementato `unload()` pubblico.
- **[tts_provider.py](file:///f:/nispa-voiceover/backend/core/tts_provider.py)**: `MultiModelProvider` delega a `ProviderRegistry` e `ModelCatalog`, eliminando substring matching e mantenendo piena retrocompatibilità.

---

## Fase 3 — Catalogo Modelli e Download Locale (Completata)

Abbiamo integrato il catalogo nell'API e nel gestore dei download, garantendo che solo i modelli integri appaiano come installati e che OmniVoice sia gestito a pieno titolo nel ciclo di vita applicativo.

### 1. Endpoint `/api/models` Data-Driven ([voices.py](file:///f:/nispa-voiceover/backend/api/routers/voices.py))
- Sostituita l'euristica basata sul nome della cartella con la validazione su disco dei file essenziali (`_is_model_installed()`) e la risoluzione tramite `resolve_model_capabilities()`.
- Tokenizer e directory temporanee/corrotte vengono escluse dalla lista dei modelli di sintesi.
- Esposte le capabilities complete nel payload JSON (`requires_transcript`, `max_speakers`, `sample_rate`, `execution`, `installed`).
- Supportato il query param `?include_all=true` per consultare il catalogo completo indicando quali modelli sono installati e quali no.

### 2. Downloader con Revisioni Pinnate e Manifest ([download_model.py](file:///f:/nispa-voiceover/backend/scripts/download_model.py))
- Aggiunta l'opzione **11) OmniVoice** con revisione fissa `c5fdb5ccb189668d56333f77ba2629f4cd7535f4`.
- Aggiunta funzione `verify_installation()` per controllare che tutti i file essenziali (`config.json`, `model.safetensors`, tokenizers) esistano con dimensione $>0$ byte.
- Generazione automatica di `manifest.json` nella directory del modello con repository, revisione, timestamp ISO 8601, stato di verifica e lista dei file.
- Rimossi i caratteri unicode problematici sui terminali Windows (sostituiti con `[OK]` e `[ERR]`).

### 3. Requisiti e Installer Guidati
- Creato **[requirements-omnivoice.txt](file:///f:/nispa-voiceover/backend/requirements-omnivoice.txt)** con dipendenze pinnate e indicizzate su `cu130`.
- Aggiornati **[install.bat](file:///f:/nispa-voiceover/install.bat)** e **[install.sh](file:///f:/nispa-voiceover/install.sh)** con opzioni estese:
  - `[1] VibeVoice only`
  - `[2] Qwen3-TTS only`
  - `[3] OmniVoice only`
  - `[4] VibeVoice + Qwen3-TTS`
  - `[5] ALL ENGINES (VibeVoice + Qwen3-TTS + OmniVoice - Recommended)`
  - Creazione e installazione automatica di `venv_omnivoice` se OmniVoice viene selezionato.

### 4. Risultati della Suite di Test
- **Nuovo Test Suite API Models ([test_api_models.py](file:///f:/nispa-voiceover/backend/tests/test_api_models.py))**: **3 passed** (verifica struttura, presenza di OmniVoice installato e query `include_all`).
- **Backend Regression Suite (`run_tests.py --backend`)**: **109 passed** (precedentemente 106).
- **Frontend Regression Suite (`run_tests.py --frontend`)**: **28 passed**.

Tutti i task della **Fase 3** sono completati e registrati in [TASKS.md](file:///f:/nispa-voiceover/TASKS.md#L95-L110).
