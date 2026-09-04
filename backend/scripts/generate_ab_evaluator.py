#!/usr/bin/env python3
"""
Generates a blind A/B listening sheet in HTML for randomized evaluation
between Qwen3-TTS and OmniVoice outputs.
Self-contained, local only, no external CDN dependencies.
"""
import argparse
import json
import random
import sys
from pathlib import Path
from typing import Dict, Any, List

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent


HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Nispa Voiceover — Blind A/B Evaluation (Qwen vs OmniVoice)</title>
<style>
  :root {
    --bg: #0f172a;
    --card: #1e293b;
    --border: #334155;
    --text: #f8fafc;
    --muted: #94a3b8;
    --primary: #38bdf8;
    --accent: #818cf8;
    --success: #34d399;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background-color: var(--bg);
    color: var(--text);
    margin: 0;
    padding: 24px;
    line-height: 1.5;
  }
  .container {
    max-width: 960px;
    margin: 0 auto;
  }
  header {
    border-bottom: 1px solid var(--border);
    padding-bottom: 20px;
    margin-bottom: 28px;
  }
  h1 { margin: 0 0 8px 0; font-size: 24px; color: var(--primary); }
  p.subtitle { margin: 0; color: var(--muted); font-size: 14px; }
  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 24px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
  }
  .badge {
    display: inline-block;
    padding: 2px 8px;
    background: #334155;
    color: var(--primary);
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .prompt-box {
    background: #0f172a;
    border-left: 3px solid var(--primary);
    padding: 12px 16px;
    margin: 12px 0;
    border-radius: 0 6px 6px 0;
  }
  .prompt-text {
    font-size: 16px;
    font-weight: 500;
  }
  .target-note {
    font-size: 13px;
    color: var(--muted);
    margin-top: 4px;
  }
  .players-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-top: 16px;
  }
  .player-card {
    background: #182234;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 16px;
  }
  .player-label {
    font-weight: bold;
    font-size: 15px;
    margin-bottom: 8px;
    color: var(--accent);
  }
  audio {
    width: 100%;
    margin-bottom: 12px;
  }
  .rating-group {
    margin-top: 10px;
  }
  .rating-label {
    font-size: 12px;
    color: var(--muted);
    margin-bottom: 4px;
  }
  select {
    width: 100%;
    padding: 6px 10px;
    border-radius: 4px;
    background: #0f172a;
    color: var(--text);
    border: 1px solid var(--border);
  }
  .footer-actions {
    position: sticky;
    bottom: 20px;
    background: var(--card);
    border: 1px solid var(--border);
    padding: 16px 24px;
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
  }
  button {
    background: var(--primary);
    color: #0f172a;
    font-weight: 600;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: opacity 0.2s;
  }
  button:hover { opacity: 0.9; }
  .reveal-tag {
    display: none;
    font-size: 13px;
    font-weight: bold;
    margin-top: 8px;
    padding: 4px 8px;
    border-radius: 4px;
    background: #065f46;
    color: #6ee7b7;
  }
</style>
</head>
<body>
<div class="container">
  <header>
    <h1>Nispa Voiceover — Blind A/B Listening Test</h1>
    <p class="subtitle">Randomized blind comparison between Qwen3-TTS and OmniVoice on UK English dialogue.</p>
  </header>

  <form id="evalForm">
    <!-- ITEMS_PLACEHOLDER -->
  </form>

  <div class="footer-actions">
    <div id="statsSummary" style="font-size: 14px; color: var(--muted);">
      Listen to both samples, rate quality, then reveal identities.
    </div>
    <button type="button" onclick="revealIdentities()">Reveal Models & Summary</button>
  </div>
</div>

<script>
function revealIdentities() {
  const tags = document.querySelectorAll('.reveal-tag');
  tags.forEach(t => t.style.display = 'inline-block');
  document.getElementById('statsSummary').innerHTML = '<span style="color: var(--success); font-weight: bold;">Identities revealed! Check model labels above.</span>';
}
</script>
</body>
</html>
"""


def main():
    parser = argparse.ArgumentParser(description="Generate blind A/B evaluation HTML sheet")
    parser.add_argument(
        "--results",
        type=str,
        default=str(PROJECT_ROOT / "data" / "benchmark" / "benchmark_results.json"),
        help="Path to benchmark_results.json",
    )
    parser.add_argument(
        "--manifest",
        type=str,
        default=str(BACKEND_DIR / "benchmarks" / "uk_dialogue_manifest.json"),
        help="Path to manifest JSON",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=str(PROJECT_ROOT / "data" / "benchmark" / "ab_listening_sheet.html"),
        help="Path to output HTML file",
    )

    args = parser.parse_args()

    results_path = Path(args.results)
    if not results_path.is_file():
        print(f"[Error] Results not found: {results_path}. Run benchmark first.", file=sys.stderr)
        sys.exit(1)

    with open(results_path, "r", encoding="utf-8") as f:
        results = json.load(f)

    with open(args.manifest, "r", encoding="utf-8") as f:
        manifest_items = {item["id"]: item for item in json.load(f)}

    models = results.get("models_evaluated", [])
    if len(models) < 2:
        print("[Error] Need at least 2 models for A/B comparison.", file=sys.stderr)
        sys.exit(1)

    m1, m2 = models[0], models[1]
    m1_details = {d["item_id"]: d for d in results["results_by_model"][m1]["details"] if d["status"] == "success"}
    m2_details = {d["item_id"]: d for d in results["results_by_model"][m2]["details"] if d["status"] == "success"}

    common_item_ids = [iid for iid in manifest_items.keys() if iid in m1_details and iid in m2_details]

    html_items = []
    keys_map = {}

    rng = random.Random(42)  # Deterministic seed for sheet reproducibility

    for idx, iid in enumerate(common_item_ids, 1):
        item_meta = manifest_items[iid]
        d1 = m1_details[iid]
        d2 = m2_details[iid]

        # Randomize A vs B
        flip = rng.choice([True, False])
        a_model = m1 if flip else m2
        b_model = m2 if flip else m1
        a_audio = d1["audio_file"] if flip else d2["audio_file"]
        b_audio = d2["audio_file"] if flip else d1["audio_file"]
        a_voice = d1["voice_id"] if flip else d2["voice_id"]
        b_voice = d2["voice_id"] if flip else d1["voice_id"]

        keys_map[iid] = {"Audio A": a_model, "Audio B": b_model}

        card_html = f"""
    <div class="card">
      <div class="badge">{idx}. {item_meta.get('category', 'Dialogue')} &bull; Voice: {a_voice}</div>
      <div class="prompt-box">
        <div class="prompt-text">"{item_meta['text']}"</div>
        <div class="target-note">Focus: {item_meta.get('target_aspect', '')}</div>
      </div>
      <div class="players-grid">
        <div class="player-card">
          <div class="player-label">Sample A</div>
          <audio controls src="../../{a_audio}"></audio>
          <div class="rating-group">
            <div class="rating-label">Naturalness & British Accent:</div>
            <select>
              <option value="5">5 — Excellent / Indistinguishable native</option>
              <option value="4">4 — Good / Convincing with minor flaws</option>
              <option value="3" selected>3 — Acceptable / Understandable</option>
              <option value="2">2 — Poor / Robotic or wrong inflection</option>
              <option value="1">1 — Bad / Severe artifact or unconvincing</option>
            </select>
          </div>
          <div class="reveal-tag">Model: {a_model}</div>
        </div>
        <div class="player-card">
          <div class="player-label">Sample B</div>
          <audio controls src="../../{b_audio}"></audio>
          <div class="rating-group">
            <div class="rating-label">Naturalness & British Accent:</div>
            <select>
              <option value="5">5 — Excellent / Indistinguishable native</option>
              <option value="4">4 — Good / Convincing with minor flaws</option>
              <option value="3" selected>3 — Acceptable / Understandable</option>
              <option value="2">2 — Poor / Robotic or wrong inflection</option>
              <option value="1">1 — Bad / Severe artifact or unconvincing</option>
            </select>
          </div>
          <div class="reveal-tag">Model: {b_model}</div>
        </div>
      </div>
    </div>
        """
        html_items.append(card_html)

    final_html = HTML_TEMPLATE.replace("<!-- ITEMS_PLACEHOLDER -->", "\n".join(html_items))

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(final_html)

    key_file = out_path.parent / "ab_keys.json"
    with open(key_file, "w", encoding="utf-8") as f:
        json.dump(keys_map, f, indent=2)

    print(f"[OK] Generated blind A/B evaluation sheet:\n     {out_path}")


if __name__ == "__main__":
    main()
