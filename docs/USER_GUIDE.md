# User Guide — Nispa VibeVoice Studio (v0.9.0)

> This guide assumes the application is already installed and running. For installation instructions, see [README.md](../README.md). For detailed configuration options and hardware tuning, see the [Settings & Configuration Guide](SETTINGS_GUIDE.md).
>
> Open your browser at `http://localhost:5173/` after running `start.bat` (Windows) or `./start.sh` (macOS/Linux).

---

## Interface Overview

At the top of the app, you will find the title bar with three manager icons in the top-right corner:
- **Layers** — opens the **Models & Engines Manager** to download, inspect, and delete AI models.
- **Microphone** — opens the **Voice Library** to manage voice reference files and transcripts.
- **Gear** — opens **Settings & Maintenance** to tune GPU batch sizes, multi-GPU setup, and disk cleanup.

Below the title bar, the mode toggle lets you choose between the two main workflows:

| Mode | Description | Accepted Files |
|------|-------------|----------------|
| **Timed Subtitles** | Voiceover synchronized to subtitle timestamps | `.srt`, `.vtt` |
| **Untimed Script** | Free-form multi-speaker dialogue voiceover with no timing constraints | `.txt`, `.md` |

---

## 1. Models & Engines Manager

Click the **Layers** icon in the header to open the Models Manager. From this modal you can:
- **Browse the Model Catalog**: Inspect all supported models across the 4 TTS engines (Higgs Audio v3, OmniVoice, Qwen3-TTS, VibeVoice) and NLLB-200 translation.
- **Filter Models**: Filter by status (*All*, *Installed*, *Downloadable*) or engine type.
- **Download Models**: Click **"Download"** to initiate a non-blocking background download with a real-time progress bar, speed meter (MB/s), and download cancellation support.
- **Disk Footprint**: See both expected download size and actual verified disk usage.
- **Delete Models**: Safely delete installed model weights to free up disk space.
- **System Health Diagnostics**: Switch to the **System Health** view to inspect real-time GPU VRAM headroom, tool availability (FFmpeg, SoX), and worker process status.

---

## 2. Timed Subtitles Mode

Use this mode when you have an `.srt` or `.vtt` file and want to generate audio that exactly matches the original subtitle timecodes.

### Step 1 — Input Source
- **Upload a subtitle file** by dragging it onto the drop zone or clicking it.
- Alternatively, **resume a previous job** from the **"Or Load from Archive"** panel on the right. Status badges indicate whether a job is a `DRAFT`, `COMPLETED`, `AUDIO SAVED` (WAV files present on disk), `TRANSLATED`, or `GROUPED`.

### Step 2 — Refining & Translation
- **Intelligent Grouping**: Merges consecutive subtitle segments that end mid-sentence, preventing choppy and unnatural synthesis. Always recommended before generating. Click **"Preview Subtitles"** to review the merged lines.
- **Save as Draft**: Persists your working subtitles, voice choices, and model configuration to the database.
- **Manual Editing**: Click **"Edit Subtitles"** to edit line text, tweak timestamps, or add/delete segments.
- **AI Translation**: Translate lines offline via built-in NLLB-200 or via your local Ollama instance.

### Step 3 — Voice Selection & Synthesis
- **Voice Selection**: Select a voice reference from your library.
- **TTS Model**: Choose the installed model best suited to your hardware and quality requirements.
- **Output Format**: Choose `MP3` or `WAV`.
- **Generate Voice-over**: Starts dynamic background synthesis with real-time SSE progress tracking.

### Audio Review & Finalization
- Click **"Review Audio"** to open the paginated audio gallery.
- **Listen**: Audition individual segment audio waveforms.
- **Regenerate**: Surgically re-synthesize any line using its original voice, model, and language.
- **Trim**: Use the visual audio trimmer (Mark-In / Mark-Out) to remove trailing silence or hallucinated tokens.
- **Download Final Voiceover**: Assembles all segments into a single file with exact original subtitle timestamp alignment.

---

## 3. Untimed Script Mode

Use this mode for narrative dialogues, podcasts, audiobooks, and multi-speaker conversations without timing constraints.

### 3.1. Script Format & Local Draft Auto-Save
Format your text with speaker tags:
```text
Alice: Welcome back to the podcast.
Bob: Great to be here, Alice.
Alice: <|style:whispering|>Keep your voice down, they might be listening.
```

- **Continuous Auto-Save**: Any changes to the text area or speaker assignments are saved continuously in your browser's local storage (`nispa_script_draft_v1`). You will never lose your text on page refresh.
- **Script Archive**: Click **"Script Archive"** in Step 1 to review past dialogue generations, listen to previous outputs, or click **"Load into Editor"** to restore a previous script and its voice mappings back into the editor.

### 3.2. Higgs Audio v3 Tag Palette & Emotion Guide
When **Higgs Audio v3** is selected:
- A collapsible **Tag Palette** appears directly above the text box.
- Filter through 45 specialized control tags across 5 categories:
  - **Emotions (21)**: `<|emotion:anger|>`, `<|emotion:sadness|>`, `<|emotion:amusement|>`, `<|emotion:elation|>`, `<|emotion:fear|>`, etc.
  - **Styles (3)**: `<|style:whispering|>`, `<|style:shouting|>`, `<|style:singing|>`
  - **SFX (9)**: `<|sfx:laughter|>`, `<|sfx:sigh|>`, `<|sfx:cough|>`, `<|sfx:crying|>`, etc.
  - **Prosody (10)**: `<|prosody:pause|>`, `<|prosody:speed_fast|>`, `<|prosody:pitch_high|>`, etc.
  - **Environment (2)**: `<|env:music|>`, `<|env:noise|>`
- Click any tag to insert it at your current cursor position.
- Click the **"Guida Sintassi & Emozioni"** button to open the interactive guide modal explaining tag conditioning and syntax rules.

### 3.3. OmniVoice: Non-Verbal Tags & CMU Phonetics
When **OmniVoice** is selected:
- **Non-Verbal Paralinguistic Tags**: Insert expressive vocalizations using square brackets (`[laughter]`, `[sigh]`, `[confirmation-en]`, `[surprise-oh]`, etc.).
- **CMU ARPAbet Phonetics**: Force exact pronunciation of ambiguous English words or heteronyms using uppercase phonemes with stress markers (e.g., `[B EY1 S]`).
- See [CMU Phonetics Guide](GUIDA_FONETICA_CMU.md) for the complete phoneme reference table and usage rules.

### 3.4. Speaker Voice Mapping
- The system automatically detects up to 8 distinct speakers.
- Assign each speaker their own voice reference file from your library.
- Click **"Generate Conversation"** to synthesize the full dialogue.

---

## 4. Voice Reference Requirements by Engine

| Engine | Audio Reference | Reference Transcript (`.txt`) | Notes |
|--------|:---------------:|:-----------------------------:|-------|
| **Higgs Audio v3** | Required (WAV) | Optional | Uses reference acoustic embeddings; supports inline tag control |
| **OmniVoice** | Required (WAV) | **Required** | Produces high-fidelity cached biometric prompts (`VoiceClonePrompt`) |
| **Qwen3-TTS** | Required (3s+ WAV) | Optional | Providing a transcript significantly improves clone fidelity |
| **VibeVoice** | Required (WAV) | Not used | Multi-speaker synchronization |

---

## 5. Voice Library

Open via the **Microphone** icon in the header:
- **Upload Voice**: Upload a clean WAV or MP3 audio file (3–10 seconds recommended).
- **Transcriptions**: Add or edit the reference transcript text paired with the voice.
- **Reprocess**: Clean background noise and normalize volume using SoX/FFmpeg.
- **Delete**: Permanently delete unused voice files.

---

## 6. Settings & Maintenance

Open via the **Gear** icon in the header:
- **System Info**: Real-time GPU VRAM, CUDA/MPS platform details, and RAM usage.
- **Generation**: Set per-model batch size overrides and toggle active CUDA devices in multi-GPU setups.
- **Maintenance**: Run SQLite `VACUUM` and scan/purge orphaned audio folders from `data/audio-rendering/`.

For complete configuration details, refer to the [Settings & Configuration Guide](SETTINGS_GUIDE.md).
