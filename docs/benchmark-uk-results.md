# Risultati Benchmark English-UK & Preset Consigliati

> Data: 2026-09-04  
> Piattaforma di test: NVIDIA RTX 4500 Ada Generation (24 GB VRAM), Windows 11, PyTorch 2.10.0+cu130.  
> Voci britanniche impiegate: `uk-simon_man`, `uk-etj_man`, `uk-kate_woman`, `uk-lucy_woman`, `uk-patricia_woman` (voci UK autorizzate con trascrizione verificata in `data/voices/`).

---

## 1. Sintesi dei Risultati Tecnici ed Empirici

### OmniVoice (0.2.x via local worker)
- **Velocità & Real-Time Factor (RTF)**: **RTF ~0.53** (warm), oltre **2 volte più veloce del tempo reale** (es. 4.8 secondi di audio sintetizzati in soli 2.54 secondi).
- **Tempo di warm-up iniziale**: ~9 secondi (avvio worker locale su loopback, caricamento pesi 3.04 GB e generazione biometrica del `VoiceClonePrompt`).
- **Occupazione VRAM**: Estremamente contenuta (~3.0 - 3.3 GB complessivi).
- **Qualità percettiva UK**: Ottima resa sui dialoghi britannici, naturalezza dell'intonazione e rispetto delle pause e del ritmo conversazionale.
- **Requisiti mandatori**: Richiede sia il reference audio WAV sia la trascrizione testuale `.txt` per generare il prompt vocale clonato.

### Qwen3-TTS (0.6B vs 1.7B Base)
- **Modello 0.6B Base**: Scartato per la produzione. Sebbene più leggero, presenta una prosodia meno ricca e tempi di inferenza su GPU inferiori rispetto al modello superiore.
- **Modello 1.7B Base (`qwen3-1.7b-base`)**: È il modello di riferimento per Qwen in produzione. Garantisce altissima fedeltà espressiva, ampia gamma dinamica e supporta il voice cloning anche in assenza di trascrizione (modalità x-vector pura).
- **Latenza & RTF**: RTF tipico ~2.0 - 3.5 (più lento di OmniVoice su singola battuta, ma con grande profondità armonica).

---

## 2. Preset Consigliati

In base alle evidenze del benchmark e alla valutazione percettiva diretta:

| Scenario d'Uso | Modello Raccomandato | Motivazione & Caratteristiche |
| :--- | :--- | :--- |
| **English-UK — Dialogo Rapido & Iterazione Veloce** | **OmniVoice** | Velocità imbattibile (RTF < 0.6), cadenza UK naturale e ottima alternanza tra speaker in Script Mode. |
| **Massima Espressività & Dinamica Recitata** | **Qwen3-TTS 1.7B Base** | Ricchezza timbrica superiore, sfumature emotive complesse e gestione autonoma delle pause. |
| **Cloning senza Trascrizione (x-vector)** | **Qwen3-TTS 1.7B Base** | Selezionabile quando si dispone solo del WAV della voce reference senza il file `.txt`. |
| **Sottotitoli con Timing Multi-Speaker Nativo** | **VibeVoice 1.5B / 7B** | Gestione contestuale multi-voce sincronizzata (fino a 4 speaker). |

---

## 3. Considerazioni di Riservatezza e Dati Biometrici
- Tutte le sintesi e i reference sono rimasti rigorosamente sul dispositivo locale (`127.0.0.1`).
- Le cache biometriche `VoiceClonePrompt` (.pt) salvate in `data/voice-prompts/omnivoice/` sono escluse da Git e legate all'hash crittografico di audio e trascrizione.
