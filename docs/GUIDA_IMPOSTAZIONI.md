# Guida alle Impostazioni & Configurazione — Nispa VibeVoice Studio

Questa guida fornisce un riferimento completo su tutte le opzioni di configurazione, ottimizzazione hardware, percorsi, variabili d'ambiente e gestione dello storage in Nispa VibeVoice Studio.

---

## 1. Architettura della Configurazione

Nispa VibeVoice Studio privilegia un'esecuzione locale, riproducibile e non distruttiva:
- **File di Configurazione Centrale**: `data/settings.json` memorizza preferenze, percorsi degli eseguibili e override GPU.
- **Gerarchia della cartella `data/`**: Tutti i modelli, file audio generati, database SQLite e voci di riferimento risiedono tassativamente sotto `data/`.
- **Politica Strict Offline**: Durante l'inferenza l'accesso alla rete è disabilitato (`HF_HUB_OFFLINE=1`, `TRANSFORMERS_OFFLINE=1`).

---

## 2. Il File `data/settings.json`

Il file principale di configurazione si trova in `data/settings.json`. Se non esiste, il backend lo crea automaticamente al primo avvio con valori predefiniti sicuri.

### Schema e Valori Predefiniti

```json
{
  "paths": {
    "sox": "sox",
    "ffmpeg": "ffmpeg",
    "ffprobe": "ffprobe"
  },
  "audio": {
    "default_format": "mp3",
    "sample_rate_asr": 16000,
    "sample_rate_tts": 24000
  },
  "ui": {
    "theme": "dark"
  },
  "tts": {
    "strict_offline": true,
    "batch_overrides": {},
    "multi_gpu": {
      "disabled_devices": []
    }
  }
}
```

### Parametri di Configurazione

| Sezione | Chiave | Tipo | Default | Descrizione |
|---------|--------|------|---------|-------------|
| `paths` | `sox` | `string` | `"sox"` | Percorso assoluto o comando di sistema per l'eseguibile SoX (necessario per il voice cloning di Qwen3). |
| `paths` | `ffmpeg` | `string` | `"ffmpeg"` | Percorso assoluto o comando di sistema per FFmpeg. |
| `paths` | `ffprobe` | `string` | `"ffprobe"` | Percorso assoluto o comando di sistema per FFprobe. |
| `audio` | `default_format` | `string` | `"mp3"` | Formato di esportazione predefinito (`"mp3"` o `"wav"`). |
| `audio` | `sample_rate_tts` | `integer` | `24000` | Frequenza di campionamento target per l'audio assemblato (in Hz). |
| `tts` | `strict_offline` | `boolean` | `true` | Applica le variabili d'ambiente offline per impedire qualsiasi richiesta di rete durante l'inferenza. |
| `tts` | `batch_overrides` | `object` | `{}` | Mappatura `model_id` → dimensione batch personalizzata (es. `{"qwen3-1.7b": 2}`). Sovrascrive il calcolo VRAM dinamico. |
| `tts.multi_gpu` | `disabled_devices` | `array[int]` | `[]` | Indici GPU CUDA da escludere dalla distribuzione del carico multi-GPU (es. `[1]`). |

---

## 3. Ottimizzazione Hardware e GPU

### 3.1. Dynamic Batching con monitoraggio VRAM (CUDA)

Su GPU NVIDIA, il sistema misura la VRAM libera in tempo reale prima di ogni iterazione di batch:
1. **Margine di sicurezza del 40%**: Il sistema alloca come budget massimo utile `free_vram * 0.60`, riservando il 40% per i picchi di memoria KV cache e attivazioni.
2. **Costo per Modello**: Ogni modello nel catalogo definisce un profilo di memoria (`cost_gb` e `peak_multiplier`).
3. **Fallback anti-crash (OOM Guard)**: Se si verifica un `torch.cuda.OutOfMemoryError`:
   - La dimensione del batch viene immediatamente dimezzata.
   - La stima del costo di memoria viene raddoppiata per le iterazioni successive.
   - Il batch fallito viene ripetuto sequenzialmente senza arrestare l'applicazione.

### 3.2. Override Manuale del Batch

È possibile forzare manualmente la dimensione del batch per qualunque modello:
- **Dall'interfaccia**: Clicca sull'icona **Ingranaggio** (Settings & Maintenance) → scheda **Generation** → imposta il valore desiderato e clicca **Save**.
- **Da `data/settings.json`**:
  ```json
  "tts": {
    "batch_overrides": {
      "higgs-audio-v3": 1,
      "omnivoice": 4,
      "qwen3-1.7b": 2
    }
  }
  ```
- **Ripristino automatico**: Clicca **Reset** nell'interfaccia oppure rimuovi la chiave dal file JSON.

### 3.3. Configurazione Multi-GPU

Se nel sistema sono presenti 2 o più GPU NVIDIA CUDA:
- Il sistema rileva automaticamente tutte le GPU e la relativa VRAM disponibile.
- I segmenti da generare vengono suddivisi in proporzione alla memoria libera di ciascuna scheda.
- I flussi vengono elaborati in parallelo e poi ricomposti in ordine cronologico.
- **Disabilitazione di una GPU**: Se una GPU è dedicata al monitor o ad altre attività, puoi disattivarla da **Settings** → **Generation** → **GPU Devices**. L'indice verrà salvato in `tts.multi_gpu.disabled_devices`.

### 3.4. Apple Silicon (macOS MPS) e CPU

- **Accelerazione MPS**: Rilevata automaticamente sui processori Apple Silicon (`M1/M2/M3/M4`).
- **Dimensione Batch**: Fissata stabilmente a **1** su MPS e CPU (la memoria unificata non espone pool VRAM distinti per dispositivo come CUDA).
- **Flash Attention**: Non necessaria su macOS; l'inferenza usa l'ottimizzazione nativa di PyTorch MPS.

---

## 4. Strumenti di Sistema ed Eseguibili Esterni

### FFmpeg
- **Scopo**: Concatenazione audio, spaziatura silenzi, conversione formati (WAV/MP3) e ritaglio audio (Audio Trimmer).
- **Installazione**: Deve essere accessibile dal `PATH` di sistema.
  - Windows: `choco install ffmpeg-full`
  - Linux: `sudo apt install ffmpeg`
  - macOS: `brew install ffmpeg`
- **Percorso personalizzato**: È possibile indicare il percorso assoluto in `data/settings.json`:
  ```json
  "paths": {
    "ffmpeg": "C:\\Tools\\ffmpeg\\bin\\ffmpeg.exe",
    "ffprobe": "C:\\Tools\\ffmpeg\\bin\\ffprobe.exe"
  }
  ```

### SoX (Sound eXchange)
- **Scopo**: Normalizzazione audio e estrazione di feature per il voice cloning in Qwen3-TTS.
- **Rilevamento automatico su Windows**: Il backend scansiona i percorsi standard (`C:\Program Files (x86)\sox-14-4-2`, `C:\Program Files\sox`, `C:\sox`).
- **Configurazione manuale**: Imposta `"paths": {"sox": "C:\\percorso\\sox.exe"}` in `data/settings.json`.

---

## 5. Struttura delle Directory e File di Dati

Tutti i dati persistenti sono contenuti nella directory `data/`:

```
data/
├── model/                         # Pesi dei modelli TTS (Higgs, OmniVoice, Qwen, VibeVoice)
├── model-translation/             # Pesi del modello di traduzione NLLB-200
├── voices/                        # Campioni vocali (.wav) e trascrizioni (.txt)
├── voice-prompts/
│   └── omnivoice/                 # Cache crittografica dei VoiceClonePrompt
├── audio-rendering/               # Segmenti WAV intermedi generati
│   ├── job_{id}/                  # Segmenti del workflow sottotitoli
│   └── script_{id}/               # Segmenti del workflow script
├── outputs/                       # File finali esportati (MP3/WAV)
├── jobs.db                        # Database SQLite dei job
└── settings.json                  # Impostazioni dell'applicazione
```

---

## 6. Configurazione Traduzione

### NLLB-200 Integrato (100% Offline)
- Posizionato in `data/model-translation/nllb-200-distilled-600M`.
- Supporta oltre 200 lingue senza dipendenze cloud o chiamate di rete.

### Integrazione Ollama Locale
- Se [Ollama](https://ollama.ai) è in esecuzione sulla macchina, Nispa VibeVoice Studio può utilizzare i modelli LLM locali per traduzioni contestuali complesse.
- **Endpoint Predefinito**: `http://localhost:11434`
- Il selettore del modello in **Subtitle Mode** → **Step 2 (Refining & Translation)** interroga automaticamente `/api/tags` di Ollama.

---

## 7. Privacy e Cache Crittografica delle Voci

1. **Modalità Rigorosamente Offline**:
   - `HF_HUB_OFFLINE=1` e `TRANSFORMERS_OFFLINE=1` impediscono chiamate silenziose a HuggingFace.
   - Il download dei modelli avviene esclusivamente su esplicita richiesta dell'utente.
2. **Cache dei Prompt Biometrici (OmniVoice)**:
   - I file `VoiceClonePrompt` vengono salvati in `data/voice-prompts/omnivoice/`.
   - La chiave della cache è basata sull'hash SHA-256 del file audio WAV e del testo di trascrizione.
   - Modifiche al file WAV o alla trascrizione invalidano e ricreano automaticamente il prompt.
   - I prompt sono esclusi da Git e possono essere eliminati in qualsiasi momento senza intaccare le voci originali.

---

## 8. Configurazione Runtime del Frontend

### Configurazione Runtime Dinamica (`frontend/public/config.js`)
Ideale per container o ambienti in cui la porta backend è dinamica:
```javascript
window.__RUNTIME_CONFIG__ = {
  API_BASE_URL: "http://localhost:8000/api"
};
```

### Configurazione di Build (`frontend/.env`)
Per ambienti di sviluppo standard Vite:
```env
VITE_API_BASE_URL=http://localhost:8000/api
```

---

## 9. Manutenzione dello Spazio Disco

Dalla finestra **Settings & Maintenance** (icona ingranaggio) → scheda **Maintenance**:
1. **VACUUM Database**: compatta il database `jobs.db` e recupera spazio disco dopo l'eliminazione di job.
2. **Scan for Orphans**: individua le cartelle in `data/audio-rendering/` non più collegate ad alcun job nel database, permettendone l'eliminazione sicura con un click.
