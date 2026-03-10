# Guida all'Uso - Nispa VibeVoice Studio

Benvenuto in **Nispa VibeVoice Studio**. Questa guida ti accompagnerà passo dopo passo nell'utilizzo di tutte le funzionalità del programma per generare voci sintetizzate di alta qualità.

---

## 1. Installazione e Avvio Rapido

### Installazione
Assicurati di avere installato **Python 3.11+**, **Node.js** e **Git**.
- **Windows**: Esegui `install.bat` con un doppio clic.
- **Linux/Mac**: Apri il terminale e digita `chmod +x install.sh && ./install.sh`.

### Avvio
- **Windows**: Esegui `start.bat`.
- **Linux/Mac**: Esegui `./start.sh`.
Il programma aprirà automaticamente il tuo browser all'indirizzo `http://localhost:5173/`.

---

## 2. Configurazione Iniziale (Modelli e Voci)

### Scaricare i Modelli
Prima di iniziare, devi scaricare un modello VibeVoice da Hugging Face (i link sono nel `README.md`) e inserirlo nella cartella `data/model/`. 
*Esempio: `data/model/VibeVoice-1.5B/`.*

### Aggiungere Voci Personalizzate (Clonazione)
Se vuoi clonare una voce specifica:
1. Prepara un file audio **WAV** di circa 10-20 secondi dove parla la persona desiderata (pulito e senza musica di sottofondo).
2. Copia il file nella cartella `data/voices/`.
3. Rinominalo seguendo lo standard: `lingua-nome_genere.wav` (es: `it-marco_uomo.wav`).

### Installazione Servizio Traduzione (Ollama)
Per abilitare la traduzione offline, segui questi passaggi:
1. Installa **Ollama** dal sito ufficiale ([ollama.com](https://ollama.com/)).
2. Apri il tuo terminale e scarica il modello consigliato per la traduzione:
   ```bash
   ollama run huihui_ai/hy-mt1.5-abliterated:7B
   ```
3. Assicurati che Ollama sia in esecuzione mentre usi lo Studio.

---

## 3. Flusso di Lavoro: Subtitle Mode (Sottotitoli)

> **💡 HINT IMPORTANTE: Dalla Trascrizione alla Traduzione**
> Se stai lavorando su una trascrizione (file .srt originale) e desideri tradurla, il passaggio più critico è il **Grouping (Raggruppamento)**. 
> I sottotitoli originali sono spesso spezzati in segmenti molto brevi per la lettura a schermo; se tradotti e sintetizzati così come sono, la voce risulterà robotica e frammentata. 
> **È essenziale** usare la funzione "Raggruppa" dopo la traduzione per unire i segmenti in frasi complete: questo permette all'IA di generare un'intonazione fluida e naturale.

Questa modalità è ideale per creare voiceover sincronizzati con un video esistente.

1. **Caricamento**: Trascina un file `.srt` o `.vtt` nell'area di caricamento.
2. **Editing**: Puoi modificare il testo di ogni segmento direttamente nella tabella.
3. **Traduzione (Opzionale)**:
   - Se hai **Ollama** attivo, clicca su "Traduci".
   - Scegli la lingua di destinazione e il modello AI (es: `hy-mt1.5-abliterated`).
   - Il sistema tradurrà i segmenti riga per riga mantenendo i tempi originali.
4. **Raggruppamento (Grouping)**: Usa la funzione "Raggruppa" per unire segmenti brevi in frasi più naturali, evitando pause robotiche tra i sottotitoli.
5. **Generazione**: Clicca su **Genera Audio**. Il sistema processerà ogni segmento e lo allineerà temporalmente per evitare sovrapposizioni.

---

## 4. Flusso di Lavoro: Script Mode (Testo Libero)

Ideale per audiolibri, podcast o narrazioni semplici.

1. **Inserimento**: Digita o incolla il tuo testo nell'area principale.
2. **Configurazione**: Scegli il modello e la voce dal pannello laterale.
3. **Generazione**: Clicca su **Genera**. Vedrai il log in tempo reale che ti informa su quale parte del testo è in fase di sintesi.

---

## 5. Selezione della Voce e Impostazioni

Nel pannello laterale (Voice Settings):
- **Speaker Profile**: Scegli tra le voci predefinite o quelle caricate da te in `data/voices/`.
- **Filtri**: Puoi filtrare le voci per lingua, genere o accento.
- **Formato Audio**: Scegli tra **WAV** (massima qualità) o **MP3** (file più leggeri).

---

## 6. Monitoraggio e Gestione

### Dettagli Operazione
Durante la generazione, clicca sul pulsante **"In corso..."** o **"Dettagli Operazione"** per aprire un modal con i log tecnici. Se necessario, puoi annullare l'operazione e scegliere di scaricare solo la parte di audio generata fino a quel momento.

### Archivio Lavori (Job Archive)
Tutti i tuoi progetti vengono salvati automaticamente:
- Clicca sull'icona dell'archivio per recuperare una sessione precedente.
- Puoi salvare "Bozze" (Drafts) per riprendere il lavoro in un secondo momento con tutti i testi e le impostazioni salvate.

### Dashboard Hardware
In basso a destra puoi monitorare l'uso della tua **GPU (VRAM)** e della **RAM**. Questo è utile per capire se il modello scelto è troppo pesante per il tuo computer.

---

## 7. Risultati Finali
Tutti i file audio generati vengono salvati automaticamente nella cartella `data/outputs/` con un nome file che include la data e l'ora, così non perderai mai il tuo lavoro.
