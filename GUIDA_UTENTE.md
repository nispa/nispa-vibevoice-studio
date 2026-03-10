# Guida all'Uso - Nispa VibeVoice Studio (v0.4.0)

Benvenuto in **Nispa VibeVoice Studio**. Questa guida ti accompagnerà nell'utilizzo dell'architettura a doppio motore (**VibeVoice** e **Qwen3-TTS**) per generare voci sintetizzate di alta qualità.

---

## 1. Installazione e Avvio Rapido

### Installazione Interattiva
L'installer ora ti permette di scegliere quali motori installare:
- **Windows**: Esegui `install.bat`. Scegli l'opzione 3 (Both) per l'esperienza completa.
- **Linux/Mac**: Esegui `chmod +x install.sh && ./install.sh`.

### Ottimizzazione (Solo NVIDIA RTX 30+)
L'installer tenterà di installare **Flash Attention 2** per velocizzare Qwen3. Lo script rileva automaticamente la tua versione di Python e CUDA per scaricare il componente corretto. Se l'installazione fallisce, il programma funzionerà comunque in modalità standard.
Se vuoi usare la clonazione voce di Qwen3 su Windows:
1. Installa SoX da [sox.sourceforge.net](http://sox.sourceforge.net/).
2. Esegui `setup_sox_path.bat` come **Amministratore** per configurare automaticamente il sistema.

---

## 2. Gestione Modelli e Pesi (Weights)

### Weights Downloader (Consigliato)
Non scaricare i file manualmente. Usa lo strumento integrato:
- **Windows**: `venv\Scripts\python backend\scripts\download_model.py`
- **Linux/Mac**: `./venv/bin/python backend\scripts\download_model.py`
Lo script scaricherà automaticamente i pesi e il Tokenizer necessario nella cartella `data/model/`.

### Quale modello scegliere?

| Modello | Punti di Forza | Requisiti VRAM |
|---------|----------------|----------------|
| **VibeVoice 1.5B** | Stabile, ottimo per testi lunghi, fino a 4 speaker. | ~4GB |
| **VibeVoice Large (7B)** | Massima qualità VibeVoice, molto naturale. | ~14GB |
| **Qwen3 0.6B (Base/Custom)** | Velatissimo, 3s voice cloning, leggero. | ~2GB |
| **Qwen3 1.7B (Base/Custom)** | Alta fedeltà, cloning superiore, voci integrate premium. | ~6GB |
| **Qwen3 1.7B (VoiceDesign)** | Supporta la creazione di voci da descrizione testuale. | ~6GB |

---

## 3. Gestione della Libreria Voci (Voice Library)

Clicca sull'icona del **microfono** nell'intestazione per aprire il gestore voci:
- **Upload**: Trascina un file WAV o MP3 (10-20s consigliati).
- **Preview**: Ascolta il campione audio prima di usarlo.
- **Process (Noise Reduction)**: Se il tuo campione ha del rumore di fondo, usa il pulsante "Process" per pulirlo automaticamente con un filtro passa-banda.
- **Delete**: Rimuovi le voci che non ti servono più.

---

## 4. Flusso di Lavoro: Subtitle Mode (Sottotitoli)

1. **Caricamento**: Trascina un file `.srt` o `.vtt`.
2. **Traduzione & Raggruppamento**:
   - Traduci con Ollama (modello `hy-mt1.5-abliterated:7B`).
   - **IMPORTANTE**: Dopo la traduzione, usa sempre la funzione **"Raggruppa"** per unire i segmenti brevi in frasi naturali.
3. **Generazione**: Scegli il modello e la voce. Se usi un modello Qwen "VoiceDesign", apparirà un campo per descrivere la voce desiderata.

---

## 5. Flusso di Lavoro: Script Mode (Testo Libero)

1. **Sintassi Multi-Speaker**: Inizia ogni riga con `Speaker1:`, `Speaker2:`, ecc.
2. **Voice Mapping**: Nel pannello laterale, assegna una voce diversa a ogni speaker rilevato.
   - *Nota*: I modelli 1.5B/Large supportano fino a 4 speaker. Il modello 0.5B solo 1.
3. **Voice Design (Qwen3)**: Se non hai un file audio per il cloning, descrivi la voce a parole (es: "una voce maschile profonda, calma e autoritaria").

---

## 6. Risoluzione Problemi (Troubleshooting)

### Errore "SoX could not be found"
- Assicurati di aver installato SoX e di aver eseguito `setup_sox_path.bat` come amministratore. Riavvia il terminale dopo l'operazione.

### Errore "Out of Memory" (VRAM)
- Se la tua GPU ha meno di 8GB, evita i modelli "Large" o "1.7B". Usa **VibeVoice 1.5B** o **Qwen3 0.6B**.
- Chiudi browser o altri programmi che occupano la scheda video.

### Test Diagnostico
- Vai nel pannello **System Info** (icona GPU in basso a destra) e clicca su **"Test Qwen3 Integration"** per verificare se i modelli sono caricati correttamente.
