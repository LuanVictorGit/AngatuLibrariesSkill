# Video plan — direction, the scene plan, and the timeline as data

> Covers phases 2 and 3 of `video-production.md` (R37). Nothing is built before the theses and the plan
> are approved. **The plan is data**: `docs/PLANO.md` is what the user reads and approves;
> `src/data/timeline.ts` is the same plan in the form the scenes, the effects bus, the checks and the
> review read. They change together, plan first.

---

## 1. Direction — three theses

Same discipline as the theses of `paint.md`: one sentence each, every required dimension named, a
self-check, and an explicit approval. A vague thesis ("moderno e dinâmico") is rewritten before it is
shown.

**Visual thesis** — palette (from `src/data/brand.ts`, i.e. from the client's URL) · typography (display
and body, sizes by role) · the texture world of the sector (glass frames for a glazier, routes for a
haulier, dough for a bakery — the cover-the-logo test of `landing-motion.md`) · image treatment (grade,
contrast, grain) · density.

**Motion and edit thesis** — the cut grid (every beat, every bar, every phrase, every sentence) · camera
language (still, push-in, punch, shake — and how much) · two or three transition families, no more ·
easing character (named: snap, glide, spring) · the intensity curve across the video · what this video
will not do.

**Sound thesis** — the role of the music (drives, supports, absent) · effect families (at most five) and
their density · the role of the voice · mix priority · loudness target (−14 LUFS, −1 dBTP) · where the
silence goes.

> Exemplo (B2): *"Azul-marinho da Angatu com o verde-água do cliente, Bricolage condensada em caixa alta
> sobre Inter, textura de esquadria e vidro em traço fino; corte em cada tempo forte, punch de 4% no kick,
> blur e flash como únicas transições, entrada rápida com mola e saída seca, nada de glitch; música
> conduz, whoosh e impacto só em troca de cena, −14 LUFS, o cartão final nunca em silêncio."*

**Styleframes** — two or three stills of the key moments (hook, product, final card), rendered from a
throwaway composition with `node tools/render.mjs still <quadro>`. The cheapest place to catch a wrong
palette, a font that does not fit, a logo that disappears on the background.

---

## 2. The master clock

Every video has one time axis, and every event is placed on it.

- **Music** (types B1, B2, and any music-driven A): `python -X utf8 tools/analyze-music.py
  public/music/<track>` → `src/data/music.ts` with `bpm`, `bpmCandidates`, `beats`, `beatFrames`,
  `downbeatsEstimate`, `attacks`, `kicks`, `highs`, `energyDbEvery100ms`, `drop`, `dropFrame`,
  `lastSoundSec`, and `out/analysis/music.png` to look at. When two tempo candidates score close (half and
  double), the user confirms by ear before scenes are anchored.
- **Narration** (type A): `python -X utf8 tools/transcribe.py public/voice/<narration>` →
  `src/data/narration.ts` with every word's start and end (`video-audio.md`).
- **Voice over music**: the narration drives; the music is placed around it and ducked under it.

**Where the cut lands.** On the beat frame, with the image at most one frame ahead of the sound —
`VISUAL_LEAD = 1`. The eye forgives sound that arrives a little after the picture far more than sound
that arrives before it (broadcast lip-sync tolerance is asymmetric, ITU-R BT.1359: detectable at about 45
ms of sound early and 125 ms of sound late). Never after the beat. The lead is tuned by one frame at the
listening checkpoint if the user feels it early or late.

**Where the text lands, on a voice.** The element enters on the stressed word — the word's start frame
minus `VISUAL_LEAD` — and stays until the idea changes. Never before the word is said; never lingering
into a sentence about something else. *"Agora você pode criar seu pedido em poucos segundos"* → "CRIAR
PEDIDO" enters on *criar*.

---

## 3. `docs/PLANO.md`

```markdown
# Plano — <cliente> · <peça>
Relógio mestre: música (120 BPM, drop 16,0 s) | narração | voz sobre música
Duração: 19,0 s = 570 quadros a 30 fps · Formato: 1080×1920

## Cenas
| Nº | Início–fim (s) | Quadros | Objetivo | Conteúdo | Elementos | Texto exato | Mídia | Animação | Entrada | Saída | SFX | Música | Âncora | Câmera | Partículas | Efeitos |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0,00–2,00 | 0–59 | fisgar | +1 cliente | ... | "+1 CLIENTE SATISFEITO" | — | palavra a palavra | flash | corte seco | pop por palavra | intro | batidas 0–3 | parada | — | blur de entrada |

## Eventos (cue sheet)
| Evento | Quadro do som | Tipo | Efeito sonoro | Ganho |
|---|---|---|---|---|
| cut-4 | 60 | cut | whoosh-01 | −8 dB |

## Mapa
Batidas e tempos fortes (music.ts) ou palavras-âncora (narration.ts) usadas pelas cenas.
```

Every field of the brief's scene list is there: objective, content, visual elements, text, image or
video, animations, entrance, exit, sound effects, music, synchronisation, camera, particles, special
effects. An empty field is a decision ("—"), not an omission.

---

## 4. `src/data/timeline.ts` — the contract the tools read

`tools/check-plan.mjs`, `sfx-bus.mjs`, `render.mjs` and `review.mjs` import this file directly in Node.
It must export:

| Export | Meaning |
|---|---|
| `COMPOSITION_ID`, `FPS`, `WIDTH`, `HEIGHT` | the composition |
| `VISUAL_LEAD` | frames the picture leads the sound (1) |
| `SCENES` | `{ id, from, durationInFrames, text?, anchor?, softIn?, flash? }` in order, no gaps |
| `CUES` | `{ id, frame, kind, sfx?, gainDb?, maxMs? }` — `frame` is the frame of the **sound**; `kind` is `cut`, `hit`, `text`, `flash` or `drop` |
| `DURATION_IN_FRAMES` | derived from the music or the narration |
| `POSTER_FRAME` | the cover frame, derived from a scene |
| `HOLDS`, `SILENCES` (optional) | `{ from, to, why }` — planned stillness and silence the review must not flag |
| `ON_SCREEN_TEXT` (optional) | every string on screen, when scenes carry more than one |

Rules:

- **Derived, never typed.** A cut is `beatFrame(n) - VISUAL_LEAD`, a text is `wordFrame(i) -
  VISUAL_LEAD`, a duration comes from `MUSIC.durationSec` or the last word. Typed frames go stale the
  moment the music is trimmed.
- Files in `src/data/` import each other **with the `.ts` extension** and use only erasable TypeScript
  (types, `as const` — no `enum`, no `namespace`), because Node strips the types instead of compiling.
- `softIn: true` marks a scene that enters by dissolve — the review then does not look for a hard cut.
  `flash: true` marks a word slammed on a hit — not reading text, so the reading-time check only warns.

Tested model (music clock):

```ts
/**
 * The video's timeline: the SINGLE source of time. Scene, SFX, check and
 * review read from here; no literal frame lives inside a scene.
 * @author Angatu Sistemas
 */
import { MUSIC } from './music.ts';

export const COMPOSITION_ID = 'Main';
export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const MASTER_CLOCK = 'music';
/** The picture comes 1 frame before the sound. */
export const VISUAL_LEAD = 1;

export const f = (sec: number): number => Math.round(sec * FPS);
export const beatFrame = (i: number): number => MUSIC.beatFrames[i];

export type Scene = { id: string; from: number; durationInFrames: number; text: string; anchor: string };
export type CueKind = 'cut' | 'hit' | 'text' | 'flash' | 'drop';
/** frame = the frame of the SOUND; the picture happens at frame - VISUAL_LEAD. */
export type Cue = { id: string; frame: number; kind: CueKind; sfx?: string; gainDb?: number };
export type Span = { from: number; to: number; why: string };

export const DURATION_IN_FRAMES = f(MUSIC.durationSec);

const SCENE_BEATS = [0, 4, 8, 12];
const SCENE_TEXTS = ['+1', 'CLIENTE', 'SATISFEITO', 'ANGATU'];
const cutFrame = (beat: number): number => (beat === 0 ? 0 : beatFrame(beat) - VISUAL_LEAD);

export const SCENES: Scene[] = SCENE_BEATS.map((beat, i) => {
  const from = cutFrame(beat);
  const to = i + 1 < SCENE_BEATS.length ? cutFrame(SCENE_BEATS[i + 1]) : DURATION_IN_FRAMES;
  return { id: `scene-${i + 1}`, from, durationInFrames: to - from, text: SCENE_TEXTS[i], anchor: `beat ${beat}` };
});

export const CUES: Cue[] = [
  ...SCENE_BEATS.slice(1).map((b): Cue => ({ id: `cut-${b}`, frame: beatFrame(b), kind: 'cut', sfx: 'whoosh-01', gainDb: -8 })),
  { id: 'drop', frame: MUSIC.dropFrame ?? beatFrame(8), kind: 'drop', sfx: 'impact-01', gainDb: -2 },
];

export const HOLDS: Span[] = [];
export const SILENCES: Span[] = [{ from: f(MUSIC.lastSoundSec), to: DURATION_IN_FRAMES, why: 'end of the music' }];
export const POSTER_FRAME = SCENES[2].from + 12;
```

Narration clock — the same contract, anchored on words:

```ts
import { NARRATION } from './narration.ts';

const WORDS = NARRATION.flatMap((s) => s.words);
/** First frame at which word i is spoken. */
export const wordFrame = (i: number): number => Math.round(WORDS[i].s * FPS);
/** Index of the first occurrence of a word (ignoring accents and punctuation). */
export const word = (w: string, from = 0): number => {
  const norm = (x: string) => x.normalize('NFD').replace(/[̀-ͯ.,!?;:]/g, '').toLowerCase();
  const i = WORDS.findIndex((x, k) => k >= from && norm(x.w) === norm(w));
  if (i < 0) throw new Error(`word "${w}" is not in the narration`);
  return i;
};
// The "criar pedido" scene enters on the word "criar":
// { id: 'criar', from: wordFrame(word('criar')) - VISUAL_LEAD, ... }
```

---

## 5. Check the plan before rendering

```bash
node tools/check-plan.mjs
```

It prints the frame table and the distance of every cut to the beat grid, and fails on: a gap or an
overlap between scenes; scenes that do not add up to `DURATION_IN_FRAMES`; a scene shorter than its
reading time (2.5 words per second, at least 0.8 s); a cut more than one frame off the grid; a drop with
neither a cut nor a `drop` cue on it; an effect without a measured anchor in `sfx.ts`; an effect that
would have to start before the video; more than three flashes in any second; a poster frame outside the
video. `tools/render.mjs` runs it again before every render — a plan error found here costs seconds; the
same error found in the render costs a render.

---

## 6. Density

- One idea per scene on a phone. At most two blocks of text on screen at once.
- Reading text at most 2.5 words per second. A single word slammed on a hit is not reading text
  (`flash: true`).
- Every element has a function you can say in one sentence: to explain, demonstrate, highlight, give
  context, or carry the identity. If it has none, it goes.
- No empty stretch longer than 0.2 s unless it is a planned hold (`HOLDS`); no stretch where everything
  moves at once — something must be still for the moving thing to read.

---

## 7. Approval

Show `PLANO.md` (the scene table and the cue sheet) and the styleframes; wait for an explicit yes. A change
after that is written in `PLANO.md` and `timeline.ts` first, and only then in the scenes.

---
*Original source: the Remotion Motion Graphics brief of Angatu Sistemas, and the timing practice of Angatu's own Remotion studios · written and audited by Angatu Sistemas*
