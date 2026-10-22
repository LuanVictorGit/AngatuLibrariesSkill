#!/usr/bin/env python3
"""
Measures the impact point of each sound effect in the public/sfx folder.

An effect aligned by the START of its file arrives late: a whoosh takes hundreds
of ms rising to its peak, and it is the peak that has to land on the cut. This
script measures, for each file, where the anchor is -- the instant that must
coincide with the event on screen -- and writes src/data/sfx.ts.

  impact, pop, click, hit, boom, stamp, glitch  -> start of the attack
  whoosh, swoosh, swipe, whip                   -> energy peak
  riser, reverse                                -> end (the sound dies on the drop)

The category comes from the file-name prefix (whoosh-01.wav, riser-02.wav).
Position of the effect on the timeline = event frame - anchor.

Usage:  python -X utf8 tools/analyze-sfx.py [public/sfx] [--out src/data/sfx.ts]

@author Angatu Sistemas
"""
from __future__ import annotations

import argparse
import json
import subprocess
import tempfile
from pathlib import Path

import librosa
import numpy as np

SR = 22050
HOP = 64  # 2.9 ms
EXTS = {".wav", ".mp3", ".ogg", ".flac", ".m4a", ".aac"}
BY_ONSET = {"impact", "hit", "pop", "click", "boom", "stamp", "glitch", "punch", "thud", "tap"}
BY_PEAK = {"whoosh", "swoosh", "swipe", "whip", "transition", "sweep"}
BY_END = {"riser", "reverse", "uplifter"}


def to_wav(src: Path) -> Path:
    out = Path(tempfile.mkdtemp()) / "sfx.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-ac", "1", "-ar", str(SR), str(out)],
                   check=True)
    return out


def measure(path: Path) -> dict:
    y, _ = librosa.load(to_wav(path), sr=SR, mono=True)
    rms = librosa.feature.rms(y=y, frame_length=256, hop_length=HOP)[0]
    db = 20 * np.log10(rms + 1e-9)
    peak_i = int(np.argmax(db))
    loud = np.where(db >= db[peak_i] - 20.0)[0]   # up to 20 dB below the peak
    tail = np.where(db >= db[peak_i] - 30.0)[0]   # up to 30 dB below the peak
    ms = lambda i: int(round(i * HOP / SR * 1000))
    category = path.stem.split("-")[0].lower()
    onset_ms, peak_ms, end_ms = ms(loud[0]), ms(peak_i), ms(tail[-1])
    if category in BY_END:
        anchor, rule = end_ms, "end"
    elif category in BY_PEAK:
        anchor, rule = peak_ms, "peak"
    elif category in BY_ONSET:
        anchor, rule = onset_ms, "onset"
    else:
        anchor, rule = peak_ms, "peak (unknown category: check it)"
    return {
        "file": path.as_posix(),
        "category": category,
        "durationMs": int(round(len(y) / SR * 1000)),
        "onsetMs": onset_ms,
        "peakMs": peak_ms,
        "endMs": end_ms,
        "anchorMs": anchor,
        "rule": rule,
        "peakDb": round(float(db[peak_i]), 1),
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("folder", nargs="?", default="public/sfx")
    ap.add_argument("--out", default="src/data/sfx.ts")
    args = ap.parse_args()

    files = sorted(p for p in Path(args.folder).iterdir() if p.suffix.lower() in EXTS)
    if not files:
        raise SystemExit(f"no effect in {args.folder}")
    table = {p.stem: measure(p) for p in files}

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    body = json.dumps(table, ensure_ascii=False, indent=2)
    out.write_text(
        "// Output of tools/analyze-sfx.py -- the anchor of each effect, in ms from the start of the file.\n"
        f"export const SFX = {body} as const;\n"
        "export type SfxName = keyof typeof SFX;\n",
        encoding="utf-8",
    )
    for name, m in table.items():
        print(f"{name:40s} {m['durationMs']:5d}ms  anchor={m['anchorMs']:5d}ms ({m['rule']})  peak={m['peakDb']}dB")
    print(f"-> {out}")


if __name__ == "__main__":
    main()
