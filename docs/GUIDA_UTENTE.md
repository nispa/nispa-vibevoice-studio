# Guida Utente — Nispa VibeVoice Studio (v0.8.1)

> Questa guida presuppone che il programma sia già installato e avviato. Per l'installazione, consulta il `README.md`.
>
> Apri il browser su `http://localhost:5173/` dopo aver eseguito `start.bat` (Windows) o `./start.sh` (macOS/Linux).

---

## Panoramica dell'Interfaccia

In alto trovi la barra del titolo con due icone nell'angolo in alto a destra:
- **Microfono** — apre la **Voice Library** per gestire le voci
- **Ingranaggio** — apre **Settings & Maintenance**

Subito sotto, il selettore di modalità ti permette di scegliere tra i due workflow principali:

| Modalità | Descrizione | File accettati |
|----------|-------------|----------------|
| **Timed Subtitles** | Voiceover sincronizzato con i tempi di un file sottotitoli | `.srt`, `.vtt` |
| **Untimed Script** | Voiceover libero da un dialogo multi-speaker senza tempi | `.txt`, `.md` |

---

## Modalità Timed Subtitles

Usa questa modalità quando hai un file `.srt` o `.vtt` e vuoi generare audio che rispetti esattamente i tempi dei sottotitoli originali. Il risultato finale sarà un file audio allineato fotogramma per fotogramma.

Il workflow è diviso in tre step visibili nella pagina.

---

### Step 1 — Input Source

**Carica un file sottotitoli** trascinandolo nell'area di upload o cliccandoci sopra. Vengono accettati file `.srt` e `.vtt`.

In alternativa, puoi **riprendere un lavoro precedente** dal pannello **"Or Load from Archive"** sulla destra: ogni riga mostra il nome del file, la voce e il modello usati, e un badge colorato che indica lo stato:
- **DRAFT** — salvato ma non ancora generato
- **COMPLETED** — generazione completata
- **AUDIO SAVED** (verde) — l'audio dei segmenti è disponibile su disco
- **TRANSLATED** — i sottotitoli sono stati tradotti
- **GROUPED** — il raggruppamento intelligente è stato applicato

Per caricare un job, clicca l'**icona viola** sulla riga corrispondente. Per eliminarlo usa l'**icona rossa**. Una volta caricato un job dall'archivio, l'area di upload viene disabilitata — per ricominciare da capo usa **"Clear / Reset"** in alto a destra della sezione.

---

### Step 2 — Refining & Translation

Clicca sul titolo della sezione per espanderla o comprimerla.

#### Raggruppamento Intelligente (Intelligent Grouping)

I file `.srt` spesso spezzano una frase in più righe consecutive. Se sintetizzi ogni riga separatamente, il risultato sonoro sarà frammentato e innaturale — il modello TTS non ha contesto della frase completa.

Attiva la checkbox **"Intelligent Grouping"** per unire automaticamente i segmenti che terminano a metà frase. Il sistema unisce solo dove non c'è punteggiatura terminale (`.`, `!`, `?`), preservando la struttura del dialogo.

> **Consiglio:** attiva sempre il grouping prima di procedere. La differenza di qualità è significativa su testi parlati o narrativi.

Clicca **"Preview Subtitles"** per vedere l'anteprima del risultato prima di procedere. Il modal mostra:
- quanti segmenti originali ci sono e quanti rimangono dopo il raggruppamento
- il testo di ogni segmento con timecode e durata

Se il risultato ti soddisfa, clicca **"Use as Input"** per adottarlo come base di lavoro. Se vuoi esportare il file `.srt` raggruppato (per usarlo altrove o in un altro momento), clicca **"Export SRT"**.

#### Salvataggio come Bozza

Prima di procedere alla generazione, o in qualsiasi momento, puoi salvare lo stato corrente cliccando **"Save as Draft"**. Il job viene salvato nell'archivio con tutti i dati (file, voce, modello, segmenti modificati) e potrai riprenderlo in una sessione successiva.

> **Importante:** salva sempre come bozza prima di generare sessioni lunghe — ti permette di riprendere dall'archivio senza ricaricare il file.

#### Modifica Manuale dei Sottotitoli

Clicca **"Edit Subtitles"** per aprire l'editor testuale. Puoi:
- modificare il testo di ogni segmento
- correggere i timestamp di inizio/fine
- aggiungere o eliminare segmenti
- navigare tra le pagine (10 segmenti per pagina)

Clicca **"Save Subtitles"** per applicare le modifiche. Le modifiche sono non-distruttive — il testo originale non viene mai sovrascritto.

#### Traduzione AI (Opzionale)

Se vuoi tradurre i sottotitoli prima di sintetizzarli:

1. Seleziona il **modello** di traduzione (NLLB-200 interno o un modello Ollama locale)
2. Imposta la lingua di **origine** e quella di **destinazione**
3. Clicca **"Translate Subtitles"**

La traduzione avviene in locale, senza connessione internet. Durante il processo puoi cliccare **"Pause"** per sospendere. Una volta completata, appare il badge **"Ready"** e i pulsanti **"Edit Translate"** (per correggere) e **"Save as Draft Translated"** (per salvare lo stato tradotto).

> **Consiglio:** esegui il grouping *prima* della traduzione — i modelli di traduzione producono risultati più coerenti su frasi complete.

---

### Step 3 — Voice Selection & Synthesis

#### Configurazione

Prima di generare, configura:

- **Voice Selection** — la voce di riferimento da usare per la clonazione. Le voci disponibili sono nella tua cartella `data/voices/`. Se non ne hai, caricane una dalla Voice Library (icona microfono in alto).
- **TTS Model** — il modello locale da usare. Modelli più grandi producono qualità superiore ma richiedono più VRAM e tempo.
- **Generation Language** — la lingua principale del testo (Italian, English, ecc.).
- **Output Format** — `MP3` o `WAV` per il file finale.
- **Voice Design** (solo su modelli che lo supportano) — descrizione testuale della voce desiderata, es. *"a deep, warm male voice with a calm tone"*.

#### Avvio della Generazione

Clicca **"Generate Voice-over"** per avviare. Il job viene salvato automaticamente nell'archivio prima di iniziare.

Durante la generazione:
- la barra di avanzamento mostra il progresso e il tempo stimato rimanente
- il contatore `{N}/{Totale}` indica i segmenti completati
- clicca **"Dettagli Operazione"** per aprire il log tecnico in tempo reale

**La generazione può essere interrotta in qualsiasi momento.** Ogni segmento audio viene salvato su disco nel momento in cui viene generato — se interrompi, tutto l'audio prodotto fino a quel momento è al sicuro nell'archivio e recuperabile.

> **Spazio su disco:** ogni segmento WAV occupa circa 0.5–2 MB. Un job da 100 segmenti può occupare 50–200 MB in `data/audio-rendering/`. Verifica di avere spazio sufficiente prima di avviare lavori molto lunghi. Puoi controllare e liberare spazio dalla scheda **Maintenance** nelle impostazioni.

---

### Revisione Audio e Finalizzazione

Quando la generazione è completata (o interrotta), appare il pulsante verde **"Review Audio (N)"** con il numero di segmenti generati. Cliccalo per aprire la galleria di revisione.

#### Galleria di Revisione

La galleria mostra i segmenti paginati (10 per pagina). Usa il toggle **"Showing: Generated Only / All Segments"** per filtrare.

Per ogni segmento puoi:

**Riascoltare** — clicca il tasto play sul waveform del segmento.

**Rigenerare** — clicca l'icona delle frecce circolari accanto al segmento. Il sistema usa automaticamente la stessa voce, modello e lingua del segmento originale e sostituisce il file su disco.

**Tagliare** — clicca l'icona delle forbici per aprire il trimmer audio. Sposta gli slider **Mark-In** e **Mark-Out** per isolare la parte pulita, poi clicca **"Apply"**. Utile per rimuovere rumori o "allucinazioni" alla fine di una frase.

#### Download del Voiceover Finale

Quando sei soddisfatto di tutti i segmenti, clicca **"Download Final Voiceover"**. Il sistema assembla tutti i file audio rispettando esattamente i timestamp del file `.srt` originale, aggiungendo silenzio dove necessario per mantenere la sincronia. Il file viene scaricato nel formato scelto (MP3 o WAV).

Se vuoi tornare all'editor per ulteriori modifiche prima di finalizzare, clicca **"Back to Editor"**.

---

## Modalità Untimed Script

Usa questa modalità quando hai un copione con più personaggi e vuoi generare un audio unico dove ogni speaker parla con una voce diversa, senza vincoli di timing. Tutti i motori supportati (OmniVoice, Qwen e VibeVoice) possono essere utilizzati.

### Formato dello Script e Salvataggio Automatico

Lo script deve avere questo formato:
```
Speaker1: Testo della battuta.
Speaker2: Risposta del secondo personaggio.
Speaker1: Altra battuta.
```

Puoi caricare un file `.txt` o `.md` tramite l'area di upload, oppure incollare il testo direttamente nella textarea.

- **Salvataggio automatico continuo (Auto-Save)**: Il testo digitato o incollato, la lista degli speaker, le voci assegnate, il modello e la lingua selezionati vengono salvati costantemente nel browser locale (`localStorage`). Se ricarichi la pagina o chiudi la scheda, ritrovi immediatamente il tuo lavoro intatto.
- **Pulsante Clear**: Un pulsante "Clear" in basso a destra nell'area di input permette di azzerare la bozza con un clic.
- **Script Archive dedicato**: In cima allo Step 1 trovi il pulsante **"Script Archive"**. Aprendo il modale puoi consultare tutti i dialoghi untimed generati in precedenza, ascoltare il player audio del dialogo completo, eliminare vecchi lavori o cliccare **"Load into Editor"** per ricaricare istantaneamente nell'editor il testo originale, gli speaker e le voci già assegnate. L'archivio script è completamente separato dall'archivio dei sottotitoli.

---

### Step 2 — Speaker Voice Mapping

Dopo aver caricato o incollato lo script, i parlanti (fino a 8) vengono rilevati automaticamente. Per ogni speaker seleziona una voce dal dropdown.

- **"Add Speaker"** — aggiunge manualmente uno speaker (fino a 8 speaker supportati)
- **Icona X** accanto allo speaker — rimuove uno speaker dalla mappa

---

### Step 3 — Model & Final Synthesis

Configura modello, lingua e (se disponibile) la descrizione Voice Design, poi clicca **"Generate Conversation"**.

Durante la generazione si apre automaticamente una finestra con il log di avanzamento. Se la chiudi mentre è in corso, il sistema ti chiede se vuoi:
- **"Cancel Generation"** — interrompere definitivamente
- **"Run in Background"** — chiudere la finestra ma lasciare girare la generazione in background
- **"Keep Open"** — tenere aperta la finestra

Una volta completata, il lavoro viene salvato automaticamente nel database e archiviato nello **Script Archive**, e compare il player audio con il risultato pronto all'ascolto o al download.

---

## Gestione Voci (Voice Library)

Clicca l'icona del microfono in alto a destra per aprire la Voice Library. Da qui puoi:

- **Caricare una nuova voce** — carica un file WAV o MP3 di almeno 3 secondi come riferimento per la clonazione. Dai un ID alla voce (es. `it-mario`).
- **Aggiungere una trascrizione** — per la clonazione Qwen3, aggiungere la trascrizione testuale del file audio migliora significativamente la qualità della clonazione. Attenzione che sarà replicata anche la cadenza. Quindi se volete tradurre in un altra lingua è meglio non inserire la trascrizione della voce.
- **Riprocessare una voce** — applica riduzione del rumore e normalizzazione a una voce esistente.
- **Eliminare una voce** — rimuove il file dalla libreria.

---

## Settings & Maintenance

Apri con l'icona dell'ingranaggio in alto a destra. Ha tre tab:

### System Info
Mostra le informazioni hardware: GPU, VRAM disponibile, versione CUDA (o MPS su Mac), RAM di sistema.

### Generation
- **GPU Devices** — se hai più GPU NVIDIA, puoi abilitare o disabilitare singoli dispositivi per la generazione multi-GPU. Il lavoro viene distribuito proporzionalmente alla VRAM libera.
- **Batch Size per Model** — il sistema calcola automaticamente quanti segmenti processare in parallelo in base alla VRAM libera. Puoi sovrascrivere questo valore inserendo un numero fisso e cliccando **"Save"**. Clicca **"Reset"** per tornare al calcolo automatico.

> Su macOS (Apple Silicon) il batch size è sempre 1 — la gestione della memoria unificata non permette il calcolo dinamico.

### Maintenance
- **VACUUM Database** — compatta il file SQLite e recupera spazio su disco dopo eliminazioni.
- **Scan for Orphans** — trova le cartelle audio in `data/audio-rendering/` che non hanno più un job corrispondente nel database. Clicca **"Delete X orphans"** per eliminarle e liberare spazio.

---

## FAQ Rapida

**La generazione si è interrotta a metà — ho perso tutto?**
No. Ogni segmento viene salvato su disco nel momento stesso in cui viene generato. Ricarica il job dall'archivio (badge **AUDIO SAVED**) e riprendi dalla galleria di revisione.

**Il file finale non è allineato con il video.**
Assicurati di finalizzare con **"Download Final Voiceover"** dalla galleria di revisione, non scaricando i singoli segmenti. Solo la finalizzazione applica l'allineamento ai timecode originali.

**Manca spazio su disco.**
Apri Settings → Maintenance → **"Scan for Orphans"** per eliminare le cartelle audio orfane. Puoi anche eliminare manualmente i job non più necessari dall'archivio — questo rimuove i record dal database ma *non* i file audio su disco; usa la scansione orphan dopo.

**La voce suona spezzettata o innaturale.**
Attiva **"Intelligent Grouping"** prima di generare. Se hai già generato senza grouping, applica il grouping, salva come bozza ed esegui di nuovo la generazione.

**"No Voices Found" nel selettore.**
Aggiungi un file WAV di riferimento dalla Voice Library (icona microfono) o copia i file WAV nella cartella `data/voices/` del progetto e clicca il pulsante di refresh nel selettore.
