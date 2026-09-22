# Video audio — music, voice, effects and the master

> Covers the sound half of R37. **The agent cannot hear.** Every decision in this file is either measured
> by a tool in `tools/video/` or put in front of the user's ears at a checkpoint — never "it sounds good"
> said by the agent. The plan that places the sound is `video-plan.md`; the loop that checks it is
> `video-review.md`.

---

## 0. What "the agent cannot hear" changes

- Timing is **measured**: beats and attacks by `analyze-music.py`, words by `transcribe.py`, the impact
  point of every effect by `analyze-sfx.py`, loudness and peaks by `master.mjs` and `review.mjs`.
- Taste is **asked**: at the first full draft and at the final, the user listens and answers specific
  questions ("o whoosh de 3,9 s chega antes do corte?", "a voz fica clara sobre a música?").
- A number the agent cannot produce is not guessed: it becomes a question.

---

## 1. Roles

With a voice: **narration > effects > music**. In an edit: **music > effects**, and the voice, if any,
rides on top. Silence is a decision in the plan (`SILENCES`), never an accident — and the final card is
never silent (one of the reference reels ends in 3.7 s of silence; do not copy that).

---

## 2. The music — `tools/analyze-music.py`

```bash
python -X utf8 tools/analyze-music.py public/music/<trilha>.mp3 --fps 30
```

It converts to WAV (librosa 1.0 does not read AAC), then measures:

- **tempo** — T, 2T and T/2 are all tried, and the grid whose beats land on the strongest attacks wins;
  the others are returned in `bpmCandidates` for the user to settle by ear when they score close;
- **beats** — pulled to the real start of each attack (the librosa envelope peaks tens of ms late), and,
  when the tempo is steady, replaced by an exact grid from a linear fit that covers the whole track —
  including a quiet intro the tracker would drop;
- **downbeats** — an *estimate* (the phase of four beats with the most low-end energy); confirm by ear
  before anchoring scenes to them, or install `beat-this` (it models downbeats) with the user's OK;
- attacks, kicks (below 150 Hz), highs (above 2.5 kHz), energy every 100 ms, the **drop** (the biggest
  energy jump, snapped to a downbeat), and where the sound ends.

Output: `src/data/music.ts` and `out/analysis/music.png` — energy, beats, downbeats and drop drawn
together; look at it.

Measured in the smoke test: a known 120 BPM track with a drop at 4.0 s came out at 120.12 BPM, beats
within 7 ms of the truth, drop at 3.997 s; a real 139 s track came out at a steady 100 BPM with the drop
on the return from the breakdown, in 11 s.

Placing it: `trimBefore` (frames) starts the music at a chosen section; the video's peak goes on
`dropFrame`.

---

## 3. The voice — recorded, never generated

The narration is a **recorded file the user points to** (G5 asks where it is). Generating a voice would
be an AI call, and R26 sends AI through AngatuCRM, which generates text only today — so voice is not
generated, and a local speech model installed on the machine is not a way around that.

```bash
python -X utf8 tools/transcribe.py public/voice/<narracao>.wav --model small
```

`faster-whisper`, local, with the model already cached (`HF_HUB_OFFLINE=1`): nothing leaves the machine
and nothing is generated — only the timing of what was recorded is measured, so R26 does not apply. It
writes `src/data/narration.ts`: segments, and every word with its start and end in seconds. Measured on a
47 s narration: the first word at 0.24 s exactly as a reference transcript, 107 words matched with a mean
difference of 11 ms, in 22 s.

- **Spelling comes from the approved script**, timing from the transcript. Proper nouns the model
  mishears ("Angato Systemas") go into `GLOSSARIO` in `tools/transcribe.py`, which then flags them.
- **Burned-in captions by default**: most social video plays without sound. One line at a time, the
  spoken word highlighted, inside the safe zone, at least 55 px.

---

## 4. Effects — tied to events, placed by their anchor

The brief's map, as the default:

| Event on screen | Sound |
|---|---|
| popup, element pops in | pop |
| text entering | whoosh |
| element landing | impact |
| scene change | impact or transition |
| flash | hit |
| zoom | riser or whoosh |
| click, tap | click |
| fast movement | swoosh |

An effect exists because an event exists; one on every beat is noise. Effects mark what the viewer should
feel.

```bash
python -X utf8 tools/analyze-sfx.py public/sfx
```

It measures, for every file, the **anchor** — the instant that must coincide with the event: the start
of the attack for impacts, pops, clicks and stamps; the peak for whooshes and swipes; the end for risers
and reverses (the category is the file-name prefix: `whoosh-01.wav`, `riser-02.wav`). Output:
`src/data/sfx.ts`. Measured on known sounds: a pop with its attack at 100 ms read 96 ms, a whoosh peaking
at 400 ms read 392 ms, a riser ending at 1500 ms read 1503 ms.

**Placement = the event's sound frame − the anchor.** The peak of the whoosh lands on the cut, not the
start of the file — a whoosh aligned by its first sample arrives hundreds of milliseconds late.

Variety: alternate two or three variants of a family, set `gainDb` per cue, never the same sample twenty
times at the same level.

---

## 5. The effects bus — `tools/sfx-bus.mjs`

Every cue with an effect is mixed into **one** file, `public/audio/sfx-bus.wav`, which the composition
plays with a single `<Audio>`. Why: on Windows every audio layer lengthens the command line Remotion
hands to FFmpeg, and an edit with dozens of hits overflows it (ENAMETOOLONG); and one layer is one fader.

- The filter graph goes in a file, and each effect file is read once and split (`asplit`) when reused.
- Each use is trimmed to 2.5 s (a cue may ask for more with `maxMs`) with an 80 ms fade: library impacts
  carry seconds of tail that bury the next hit.
- The output is padded to the exact duration of the video; a stamp of the cue list is written next to it
  (`sfx-bus.json`).
- `tools/render.mjs` rebuilds it before every render, so it is never stale.

Measured: eight effects from three files landed 0–5 ms from the planned instant. Re-detecting attacks in
the mixed bus drifts when tails overlap — the stamp is the proof of placement, the acoustic check only a
coarse one.

---

## 6. Stems and placement in the composition

Recorded stems are prepared once with FFmpeg when needed — voice:
`highpass=f=85,acompressor=threshold=0.1:ratio=2.5:attack=15:release=250:makeup=1.6`; music under a voice:
`equalizer=f=2400:t=q:w=1.7:g=-3.5` (room for consonants); everything to 48 kHz stereo.

In the composition, `<Audio>` comes from `@remotion/media` — the core `Audio` was renamed `Html5Audio`
and is deprecated. Volume is a callback, and **its frame starts at 0 when that audio starts**, not at the
composition's frame. Ducking the music under the narration:

```tsx
/** Musica abaixada durante a fala: -12 dB, ataque de 6 quadros, soltura de 12. @author Angatu Sistemas */
import { Audio } from '@remotion/media';
import { interpolate, staticFile } from 'remotion';
import { NARRATION } from '../data/narration.ts';
import { FPS } from '../data/timeline.ts';

const DUCK = 10 ** (-12 / 20);
// Fim no minimo 1 quadro depois do inicio: o interpolate exige faixa estritamente crescente.
const SPEECH = NARRATION.map((s) => {
  const a = Math.round(s.start * FPS);
  return [a, Math.max(a + 1, Math.round(s.end * FPS))] as const;
});

const duck = (frame: number): number =>
  SPEECH.reduce((gain, [a, b]) => Math.min(gain,
    interpolate(frame, [a - 6, a, b, b + 12], [1, DUCK, DUCK, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })), 1);

// A musica comeca no quadro 0 da composicao, entao o quadro do callback e o mesmo da composicao.
export const Music: React.FC = () => <Audio src={staticFile('music/trilha.mp3')} volume={(f) => 0.8 * duck(f)} />;
```

Music fades in and out on the grid; the final card keeps the music (fading), never silence.

---

## 7. The master — `tools/master.mjs`

```bash
node tools/master.mjs out/final.mp4          # -> out/final-master.mp4
```

Target: **−14 LUFS** integrated and a true peak of at most **−1 dBTP** — the market convention for social
video; no platform publishes a target. The chain: measure (`ebur128`) → a limiter on the peaks only →
a static gain → measure again, up to five tries (the true peak decides first, then the loudness) → AAC
320 kbps at 48 kHz, the picture copied untouched (`-c:v copy`), `+faststart` for the web.

The trap: FFmpeg's `alimiter` looks ahead and **delays the audio by its attack unless `latency=1`** — a
video synchronised to the frame would come out of the master late. `level=0` turns off its automatic
gain. Measured: −18.9 LUFS with a peak of +1 dBTP became −14.2 LUFS at −1.0 dBTP, with **zero samples**
of delay against the render.

If the limiter has to take more than 6 dB, the script says so: the mix is crushed — lower the effects'
`gainDb` or the music in the composition and render again, instead of squashing it.

---

## 8. Deliverables

- `final-master.mp4` per format.
- **A version without music** when the track's licence does not cover the platform — with the music's
  start offset noted, for whoever adds a licensed track in the app.
- `docs/LICENCAS.md` complete.

## 9. `docs/LICENCAS.md`

| Arquivo | Tipo | Fonte (URL) | Licença | Autor | Data | Onde é usado |
|---|---|---|---|---|---|---|
| public/sfx/whoosh-01.mp3 | efeito | https://freesound.org/... | CC0 1.0 | ... | 2026-09-22 | cortes 4, 8, 12 |

---
*Original source: the Remotion Motion Graphics brief of Angatu Sistemas, and the audio practice of Angatu's own studios · written and audited by Angatu Sistemas*
