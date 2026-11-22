#!/usr/bin/env python3
"""
Generated narration for Angatu videos, through OpenRouter.

Model google/gemini-3.8-flash-lite-tts, always with the voice Leda -- the fixed house
voice, never switched per video. See references/video-voice.md.

Commands:

  key    Saves the user's OpenRouter API key to KEY_FILE so every later video
         reuses it. Typed hidden in a terminal, or piped on stdin. The key never
         goes into a project, a repository, a reply or a log.

  speak  Reads the narration text file (one paragraph per blank-line block),
         generates one take per paragraph, joins them with 350 ms of silence and
         writes one WAV.

Usage:
  python tools/tts.py key
  python tools/tts.py speak docs/narracao.txt public/voice/narracao.wav

Status: follows OpenRouter's /audio/speech API, not yet run on this workstation.

@author Angatu Sistemas
"""
from __future__ import annotations

import argparse
import getpass
import json
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from pathlib import Path

KEY_FILE = Path.home() / ".angatu" / "openrouter.key"
OPENROUTER_URL = "https://openrouter.ai/api/v1/audio/speech"
MODEL = "google/gemini-3.8-flash-lite-tts"
VOICE = "Leda"  # the fixed house voice; never switched per video
GAP_SECONDS = 0.35


def read_paragraphs(script: Path) -> list[str]:
    text = script.read_text(encoding="utf-8")
    blocks = [" ".join(b.split()) for b in text.split("\n\n")]
    paragraphs = [b for b in blocks if b]
    if not paragraphs:
        sys.exit(f"{script} has no text.")
    return paragraphs


def save_key() -> None:
    if sys.stdin.isatty():
        key = getpass.getpass("OpenRouter API key (hidden): ").strip()
    else:
        key = sys.stdin.readline().strip()
    if not key.startswith("sk-or-"):
        sys.exit("That does not look like an OpenRouter key (sk-or-...). Nothing saved.")
    KEY_FILE.parent.mkdir(parents=True, exist_ok=True)
    KEY_FILE.write_text(key, encoding="utf-8")
    if os.name == "nt":  # readable by this Windows user only
        subprocess.run(
            ["icacls", str(KEY_FILE), "/inheritance:r", "/grant:r", f"{getpass.getuser()}:F"],
            check=False, capture_output=True,
        )
    else:
        KEY_FILE.chmod(0o600)
    print(f"saved to {KEY_FILE}")


def load_key() -> str:
    key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not key and KEY_FILE.exists():
        key = KEY_FILE.read_text(encoding="utf-8").strip()
    if not key:
        sys.exit("No OpenRouter key: ask the user for it and run 'tts.py key'.")
    return key


def take(key: str, text: str, target: Path) -> None:
    body = json.dumps({
        "model": MODEL,
        "input": text,
        "voice": VOICE,
        "response_format": "mp3",
    }).encode("utf-8")
    request = urllib.request.Request(
        OPENROUTER_URL, data=body, method="POST",
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
    )
    try:
        with urllib.request.urlopen(request, timeout=300) as response:
            target.write_bytes(response.read())  # raw audio bytes, not JSON
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", "replace")[:400]
        sys.exit(f"OpenRouter {error.code}: {detail}")  # 401 key, 402 credits, 429 rate


def speak(script: Path, out: Path) -> None:
    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg not found (video-production.md, preflight).")
    paragraphs = read_paragraphs(script)
    key = load_key()
    out.parent.mkdir(parents=True, exist_ok=True)
    print(f"{MODEL} · {VOICE} · {len(paragraphs)} paragraphs, {sum(map(len, paragraphs))} characters")

    with tempfile.TemporaryDirectory() as tmp:
        takes = []
        for index, paragraph in enumerate(paragraphs, start=1):
            print(f"paragraph {index}/{len(paragraphs)}", flush=True)
            path = Path(tmp) / f"p{index:03d}.mp3"
            take(key, paragraph, path)
            takes.append(path)

        inputs: list[str] = []
        chain = ""
        for index, path in enumerate(takes):
            inputs += ["-i", str(path)]
            pad = f"apad=pad_dur={GAP_SECONDS}" if index < len(takes) - 1 else "anull"
            chain += f"[{index}:a]{pad}[a{index}];"
        chain += "".join(f"[a{i}]" for i in range(len(takes))) + f"concat=n={len(takes)}:v=0:a=1[out]"
        subprocess.run(
            ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *inputs,
             "-filter_complex", chain, "-map", "[out]", str(out)],
            check=True,
        )
    print(f"wrote {out}")


def main() -> None:
    ap = argparse.ArgumentParser(description="Generated narration (OpenRouter, Gemini TTS, voice Leda).")
    sub = ap.add_subparsers(dest="command", required=True)
    sub.add_parser("key", help="save the user's OpenRouter API key for every later video")
    sp = sub.add_parser("speak", help="narrate a text file")
    sp.add_argument("script", type=Path, help="plain text, one paragraph per blank-line block")
    sp.add_argument("out", type=Path, help="output WAV, usually public/voice/narracao.wav")
    args = ap.parse_args()

    if args.command == "key":
        save_key()
    else:
        speak(args.script, args.out)


if __name__ == "__main__":
    main()
