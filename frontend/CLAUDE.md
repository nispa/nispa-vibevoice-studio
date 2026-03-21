# CLAUDE.md — Nispa VibeVoice Studio

> Istruzioni specifiche per Claude/Anthropic models che lavorano su questo progetto.

## Contesto Rapido

Nispa VibeVoice Studio è un'app desktop offline per:
- **Voiceover AI** da sottotitoli (.srt/.vtt) o script liberi
- **Traduzione AI** offline con NLLB-200 e Ollama
- **Voice cloning** in 3 secondi con Qwen3-TTS

Stack: React 19 + Vite + TypeScript + Tailwind (frontend) | FastAPI + SQLite + PyTorch (backend)

## Dove Trovare Cosa

| Cosa cerchi | Dove guardare |
|-------------|---------------|
| Entry point frontend | `frontend/src/main.tsx` → `App.tsx` |
| State globale | `frontend/src/context/GlobalContext.tsx` |
| Feature Subtitle | `frontend/src/features/subtitle/` |
| Feature Script | `frontend/src/features/script/` |
| Hook principali | `frontend/src/hooks/` (useJobArchive, useScriptGeneration, useSystemInfo) |
| API backend | `backend/api/routers/` (tasks, jobs, translation, generation) |
| TTS engines | `backend/core/tts/` (qwen_provider, vibe_provider, tts_provider) |
| Documentazione tecnica | `TECHNICAL_DOCUMENTATION.md` |
| API reference | `API_REFERENCE.md` |

## Attenzione: Bug Attivi

### Backend
1. **`translator.py` L71** — `dtype` usato invece di `torch_dtype` (parametro ignorato silenziosamente)
2. **`tasks.py` L272/L371** — Bare `except: pass` nasconde errori di I/O
3. **`database.py`** — Connessioni SQLite senza context manager (possibile leak)
4. **`main.py` L28** — `@app.on_event("startup")` è deprecato in FastAPI moderno

## Pattern del Progetto

### Frontend
- **Context API** per state management (no Redux/Zustand)
- **SSE (Server-Sent Events)** per progress real-time della generazione
- **File-based audio** — i segmenti vengono salvati come WAV in `data/audio-rendering/{slug}_{id}/` e serviti via HTTP; `audioUrl` nel DB è un path relativo convertito con `filePathToHttpUrl()`
- **Incremental save** — il backend salva ogni segmento audio appena generato

### Backend
- **Provider pattern** per TTS engines (abstract `TTSProvider` → concrete providers)
- **Dynamic batching** basato su VRAM disponibile
- **Pydantic models** con `extra="ignore"` per compatibilità legacy DB

## Stile di Codice

- TypeScript strict mode attivo
- Componenti funzionali React con hooks
- JSDoc per documentazione inline
- Tailwind CSS v4 (no utility classes costruite dinamicamente)
- Nomi variabili e funzioni in inglese, UI in fase di standardizzazione (mix IT/EN)

## Comandi Utili

```bash
cd frontend && npm run dev          # Dev server frontend
cd frontend && npx vitest           # Test frontend
cd frontend && npx vitest --run     # Test frontend (single run, no watch)
python run_tests.py                 # Test completi (backend + frontend)
```

## Cosa NON Fare

- ❌ Aggiungere `any` — tipizzare tutto
- ❌ Hardcodare `http://localhost:8000` — usare variabili d'ambiente
- ❌ Usare `alert()` / `confirm()` — creare componenti modali
- ❌ Duplicare conversione base64→Blob — centralizzare in utility
- ❌ Creare nuovi `AudioContext` senza chiuderli
- ❌ Chiamare `URL.createObjectURL` senza `revokeObjectURL`
