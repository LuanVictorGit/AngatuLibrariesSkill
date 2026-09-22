#!/usr/bin/env python3
"""
Transcricao local da narracao, com o tempo de cada palavra.

A narracao e o relogio do video de tipo A: o elemento entra quando a palavra
e dita. Este script mede esse relogio e grava src/data/narration.ts.

Roda 100% local (faster-whisper, modelo em cache, HF_HUB_OFFLINE=1): nada sai
da maquina e nada e gerado -- so se mede o tempo do que ja foi gravado. Por
isso nao e chamada de IA no sentido de R26.

A grafia NAO vem daqui: o texto que aparece na tela sai do roteiro aprovado.
Daqui vem so o tempo. Nome proprio que o modelo erra ("Angato Systemas") entra
no GLOSSARIO abaixo para a conferencia apontar.

Uso:  python -X utf8 tools/transcribe.py public/voice/narracao.wav [--model small]

@author Angatu Sistemas
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

os.environ.setdefault("HF_HUB_OFFLINE", "1")

from faster_whisper import WhisperModel  # noqa: E402  (depois do HF_HUB_OFFLINE)

GLOSSARIO = {"angato": "Angatu", "systemas": "Sistemas", "angatu": "Angatu"}


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

    data, suspeitas = [], []
    for seg in segments:
        words = []
        for w in seg.words or []:
            text = w.word.strip()
            key = text.lower().strip(".,!?;:")
            if key in GLOSSARIO and GLOSSARIO[key] != text.strip(".,!?;:"):
                suspeitas.append(f"{w.start:.2f}s '{text}' -> conferir '{GLOSSARIO[key]}'")
            words.append({"w": text, "s": round(w.start, 3), "e": round(w.end, 3)})
        data.append({"start": round(seg.start, 3), "end": round(seg.end, 3),
                     "text": seg.text.strip(), "words": words})

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    body = json.dumps(data, ensure_ascii=False, indent=1)
    out.write_text(
        "// Saida de tools/transcribe.py -- tempo das palavras; a grafia da tela vem do roteiro.\n"
        "export type Word = { w: string; s: number; e: number };\n"
        "export type Segment = { start: number; end: number; text: string; words: Word[] };\n"
        f"export const NARRATION: Segment[] = {body};\n",
        encoding="utf-8",
    )

    total = sum(len(s["words"]) for s in data)
    print(f"idioma={info.language} duracao={info.duration:.2f}s segmentos={len(data)} palavras={total}")
    if data and data[0]["words"]:
        first = data[0]["words"][0]
        print(f"primeira palavra: '{first['w']}' {first['s']}s -> {first['e']}s")
    for s in suspeitas:
        print("conferir grafia:", s)
    print(f"-> {out}")


if __name__ == "__main__":
    main()
