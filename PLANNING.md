# Planning - OmniVoice locale e refactoring dei provider TTS

> Stato: **COMPLETATO**. Versione: 2026-09-04 (v0.8.0).
> Obiettivo: integrare OmniVoice come terzo provider TTS locale e rifattorizzare l'architettura provider in modo data-driven.
> Uso principale: dialoghi untimed in inglese con accento UK e voice cloning da reference autorizzati.
> Vincolo non negoziabile: offline durante l'inferenza. WAV, trascrizioni, prompt vocali, modelli e output restano sul computer dell'utente; nessuna API o servizio cloud.

## Decisione corrente

OmniVoice va integrato come provider aggiuntivo a prescindere dal fatto che batta Qwen3-TTS in ogni benchmark. Il benchmark serve a produrre raccomandazioni pratiche, preset e limiti documentati, non a decidere se il provider esiste nella UI.

Il primo target di qualita' e' English-UK dialogue: battute brevi, alternanza speaker, reference vocali UK autorizzati, nomi/date/valute britanniche, intonazione conversazionale. Italiano e altre lingue restano supportate quando il provider lo consente, ma non guidano la prima ottimizzazione.

## Decisione architetturale di runtime (Fase 1)

**Decisione:** Adottato il **Percorso B — worker locale isolato**.

**Motivazione tecnica e riscontri dello spike:**
1. **Conflitto fatale sulle dipendenze:** OmniVoice 0.2.1 richiede tassativamente `transformers>=5.3.0` (ha installato `transformers-5.16.1`).
2. **Rottura di Qwen3-TTS:** `qwen-tts 0.1.1` richiede strettamente `transformers==4.57.3`. Sotto Transformers 5.16.1, `qwen_tts` fallisce già all'import con: `TypeError: check_model_inputs() missing 1 required positional argument: 'func'`.
3. **Rottura di VibeVoice:** il codice vendorizzato di VibeVoice fallisce all'import sotto Transformers 5.16.1 con: `ValueError: '<class 'vibevoice.modular.configuration_vibevoice.VibeVoiceAcousticTokenizerConfig'>' is already used by a Transformers model.`
4. **Impossibilità di convivenza in-process:** Nessun singolo venv può ospitare contemporaneamente Transformers 4.57.3 e Transformers 5.16.1. Forzare l'aggiornamento romperebbe immediatamente entrambi i provider esistenti.
5. **Esito dello spike OmniVoice isolato:**
   - Inferenza **strict-offline** (`HF_HUB_OFFLINE=1`, `TRANSFORMERS_OFFLINE=1`) verificata con successo su GPU `cuda:0` da path locale.
   - Caricamento pesi (3.04 GB) in soli **2.50s**, VRAM a riposo **3.03 GB**.
   - Sintesi ad alta velocità: **1.88s** (RTF ~0.42), picco VRAM **3.28 GB**, audio WAV 24kHz mono PCM.
   - Creazione prompt vocale in **0.24s**, salvataggio e riuso da cache locale (.pt, ~15.7 KB) verificato.
6. **Direttive per il worker:**
   - Loopback esclusivo `127.0.0.1` con token locale per-processo, timeout controllati e pulizia all'uscita.
   - Gestito dagli script `install.bat`/`install.sh` e dal backend principale; invisibile per l'utente finale.
   - Se OmniVoice non è attivo, l'applicazione principale e gli altri provider non subiscono alcun impatto.


## Stato attuale rilevato

- `backend/core/tts/base.py` definisce `synthesize()` e `synthesize_batch()` e quindi copre bene un TTS per-battuta.
- `backend/core/tts_provider.py` e' un orchestratore hard-coded: sceglie Qwen se `"Qwen" in model_name`, altrimenti VibeVoice; pool e cleanup conoscono soltanto quei due provider.
- `backend/api/routers/voices.py` scopre i modelli dal filesystem con la stessa euristica: ogni modello non-Qwen diventa VibeVoice.
- `backend/api/routers/tasks.py` tratta gia' lo script untimed come lista di battute: raggruppa solo battute consecutive con la stessa voce, sintetizza e concatena. E' il percorso giusto per OmniVoice.
- Frontend: `frontend/src/context/GlobalContext.tsx` restringe `engine` a `vibevoice | qwen`; il selettore modello e' altrimenti gia' abbastanza data-driven.
- Gli installer guidati (`install.bat`, `install.sh`) e il downloader (`backend/scripts/download_model.py`) sono il percorso utente supportato: l'integrazione deve passare da li', non da setup manuali paralleli.

Conclusione: per OmniVoice non serve un nuovo flusso dialogo. Serve rendere registry provider, catalogo modelli, capability, installer e UI estensibili e verificabili offline.

## Piano operativo

1. Proteggere la baseline: registrare ambiente, `git status`, test esistenti e smoke reali Qwen/VibeVoice se i modelli sono presenti.
2. Fare spike compatibilita' OmniVoice: versione pinnata, pesi locali, inferenza offline, convivenza con Torch/CUDA/Transformers esistenti.
3. Rifattorizzare provider e catalogo: niente routing per substring, capability data-driven, provider registry lazy, `unload()` pubblico.
4. Integrare installer/downloader: selezione guidata multi-engine, manifest locale dei modelli, nessun download implicito durante sintesi.
5. Implementare OmniVoiceProvider: path locali, transcript obbligatorio, cache biometrica `VoiceClonePrompt`, WAV 24 kHz, fallback batch sequenziale corretto.
6. Integrare Script Mode e frontend: modello selezionabile, requisiti reference/transcript visibili, limiti speaker da capability, opzioni avanzate solo validate.
7. Verificare privacy/offline: `HF_HUB_OFFLINE`, `TRANSFORMERS_OFFLINE`, niente ASR implicito, niente log sensibili, cache gitignored e invalidabile.
8. Costruire benchmark English-UK: confronto Qwen/OmniVoice con reference autorizzati, A/B blind, metriche di qualita', VRAM e latenza.
9. Documentare installazione, licenza, limiti, rollback e preset consigliati.

La checklist dettagliata vive in `TASKS.md`.

## Vendor candidati per cicli successivi

Questi vendor sono fuori dallo scope OmniVoice, ma il refactoring deve renderli integrabili senza aggiungere nuovi hardcoding.

| Vendor | Perche' interessa | Rischio principale | Priorita' |
|---|---|---|---|
| Chatterbox / Turbo / Multilingual V3 | English-first, MIT, voice cloning, leggero, emotion exaggeration e tag paralinguistici in Turbo | verificare qualita' UK, watermarking, dipendenze e download offline | Alta |
| IndexTTS-2.5 | emotion/timbre disentanglement, speed control, fonemi CMU inglesi, voice cloning | licenza, stabilita' su paragrafi inglesi, stack Windows/Blackwell | Alta |
| Higgs Audio v3 | tag inline ricchi per emotion/style/prosody/SFX, voice cloning, 100+ lingue | licenza non-commercial, modello piu' pesante, packaging/runtime | Media |
| Breeze TTS 2 | voice direction naturale, voice design, voice clone, release recente | pesi non-commercial, copertura English-UK da verificare | Media |
| EmoTra-TTS / TED-TTS | ricerca utile per controllo emotivo intra-utterance | non ancora vendor prodotto: dataset/fine-tuning/pipeline sperimentale | Bassa |

## Fuori scope del ciclo OmniVoice

- Provider cloud o upload remoto di audio.
- Implementare Chatterbox, IndexTTS-2.5, Higgs, Breeze o altri provider nello stesso ciclo.
- Emotion tagging automatico via LLM finche' non c'e' un provider locale scelto che consumi quei tag in modo documentato e testabile.
- Generazione dialogue-native in una singola chiamata: OmniVoice viene trattato per-battuta.
- Broad cleanup non collegato al provider registry o alla privacy/offline inference.

## Rischi e mitigazioni

| Rischio | Mitigazione |
|---|---|
| Dipendenze OmniVoice incompatibili con Qwen/VibeVoice | test in venv principale prima; se serve worker isolato, deve essere creato e gestito dagli installer/launcher |
| Download implicito a runtime | pesi preinstallati, path locali, flag offline, errore esplicito se modello manca |
| Auto-trascrizione o fallback ASR non voluto | transcript `.txt` obbligatorio per voice cloning; nessun Whisper nascosto |
| Cache prompt trattata come cache innocua | directory sotto `data/`, gitignore, hash input, invalidazione e cancellazione esplicita |
| Batch multi-voce errato | prima implementazione sequenziale corretta; batching nativo solo dopo test |
| Regressione Qwen/VibeVoice | registry testato prima di OmniVoice funzionale; compatibilita' con ID esistenti |

## Definition of Done

1. OmniVoice e' selezionabile, installabile dal guided installer e genera dialoghi English-UK con voci locali.
2. L'inferenza funziona offline, senza download, ASR implicito o servizi cloud.
3. WAV, trascrizioni e prompt derivati restano locali, gitignored, invalidabili ed eliminabili.
4. Qwen e VibeVoice continuano a funzionare con test di regressione.
5. Provider/model selection e' registry- e capability-driven, senza substring routing.
6. Benchmark e documentazione spiegano quando scegliere Qwen, VibeVoice o OmniVoice.
7. I vendor futuri sono annotati ma non implementati nel ciclo corrente.

## Riferimenti

- OmniVoice: https://github.com/k2-fsa/OmniVoice
- Modello OmniVoice: https://huggingface.co/k2-fsa/OmniVoice
- Chatterbox: https://huggingface.co/ResembleAI/chatterbox
- Chatterbox Turbo: https://huggingface.co/ResembleAI/chatterbox-turbo
- IndexTTS-2.5: https://huggingface.co/IndexTeam/IndexTTS-2.5
- Higgs Audio v3: https://huggingface.co/bosonai/higgs-tts-3-4b
- Breeze TTS 2: https://huggingface.co/BreezeBlue/Breeze-TTS-2
- Codice Nispa da evolvere: `backend/core/tts/base.py`, `backend/core/tts_provider.py`, `backend/api/routers/tasks.py`, `backend/api/routers/voices.py`.