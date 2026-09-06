# Guida Utente — Nispa VibeVoice Studio (v0.9.0)

> Questa guida presuppone che il programma sia già installato e avviato. Per l'installazione iniziale, consulta il [README.md](../README.md). Per tutte le opzioni avanzate di configurazione e ottimizzazione GPU, consulta la [Guida alle Impostazioni & Configurazione](GUIDA_IMPOSTAZIONI.md).
>
> Apri il browser su `http://localhost:5173/` dopo aver eseguito `start.bat` (Windows) o `./start.sh` (macOS/Linux).

---

## Panoramica dell'Interfaccia

Nella parte superiore della schermata trovi la barra del titolo con tre icone di gestione nell'angolo in alto a destra:
- **Livelli (Layers)** — apre il **Gestore Modelli & Motori** per scaricare, verificare lo stato e gestire i modelli IA.
- **Microfono** — apre la **Voice Library** per gestire le voci di riferimento e le trascrizioni.
- **Ingranaggio** — apre **Settings & Maintenance** per regolare batch GPU, dispositivi multi-GPU e pulizia disco.

Subito sotto, il selettore di modalità ti permette di scegliere tra i due workflow principali:

| Modalità | Descrizione | File accettati |
|----------|-------------|----------------|
| **Timed Subtitles** | Voiceover sincronizzato con i tempi esatti di un file sottotitoli | `.srt`, `.vtt` |
| **Untimed Script** | Voiceover libero per dialoghi multi-speaker narrativi senza vincoli temporali | `.txt`, `.md` |

---

## 1. Gestore Modelli & Motori (Models Manager)

Clicca sull'icona **Livelli** in alto a destra per aprire il Gestore Modelli. Da questa schermata puoi:
- **Esplorare il Catalogo dei Modelli**: Visualizzare tutti i modelli supportati per i 4 motori TTS (Higgs Audio v3, OmniVoice, Qwen3-TTS, VibeVoice) e il motore di traduzione NLLB-200.
- **Filtrare i Modelli**: Filtra per stato (*Tutti*, *Installati*, *Scaricabili*) o per motore TTS.
- **Scaricare i Modelli**: Clicca su **"Download"** per avviare il download in background non bloccante, con barra di avanzamento in tempo reale, indicatore di velocità (MB/s) e pulsante di annullamento.
- **Controllo dello Spazio Disco**: Visualizza sia la dimensione prevista del download sia lo spazio reale occupato su disco una volta installato.
- **Eliminare i Modelli**: Rimuovi in modo sicuro i pesi dei modelli per liberare spazio su disco.
- **Diagnostica Hardware (System Health)**: Passa alla scheda **System Health** per verificare in tempo reale la VRAM GPU libera, lo stato dei processi worker e la disponibilità di FFmpeg e SoX.

---

## 2. Modalità Timed Subtitles

Usa questa modalità quando hai un file `.srt` o `.vtt` e vuoi generare audio che rispetti esattamente i tempi dei sottotitoli originali.

### Step 1 — Input Source
- **Carica un file sottotitoli** trascinandolo nell'area di upload o cliccandoci sopra.
- In alternativa, **riprendi un lavoro precedente** dal pannello **"Or Load from Archive"** sulla destra. I badge colorati indicano lo stato: `DRAFT`, `COMPLETED`, `AUDIO SAVED` (segmenti audio già su disco), `TRANSLATED`, `GROUPED`.

### Step 2 — Refining & Translation
- **Raggruppamento Intelligente (Intelligent Grouping)**: Unisce automaticamente i segmenti consecutivi che terminano a metà frase, evitando spezzature innaturali nel parlato. Consigliato prima della generazione. Clicca **"Preview Subtitles"** per verificare il risultato.
- **Salva come Bozza (Save as Draft)**: Salva lo stato di lavoro corrente (file, voce, modello, modifiche) nel database.
- **Modifica Manuale (Edit Subtitles)**: Modifica il testo dei singoli segmenti, corregge i timestamp o aggiunge/rimuove righe.
- **Traduzione IA**: Traduci i sottotitoli offline con NLLB-200 integrato oppure con un modello Ollama locale.

### Step 3 — Selezione Voce & Sintesi
- **Selezione Voce**: Scegli la voce di riferimento clonata dalla tua libreria.
- **Modello TTS**: Scegli il modello più adatto al tuo hardware e alle esigenze qualitative.
- **Formato di Esportazione**: Scegli tra `MP3` e `WAV`.
- **Genera Voice-over**: Avvia la sintesi in background con aggiornamento SSE in tempo reale.

### Revisione Audio & Finalizzazione
- Clicca **"Review Audio"** per accedere alla galleria segmenti.
- **Ascolto**: Ascolta la forma d'onda di ogni singolo segmento.
- **Rigenerazione Chirurgica**: Risintetizza una specifica riga mantenendo voce, modello e lingua originali.
- **Ritaglio Audio (Audio Trimmer)**: Taglia code di silenzio o token spuri tramite gli slider Mark-In / Mark-Out.
- **Download Final Voiceover**: Assembla tutti i segmenti in un unico file perfettamente allineato ai timestamp del sottotitolo.

---

## 3. Modalità Untimed Script

Ideale per podcast, dialoghi narrativi, audiolibri e sceneggiature multi-voce.

### 3.1. Formato Script & Salvataggio Continuo della Bozza
Scrivi il testo indicando l'oratore all'inizio della riga:
```text
Alice: Bentornati al nostro podcast.
Bob: È un piacere essere qui, Alice.
Alice: <|style:whispering|>Parla a bassa voce, qualcuno potrebbe ascoltarci.
```

- **Salvataggio Continuo in LocalStorage**: Qualsiasi modifica apportata al testo o all'assegnazione delle voci viene salvata costantemente nel browser (`nispa_script_draft_v1`). Ricaricare la pagina non farà perdere il lavoro.
- **Script Archive**: Clicca su **"Script Archive"** nello Step 1 per riascoltare i dialoghi generati in precedenza o cliccare su **"Load into Editor"** per ripristinare istantaneamente il testo e le voci nell'area di lavoro.

### 3.2. Higgs Audio v3: Palette Tag & Guida Emozioni
Quando è selezionato **Higgs Audio v3**:
- Direttamente sopra il testo compare una **Palette Tag** collassabile.
- Esplora e inserisci 45 tag acustici divisi in 5 categorie:
  - **Emozioni (21)**: `<|emotion:anger|>`, `<|emotion:sadness|>`, `<|emotion:amusement|>`, `<|emotion:elation|>`, `<|emotion:fear|>`, ecc.
  - **Stili Vocali (3)**: `<|style:whispering|>`, `<|style:shouting|>`, `<|style:singing|>`
  - **SFX Paralinguistici (9)**: `<|sfx:laughter|>`, `<|sfx:sigh|>`, `<|sfx:cough|>`, `<|sfx:crying|>`, ecc.
  - **Prosodia & Ritmo (10)**: `<|prosody:pause|>`, `<|prosody:speed_fast|>`, `<|prosody:pitch_high|>`, ecc.
  - **Ambiente (2)**: `<|env:music|>`, `<|env:noise|>`
- Clicca su un tag per inserirlo istantaneamente nella posizione del cursore.
- Clicca sul pulsante **"Guida Sintassi & Emozioni"** per aprire il modal illustrativo sul condizionamento acustico del modello.

### 3.3. Mappatura Voci degli Oratori
- Il sistema rileva automaticamente fino a 8 oratori nel testo.
- Assegna a ciascun oratore la rispettiva voce di riferimento dalla libreria.
- Clicca **"Generate Conversation"** per avviare la generazione del dialogo unificato.

---

## 4. Requisiti dei File di Riferimento per Motore

| Motore | Audio di Riferimento | Trascrizione del Riferimento (`.txt`) | Note |
|--------|:--------------------:|:------------------------------------:|------|
| **Higgs Audio v3** | Obbligatorio (WAV) | Opzionale | Usa embedding acustici e supporta il controllo emotivo via tag |
| **OmniVoice** | Obbligatorio (WAV) | **Obbligatorio** | Genera prompt biometrici crittografati in cache (`VoiceClonePrompt`) |
| **Qwen3-TTS** | Obbligatorio (WAV ≥3s) | Opzionale | Fornire il testo di trascrizione migliora notevolmente la somiglianza vocale |
| **VibeVoice** | Obbligatorio (WAV) | Non utilizzato | Sincronizzazione multi-speaker |

---

## 5. Voice Library

Accessibile dall'icona **Microfono** in alto a destra:
- **Carica Voce**: Carica un file audio WAV o MP3 pulito (durata consigliata 3–10 secondi).
- **Trascrizioni**: Aggiungi o modifica il testo corrispondente all'audio di riferimento.
- **Riprocessa**: Rimuove il rumore di fondo e normalizza il volume con SoX e FFmpeg.
- **Elimina**: Rimuove definitivamente le voci inutilizzate.

---

## 6. Settings & Maintenance

Accessibile dall'icona **Ingranaggio** in alto a destra:
- **System Info**: Monitoraggio in tempo reale della VRAM GPU, dettagli CUDA/MPS e RAM di sistema.
- **Generation**: Regolazione degli override manuali della dimensione batch e attivazione/disattivazione GPU multiple.
- **Maintenance**: Esecuzione di `VACUUM` su SQLite e scansione/eliminazione delle cartelle audio orfane in `data/audio-rendering/`.

Per la guida completa a tutte le impostazioni, consulta la [Guida alle Impostazioni & Configurazione](GUIDA_IMPOSTAZIONI.md).
