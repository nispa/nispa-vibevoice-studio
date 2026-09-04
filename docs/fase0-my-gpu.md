# Walkthrough: Fase 0 — Protezione della Baseline

La **Fase 0** è stata completata con successo. Abbiamo congelato lo stato iniziale dell'ambiente, eseguito l'intera suite di test e validato le prestazioni e l'integrità dei modelli TTS attualmente installati (`Qwen3-TTS` e `VibeVoice`).

---

## 1. Inventario dell'Ambiente di Esecuzione

- **Sistema Operativo**: Windows 11 (`Windows-10-10.0.26200-SP0`)
- **Python**: `3.11.9` (64-bit AMD64)
- **Git Branch attivo**: `omnivoice`
- **Git Commit**: `9e86fa60e50251b037e4c90e084c937e0fec41ff`
- **GPU Primaria**: NVIDIA RTX 4500 Ada Generation
  - Compute Capability: `(8, 9)`
  - VRAM Totale: `23.99 GB`
  - Device Count: 2
- **PyTorch**: `2.10.0+cu130`
- **CUDA (PyTorch)**: `13.0`
- **Dipendenze Chiave**:
  - `torchaudio`: `2.11.0+cu130`
  - `transformers`: `4.57.3`
  - `qwen_tts`: installato
  - `soundfile`: `0.13.1`
  - `flash_attn`: `2.8.3`
  - `fastapi`: `0.135.1`
  - `pydantic`: `2.12.5`
  - `numpy`: `2.4.3`
  - `SoX`: `14.4.2` presente in `C:\Program Files (x86)\sox-14-4-2`

---

## 2. Esito Suite di Test (`run_tests.py`)

- **Backend (`pytest backend/tests`)**:
  - **97 passed** in 20.64s
  - 0 fallimenti
- **Frontend (`npm run test -- --run` via Vitest)**:
  - **12 test file passed**, **28 tests passed** in 1.98s
  - 0 fallimenti
- **Risultato complessivo**: `backend: PASSED`, `frontend: PASSED`.
- **Miglioramento apportato**: aggiunto supporto a `npm.cmd` su Windows in [run_tests.py](file:///f:/nispa-voiceover/run_tests.py#L34-L35) per consentire l'esecuzione con un singolo comando `python run_tests.py`.

---

## 3. Baseline Smoke Test Reali su GPU

I test sono stati eseguiti con voice cloning su una battuta reale in lingua inglese:
> *"Good morning! The meeting has been rescheduled to half past two this afternoon."* con reference `uk-simon_man`.

| Metrica | Qwen3-TTS (`Qwen3-TTS-12Hz-0.6B-Base`) | VibeVoice (`VibeVoice-1.5B`) |
| :--- | :--- | :--- |
| **Tempo caricamento + 1ª sintesi (cold)** | 36.58 s | 33.50 s |
| **Tempo sintesi successiva (warm)** | 8.10 s | 5.09 s |
| **VRAM Allocata a riposo (post-load)** | 2.06 GB | 7.10 GB |
| **Picco VRAM durante sintesi** | 2.95 GB | 8.03 GB |
| **Sample Rate audio generato** | 24,000 Hz | 24,000 Hz |
| **Canali audio** | 1 (Mono) | 1 (Mono) |
| **Durata audio generato** | 10.08 s | 5.07 s |
| **Integrità WAV** | Valido (16-bit PCM, 483,884 bytes) | Valido (16-bit PCM, 243,244 bytes) |
| **Pulizia VRAM post-test** | Completata con successo (0 GB alloc) | Completata con successo (0 GB alloc) |

---

## 4. Preservazione del Worktree

Le modifiche preesistenti dell'utente sono intatte (`git status --short`):
- `D .claude/settings.local.json`
- `D CLAUDE.md`
- `?? AGENTS.md`
- `?? PLANNING.md`
- `?? TASKS.md` (aggiornata checklist Fase 0)
- `?? docs/PLANNING-emotion-tagging.md`

Tutti i requisiti della **Fase 0** sono pienamente soddisfatti e registrati in [TASKS.md](file:///f:/nispa-voiceover/TASKS.md#L27-L36).
