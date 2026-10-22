#!/usr/bin/env python3
"""
Analysis of the music that drives the video.

Measures tempo, beats, downbeats (an estimate), low and high attacks, energy
every 100 ms, the drop and where the sound ends, and writes src/data/music.ts
for the timeline to import. Draws out/analysis/music.png to check by eye: a
beat off the energy peak is the sign of a wrong grid.

Three safeguards the raw librosa number lacks:
  - Double and half ambiguity (68 or 136 BPM on the same track): the script
    scores T, 2T and T/2 by the strength of the attacks on the beats and returns
    the candidates, for a person to decide when the difference is small.
  - Onset envelope lag: the librosa peak arrives tens of ms after the sound.
    The start of the attack is measured on the rising edge of a short envelope
    (the attacks function). Without it the cut lands a frame after the sound.
  - Electronic music has a steady tempo: if the beats fit a straight line
    (small residual), the grid becomes exact by linear regression and covers
    the whole track, including the quiet intro the tracker discards.

The downbeat (the "1" of the bar) is an ESTIMATE: the phase of 4 beats with the
most low-end energy. Confirm it by ear before anchoring a scene on it.

Usage:  python -X utf8 tools/analyze-music.py public/music/track.mp3 [--fps 30]

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
HOP = 256  # 11.6 ms: a third of a frame at 30 fps
GRID_MAX_RESIDUAL_MS = 25.0


def to_wav(src: Path) -> Path:
    """Converts to mono WAV at 22050 Hz. librosa 1.0 does not read AAC/M4A directly."""
    out = Path(tempfile.mkdtemp()) / "music.wav"
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", str(src), "-ac", "1", "-ar", str(SR), str(out)],
        check=True,
    )
    return out


def filtered(y: np.ndarray, kind: str, freq: float) -> np.ndarray:
    """4th-order Butterworth filter, zero phase (forward and backward)."""
    return sosfiltfilt(butter(4, freq, btype=kind, fs=SR, output="sos"), y)


def onset_env(y: np.ndarray) -> np.ndarray:
    return librosa.onset.onset_strength(y=y, sr=SR, hop_length=HOP)


def attacks(y: np.ndarray, oenv: np.ndarray) -> np.ndarray:
    """Real start of each attack, measured on the rising edge.

    The peak of the librosa envelope arrives tens of ms after the sound (wide
    FFT window), and stepping back to the energy valley with a 46 ms RMS window
    is off by a whole frame. Here each coarse attack is refined on a short RMS
    envelope (256 samples, hop of 64 = 2.9 ms): the start is where the rise
    passes halfway, in dB, between the previous valley and the peak.
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
    """Moves each time to the nearest target within the tolerance."""
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
    """Strength of the attack right after each beat (90 ms), relative to the overall mean."""
    idx = librosa.time_to_frames(beats_s, sr=SR, hop_length=HOP)
    idx = idx[(idx >= 0) & (idx < len(oenv))]
    if not len(idx):
        return 0.0
    near = [oenv[i : i + 8].max() for i in idx]
    return float(np.mean(near) / (np.mean(oenv) + 1e-9))


def fit_grid(beats_s: np.ndarray, duration: float) -> tuple[float, np.ndarray, float]:
    """Line time = t0 + k * period. Returns the period, the grid over the whole track and the residual (ms)."""
    k = np.arange(len(beats_s))
    period, t0 = np.polyfit(k, beats_s, 1)
    residual_ms = float(np.sqrt(np.mean((beats_s - (t0 + k * period)) ** 2)) * 1000)
    first = t0 - period * np.floor(t0 / period)
    grid = np.arange(first, duration - 1e-6, period)
    return float(period), grid, residual_ms


def peaks(env: np.ndarray, k: float = 1.5, gap_s: float = 0.1) -> list[float]:
    """Peaks above the mean + k standard deviations, with a minimum gap between them."""
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
    """Biggest energy jump (2 s after against 2 s before), requiring at least 4 dB."""
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
    """Energy (white), beats (grey), downbeats (blue) and drop (red)."""
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
    d.text((pad, 4), f"energy (dB) | beats | downbeats | drop={drop}", fill=(200, 200, 200))
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

    # Candidates T, 2T and T/2, from librosa's estimate.
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
        raise SystemExit("no reliable beat grid: does the music have a pulse?")
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
        if abs(nearest - drop) <= 30.0 / best["bpm"]:  # half a beat
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
        "// Output of tools/analyze-music.py -- do not edit by hand; run the script again.\n"
        f"export const MUSIC = {body} as const;\n",
        encoding="utf-8",
    )
    draw(Path(args.png), e, music["beats"], music["downbeatsEstimate"], music["drop"], duration)

    print(f"bpm={best['bpm']} steady={best['steady']} residual={best['residualMs']}ms")
    print(f"candidates={[(c['bpm'], c['hit']) for c in candidates]}")
    print(f"beats={len(beats_s)} first={music['beats'][:6]}")
    print(f"downbeats (estimate)={music['downbeatsEstimate'][:4]} drop={music['drop']}")
    print(f"sound until {last_sound}s of {duration:.2f}s -> {out} {args.png}")


if __name__ == "__main__":
    main()
