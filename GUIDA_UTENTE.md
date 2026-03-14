# Guida all'Uso - Nispa VibeVoice Studio (v0.5.0)

Benvenuto in **Nispa VibeVoice Studio**. Questa guida ti accompagnerà nell'utilizzo dell'architettura **completamente offline** per generare voci sintetizzate di alta qualità e tradurre sottotitoli senza dipendere da servizi esterni.

---

## 1. Installazione e Primo Avvio

### Installer Unificato
Non hai più bisogno di configurare Ollama o installare librerie da GitHub manualmente.
- **Windows**: Esegui `install.bat`.
- **Linux/Mac**: Esegui `install.sh`.

Lo script installerà tutte le dipendenze Python (incluso il supporto per GPU NVIDIA) e configurerà l'ambiente virtuale.

### Preparazione Modelli (Fondamentale)
Al primo avvio, o tramite lo script di download, assicurati di scaricare:
1.  **Opzione 10 (NLLB-200)**: Necessaria per la traduzione dei sottotitoli.
2.  **Un modello TTS**: Consigliamo **Qwen3 1.7B Base** per la clonazione o **VibeVoice 1.5B** per la stabilità.

---

## 2. Traduzione Offline (Addio Ollama)

Nispa Studio integra ora il modello **NLLB-200 Distilled** di Facebook.
- **Vantaggi**: Traduzione istantanea, 100% privata, supporto per 200 lingue.
- **Come usarla**: Carica un file di sottotitoli in *Subtitle Mode*, seleziona la lingua di destinazione e premi **"Translate Subtitles"**. Il sistema tradurrà l'intero file in un unico blocco velocissimo.

---

## 3. Gestione della Libreria Voci

Clicca sull'icona del **microfono** per gestire le tue voci di riferimento:
- **Upload**: Carica un file WAV/MP3 di 10-20 secondi.
- **Trascrizione**: Per i modelli Qwen3, scrivi esattamente cosa dice l'audio nel campo "Transcription". Questo attiva la modalità *In-Context Learning* (ICL) che rende la clonazione incredibilmente fedele.
- **Process**: Usa il denoising integrato per pulire i campioni audio rumorosi.

---

## 4. Modalità di Generazione

### Subtitle Mode (Sottotitoli)
1. Carica il file `.srt`.
2. Traduci nella lingua desiderata.
3. **Importante**: Usa "Raggruppa per punteggiatura" per unire i frammenti brevi in frasi complete.
4. Genera l'audio sincronizzato.

### Script Mode (Testo Libero)
Scrivi dialoghi usando il formato `Speaker1: Testo`. Puoi assegnare voci diverse a ogni personaggio nel pannello laterale. Se non hai un audio per un personaggio, usa un modello **VoiceDesign** e descrivi la voce a parole.

---

## 5. Risoluzione Problemi

### "NLLB model not found"
Assicurati di aver scaricato l'opzione 10 nel Downloader. Il modello deve trovarsi in `data/model/nllb-200-distilled-600M`.

### Problemi di Memoria (VRAM)
Se la traduzione e la sintesi avvengono contemporaneamente, la GPU potrebbe riempirsi. Il traduttore tenterà di spostarsi automaticamente sulla CPU se necessario.

### Test del Sistema
Usa lo script globale per verificare che tutto sia installato correttamente:
```bash
python run_tests.py
```
