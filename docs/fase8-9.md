# Fasi 8 e 9 — Frontend, Validazione e Suite di Test Automatici

## Obiettivi raggiunti

### Fase 8 — Frontend e Validazione Data-Driven
1. **Estensione interfaccia `Model` nel frontend**:
   - `frontend/src/context/GlobalContext.tsx`: esteso `Model.engine` da union fissa a provider estensibile (`'vibevoice' | 'qwen' | 'omnivoice' | string`) con campi di capability data-driven (`requires_reference`, `requires_transcript`, `supports_voice_design`, `max_speakers`, `installed`).
2. **Componente `ModelSelector`**:
   - Badge visivo `Local / Offline`.
   - Indicatore automatico di requisito trascrizione (`.wav + .txt`) quando il modello selezionato lo richiede.
   - 4 unit test aggiunti in `frontend/src/components/ui/ModelSelector.test.tsx`.
3. **Validazione preventiva pre-generazione**:
   - In `GenerationControls.tsx` (Subtitle Mode) e `useScriptGeneration.ts` (Script Mode), verifica che le voci selezionate per OmniVoice abbiano una trascrizione valida (`.txt`), bloccando l'invio e fornendo un messaggio chiaro e azionabile all'utente se la trascrizione è assente.

### Fase 9 — Suite Completa di Test Automatici
1. **Retrocompatibilità Job Archiviati**:
   - Creato `backend/tests/test_integration_omnivoice_and_jobs.py` con test che verificano che i job creati con vecchi identificatori di modello (`Qwen3-TTS-1.7B`, `VibeVoice-1.5B`, `VibeVoice`, ecc.) vengano caricati e risolti correttamente tramite le capability del catalogo senza errori.
2. **Integrazione Script Mode e Ordinamento Battute**:
   - Verificato che una richiesta multi-turn con OmniVoice mantenga rigorosamente l'ordine sequenziale delle battute e associ ciascun turno allo speaker e al reference vocale corretto.
3. **Pulizia VRAM e Cambio Provider**:
   - Verificato il ciclo di vita del `ProviderRegistry` con rilascio VRAM tramite `clean_vram()` e `unload()` al passaggio da un provider all'altro.
4. **Risultati Test Suite**:
   - **Backend**: 135 test superati (`pytest backend/tests`).
   - **Frontend**: 32 test superati (`vitest`).
