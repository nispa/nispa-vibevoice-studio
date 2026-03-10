# User Guide - Nispa VibeVoice Studio

Welcome to **Nispa VibeVoice Studio**. This guide will walk you through the steps to use all the program's features to generate high-quality synthesized voices.

---

## 1. Installation and Quick Start

### Installation
Ensure you have **Python 3.11+**, **Node.js**, and **Git** installed.
- **Windows**: Double-click `install.bat`.
- **Linux/Mac**: Open a terminal and run `chmod +x install.sh && ./install.sh`.

### Startup
- **Windows**: Run `start.bat`.
- **Linux/Mac**: Run `./start.sh`.
The program will automatically open your browser at `http://localhost:5173/`.

---

## 2. Initial Configuration (Models and Voices)

### Downloading Models
Before starting, you must download a VibeVoice model from Hugging Face (links are in `README.md`) and place it in the `data/model/` directory.
*Example: `data/model/VibeVoice-1.5B/`.*

### Adding Custom Voices (Cloning)
To clone a specific voice:
1. Prepare a **WAV** audio file of about 10-20 seconds of the target person speaking (clear, no background music).
2. Copy the file to the `data/voices/` folder.
3. Rename it following the standard: `language-name_gender.wav` (e.g., `en-john_man.wav`).

### Translation Service Setup (Ollama)
To enable offline translation:
1. Install **Ollama** from the official website ([ollama.com](https://ollama.com/)).
2. Open your terminal and download the recommended translation model:
   ```bash
   ollama run huihui_ai/hy-mt1.5-abliterated:7B
   ```
3. Ensure Ollama is running while using the Studio.

---

## 3. Workflow: Subtitle Mode

> **💡 CRITICAL HINT: From Transcription to Translation**
> If you are working on a transcription (original .srt file) and wish to translate it, the most critical step is **Grouping**.
> Original subtitles are often split into very short segments for on-screen reading; if translated and synthesized as-is, the voice will sound robotic and fragmented.
> **It is essential** to use the "Group" function after translation to merge segments into complete sentences: this allows the AI to generate fluid and natural intonation.

This mode is ideal for creating voiceovers synchronized with existing video.

1. **Upload**: Drag a `.srt` or `.vtt` file into the upload area.
2. **Editing**: You can modify the text of each segment directly in the table.
3. **Translation (Optional)**:
   - If **Ollama** is active, click "Translate".
   - Choose the target language and AI model (e.g., `hy-mt1.5-abliterated`).
   - The system will translate segments line-by-line while maintaining original timing.
4. **Grouping**: Use the "Group" feature to join short segments into natural sentences, avoiding robotic pauses between subtitles.
5. **Generation**: Click **Generate Audio**. The system will process each segment and align them temporally to prevent overlaps.

---

## 4. Workflow: Script Mode (Free Text)

Ideal for audiobooks, podcasts, or simple narrations with multiple characters.

1. **Input**: Type or paste your text into the main area.
   - **Multi-Speaker Syntax**: To use different voices, start each line with a speaker label followed by a colon.
   - **Example**:
     ```text
     Speaker1: Hello, how are you today?
     Speaker2: I am doing great, thank you for asking!
     Speaker1: That is wonderful to hear.
     ```
2. **Configuration**: 
   - Choose the **VibeVoice-1.5B** or **VibeVoice-Large** model (these support up to **4 speakers**).
   - *Note*: The **VibeVoice-0.5B** (Streaming) model only supports **1 speaker**.
   - In the **Speaker Voice Mapping** panel, assign a different voice for each speaker detected in your script (Speaker1, Speaker2, etc.).
3. **Generation**: Click **Generate**. You will see the real-time log informing you which part of the text is being synthesized.

---

## 5. Voice Selection and Settings

In the side panel (Voice Settings):
- **Speaker Profile**: Choose from default voices or those you uploaded to `data/voices/`.
- **Filters**: Filter voices by language, gender, or accent.
- **Audio Format**: Choose between **WAV** (max quality) or **MP3** (smaller files).

---

## 6. Monitoring and Management

### Operation Details
During generation, click the **"Processing..."** or **"Operation Details"** button to open a modal with technical logs. If necessary, you can cancel the operation and choose to download only the audio generated up to that point.

### Job Archive
All your projects are saved automatically:
- Click the archive icon to recover a previous session.
- You can save "Drafts" to resume work later with all texts and settings preserved.

### Hardware Dashboard
At the bottom right, you can monitor your **GPU (VRAM)** and **RAM** usage. This is useful for understanding if the chosen model is too heavy for your computer.

---

## 7. Final Results
All generated audio files are automatically saved in the `data/outputs/` folder with a filename including the date and time, ensuring you never lose your work.
