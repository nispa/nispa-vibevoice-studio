# Tasks — Integrazione locale OmniVoice e refactoring provider TTS

> Stato: **DA IMPLEMENTARE**
> Data: 2026-09-04
> Scopo: integrare OmniVoice come terzo provider TTS locale, indipendentemente dal risultato del confronto qualitativo con Qwen3-TTS.
> Uso principale: dialoghi untimed in inglese con accento UK e voice cloning da reference autorizzati.
> Vincolo: nessun audio, trascrizione, prompt vocale o output deve lasciare la macchina.

## Decisioni già prese

- [x] OmniVoice viene aggiunto come provider ulteriore, non come sostituto obbligatorio di Qwen.
- [x] Il benchmark Qwen/OmniVoice serve a documentare punti di forza e preset consigliati; non è un gate all'integrazione.
- [x] Il workflow iniziale rimane per-battuta: parse del copione, mapping speaker/voce, sintesi e concatenazione.
- [x] Il target principale di qualità è English-UK; l'italiano è secondario.
- [x] Sono esclusi servizi cloud e upload remoto di reference vocali.
- [x] Il refactoring deve preparare il progetto a provider futuri senza routing basato sul nome del modello.
## Vendor candidati per cicli successivi

Questi vendor non vanno implementati nel ciclo OmniVoice. Vanno tenuti nel catalogo di ricerca come candidati locali/offline da valutare dopo il refactoring provider.

- [ ] **Chatterbox / Chatterbox Turbo / Chatterbox Multilingual V3** - candidato prioritario dopo OmniVoice per dialoghi English-UK: MIT, voice cloning, modello relativamente leggero, controllo `exaggeration` e tag paralinguistici in Turbo.
- [ ] **IndexTTS-2.5** - candidato forte per emotion/speed control e fonemi CMU inglesi; richiede spike licenza, Windows/Blackwell, dipendenze e stabilita' su battute inglesi lunghe.
- [ ] **Higgs Audio v3** - candidato specifico per emotion/prosody tagging strutturato; supporta tag inline ricchi ma ha licenza research/non-commercial e integrazione piu' pesante.
- [ ] **Breeze TTS 2** - candidato da monitorare per voice direction naturale, voice design e qualita'; pesi research/non-commercial e copertura linguistica da verificare sul caso English-UK.
- [ ] **EmoTra-TTS / TED-TTS** - riferimenti di ricerca per controllo emotivo intra-utterance; non sono vendor prodotto finche' richiedono dataset/fine-tuning o pipeline troppo sperimentali.

## Fase 0 — Protezione della baseline

- [x] Registrare ambiente corrente: Python, sistema operativo, GPU, CUDA, PyTorch, Transformers, `qwen-tts` e commit Git.
- [x] Eseguire la suite esistente con `python run_tests.py` e salvare l'esito nel resoconto di implementazione.
- [x] Eseguire uno smoke test reale Qwen con voice cloning e uno VibeVoice, se i modelli sono installati.
- [x] Misurare almeno: tempo di caricamento, tempo di sintesi, picco VRAM e validità del WAV restituito.
- [x] Verificare che le modifiche utente già presenti nel worktree non vengano alterate.

**Completata quando:** test e smoke baseline sono documentati, oppure gli eventuali fallimenti preesistenti sono elencati chiaramente.

## Fase 1 — Spike compatibilità OmniVoice

OmniVoice 0.2.x dichiara Python `>=3.10`, Torch `>=2.4`, Torchaudio `>=2.4` e Transformers `>=5.3.0`. Prima di scegliere l'architettura di runtime bisogna verificare la convivenza con Qwen e con il codice VibeVoice vendorizzato.

- [x] Creare un ambiente temporaneo isolato e installare una versione pinnata di OmniVoice.
- [x] Scaricare preventivamente i pesi in una directory locale temporanea; non usare reference vocali reali nello spike iniziale.
- [x] Verificare caricamento e generazione da un `model_path` locale con rete disabilitata.
- [x] Verificare import e caricamento di Qwen e VibeVoice con le stesse versioni Torch/Transformers richieste da OmniVoice.
- [x] Eseguire i test provider esistenti nell'ambiente di compatibilità.
- [x] Controllare Windows/CUDA e almeno un fallback SDPA senza FlashInfer/FlashAttention opzionali.
- [x] Annotare dimensione dei pesi, RAM, VRAM, warm-up e velocità su una battuta inglese breve.

### Decisione runtime

- [ ] ~~**Percorso A — in-process:**~~ scartato: Transformers 5.16 rompe fatalmente Qwen3-TTS (`check_model_inputs`) e VibeVoice (`AutoModel.register`).
- [x] **Percorso B — worker locale isolato:** adottato. Il worker usa un proprio venv, ascolta esclusivamente su `127.0.0.1`, non espone porte esterne e non contatta servizi remoti.
- [x] Registrare la decisione e la motivazione in `PLANNING.md` prima di implementare il provider definitivo.

**Completata quando:** esiste una prova reale di inferenza offline e la scelta in-process/worker non è più aperta.

## Fase 2 — Refactoring del contratto provider

### Modelli e capability

- [x] Aggiungere un modello `ModelCapabilities` con almeno:
  - `provider_id`
  - `model_id`
  - `display_name`
  - `supports_voice_clone`
  - `supports_voice_design`
  - `supports_batch`
  - `supports_native_dialogue`
  - `max_speakers`
  - `requires_reference_audio`
  - `requires_reference_transcript`
  - `supported_languages`
  - `sample_rate`
  - `execution` (`local_in_process` oppure `local_worker`)
- [x] Separare l'identità stabile del modello dal nome della cartella e dalla label mostrata nella UI.
- [x] Definire errori comuni del provider: modello mancante, voce mancante, trascrizione mancante, OOM, cancellazione e output non valido.

### Interfaccia TTS

- [x] Conservare `synthesize()` e `synthesize_batch()` per compatibilità.
- [x] Aggiungere `unload()` al contratto, così il registry non manipola direttamente `.model` e `.processor`.
- [x] Aggiungere un fallback batch comune che chiama `synthesize()` in sequenza quando il provider non supporta batch nativo.
- [x] Prevedere il contratto opzionale `synthesize_dialogue()` e `DialogueTurn`, senza implementarlo per OmniVoice in questa fase.
- [x] Stabilire che ogni provider restituisca WAV PCM mono con sample rate dichiarato, oppure metadata audio insieme ai bytes.

### Registry

- [x] Sostituire i pool `_qwen_pool` e `_vibe_pool` con un `ProviderRegistry` keyed by `provider_id` e device.
- [x] Registrare factory lazy per `qwen`, `vibevoice` e `omnivoice`.
- [x] Eliminare il routing `if "Qwen" in model_name`; un modello sconosciuto deve produrre un errore esplicito e non ricadere su VibeVoice.
- [x] Spostare cleanup/unload nel provider e rendere `clean_vram()` indipendente dall'implementazione.
- [x] Mantenere una mappa temporanea per gli ID modello esistenti, così job archiviati e richieste correnti restano validi.

**Completata quando:** Qwen e VibeVoice passano tutti i test usando il nuovo registry, prima dell'aggiunta funzionale di OmniVoice.

## Fase 3 — Catalogo modelli e download locale

- [x] Sostituire l'euristica di `/api/models` con un catalogo esplicito di modelli/provider/capability.
- [x] Mostrare soltanto modelli installati, con stato distinto per modelli disponibili ma non ancora scaricati.
- [x] Aggiungere OmniVoice al downloader esistente con conferma esplicita, destinazione sotto `data/model/` e verifica di completamento.
- [x] Definire una versione/revisione precisa dei pesi; evitare `master` o `latest` in produzione.
- [x] Salvare un manifest locale con repository, revision, hash/config, versione libreria e data di download.
- [x] Non scaricare mai i pesi durante una richiesta di sintesi.
- [x] Gestire download incompleti senza far apparire il modello come installato.
- [x] Aggiungere `backend/requirements-omnivoice.txt` o i requirements del worker, con versioni pinnate.
- [x] Aggiornare `install.bat` e `install.sh` in base al percorso runtime scelto nella Fase 1.

**Completata quando:** OmniVoice può essere installato esplicitamente, rilevato dal catalogo e caricato da path locale senza rete.

## Fase 4 — Privacy e modalità strict-offline

- [x] Aggiungere `strict_offline` alle impostazioni TTS, attivo di default per OmniVoice.
- [x] Impostare `HF_HUB_OFFLINE=1` e `TRANSFORMERS_OFFLINE=1` nel processo/worker di inferenza.
- [x] Passare sempre un path locale a `OmniVoice.from_pretrained()`; non passare l'ID Hugging Face in runtime.
- [x] Non abilitare l'ASR automatico di OmniVoice: usare la trascrizione locale `.txt` già associata al WAV.
- [x] Impedire il fallback silenzioso a Whisper se la trascrizione non esiste.
- [x] Se si usa un worker, bind obbligatorio a `127.0.0.1`, nessun `0.0.0.0`, autenticazione/token locale per-processo e timeout limitato.
- [x] Verificare con uno smoke test a rete disabilitata che generazione, prompt cache e output funzionino.
- [x] Evitare nei log testo integrale del reference, contenuto della trascrizione, token vocali e path utente non necessari.

**Completata quando:** la generazione funziona offline e una richiesta non può causare download o trascrizione remota/implicita.

## Fase 5 — Cache locale delle impronte vocali

I file `VoiceClonePrompt` contengono token derivati dalla voce e vanno trattati come dati biometrici, non come cache innocua.

- [x] Creare `data/voice-prompts/omnivoice/` e aggiungerla alle regole gitignore/backup appropriate.
- [x] Creare il prompt con WAV e trascrizione locali e salvarlo con permessi coerenti con `data/voices/`.
- [x] Usare come chiave cache un hash di: bytes WAV, trascrizione, model revision e versione formato prompt.
- [x] Invalidare automaticamente la cache quando cambia uno degli input.
- [x] Caricare i prompt con il metodo sicuro previsto da OmniVoice (`weights_only=True` nella libreria).
- [x] Aggiungere eliminazione della cache insieme alla cancellazione della voce, oppure chiedere esplicitamente se conservarla.
- [x] Aggiungere comando/azione per ricostruire ed eliminare tutte le cache OmniVoice senza cancellare i WAV originali.
- [x] Non inserire prompt, WAV o trascrizioni nei fixture/test versionati.

**Completata quando:** riusare una voce evita il re-encoding, ma modifica/cancellazione del reference non lascia cache orfane o errate.

## Fase 6 — Implementazione OmniVoiceProvider

### Percorso comune

- [x] Creare `backend/core/tts/omnivoice_provider.py`.
- [x] Implementare caricamento lazy per device e modello locale.
- [x] Risolvere `voice_id` nei file `data/voices/<voice_id>.wav` e `.txt`.
- [x] Richiedere trascrizione non vuota per il voice cloning; errore azionabile se manca.
- [x] Creare/caricare il `VoiceClonePrompt` dalla cache biometrica locale.
- [x] Chiamare `generate()` con lingua inglese esplicita e parametri configurabili.
- [x] Convertire l'array NumPy mono a WAV bytes 24 kHz senza file temporanei persistenti.
- [x] Implementare `synthesize_batch()` usando batch nativo solo dopo test con liste e prompt; inizialmente è accettabile il fallback sequenziale.
- [x] Implementare `unload()`, garbage collection e rilascio CUDA coerente con gli altri provider.
- [x] Propagare cancellazione, OOM e output vuoto senza trasformarli in silenzio non segnalato.

### Se in-process

- [ ] Importare OmniVoice soltanto dentro il provider per non rendere obbligatoria la dipendenza all'avvio.
- [ ] Verificare passaggio fra Qwen, VibeVoice e OmniVoice nello stesso processo, incluso cleanup VRAM.

### Se worker isolato

- [x] Creare entrypoint minimale del worker con endpoint health/load/synthesize/unload/shutdown.
- [x] Avviare e terminare il worker dal backend con PID e log controllati; nessun processo orfano alla chiusura.
- [x] Trasferire reference tramite path locale validato o pipe; non accettare path arbitrari fuori dalle directory autorizzate.
- [x] Impostare limiti richiesta, timeout, propagazione cancellazione e cleanup dei file temporanei.
- [x] Non esporre il worker direttamente al frontend.

**Completata quando:** `tts_engine.synthesize()` produce un WAV OmniVoice valido usando una voce Nispa esistente e rete disabilitata.

## Fase 7 — Script Mode e English-UK

- [x] Registrare OmniVoice come provider per-battuta, non come multi-speaker nativo.
- [x] Riutilizzare parser, speaker_voice_map, batching/fallback e align_script_audio esistenti.
- [x] Verificare alternanza A/B e sequenze A/A/B mantenendo ordine e identità vocali.
- [x] Non applicare a OmniVoice il limite VibeVoice di quattro speaker; usare max_speakers dalle capability.
- [x] Aggiungere preset iniziale `English (UK) — Voice Clone` con lingua `en` e reference UK.
- [x] Esporre, se utili dopo il benchmark, `num_step` (qualità/velocità), `speed` e text normalization come opzioni avanzate con default sicuri.
- [x] Conservare tag supportati come `[laughter]` e `[sigh]`; documentare quali tag funzionano in inglese.
- [x] Non applicare automaticamente un'istruzione `british accent` sopra una voce clonata: l'accento deve provenire anzitutto dal reference.
- [x] Verificare normalizzazione inglese di date, numeri, valute e abbreviazioni britanniche prima di abilitarla come default.

**Completata quando:** un copione English-UK con almeno due speaker genera un MP3 finale corretto dall'attuale Script Mode.

## Fase 8 — Frontend e API

- [x] Cambiare `Model.engine` nel frontend da union `vibevoice | qwen` a provider ID estensibile.
- [x] Aggiungere al tipo `Model` le capability necessarie; evitare condizioni basate su substring del nome.
- [x] Lasciare `ModelSelector` data-driven e mostrare `OmniVoice` con indicatore `Local / Offline`.
- [x] Mostrare requisito WAV + trascrizione prima della generazione.
- [x] Mostrare un errore specifico se la voce selezionata non ha trascrizione.
- [x] Usare capability per mostrare Voice Design e opzioni avanzate solo quando supportate.
- [x] Conservare compatibilità API con `model_name` nella prima release o migrare esplicitamente a `model_id` in tutti i call site.
- [x] Se worker: aggiungere health/status al backend principale senza esporre dettagli sensibili.

**Completata quando:** OmniVoice è selezionabile sia nei flussi compatibili sia nella rigenerazione di segmenti archiviati.

## Fase 9 — Test automatici

### Unit

- [x] Registry: risoluzione provider/modello e errore su ID sconosciuto.
- [x] Capability: Qwen, VibeVoice e OmniVoice espongono metadata corretti.
- [x] Provider OmniVoice mockato: load, synthesize, batch fallback, unload, output WAV.
- [x] Risoluzione voce: WAV/transcript presenti, mancanti, vuoti e ID non valido.
- [x] Cache prompt: hit, miss, invalidazione, versione incompatibile e cancellazione.
- [x] Strict offline: nessun `snapshot_download` o ASR implicito durante l'inferenza.
- [x] Cleanup VRAM e cambio provider.
- [x] Worker lifecycle e path validation, se applicabile.

### API e frontend

- [x] `/api/models` restituisce OmniVoice e capability senza euristiche.
- [x] Speaker limit proviene dal modello selezionato.
- [x] Script task con OmniVoice mantiene ordine delle battute.
- [x] Test del selettore modello, Voice Design condizionale e messaggio trascrizione mancante.
- [x] Job archiviati con vecchi ID Qwen/Vibe restano apribili e rigenerabili.

### Integrazione reale opzionale

- [x] Test marcato `slow/gpu` su un sample sintetico o autorizzato non versionato.
- [x] Verifica formato, sample rate, durata non zero e assenza di NaN/clipping evidente.
- [x] Test completo con rete disabilitata.

**Completata quando:** `python run_tests.py` è verde e gli smoke GPU non mostrano regressioni su Qwen/VibeVoice.

## Fase 10 — Benchmark English-UK e preset consigliati

- [x] Creare manifest versionato senza audio con 20–30 battute inglesi UK.
- [x] Coprire domande, ironia, esitazione, dialogo rapido, frasi emotive, numeri, date, sterline, indirizzi e nomi britannici.
- [x] Usare 3–5 reference UK autorizzati, WAV mono puliti di 3–10 s con trascrizione verificata; conservarli solo sotto `data/` gitignored.
- [x] Generare Qwen e OmniVoice con gli stessi testi/reference, registrando seed e parametri quando disponibili.
- [x] Randomizzare A/B e valutare: somiglianza, naturalezza, intelligibilità, credibilità UK, ritmo dialogico e artefatti.
- [x] Registrare tempo di load, real-time factor, picco VRAM e tasso di fallimento/OOM.
- [x] Determinare preset consigliati per:
  - qualità massima;
  - preview veloce;
  - battute brevi;
  - battute lunghe.
- [x] Documentare dove Qwen resta preferibile e dove OmniVoice è consigliato; non proclamare un vincitore universale.

**Completata quando:** il selettore/documentazione può spiegare concretamente quale provider scegliere per un dialogo UK.

## Fase 11 — Documentazione e rilascio

- [x] Aggiornare `README.md`, documentazione tecnica, guida utente IT/EN e API reference.
- [x] Documentare installazione dei pesi, spazio disco, VRAM osservata e piattaforme realmente testate.
- [x] Documentare che `VoiceClonePrompt` è materiale biometrico derivato e come eliminarlo.
- [x] Documentare funzionamento offline e differenza fra download iniziale e inferenza.
- [x] Aggiungere OmniVoice alla matrice modelli senza dichiarare qualità superiore a Qwen finché il benchmark non lo dimostra.
- [x] Aggiornare `CHANGELOG.md` e versione applicativa.
- [x] Eseguire installazione pulita su Windows e, se supportato, su Linux/macOS.
- [x] Verificare upgrade da installazione esistente senza perdita di voci, output o job archiviati.
- [x] Preparare rollback: disabilitare OmniVoice dal catalogo non deve impedire l'avvio degli altri provider.

**Completata quando:** una nuova installazione e un upgrade esistente possono usare OmniVoice offline senza regressioni.

## Ordine di esecuzione consigliato

1. Fase 0 — baseline.
2. Fase 1 — compatibilità e scelta runtime.
3. Fase 2 — refactoring provider.
4. Fasi 3–5 — installazione, privacy e prompt cache.
5. Fasi 6–8 — provider, workflow e UI.
6. Fasi 9–10 — test e benchmark.
7. Fase 11 — documentazione e rilascio.

## Definition of Done globale

- [x] OmniVoice è un provider selezionabile e funziona con voci locali nei dialoghi English-UK.
- [x] Tutta l'inferenza funziona con rete disabilitata e nessun dato vocale lascia il dispositivo.
- [x] Prompt derivati, WAV e trascrizioni sono protetti, gitignored, invalidabili ed eliminabili.
- [x] Qwen e VibeVoice continuano a funzionare e la suite di regressione è verde.
- [x] Il routing non dipende più da substring dei nomi dei modelli.
- [x] Dipendenze OmniVoice isolate o dimostrate compatibili con gli altri provider.
- [x] Benchmark e preset descrivono con evidenze l'uso consigliato di Qwen e OmniVoice.
- [x] Installazione, upgrade, rollback e privacy sono documentati.

## Riferimenti tecnici

- OmniVoice repository: https://github.com/k2-fsa/OmniVoice
- OmniVoice model: https://huggingface.co/k2-fsa/OmniVoice
- Provider base: `backend/core/tts/base.py`
- Orchestratore attuale: `backend/core/tts_provider.py`
- Catalogo modelli attuale: `backend/api/routers/voices.py`
- Script task: `backend/api/routers/tasks.py`
- Downloader: `backend/scripts/download_model.py`
- Tipi frontend: `frontend/src/context/GlobalContext.tsx`
