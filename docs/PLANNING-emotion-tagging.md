# Planning — Preprocessing LLM per Emotion Tagging

> Stato: **IPOTESI FUTURA / NON PIANIFICATO**. Bozza creata: 2026-06-22.
> Owner: nispa. Da rivalutare solo quando esistono provider locali integrati o candidati recenti che supportano davvero tag emotivi/prosodici utili al workflow.

## Contesto e decisioni prese

Discussione di partenza: integrare `bosonai/higgs-audio-v3-tts-4b` nell'app. Questo piano non e' una roadmap attiva: dipende dalla disponibilita' di modelli TTS locali che consumino in modo affidabile tag emotivi/prosodici.

Percorsi valutati e **scartati**:
- **Integrazione Higgs in-app come provider** (in-process via transformers, come fanno i nodi
  ComfyUI `Saganaki22/Higgs_v3-TTS-ComfyUI`): fattibile ma non prioritario ora. Nota: il path
  in-process esiste, quindi NON serve il sidecar SGLang/vLLM (che su Windows+Blackwell sm_120
  sarebbe stato il rischio principale).
- **Spostare il workflow su ComfyUI** (`diodiogod/TTS-Audio-Suite`, che fa già SRT multi-engine):
  scartato perché si perderebbero i differenziatori dell'app (traduzione offline NLLB+Ollama,
  job archive, session recovery, UX lineare sottotitoli→voiceover).
- **Custom node ComfyUI "solo sottotitoli + batch"**: scartato. La parte sottotitoli multilingua +
  grouping per contesto resta nell'app così com'è; gli untimed dialogs si usano come sono.

**Decisione storica:** l'unica cosa che sembrava valere la pena aggiungere era un **preprocessing tramite LLM
(Ollama, già integrato) che annota il testo con i tag di emotività/stile/prosodia di Higgs v3**,
da eseguire dopo grouping/traduzione e prima del TTS. Feature engine-agnostica: il testo taggato
può andare al TTS interno o essere esportato verso ComfyUI.

**Decisione attuale:** non implementare finche' non viene scelto almeno un provider locale che supporti questi tag in modo documentato e testabile. Per ora il lavoro principale resta OmniVoice, provider registry e dialoghi English-UK.

## Obiettivo

Dato un testo (già raggruppato per contesto e/o tradotto), produrre lo **stesso testo con tag
inline Higgs v3** inseriti dove la recitazione lo richiede, senza alterare il contenuto.

## Vocabolario tag Higgs v3 (sintassi ESATTA — vincolo per l'LLM)

Formato: `<|category:value|>` posto prima del testo a cui si applica.

- **emotion** (21): `elation, amusement, enthusiasm, determination, pride, contentment, affection,
  relief, contemplation, confusion, surprise, awe, longing, arousal, anger, fear, disgust,
  bitterness, sadness, shame, helplessness`
- **style** (3): `singing, shouting, whispering`
- **sfx** (9): `cough, laughter, crying, screaming, burping, humming, sigh, sniff, sneeze`
- **prosody**: `speed_very_slow, speed_slow, speed_fast, speed_very_fast, pitch_low, pitch_high,
  pause, long_pause, expressive_high, expressive_low`
- **multi-speaker** (se serve): label `[Speaker_1]:`, `[Speaker_2]:` davanti alle battute.

Esempi: `<|emotion:amusement|>Wait, that was actually funny.` · `<|style:whispering|>Keep your voice down.`
· `<|sfx:laughter|>Haha, absolutely perfect.` · `<|prosody:speed_very_slow|>This is a test.`

## Dove si innesta (riuso di `translation.py`)

La feature è quasi un clone della pipeline di traduzione Ollama esistente in
`backend/api/routers/translation.py`:
- `translate_with_ollama()` → modello per `tag_emotions_with_ollama()`
- `POST /translate-segment` / `/translate-batch` → modello per `/tag-segment` / `/tag-batch`
- `get_ollama_local_models()` / `GET /ollama/models` → riusati per la scelta modello
- merge sui segmenti (`seg["text"] = ...`) → scrive `seg["tagged_text"]` (NON sovrascrive `text`)

Ordine pipeline: parse → grouping → (traduzione opz.) → **emotion tagging (nuovo)** → TTS.

## Design

- **Granularità:** per-segmento di default (come fa già il loop Ollama in `translate-batch`).
  Opzione alternativa: un solo prompt per l'intero blocco → coerenza emotiva migliore ma output
  più fragile (stesso trade-off già notato per la traduzione). Vedi Decisioni aperte.
- **Prompt a vocabolario chiuso** (bozza):
  ```
  Sei un direttore di doppiaggio. Inserisci tag di recitazione nel testo per un TTS.
  NON modificare, tradurre o riscrivere il testo: aggiungi SOLO tag inline.
  Usa ESCLUSIVAMENTE questi tag (categoria:valore tra <| |>):
    emotion ∈ {elation, amusement, ... helplessness}
    style   ∈ {singing, shouting, whispering}
    sfx     ∈ {cough, laughter, crying, screaming, burping, humming, sigh, sniff, sneeze}
    prosody ∈ {speed_very_slow..very_fast, pitch_low/high, pause, long_pause, expressive_high/low}
  Sii parsimonioso: di norma 0–1 tag emozione a frase; SFX/style solo se davvero implicito.
  Rispondi SOLO col testo taggato.
  ```
- **Default consigliati:** tagging parsimonioso, feature **opt-in** con toggle UI, modello
  instruct **multilingua** (i sottotitoli sono multilingua; i modellini NLLB non vanno bene qui).

## Requisiti di affidabilità (NON opzionali)

1. **Validatore vocabolario.** Post-filtro regex che, contro il set noto dei valori, **rimuove i
   tag non validi** lasciando intatto il testo. Senza, Higgs riceve tag spurî. Requisito.
2. **Integrità testo.** Check che "testo senza tag ≈ testo originale". Se diverge oltre soglia
   (il modello ha riscritto/tradotto), **scarta i tag di quel segmento** e tieni il testo grezzo.
3. **Fallback Ollama down.** Se Ollama non risponde, restituire il testo non taggato (come degrado
   morbido), non far fallire la generazione.

## Tasklist

### Backend
- [ ] `tag_emotions_with_ollama(text, model_name, ...)` in `translation.py` (o nuovo
      `emotion_tagger.py`), gemello di `translate_with_ollama`.
- [ ] Costante con il vocabolario tag + funzione `validate_and_strip_tags(text) -> str`.
- [ ] Funzione `check_text_integrity(original, tagged) -> bool` (confronto testo senza tag).
- [ ] Endpoint `POST /api/tag-segment` e `POST /api/tag-batch` (mirror di translate-*), che
      scrivono `seg["tagged_text"]` e non toccano `seg["text"]`.
- [ ] Gestione fallback Ollama down → ritorna testo grezzo.

### Frontend
- [ ] Toggle opt-in "Emotion tagging (Higgs)" nel flusso (subtitle e/o script feature).
- [ ] Dropdown modello LLM riusando `GET /api/ollama/models`.
- [ ] Mostrare/permettere edit del `tagged_text` prima del TTS (anteprima tag).
- [ ] Passare `tagged_text` (se presente) al posto di `text` alla submit di generazione.

### Test
- [ ] Unit: `validate_and_strip_tags` rimuove valori inventati, tiene quelli validi.
- [ ] Unit: `check_text_integrity` scarta riscritture, accetta solo-tag.
- [ ] Integrazione: segmento multilingua → tag plausibili e validi.
- [ ] Fallback: Ollama spento → testo grezzo, nessun errore.

### Docs
- [ ] Aggiornare `AGENTS.md`, `README.md` e la documentazione utente/API quando la feature diventa implementazione reale.


## Provider locali da rivalutare

Candidati emersi dalla ricerca del 2026-09-04:

- **Higgs Audio v3** - candidato principale per tag strutturati `<|emotion:...|>`, `<|style:...|>`, `<|prosody:...|>` e `<|sfx:...|>`; richiede verifica licenza e runtime locale.
- **IndexTTS-2.5** - candidato per emotion/speed control con `emo_vector`, `emo_text`, `duration_factor` e fonemi CMU inglesi; adatto a uno spike English-UK separato.
- **Chatterbox Turbo** - candidato per tag paralinguistici semplici (`[laugh]`, `[cough]`, `[whisper]`, ecc.) e controllo di espressivita' tramite parametri, ma non usa il vocabolario Higgs.
- **Breeze TTS 2** - candidato per voice direction in linguaggio naturale; da verificare se puo' consumare annotazioni LLM in modo stabile.
- **EmoTra-TTS / TED-TTS** - riferimenti di ricerca per emotion control intra-utterance, non ancora target di integrazione prodotto.
## Decisioni aperte (da sciogliere prima di implementare)

1. **Per-segmento vs prompt unico sul blocco** (coerenza vs robustezza output).
2. **TTS di destinazione:** provider Higgs in-app (da integrare separatamente) o export verso
   ComfyUI? I tag sono validi in entrambi i casi, ma cambia dove `tagged_text` viene consumato.
3. **Editing manuale dei tag** nella UI: necessario al primo rilascio o fase 2?

## Riferimenti

- Modello: https://huggingface.co/bosonai/higgs-audio-v3-tts-4b (licenza research/non-commercial — OK per uso personale)
- Nodo ComfyUI v3 (sintassi tag confermata qui): https://github.com/Saganaki22/Higgs_v3-TTS-ComfyUI
- Suite multi-engine SRT: https://github.com/diodiogod/TTS-Audio-Suite
- Codice da riusare: `backend/api/routers/translation.py`, `backend/core/parser.py`
