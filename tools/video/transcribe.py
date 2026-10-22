#!/usr/bin/env python3
"""
Local transcription of the narration, with the timing of every word.

The narration is the clock of a type A video: an element enters when its word
is spoken. This script measures that clock and writes src/data/narration.ts.

Runs 100% locally (faster-whisper, model in cache, HF_HUB_OFFLINE=1): nothing
leaves the machine and nothing is generated -- only the timing of what was
already recorded is measured. That is why it is not an AI call in the sense
of R26.

The spelling does NOT come from here: the on-screen text comes from the
approved script. Only the timing comes from here. A proper noun the model gets
wrong ("Angato Systemas") goes into GLOSSARY below so the check flags it.

Usage:  python -X utf8 tools/transcribe.py public/voice/narration.wav [--model small]

@author Angatu Sistemas
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

os.environ.setdefault("HF_HUB_OFFLINE", "1")

from faster_whisper import WhisperModel  # noqa: E402  (after HF_HUB_OFFLINE)

GLOSSARY = {"angato": "Angatu", "systemas": "Sistemas", "angatu": "Angatu"}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("audio")
    ap.add_argument("--model", default="small")
    ap.add_argument("--language", default="pt")
    ap.add_argument("--out", default="src/data/narration.ts")
    args = ap.parse_args()

    model = WhisperModel(args.model, device="cpu", compute_type="int8")
    segments, info = model.transcribe(
        args.audio, language=args.language, word_timestamps=True, vad_filter=True
    )

    data, flagged = [], []
    for seg in segments:
        words = []
        for w in seg.words or []:
            text = w.word.strip()
            key = text.lower().strip(".,!?;:")
            if key in GLOSSARY and GLOSSARY[key] != text.strip(".,!?;:"):
                flagged.append(f"{w.start:.2f}s '{text}' -> check '{GLOSSARY[key]}'")
            words.append({"w": text, "s": round(w.start, 3), "e": round(w.end, 3)})
        data.append({"start": round(seg.start, 3), "end": round(seg.end, 3),
                     "text": seg.text.strip(), "words": words})

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    body = json.dumps(data, ensure_ascii=False, indent=1)
    out.write_text(
        "// Output of tools/transcribe.py -- word timing; the on-screen spelling comes from the script.\n"
        "export type Word = { w: string; s: number; e: number };\n"
        "export type Segment = { start: number; end: number; text: string; words: Word[] };\n"
        f"export const NARRATION: Segment[] = {body};\n",
        encoding="utf-8",
    )

    total = sum(len(s["words"]) for s in data)
    print(f"language={info.language} duration={info.duration:.2f}s segments={len(data)} words={total}")
    if data and data[0]["words"]:
        first = data[0]["words"][0]
        print(f"first word: '{first['w']}' {first['s']}s -> {first['e']}s")
    for s in flagged:
        print("check the spelling:", s)
    print(f"-> {out}")


if __name__ == "__main__":
    main()
