# Piano di Testing - Nispa VibeVoice Studio (v0.4.0)

Questo documento traccia i test necessari per garantire la stabilità delle nuove funzionalità introdotte con Qwen3-TTS e il Voice Library Manager.

## 🧠 1. Backend: Core & Engines (Pytest)
- [x] **Multi-Model Orchestration**: Verificare che `MultiModelProvider` smisti correttamente a Vibe o Qwen in base al nome modello.
- [x] **GPU Auto-Selection**: Mockare `torch.cuda.mem_get_info` e verificare che `_get_best_gpu` scelga la scheda con più VRAM.
- [x] **Qwen3 Logic Switching**: 
    - [x] Test `Base` model -> `generate_voice_clone` (con e senza trascrizione).
    - [x] Test `CustomVoice` model -> `generate_custom_voice`.
    - [x] Test `VoiceDesign` model -> `generate_voice_design`.
- [x] **Reprocess Audio**: Verificare che il filtro passa-banda Scipy non corrompa il file e crei correttamente la copia `_processed`.

## 🌐 2. Backend: API Endpoints (Pytest + TestClient)
- [ ] **Voice Management**:
    - [ ] `POST /upload-voice`: Verifica salvataggio `.wav` + `.txt`.
    - [ ] `DELETE /voices/{id}`: Verifica rimozione di entrambi i file.
    - [ ] `POST /voices/{id}/transcription`: Verifica aggiornamento del file di testo.
- [ ] **Language Support**: Verificare che il parametro `language` sia accettato da tutti i router di generazione e passato correttamente al motore.
- [ ] **CORS Check**: Verificare che gli header `Access-Control-Allow-Origin` siano presenti per `127.0.0.1`.

## 🎨 3. Frontend: Componenti UI (Vitest + React Testing Library)
- [ ] **AudioWaveformPlayer**:
    - [ ] Mock `AudioContext` e `Canvas`.
    - [ ] Test play/pause toggle.
    - [ ] Test Seek: Verificare il calcolo del tempo al click sul canvas.
- [ ] **VoicesManagementModal**:
    - [ ] Test caricamento audio + inserimento trascrizione.
    - [ ] Test toggle modalità "Inline Edit" per la trascrizione.
- [ ] **LanguageSelector**: Verifica che la selezione aggiorni correttamente il contesto globale.
- [ ] **Voice Design Field**: Verifica che appaia solo con i modelli compatibili.

## 🛠️ 4. Script & Installers (E2E Manual/Automated)
- [ ] **Weights Downloader**: Mockare `huggingface_hub` e testare il ciclo di download e il rilevamento `ALREADY INSTALLED`.
- [ ] **Flash-Attn Installer**: Verificare il rilevamento dinamico della versione di Python/CUDA e la generazione dell'URL.
- [ ] **SoX Path Utility**: Testare l'aggiunta al PATH tramite PowerShell (ambiente Windows).

---
## 🚀 Stato Avanzamento
- **Test Creati**: 4
- **Test Superati**: 4
- **Copertura stimata**: 25%
