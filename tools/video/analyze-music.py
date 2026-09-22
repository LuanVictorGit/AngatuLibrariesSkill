#!/usr/bin/env python3
"""
Analise da musica que comanda o video.

Mede andamento, batidas, tempos fortes (estimativa), ataques graves e agudos,
energia a cada 100 ms, o drop e onde o som acaba, e grava src/data/music.ts
para a linha do tempo importar. Desenha out/analysis/music.png para conferir
de olho: batida fora do pico de energia e sinal de grade errada.

Tres cuidados que o numero cru do librosa nao tem:
  - Ambiguidade de dobro e metade (68 ou 136 BPM na mesma musica): o script
    pontua T, 2T e T/2 pela forca dos ataques em cima das batidas e devolve os
    candidatos, para o humano decidir quando a diferenca for pequena.
  - Atraso do envelope de ataque: o pico do librosa chega dezenas de ms depois
    do som. O inicio do ataque e medido na borda de subida de um envelope curto
    (funcao attacks). Sem isso o corte cai um quadro depois do som.
  - Musica eletronica tem andamento constante: se as batidas cabem numa reta
    (desvio pequeno), a grade vira exata por regressao linear e cobre a musica
    inteira, inclusive o trecho baixo do comeco que o rastreador descarta.

Tempo forte (o "1" do compasso) e ESTIMATIVA: a fase de 4 batidas com mais
energia grave. Confirmar de ouvido antes de ancorar cena nele.

Uso:  python -X utf8 tools/analyze-music.py public/music/trilha.mp3 [--fps 30]

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
from PIL import Image, ImageDraw
from scipy.signal import butter, sosfiltfilt

SR = 22050
HOP = 256  # 11,6 ms: um terco de quadro a 30 fps
GRID_MAX_RESIDUAL_MS = 25.0


def to_wav(src: Path) -> Path:
    """Converte para WAV mono 22050 Hz. O librosa 1.0 nao le AAC/M4A direto."""
    out = Path(tempfile.mkdtemp()) / "musica.wav"
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", str(src), "-ac", "1", "-ar", str(SR), str(out)],
        check=True,
    )
    return out


def filtered(y: np.ndarray, kind: str, freq: float) -> np.ndarray:
    """Filtro Butterworth de 4a ordem, sem defasagem (ida e volta)."""
    return sosfiltfilt(butter(4, freq, btype=kind, fs=SR, output="sos"), y)


def onset_env(y: np.ndarray) -> np.ndarray:
    return librosa.onset.onset_strength(y=y, sr=SR, hop_length=HOP)


def attacks(y: np.ndarray, oenv: np.ndarray) -> np.ndarray:
    """Inicio real de cada ataque, medido na borda de subida.

    O pico do envelope do librosa chega dezenas de ms depois do som (janela de
    FFT larga), e recuar ate o vale de energia com janela RMS de 46 ms erra por
    um quadro inteiro. Aqui cada ataque grosso e refinado num envelope RMS curto
    (256 amostras, passo de 64 = 2,9 ms): o inicio e onde a subida passa da
    metade do caminho, em dB, entre o vale anterior e o pico.
    """
    coarse = librosa.onset.onset_detect(onset_envelope=oenv, sr=SR, hop_length=HOP, units="time")
    fine_hop = 64
    rms = librosa.feature.rms(y=y, frame_length=256, hop_length=fine_hop)[0]
    db = 20 * np.log10(rms + 1e-9)
    back, ahead = int(0.08 * SR / fine_hop), int(0.04 * SR / fine_hop)
    out = []
    for t in coarse:
        i = int(round(t * SR / fine_hop))
        lo, hi = max(0, i - back), min(len(db), i + ahead)
        if hi - lo < 3:
            continue
        peak = lo + int(np.argmax(db[lo:hi]))
        floor = float(np.min(db[lo : peak + 1]))
        threshold = floor + 0.5 * (db[peak] - floor)
        j = peak
        while j > lo and db[j - 1] >= threshold:
            j -= 1
        out.append(j * fine_hop / SR)
    return np.array(sorted(set(round(x, 4) for x in out)))


def snap(times: np.ndarray, targets: np.ndarray, tol: float = 0.06) -> np.ndarray:
    """Leva cada tempo ao alvo mais proximo dentro da tolerancia."""
    if not len(targets):
        return times
    out = times.copy()
    for i, t in enumerate(times):
        j = int(np.argmin(np.abs(targets - t)))
        if abs(targets[j] - t) <= tol:
            out[i] = targets[j]
    return out


def track(oenv: np.ndarray, start_bpm: float) -> np.ndarray:
    _, beats = librosa.beat.beat_track(
        onset_envelope=oenv, sr=SR, hop_length=HOP, start_bpm=start_bpm, trim=False, units="time"
    )
    return beats


def hit_score(oenv: np.ndarray, beats_s: np.ndarray) -> float:
    """Forca do ataque logo depois de cada batida (90 ms), relativa a media geral."""
    idx = librosa.time_to_frames(beats_s, sr=SR, hop_length=HOP)
    idx = idx[(idx >= 0) & (idx < len(oenv))]
    if not len(idx):
        return 0.0
    near = [oenv[i : i + 8].max() for i in idx]
    return float(np.mean(near) / (np.mean(oenv) + 1e-9))


def fit_grid(beats_s: np.ndarray, duration: float) -> tuple[float, np.ndarray, float]:
    """Reta tempo = t0 + k * periodo. Devolve periodo, grade na musica toda e desvio (ms)."""
    k = np.arange(len(beats_s))
    period, t0 = np.polyfit(k, beats_s, 1)
    residual_ms = float(np.sqrt(np.mean((beats_s - (t0 + k * period)) ** 2)) * 1000)
    first = t0 - period * np.floor(t0 / period)
    grid = np.arange(first, duration - 1e-6, period)
    return float(period), grid, residual_ms


def peaks(env: np.ndarray, k: float = 1.5, gap_s: float = 0.1) -> list[float]:
    """Picos acima de media + k desvios, com intervalo minimo entre eles."""
    thr = env.mean() + k * env.std()
    gap = max(1, int(gap_s * SR / HOP))
    out, last = [], -gap
    for i in range(1, len(env) - 1):
        if env[i] > thr and env[i] >= env[i - 1] and env[i] >= env[i + 1] and i - last >= gap:
            out.append(round(float(librosa.frames_to_time(i, sr=SR, hop_length=HOP)), 3))
            last = i
    return out


def energy_db(y: np.ndarray, step_s: float = 0.1) -> np.ndarray:
    n = int(step_s * SR)
    chunks = [y[i : i + n] for i in range(0, len(y), n)]
    return np.array([20 * np.log10(np.sqrt(np.mean(c**2)) + 1e-9) for c in chunks if len(c)])


def find_drop(e: np.ndarray, beats_s: np.ndarray, step_s: float = 0.1) -> float | None:
    """Maior salto de energia (2 s depois contra 2 s antes), exigindo pelo menos 4 dB."""
    w = int(2.0 / step_s)
    best, best_t = 4.0, None
    for t in beats_s:
        i = int(round(t / step_s))
        if i - w < 0 or i + w > len(e):
            continue
        jump = float(np.mean(e[i : i + w]) - np.mean(e[i - w : i]))
        if jump > best:
            best, best_t = jump, float(t)
    return best_t


def draw(path: Path, e: np.ndarray, beats: list[float], downbeats: list[float],
         drop: float | None, duration: float, step_s: float = 0.1) -> None:
    """Energia (branco), batidas (cinza), tempos fortes (azul) e drop (vermelho)."""
    w, h, pad = 1600, 360, 20
    img = Image.new("RGB", (w, h), (18, 20, 28))
    d = ImageDraw.Draw(img)
    x = lambda t: pad + (w - 2 * pad) * t / max(duration, 1e-6)
    lo, hi = float(np.percentile(e, 5)), float(e.max())
    y = lambda v: h - pad - (h - 2 * pad) * (min(max(v, lo), hi) - lo) / max(hi - lo, 1e-6)
    for t in beats:
        d.line([(x(t), pad), (x(t), h - pad)], fill=(70, 74, 88))
    for t in downbeats:
        d.line([(x(t), pad), (x(t), h - pad)], fill=(60, 120, 255), width=2)
    if drop is not None:
        d.line([(x(drop), pad), (x(drop), h - pad)], fill=(255, 60, 60), width=3)
    d.line([(x(i * step_s), y(v)) for i, v in enumerate(e)], fill=(235, 235, 235), width=2)
    d.text((pad, 4), f"energia (dB) | batidas | tempos fortes | drop={drop}", fill=(200, 200, 200))
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("audio")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--out", default="src/data/music.ts")
    ap.add_argument("--png", default="out/analysis/music.png")
    args = ap.parse_args()

    src = Path(args.audio)
    y, _ = librosa.load(to_wav(src), sr=SR, mono=True)
    duration = len(y) / SR
    oenv = onset_env(y)
    starts = attacks(y, oenv)

    # Candidatos T, 2T e T/2 a partir da estimativa do librosa.
    base = float(np.atleast_1d(librosa.feature.tempo(onset_envelope=oenv, sr=SR, hop_length=HOP))[0])
    candidates = []
    for bpm in sorted({base, base * 2, base / 2}):
        if not 50 <= bpm <= 220:
            continue
        beats = snap(track(oenv, bpm), starts)
        if len(beats) < 4:
            continue
        period, grid, residual = fit_grid(beats, duration)
        steady = residual <= GRID_MAX_RESIDUAL_MS
        chosen = grid if steady else beats
        prior = float(np.exp(-0.5 * np.log2((60.0 / period) / 120.0) ** 2))
        hit = hit_score(oenv, chosen)
        candidates.append({
            "bpm": round(60.0 / period, 2), "hit": round(hit, 3), "score": hit * prior,
            "steady": steady, "residualMs": round(residual, 1), "beats": chosen,
        })
    if not candidates:
        raise SystemExit("nenhuma grade de batida confiavel: a musica tem pulso?")
    candidates.sort(key=lambda c: -c["score"])
    best = candidates[0]
    beats_s = best["beats"]

    low = onset_env(filtered(y, "lowpass", 150.0))
    high = onset_env(filtered(y, "highpass", 2500.0))
    beat_idx = librosa.time_to_frames(beats_s, sr=SR, hop_length=HOP).clip(0, len(low) - 1)
    phase = int(np.argmax([float(np.sum(low[beat_idx[p::4]])) for p in range(4)]))
    downbeats_s = beats_s[phase::4]

    e = energy_db(y)
    drop = find_drop(e, beats_s)
    if drop is not None and len(downbeats_s):
        nearest = float(downbeats_s[np.argmin(np.abs(downbeats_s - drop))])
        if abs(nearest - drop) <= 30.0 / best["bpm"]:  # meia batida
            drop = nearest
    audible = np.where(e > e.max() - 40.0)[0]
    last_sound = round(float((audible[-1] + 1) * 0.1), 2) if len(audible) else round(duration, 2)

    fps = args.fps
    music = {
        "file": src.as_posix(),
        "fps": fps,
        "durationSec": round(duration, 3),
        "bpm": best["bpm"],
        "steadyTempo": best["steady"],
        "gridResidualMs": best["residualMs"],
        "bpmCandidates": [{"bpm": c["bpm"], "hit": c["hit"]} for c in candidates],
        "beats": [round(float(t), 3) for t in beats_s],
        "beatFrames": [int(round(float(t) * fps)) for t in beats_s],
        "downbeatsEstimate": [round(float(t), 3) for t in downbeats_s],
        "attacks": [round(float(t), 3) for t in starts],
        "kicks": peaks(low),
        "highs": peaks(high, k=1.8),
        "energyDbEvery100ms": [round(float(v), 1) for v in e],
        "drop": None if drop is None else round(drop, 3),
        "dropFrame": None if drop is None else int(round(drop * fps)),
        "lastSoundSec": last_sound,
    }

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    body = json.dumps(music, ensure_ascii=False, indent=2)
    out.write_text(
        "// Saida de tools/analyze-music.py -- nao editar a mao; rode o script de novo.\n"
        f"export const MUSIC = {body} as const;\n",
        encoding="utf-8",
    )
    draw(Path(args.png), e, music["beats"], music["downbeatsEstimate"], music["drop"], duration)

    print(f"bpm={best['bpm']} constante={best['steady']} desvio={best['residualMs']}ms")
    print(f"candidatos={[(c['bpm'], c['hit']) for c in candidates]}")
    print(f"batidas={len(beats_s)} primeiras={music['beats'][:6]}")
    print(f"tempos fortes (estimativa)={music['downbeatsEstimate'][:4]} drop={music['drop']}")
    print(f"som ate {last_sound}s de {duration:.2f}s -> {out} {args.png}")


if __name__ == "__main__":
    main()
