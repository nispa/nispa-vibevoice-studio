# Task List: Testing & API Documentation

### Fase 1: Backend Testing (Pytest)
- [ ] **Task 1.1: Audio Aligner Tests**
  - Creare `backend/tests/test_aligner.py`.
  - Testare logica di shifting e silence padding.
- [ ] **Task 1.2: Queue Manager & Worker Tests**
  - Creare `backend/tests/test_queue.py`.
  - Testare concorrenza, cancellazione e gestione errori del worker.
- [ ] **Task 1.3: API Integration Tests**
  - Creare `backend/tests/test_api.py`.
  - Testare validazione input e risposte d'errore (400, 404, 500).

### Fase 2: Frontend Testing (Vitest)
- [ ] **Task 2.1: Translation Loop Logic**
  - Creare `frontend/src/features/subtitle/hooks/useTranslationLoop.test.ts`.
  - Verificare avanzamento progressivo e gestione pausa.
- [ ] **Task 2.2: SSE Stream Consumption**
  - Creare `frontend/src/hooks/useScriptGeneration.test.ts`.
  - Mockare `EventSource` e testare la ricezione di progress/complete.
- [ ] **Task 2.3: UI Workflow Integration**
  - Testare il passaggio tra Step 1, 2 e 3 in `SubtitleMode.tsx`.

### Fase 3: API Documentation
- [ ] **Task 3.1: Static API Reference**
  - Creare `API_REFERENCE.md` con dettaglio di tutti gli endpoint.
- [ ] **Task 3.2: SSE Protocol Documentation**
  - Documentare la struttura dei messaggi stream nel README o nel file API.
