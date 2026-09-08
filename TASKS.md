# Tasks — Integrazione locale Higgs Audio v3 (Emotion & Style Tagging)

> Stato: **COMPLETATO**
> Branch: `higgs`
> Data: 2026-09-06
> Scopo: integrare Higgs Audio v3 (4B) come quarto provider TTS locale per voice cloning ad alta qualità e recitazione espressiva guidata da tag inline (emozioni, stili, prosodia, suoni paralinguistici).
> Vincolo non negoziabile: inferenza rigorosamente locale e offline. Nessun dato vocale, prompt o testo lascia il dispositivo.

---

## Decisioni già prese

- [x] Higgs Audio v3 è un provider per-battuta con Voice Cloning da file WAV di riferimento.
- [x] Il modello gira su architettura a **Worker Locale Isolato** su loopback `127.0.0.1` per evitare conflitti con Qwen3-TTS (`transformers==4.57.3`).
- [x] Il caricamento dei pesi avviene in `torch.bfloat16` con target 24 kHz PCM mono.
- [x] Confinamento di sicurezza rigoroso: il worker valida tutti i percorsi audio sotto `data/` bloccando tentativi di path traversal.
- [x] In Script Mode viene fornita una **Tag Palette** (pulsanti cliccabili) per inserire facilmente i tag emotivi nel cursore del testo.

---

## Fase 0 — Baseline e Ambiente di Sviluppo

- [x] Verificare che il branch corrente sia `higgs` e che il worktree sia pulito rispetto a `main`.
- [x] Verificare la baseline dei test automatici (`python run_tests.py` verde al 100%).
- [x] Registrare le specifiche hardware correnti: RTX 5070 Ti (16 GB VRAM, Blackwell `sm_120`), CUDA 13.2, PyTorch `2.10.0+cu130`.

**Completata quando:** baseline registrata e suite di test verde.

---

## Fase 1 — Spike di Compatibilità e Runtime

- [x] Verificare la presenza delle dipendenze nel venv dei motori moderni (`venv_omnivoice` con `transformers 5.16.1` e `torch 2.10.0+cu130`).
- [x] Verificare la fattibilità del repository compatibile Transformers: `multimodalart/higgs-audio-v3-tts-4b-transformers`.
- [x] Testare importazione di `AutoModelForCausalLM` con `trust_remote_code=True` e `AutoTokenizer` in ambiente offline (`HF_HUB_OFFLINE=1`).
- [ ] Misurare VRAM a riposo e VRAM di picco durante la generazione di una frase test in `bfloat16`.
- [x] Decidere definitivamente se condividere `venv_omnivoice` (consigliato per non duplicare 6 GB di ambiente virtuale) o creare `venv_higgs`.

**Completata quando:** lo spike conferma caricamento pesi e generazione WAV su Blackwell senza errori di dipendenza.

---

## Fase 2 — Catalogo Modelli e Capability

- [x] Aggiungere `higgs-audio-v3-4b` a `backend/core/tts/catalog.py`:
  - `provider_id`: `"higgs"`
  - `model_id`: `"higgs-audio-v3-4b"`
  - `display_name`: `"Higgs Audio v3 (4B Emotion & Style)"`
  - `supports_voice_clone`: `True`
  - `supports_voice_design`: `False`
  - `supports_batch`: `False` (fallback sequenziale ordinato)
  - `requires_reference_audio`: `True`
  - `requires_reference_transcript`: `False` (opzionale)
  - `supported_languages`: `["en", "it", "fr", "de", "es", "ja", "zh"]`
  - `sample_rate`: `24000`
  - `execution`: `"local_worker"`
- [x] Aggiungere test unitario di risoluzione catalogo per `higgs-audio-v3-4b`.

**Completata quando:** `resolve_model_capabilities("higgs-audio-v3-4b")` restituisce le capability corrette.

---

## Fase 3 — Downloader Modello

- [x] Aggiornare `backend/scripts/download_model.py`:
  - Aggiungere il target `higgs` per scaricare `multimodalart/higgs-audio-v3-tts-4b-transformers` con revisione pinnata.
  - Salvare i pesi sotto `data/model/Higgs-Audio-v3/`.
  - Scrivere `manifest.json` con repository, revisione pinnata, hash e data download.
- [x] Verificare che il download sia atomico e gestisca errori di rete parziali.

**Completata quando:** `python backend/scripts/download_model.py higgs` scarica i pesi e valida il manifest.

---

## Fase 4 — Worker Isolato Higgs (`higgs_worker.py`)

- [x] Creare `backend/workers/higgs_worker.py`:
  - Applicare bind esclusivo a `127.0.0.1` e autenticazione con token di sessione per-processo.
  - Implementare `_validate_data_path` per confinare reference e output strettamente sotto `data/`.
  - Endpoint `GET /health` per controllo stato e GPU.
  - Endpoint `POST /load` con caricamento lazy in `torch.bfloat16`.
  - Endpoint `POST /synthesize` con passaggio di `reference_audio`, `reference_sample_rate`, `reference_text`, `temperature`, `top_p` e gestione dei tag emotivi.
  - Mappatura OOM (`torch.cuda.OutOfMemoryError`) su HTTP 507.
  - Validazione audio restituito (rilevamento silenzio vuoto o NaN/Inf) con HTTP 502.
  - Endpoint `POST /unload` e `POST /shutdown`.

**Completata quando:** il worker risponde a tutte le chiamate REST e blocca i tentativi di path traversal.

---

## Fase 5 — Provider Adapter & Registry

- [x] Creare `backend/core/tts/higgs_provider.py`:
  - Ereditare da `BaseTTSProvider`.
  - Implementare avvio automatico lazy del processo worker.
  - Gestire timeout per-operazione e propagazione errori strutturati (`OutOfMemoryError`, `InvalidAudioOutputError`, `TTSGenerationError`).
  - Implementare `unload()` con terminazione esplicita del processo worker (`shutdown()`).
  - Convertire l'output tensor in WAV PCM mono 24 kHz in memoria (`soundfile`).
- [x] Registrare la factory `higgs` in `backend/core/tts/registry.py`.
- [x] Verificare che `clean_vram()` termini il worker e rilasci la memoria GPU.

**Completata quando:** `tts_engine.synthesize(text, voice_id="...", model_name="higgs-audio-v3-4b")` genera correttamente l'audio WAV.

---

## Fase 6 — Frontend & Tag Palette Emozioni

- [x] Estendere l'interfaccia `Model` nel frontend per supportare l'engine `higgs`.
- [x] In `ScriptMode` (e `SubtitleMode`), quando è selezionato Higgs:
  - Mostrare una **Tag Palette** sopra l'area di testo del copione:
    - Emozioni: `Anger`, `Sadness`, `Amusement`, `Elation`
    - Stili: `Whisper`, `Shout`
    - Prosodia: `High Pitch`, `Slow`, `Pause`
    - SFX: `Laughter`, `Sigh`, `Cough`
  - Al clic sul bottone, inserire il rispettivo token inline (es. `<|emotion:anger|>`) nella posizione corrente del cursore.
- [x] Aggiornare `ModelSelector` per mostrare `Higgs Audio v3 (4B Emotion & Style)` con badge `Local / Offline`.

**Completata quando:** l'utente può selezionare Higgs e inserire tag emotivi con un clic dal copione.

---

## Fase 7 — Installer e Integrazione Ambiente

- [x] Aggiornare `install.bat` e `install.sh`:
  - Aggiungere Higgs Audio alle opzioni di installazione engine.
  - Gestire il download e i requisiti pip nel venv dedicato.
- [x] Aggiornare `backend/scripts/optimize_env.py` per validare l'ambiente `higgs` quando selezionato.

**Completata quando:** `install.bat` installa ed equipaggia Higgs Audio in modo idempotente.

---

## Fase 8 — Test Automatici e Regressione

- [x] Creare `backend/tests/test_higgs_provider.py`:
  - Test risoluzione catalogo e capability.
  - Test mock di `synthesize()` con reference vocale e tag.
  - Test gestione errori (OOM 507, audio non valido 502, timeout).
  - Test sicurezza: blocco path traversal.
  - Test terminazione ordinata del subprocess all'unload.
- [x] Eseguire `python run_tests.py --backend`.
- [x] Eseguire `python run_tests.py --frontend`.
- [x] Eseguire `npm run lint` e `npm run build` nel frontend.

**Completata quando:** l'intera suite di test e le build di produzione passano con 0 errori.

---

## Fase 9 — Documentazione e Benchmark Tagging

- [x] Aggiornare `README.md` e la documentazione con la guida alla sintassi dei tag emotivi e di stile.
- [x] Creare manifest di benchmark dedicato per testare le varie emozioni su voci UK clonate.
- [x] Aggiornare `CHANGELOG.md` con il rilascio della feature.

**Completata quando:** guida all'uso dei tag e documentazione tecnica sono aggiornate.


## Follow-up — Espressività OmniVoice (2026-09-08)

- [x] Verificati i 13 simboli non verbali nella documentazione upstream e nel matcher della libreria installata.
- [x] Aggiunti `inline_tags` e `inline_tag_guidance` al catalogo e alle API di selezione/gestione modelli; mantenuta distinta la capability emotion/style di Higgs.
- [x] Estesa la palette di Script Mode con inserimento al cursore/selezione, guida dedicata e aggiornamento al cambio modello senza riscrittura del copione.
- [x] Aggiornati README e CHANGELOG con sintassi, pronuncia CMU e limiti rispetto al voice design.
- [x] Verificati catalogo/API, inserimento frontend e passaggio invariato di tag/fonemi al provider e al worker con test mock; regressione completa: 172 backend e 53 frontend passati, build frontend riuscita.
- [ ] Prova reale GPU/offline e ascolto comparativo dei tag OmniVoice: non eseguiti in questa modifica.

`npm run lint` eseguito: 3 errori preesistenti in file non modificati (`ModelsManagerModal.test.tsx`: due `any`; `GenerationProgressModal/index.tsx`: setState nell'effect), oltre a 6 warning. Nessun errore lint nei file modificati.
