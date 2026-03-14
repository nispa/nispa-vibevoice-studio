# Planning e Checklist: Implementazione Batching per Qwen3-TTS

Questo documento definisce la strategia per implementare il batching (elaborazione in parallelo) nel motore TTS Qwen3, con l'obiettivo di ridurre drasticamente i tempi di inferenza per i lavori con numerosi segmenti.

---

## 1. Analisi di Fattibilità Tecnica

I modelli Transformer TTS (come Qwen) traggono grande vantaggio dall'elaborazione in parallelo, specialmente con Flash Attention 2 attivo. Tuttavia, l'inferenza autoregressiva di testi di lunghezze diverse richiede un "padding" sia lato input testuale che lato output audio.

### Passi Preliminari:
- **Verifica Supporto `qwen_tts`**: Controllare se le classi wrapper attuali (`generate_voice_clone`, `generate_custom_voice`) accettano nativamente `List[str]`. Se accettano solo `str`, sarà necessario scrivere una funzione personalizzata all'interno di `Qwen3TTSProvider` per gestire il padding dei tensori e la tokenizzazione multipla.
- **Gestione VRAM**: Stabilire una "batch size" dinamica. Es: 2 o 3 segmenti per GPU da 12GB; 4-6 segmenti per GPU da 24GB.

---

## 2. Checklist Implementativa

### Fase 1: Motore Core (Backend)
- [ ] Analizzare il codice sorgente del pacchetto `qwen_tts` per confermare o meno il supporto nativo a `List[str]`.
- [ ] Modificare l'interfaccia base in `backend/core/tts_provider.py` per aggiungere il metodo `synthesize_batch()`.
- [ ] Implementare `synthesize_batch` in `Qwen3TTSProvider`:
  - Tokenizzare una lista di stringhe simultaneamente.
  - Applicare il padding ai tensori di input.
  - Eseguire `self.model.generate` in modalità batch.
  - Separare i tensori audio risultanti rimuovendo i silenzi di padding finali.
- [ ] Implementare un fallback "finto batching" (ciclo for sequenziale) in `VibeVoiceProvider` per mantenere l'interfaccia unificata, qualora VibeVoice non supporti nativamente il batching.

### Fase 2: Logica dei Task (Router Generation)
- [ ] Modificare `backend/api/routers/generation.py` (`subtitle_job`).
- [ ] Implementare un raggruppamento (chunking): dividere `job_segments` in blocchi di dimensione `N` (es. `BATCH_SIZE = 3`).
- [ ] Richiamare `tts_engine.synthesize_batch` per ogni blocco.
- [ ] Mappare ogni file audio ritornato al segmento originale corrispondente, **mantenendo intatti i metadati `start_ms` e `end_ms`**.

### Fase 3: Rispetto del Timing (Cruciale per i file SRT)
Il sistema di batching non deve alterare la struttura temporale imposta dalla trascrizione originale.
- [ ] L'allineamento finale (`align_subtitles_audio`) si basa su `start_time_ms` e `end_time_ms` di ogni segmento. Il processo di batching deve garantire che i `wav_bytes` restituiti per ogni testo vengano riassociati al `SubtitleSegment` originale senza perdere o confondere l'indice.
- [ ] Considerare che la durata dell'audio generato per un segmento potrebbe non coincidere esattamente con il delta `end_ms - start_ms`. Il batching deve preservare questi timestamp in modo che `core/aligner.py` possa applicare correttamente silenzi, padding o speed-up (time-stretching) come avviene attualmente.

### Fase 4: Ottimizzazione Flusso Dati (SSE)
- [ ] Modificare il ciclo `yield` per inviare via SSE i progressi raggruppati. Invece di inviare 1 segmento alla volta, inviare un array `new_segments` contenente tutti gli elementi elaborati nel batch corrente.
- [ ] Calibrare il contatore ETA nel Frontend (`GenerationProgressDisplay`), poiché l'avanzamento avverrà "a scatti" (es. da 0, a 3, a 6...) invece che linearmente.

### Fase 5: Test e Profilazione
- [ ] Test di Memoria: Verificare picchi di VRAM durante la sintesi di segmenti lunghi. Aggiungere un meccanismo di svuotamento (`torch.cuda.empty_cache()`) tra un batch e l'altro se necessario.
- [ ] Test di Allineamento: Assicurarsi che i timestamp di fine generazione rimangano fedeli anche quando l'audio viene generato in gruppo.
- [ ] Test Fallback: In caso di OOM (Out Of Memory) su un batch, inserire un meccanismo di recupero che riprova la sintesi in modo sequenziale (batch=1).

---

## Note Architetturali
L'implementazione richiederà modifiche sensibili al core di `Qwen3TTSProvider`. Si raccomanda di testare la modifica in un branch o ambiente separato per non compromettere la stabilità raggiunta con il salvataggio incrementale dei segmenti.
