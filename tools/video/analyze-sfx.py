#!/usr/bin/env python3
"""
Mede o ponto de impacto de cada efeito sonoro da pasta public/sfx.

Efeito sonoro alinhado pelo INICIO do arquivo chega atrasado: um whoosh leva
centenas de ms subindo ate o pico, e e o pico que tem de cair no corte. Este
script mede, para cada arquivo, onde esta a ancora -- o instante que deve
coincidir com o evento na tela -- e grava src/data/sfx.ts.

  impacto, pop, click, hit, boom, stamp, glitch -> inicio do ataque
  whoosh, swoosh, swipe, whip                   -> pico de energia
  riser, reverse                                -> fim (o som morre no drop)

A categoria vem do prefixo do nome do arquivo (whoosh-01.wav, riser-02.wav).
Posicao do efeito na linha do tempo = quadro do evento - ancora.

Uso:  python -X utf8 tools/analyze-sfx.py [public/sfx] [--out src/data/sfx.ts]

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
HOP = 64  # 2,9 ms
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
    loud = np.where(db >= db[peak_i] - 20.0)[0]   # ate 20 dB abaixo do pico
    tail = np.where(db >= db[peak_i] - 30.0)[0]   # ate 30 dB abaixo do pico
    ms = lambda i: int(round(i * HOP / SR * 1000))
    category = path.stem.split("-")[0].lower()
    onset_ms, peak_ms, end_ms = ms(loud[0]), ms(peak_i), ms(tail[-1])
    if category in BY_END:
        anchor, rule = end_ms, "fim"
    elif category in BY_PEAK:
        anchor, rule = peak_ms, "pico"
    elif category in BY_ONSET:
        anchor, rule = onset_ms, "ataque"
    else:
        anchor, rule = peak_ms, "pico (categoria desconhecida: conferir)"
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
        raise SystemExit(f"nenhum efeito em {args.folder}")
    table = {p.stem: measure(p) for p in files}

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    body = json.dumps(table, ensure_ascii=False, indent=2)
    out.write_text(
        "// Saida de tools/analyze-sfx.py -- ancora de cada efeito, em ms desde o inicio do arquivo.\n"
        f"export const SFX = {body} as const;\n"
        "export type SfxName = keyof typeof SFX;\n",
        encoding="utf-8",
    )
    for name, m in table.items():
        print(f"{name:40s} {m['durationMs']:5d}ms  ancora={m['anchorMs']:5d}ms ({m['rule']})  pico={m['peakDb']}dB")
    print(f"-> {out}")


if __name__ == "__main__":
    main()
