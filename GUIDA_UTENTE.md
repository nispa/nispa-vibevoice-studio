# Guida all'Uso - Nispa VibeVoice Studio (v0.5.0)

Benvenuto in **Nispa VibeVoice Studio**. Questa guida ti accompagnerà nell'utilizzo dell'architettura dual-engine (**VibeVoice** e **Qwen3-TTS**) per generare voci sintetizzate di altissima qualità, con capacità avanzate di clonazione e generazione parallela.

---

## 1. Installazione e Primo Avvio

### Installer Unificato
Non hai più bisogno di configurare manualmente l'ambiente. Lo script rileva l'hardware e installa le dipendenze:
- **Windows**: Esegui `install.bat`.
- **Linux/Mac**: Esegui `install.sh`.

### Ottimizzazione Ambiente (Hardware)
Dopo l'installazione delle dipendenze base, il sistema esegue `optimize_env.py` che:
1.  **Rileva GPU NVIDIA**: Installa automaticamente la versione corretta di **Flash Attention** per accelerare i calcoli in VRAM.
2.  **Verifica Strumenti di Sistema**: Controlla la presenza di **FFmpeg** e **SoX** (fondamentali per manipolare l'audio).

---

## 2. Gestione Modelli e Accelerazione

### Download dei Modelli (Qwen e NLLB)
Al primo avvio, usa lo script per scaricare i pesi ufficiali:
- **Windows**: `venv\Scripts\python backend\scripts\download_model.py`

### Batching Dinamico & Gestione VRAM
Il sistema è "Hardware-Aware". Prima di avviare una generazione, il motore interroga la tua GPU per capire quanta VRAM è libera.
- Se hai una GPU potente (es. RTX 4090), il sistema processerà fino a 8 frasi contemporaneamente, riducendo drasticamente i tempi di attesa.
- Se hai una GPU più piccola (es. 8GB), il sistema adatterà il carico per evitare crash (Out of Memory).

### Requisiti di Risorse (VRAM)

| Modello | Punti di Forza | VRAM Richiesta |
|-------|-----------|-----------|
| **VibeVoice 1.5B** | Molto stabile, ottimo per testi lunghi, fino a 4 speaker. | ~4GB |
| **VibeVoice Large (7B)** | Massima qualità VibeVoice, estremamente naturale. | ~14GB |
| **Qwen3 0.6B** | Velocissimo, clonazione in 3s, leggero. | ~2GB |
| **Qwen3 1.7B** | Altissima fedeltà, clonazione superiore, Premium. | ~6GB |

---

## 3. Flusso di Lavoro: Subtitle Mode

### Fase 1: Caricamento e Traduzione Offline
Nispa Studio integra nativamente il modello **NLLB-200** per traduzioni istantanee e 100% private. In alternativa, puoi connetterti alla tua istanza locale di **Ollama** per usare LLM avanzati.
1.  Trascina un file `.srt` o `.vtt`.
2.  Seleziona la lingua di origine e quella di destinazione.
3.  Premi "Translate Subtitles".

### Fase 2: Modifica Testi e Tempi
Premi **Edit Subtitles** per aprire l'editor testuale. Qui puoi ritoccare la traduzione, unire frasi o modificare i millisecondi di inizio/fine in modo non distruttivo.

### Fase 3: Generazione e Salvataggio Istantaneo
1. Scegli la voce e il modello TTS.
2. Premi **Generate Voice-over**.
3. **Nessuna perdita di dati:** Il nuovo sistema salva l'audio direttamente nel database nel preciso istante in cui viene generato. Se chiudi il browser per sbaglio o premi "Cancel", tutto l'audio creato fino a quel secondo è salvo e pronto per essere ripreso.

---

## 4. Revisione Audio e Finalizzazione (Novità v0.6.0)

A generazione completata (o interrotta), comparirà un pulsante verde **Review Audio**. Cliccandolo si aprirà la *Galleria Audio del Job*.

### Rigenerazione Chirurgica (Regenerate)
Se una frase è stata pronunciata male:
1. Trovala nella galleria (il modal è ora impaginato a blocchi di 10 per gestire script enormi).
2. Premi il pulsante **Regenerate** (le due frecce circolari) accanto all'audio.
3. Il sistema ricorderà esattamente la voce e il modello scelti per quel segmento e lo rigenererà al volo, aggiornando il database all'istante.

### Editor Audio Integrato (Trimmer)
Se l'intelligenza artificiale ha generato "allucinazioni" (rumori o fruscii alla fine della frase):
- Usa il pulsante a forma di forbice.
- Sposta gli slider per selezionare solo la parte di audio corretta.
- Premi "Apply".

### Assemblaggio Finale
Quando sei soddisfatto di ogni singolo segmento, premi il grande pulsante blu **Download Final Voiceover**. Il motore Allineatore si occuperà di incastrare tutti i file audio esattamente nei tempi imposti dal tuo file `.srt` originale.

---

## 5. Job Archive (Storico Lavori)

Tutti i tuoi progetti vengono salvati automaticamente.
Per riprendere un lavoro passato:
1. Apri il pannello **Job Archive** (in alto a destra).
2. Cerca i lavori che presentano il badge verde **🎵 AUDIO SAVED**.
3. Premi l'icona viola per ricaricarlo in memoria.
4. L'audio verrà ricostruito istantaneamente. Potrai procedere alla finalizzazione o continuare a generare i pezzi mancanti.
