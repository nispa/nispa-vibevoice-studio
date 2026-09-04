#!/usr/bin/env python3
"""
UK Dialogue Benchmark Runner: Qwen3-TTS vs OmniVoice
Evaluates inference speed, RTF, VRAM utilization, and audio generation
across representative UK English dialogue categories and voices.
Strictly offline and local.
"""
import argparse
import io
import json
import math
import os
import sys
import time
from pathlib import Path
from typing import Dict, List, Any

# Ensure backend root is in sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Enforce strict offline execution
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"

import torch
import soundfile as sf
from core.tts_provider import tts_engine
from core.tts.catalog import resolve_model_capabilities, list_supported_models


DEFAULT_VOICES = [
    "uk-simon_man",
    "uk-etj_man",
    "uk-kate_woman",
    "uk-lucy_woman",
    "uk-patricia_woman",
]

DEFAULT_MODELS = [
    "qwen3-0.6b-base",
    "omnivoice-0.2",
]


def analyze_audio_bytes(wav_bytes: bytes) -> Dict[str, Any]:
    """Analyzes WAV audio bytes for duration, sample rate, and signal validity."""
    with io.BytesIO(wav_bytes) as buf:
        data, sr = sf.read(buf, dtype="float32")
    
    if data.ndim > 1:
        data = data[:, 0]  # mono
    
    duration = len(data) / float(sr) if sr > 0 else 0.0
    peak = float(abs(data).max()) if len(data) > 0 else 0.0
    rms = float(math.sqrt((data ** 2).mean())) if len(data) > 0 else 0.0
    is_silent = bool(peak < 1e-4)
    has_nan = bool(math.isnan(peak) or math.isnan(rms))

    return {
        "sample_rate": sr,
        "duration_sec": round(duration, 3),
        "peak_amplitude": round(peak, 4),
        "rms_amplitude": round(rms, 4),
        "is_silent": is_silent,
        "has_nan": has_nan,
        "samples_count": len(data),
    }


def main():
    parser = argparse.ArgumentParser(description="Run UK dialogue benchmark comparing Qwen vs OmniVoice")
    parser.add_argument(
        "--manifest",
        type=str,
        default=str(BACKEND_DIR / "benchmarks" / "uk_dialogue_manifest.json"),
        help="Path to manifest JSON file",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=str(PROJECT_ROOT / "data" / "benchmark"),
        help="Path to store benchmark outputs and reports",
    )
    parser.add_argument(
        "--models",
        nargs="+",
        default=DEFAULT_MODELS,
        help=f"Models to evaluate (default: {' '.join(DEFAULT_MODELS)})",
    )
    parser.add_argument(
        "--voices",
        nargs="+",
        default=DEFAULT_VOICES,
        help=f"Voice IDs to use for cloning (default: {' '.join(DEFAULT_VOICES)})",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit number of manifest items to evaluate (for dry-runs / fast testing)",
    )
    parser.add_argument(
        "--device",
        type=str,
        default="cuda:0" if torch.cuda.is_available() else "cpu",
        help="Device to use (e.g. cuda:0, cpu)",
    )

    args = parser.parse_args()

    manifest_path = Path(args.manifest)
    if not manifest_path.is_file():
        print(f"[Error] Manifest file not found: {manifest_path}", file=sys.stderr)
        sys.exit(1)

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest: List[Dict[str, Any]] = json.load(f)

    if args.limit and args.limit > 0:
        manifest = manifest[:args.limit]

    output_dir = Path(args.output_dir)
    audio_output_dir = output_dir / "audio"
    audio_output_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 80)
    print(" " * 20 + "NISPA VOICEOVER — UK DIALOGUE BENCHMARK")
    print("=" * 80)
    print(f"Device:            {args.device}")
    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        print(f"GPU:               {gpu_name} ({vram_gb:.2f} GB)")
    print(f"Manifest items:    {len(manifest)}")
    print(f"Models to test:    {args.models}")
    print(f"Voices to test:    {args.voices}")
    print(f"Output directory:  {output_dir}")
    print("=" * 80)

    all_results: Dict[str, Any] = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "device": args.device,
        "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "None",
        "models_evaluated": args.models,
        "voices_used": args.voices,
        "manifest_count": len(manifest),
        "results_by_model": {},
    }

    for model_id in args.models:
        print(f"\n>>> [MODEL: {model_id}] Starting evaluation...")
        
        # Reset CUDA memory stats
        if torch.cuda.is_available():
            torch.cuda.reset_peak_memory_stats()
            torch.cuda.empty_cache()

        # Warm-up / Load phase measurement
        load_start = time.perf_counter()
        try:
            caps = resolve_model_capabilities(model_id)
            print(f"    Provider: {caps.provider_id} | Execution: {caps.execution}")
        except Exception as e:
            print(f"    [Error] Unable to resolve model {model_id}: {e}")
            continue

        model_results: List[Dict[str, Any]] = []
        failures = 0
        total_audio_sec = 0.0
        total_inference_sec = 0.0
        peak_vram_bytes = 0

        # We test each manifest item with round-robin voices across items
        # ensuring all voices are covered evenly.
        for idx, item in enumerate(manifest, 1):
            voice_id = args.voices[(idx - 1) % len(args.voices)]
            item_id = item["id"]
            text = item["text"]
            category = item.get("category", "")

            print(f"  [{idx}/{len(manifest)}] ({voice_id}) \"{text[:45]}...\"", end="", flush=True)

            t0 = time.perf_counter()
            try:
                wav_bytes = tts_engine.synthesize(
                    text=text,
                    model_name=model_id,
                    voice_id=voice_id,
                    language="en",
                    skip_cleanup=True,
                )
                t_infer = time.perf_counter() - t0
                
                audio_meta = analyze_audio_bytes(wav_bytes)
                duration = audio_meta["duration_sec"]
                rtf = t_infer / duration if duration > 0 else 0.0

                # Check VRAM
                cur_vram = torch.cuda.max_memory_allocated() if torch.cuda.is_available() else 0
                if cur_vram > peak_vram_bytes:
                    peak_vram_bytes = cur_vram

                # Save generated audio
                voice_audio_dir = audio_output_dir / model_id / voice_id
                voice_audio_dir.mkdir(parents=True, exist_ok=True)
                audio_file = voice_audio_dir / f"{item_id}.wav"
                with open(audio_file, "wb") as af:
                    af.write(wav_bytes)

                total_audio_sec += duration
                total_inference_sec += t_infer

                record = {
                    "item_id": item_id,
                    "category": category,
                    "voice_id": voice_id,
                    "text": text,
                    "inference_sec": round(t_infer, 3),
                    "audio_duration_sec": duration,
                    "rtf": round(rtf, 3),
                    "audio_file": str(audio_file.relative_to(PROJECT_ROOT)),
                    "peak_amplitude": audio_meta["peak_amplitude"],
                    "is_silent": audio_meta["is_silent"],
                    "status": "success",
                }
                model_results.append(record)
                print(f" -> {duration:.1f}s audio in {t_infer:.2f}s (RTF: {rtf:.2f})")

            except Exception as ex:
                t_infer = time.perf_counter() - t0
                failures += 1
                print(f" -> FAILED: {ex}")
                model_results.append({
                    "item_id": item_id,
                    "category": category,
                    "voice_id": voice_id,
                    "text": text,
                    "inference_sec": round(t_infer, 3),
                    "status": f"failed: {str(ex)}",
                })

        # Summary for this model
        vram_mb = peak_vram_bytes / (1024 * 1024)
        avg_rtf = (total_inference_sec / total_audio_sec) if total_audio_sec > 0 else 0.0
        all_results["results_by_model"][model_id] = {
            "total_items": len(manifest),
            "successful_items": len(manifest) - failures,
            "failed_items": failures,
            "total_audio_duration_sec": round(total_audio_sec, 2),
            "total_inference_time_sec": round(total_inference_sec, 2),
            "average_rtf": round(avg_rtf, 3),
            "peak_vram_mb": round(vram_mb, 1),
            "details": model_results,
        }

        print(f"\n--- [Summary: {model_id}] ---")
        print(f"  Success:     {len(manifest) - failures}/{len(manifest)}")
        print(f"  Total audio: {total_audio_sec:.2f}s")
        print(f"  Total time:  {total_inference_sec:.2f}s")
        print(f"  Average RTF: {avg_rtf:.3f} (lower is faster)")
        print(f"  Peak VRAM:   {vram_mb:.1f} MB")

        # Clean VRAM after model run
        print(f"  Cleaning VRAM...")
        tts_engine.clean_vram()

    # Save complete report
    report_file = output_dir / "benchmark_results.json"
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)
    print(f"\n[OK] Benchmark completed. Detailed results saved to:\n     {report_file}")

    # Comparative Table
    print("\n" + "=" * 80)
    print(f"{'Model ID':<26} | {'Items':<7} | {'Avg RTF':<9} | {'Peak VRAM':<11} | {'Total Time':<11} | {'Status'}")
    print("-" * 80)
    for mid, mdata in all_results["results_by_model"].items():
        status = "OK" if mdata["failed_items"] == 0 else f"{mdata['failed_items']} errors"
        print(
            f"{mid:<26} | "
            f"{mdata['successful_items']}/{mdata['total_items']:<4} | "
            f"{mdata['average_rtf']:<9.3f} | "
            f"{mdata['peak_vram_mb']:>7.1f} MB | "
            f"{mdata['total_inference_time_sec']:>9.2f} s | "
            f"{status}"
        )
    print("=" * 80)


if __name__ == "__main__":
    main()
