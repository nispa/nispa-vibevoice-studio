# User Guide — Nispa VibeVoice Studio (v0.8.1)

> This guide assumes the application is already installed and running. For installation, refer to `README.md`.
>
> Open your browser at `http://localhost:5173/` after running `start.bat` (Windows) or `./start.sh` (macOS/Linux).

---

## Interface Overview

At the top of the app you will find the title bar with two icons in the top-right corner:
- **Microphone** — opens the **Voice Library** to manage voice reference files
- **Gear** — opens **Settings & Maintenance**

Below the title bar, the mode toggle lets you choose between the two main workflows:

| Mode | Description | Accepted files |
|------|-------------|----------------|
| **Timed Subtitles** | Voiceover synchronized to subtitle timestamps | `.srt`, `.vtt` |
| **Untimed Script** | Free-form voiceover from a multi-speaker dialogue with no timing | `.txt`, `.md` |

---

## Timed Subtitles Mode

Use this mode when you have a `.srt` or `.vtt` file and want to generate audio that exactly matches the original subtitle timecodes. The final output will be a single audio file, frame-accurately aligned to the original.

The workflow is split into three visible steps on the page.

---

### Step 1 — Input Source

**Upload a subtitle file** by dragging it onto the upload area or clicking it. `.srt` and `.vtt` are accepted.

Alternatively, **resume a previous job** from the **"Or Load from Archive"** panel on the right. Each row shows the filename, voice, model, and a status badge:
- **DRAFT** — saved but not yet generated
- **COMPLETED** — generation finished
- **AUDIO SAVED** (green) — segment audio files are available on disk
- **TRANSLATED** — subtitles have been translated
- **GROUPED** — intelligent grouping has been applied

To load a job, click the **purple icon** on the corresponding row. To delete it, use the **red icon**. Once a job is loaded from the archive, the upload area is disabled — use **"Clear / Reset"** (top-right of the section) to start fresh.

---

### Step 2 — Refining & Translation

Click the section title to expand or collapse it.

#### Intelligent Grouping

`.srt` files often split a single sentence across multiple consecutive lines. Synthesizing each line individually produces choppy, unnatural audio — the TTS model has no context for the full sentence.

Enable the **"Intelligent Grouping"** checkbox to automatically merge segments that end mid-sentence. The system only merges where there is no terminal punctuation (`.`, `!`, `?`), preserving the structure of the dialogue.

> **Recommendation:** always enable grouping before generating. The quality difference on spoken or narrative text is significant.

Click **"Preview Subtitles"** to see the result before committing. The modal shows:
- how many original segments exist and how many remain after grouping
- each segment with its timecode and duration

If the result looks correct, click **"Use as Input"** to adopt it as the working base. If you want to export the grouped file for use elsewhere, click **"Export SRT"**.

#### Saving as Draft

At any point, click **"Save as Draft"** to save the current state to the archive (file, voice, model, modified segments). You can reopen it in a future session without reloading the file.

> **Important:** save as draft before starting long generation runs — it allows you to resume from the archive if anything goes wrong.

#### Manual Subtitle Editing

Click **"Edit Subtitles"** to open the text editor. You can:
- edit the text of each segment
- correct start/end timestamps
- add or delete segments
- navigate between pages (10 segments per page)

Click **"Save Subtitles"** to apply your changes. Edits are non-destructive — the original file is never overwritten.

#### AI Translation (Optional)

To translate the subtitles before synthesis:

1. Select a **translation model** (built-in NLLB-200 or a local Ollama model)
2. Set the **source** and **target** languages
3. Click **"Translate Subtitles"**

Translation runs entirely offline. During the process you can click **"Pause"** to suspend it. When complete, a **"Ready"** badge appears along with **"Edit Translate"** (to correct the output) and **"Save as Draft Translated"** (to save the translated state).

> **Recommendation:** apply grouping *before* translating — translation models produce more coherent output on complete sentences.

---

### Step 3 — Voice Selection & Synthesis

#### Configuration

Before generating, set:

- **Voice Selection** — the reference voice to use for cloning. Available voices come from your `data/voices/` folder. If none are listed, add one via the Voice Library (microphone icon at the top).
- **TTS Model** — the local model to use. Larger models produce higher quality but require more VRAM and time.
- **Generation Language** — the primary language of the text (Italian, English, etc.).
- **Output Format** — `MP3` or `WAV` for the final file.
- **Voice Design** (on supported models only) — a text description of the voice you want, e.g. *"a deep, warm male voice with a calm tone"*.

#### Starting Generation

Click **"Generate Voice-over"**. The job is automatically saved to the archive before generation begins.

During generation:
- the progress bar shows completion percentage and estimated time remaining
- the counter `{N}/{Total}` shows completed segments
- click **"Dettagli Operazione"** to open the real-time technical log

**You can stop generation at any time.** Each audio segment is saved to disk the moment it is generated — if you stop, all audio produced up to that point is safe in the archive and fully recoverable.

> **Disk space:** each WAV segment is roughly 0.5–2 MB. A 100-segment job can use 50–200 MB in `data/audio-rendering/`. Check that you have enough free space before starting very long jobs. You can monitor and free space from the **Maintenance** tab in Settings.

---

### Audio Review & Finalization

When generation completes (or is stopped), the green **"Review Audio (N)"** button appears, showing the number of generated segments. Click it to open the review gallery.

#### Review Gallery

The gallery shows segments paginated 10 per page. Use the **"Showing: Generated Only / All Segments"** toggle to filter the view.

For each segment you can:

**Listen** — click the play button on the segment's waveform.

**Regenerate** — click the circular arrows icon next to the segment. The system automatically uses the same voice, model, and language as the original and replaces the file on disk.

**Trim** — click the scissors icon to open the audio trimmer. Move the **Mark-In** and **Mark-Out** sliders to isolate the clean audio, then click **"Apply"**. Use this to remove noise or TTS "hallucinations" at the end of a line.

#### Downloading the Final Voiceover

When you are satisfied with all segments, click **"Download Final Voiceover"**. The system assembles all audio files respecting the original `.srt` timestamps exactly, inserting silence where needed to maintain sync. The file is downloaded in the format you chose (MP3 or WAV).

To return to the editor for further changes before finalizing, click **"Back to Editor"**.

---

## Untimed Script Mode

Use this mode when you have a multi-character script and want to generate a single audio file where each speaker uses a different voice, with no timing constraints. All supported engines (OmniVoice, Qwen, and VibeVoice) can be used.

### Script Format & Auto-Save

The script must follow this format:
```
SpeakerName1: Line of dialogue.
SpeakerName2: Another character's response.
SpeakerName1: Another line.
```

Upload a `.txt` or `.md` file via the upload area, or paste the text directly into the textarea.

- **Local Draft Auto-Save**: Any script text, speaker list, model selection, or voice mappings are continuously auto-saved to your browser's local storage (`nispa_script_draft_v1`). If you reload or close the tab, your work is restored automatically.
- **Clear Draft**: Click the "Clear" button at the bottom right of the input area to reset the text and speaker mappings.
- **Dedicated Script Archive**: Click the **"Script Archive"** button at the top of Step 1 to open previous untimed script generations. From this modal you can preview combined dialogue audio, check speaker metadata, delete old jobs, or click **"Load into Editor"** to restore the entire script and voice assignments back into the active workspace. Script jobs are isolated and never mixed with timed subtitle jobs.

---

### Step 2 — Speaker Voice Mapping

After loading or pasting the script, speakers (up to 8) are detected automatically. For each speaker, select a voice from the dropdown.

- **"Add Speaker"** — manually adds a speaker entry (maximum 8 speakers)
- **X icon** next to a speaker — removes it from the map

---

### Step 3 — Model & Final Synthesis

Configure the model, language, and (if available) the Voice Design description, then click **"Generate Conversation"**.

A progress window opens automatically during generation. If you close it while generation is still running, the system asks:
- **"Cancel Generation"** — stop completely
- **"Run in Background"** — close the window but keep generation running
- **"Keep Open"** — leave the window open

When complete, the generated script job is automatically persisted in the database and saved to the **Script Archive**, and the audio player appears with the result.

---

## Voice Library

Click the microphone icon in the top-right to open the Voice Library. From here you can:

- **Upload a new voice** — upload a WAV or MP3 file of at least 3 seconds as a cloning reference. Assign it an ID (e.g. `en-alice`).
- **Add a transcription** — for Qwen3 cloning, providing the text transcription of the reference audio significantly improves clone quality.
- **Reprocess a voice** — applies noise reduction and normalization to an existing voice file.
- **Delete a voice** — removes the file from the library.

---

## Settings & Maintenance

Open with the gear icon in the top-right. It has three tabs:

### System Info
Shows hardware information: GPU name, available VRAM, CUDA version (or MPS on Mac), and system RAM.

### Generation
- **GPU Devices** — if you have multiple NVIDIA GPUs, you can enable or disable individual devices. Work is distributed proportionally to each GPU's free VRAM.
- **Batch Size per Model** — the system automatically calculates how many segments to process in parallel based on available VRAM. You can override this with a fixed number by entering a value and clicking **"Save"**. Click **"Reset"** to return to automatic calculation.

> On macOS (Apple Silicon), batch size is always 1 — unified memory does not allow the dynamic VRAM query used on CUDA.

### Maintenance
- **VACUUM Database** — compacts the SQLite file and recovers disk space after deletions.
- **Scan for Orphans** — finds audio folders in `data/audio-rendering/` with no corresponding job in the database. Click **"Delete X orphans"** to remove them and free space.

---

## Quick FAQ

**Generation stopped halfway — did I lose my work?**
No. Every segment is saved to disk the moment it is generated. Reload the job from the archive (look for the **AUDIO SAVED** badge) and resume from the review gallery.

**The final audio is not aligned with my video.**
Make sure you download via **"Download Final Voiceover"** in the review gallery, not by downloading individual segments. Only the finalization step applies timestamp alignment.

**I'm running out of disk space.**
Go to Settings → Maintenance → **"Scan for Orphans"** to remove orphaned audio folders. You can also delete jobs you no longer need from the archive — this removes the database record but *not* the audio files on disk; run the orphan scan afterwards to clean those up.

**The generated voice sounds choppy or unnatural.**
Enable **"Intelligent Grouping"** before generating. If you already generated without it, apply grouping, save as draft, and generate again.

**"No Voices Found" in the voice selector.**
Add a WAV reference file via the Voice Library (microphone icon) or copy WAV files into the `data/voices/` folder and click the refresh button in the selector.
