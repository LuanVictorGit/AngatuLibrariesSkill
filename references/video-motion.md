# Video motion — building the video from scratch

> Covers phase 4 of `video-production.md` (R37). **Technique, not a template**: every component here is
> written for this video, from these patterns, after the plan was approved (`video-plan.md`). The snippets
> marked *testado* ran in the smoke test of this module on Remotion 4.0.527; the rest follow the installed
> types — confirm them there before trusting them.

---

## 1. The render configuration

One place for the options that decide how frames become a file. The tools never repeat them on the
command line. *Testado*:

```ts
/**
 * Configuracao unica de render. Vale para o Studio, o render e o still.
 *
 * PNG + bt709 + yuv420p: quadro JPEG sai em faixa cheia (yuvj420p) e sem
 * marcacao de cor, e o Chrome ja recusou um WebM assim (PIPELINE_ERROR_DECODE).
 * angle: exigido por @remotion/effects, light leak e three.js no Remotion 4.
 *
 * @author Angatu Sistemas
 */
import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("png");
Config.setColorSpace("bt709");
Config.setPixelFormat("yuv420p");
Config.setChromiumOpenGlRenderer("angle");
Config.setOverwriteOutput(true);
```

The result was checked with `ffprobe`: H.264 and VP9 both came out `yuv420p`, limited range (`tv`), and
bt709 in primaries, transfer and matrix — and both decoded and played in Chrome 153.

---

## 2. The API is the installed types

Remotion changes between minor versions, and memory is where wrong APIs come from. Before using a
component, read its types in `node_modules/remotion/dist/cjs/*.d.ts` or
`node_modules/@remotion/<pacote>/dist/*.d.ts`, and use the official Remotion skills installed in the
project (`npx remotion skills add` puts them in `.claude/skills`) for API detail. **This module decides
direction, process and quality; the official skills decide API spelling.** One known error there: their
sound-effects rule imports `Audio` from `@remotion/sfx`, which only exports URLs — `Audio` comes from
`@remotion/media`.

Renames that bite (4.0.527):

| Old | Current |
|---|---|
| `Audio`, `Video` from `remotion` | `Audio`, `Video` from `@remotion/media` — the core ones are now `Html5Audio`, `Html5Video` |
| `startFrom`, `endAt` | `trimBefore`, `trimAfter` (frames) |
| `@remotion/light-leaks` | `lightLeak()` in `@remotion/effects` |
| `<MotionBlur>` | `CameraMotionBlur`, `Trail` from `@remotion/motion-blur` |

---

## 3. Determinism

Remotion renders by capture: Chrome paints frame N, takes a picture, advances the clock, paints N+1 —
and with concurrency, neighbouring frames are painted by different tabs. So:

- motion comes only from `useCurrentFrame()` and `interpolate`/`spring` over it;
- randomness only from `random('semente')` (remotion) or `noise2D`/`noise3D` (`@remotion/noise`);
- never `Math.random`, `Date.now`, `performance.now`, timers, `requestAnimationFrame`, CSS
  `transition`/`animation`, `@keyframes`, or animation classes — in the Studio they look right, in the
  MP4 everything happens on the first frame or flickers differently on every render.

`node tools/check-determinism.mjs` rejects all of those (tested: it passes a clean project and fails on
a temporary `Math.random()`). A rare legitimate exception carries `// determinismo-ok: <motivo>` on the
line or the line above. `tools/render.mjs` runs it before every render.

---

## 4. Traps — each one has cost a render somewhere

- **Inside a `<Sequence>`, `useCurrentFrame()` is already relative** to the sequence. Subtracting the
  scene's start again renders an empty scene, with no error at all.
- **`TransitionSeries` overlaps its sequences and shortens the video**: in a video anchored to beats or
  words, every transition moves the next cut. Cut on the anchor and draw the effect over the cut — with a
  layer of your own on absolute frames (the `Flash` below) or with `TransitionSeries.Overlay` (4.0.415+,
  draws over a cut without changing any timing) — or animate the change inside each scene's own window.
- **Never `--log=error`, never `stdio: 'ignore'`** on a render: they hide the one message that explains
  the failure.
- **Windows**: render through `tools/render.mjs`, which starts the CLI with Node and an argument list.
  Through a shell, the space in "Luan Victor" splits the path, and `npx.cmd` fails without a shell. Keep
  the project path short — MAX_PATH (`video-production.md`, section 6).
- **Many `<Audio>` layers overflow the Windows command line** (ENAMETOOLONG) — effects go through the bus
  (`video-audio.md`).
- **Fonts before the first frame.** A fallback font changes every measured text. Load with
  `@remotion/fonts` (the client's own files in `public/fonts/`) or `@remotion/google-fonts`; if the
  installed `loadFont` does not hold the render by itself, wrap it in `delayRender`/`continueRender`.
- **Media**: `<Img>` and `staticFile()` for images; `<Video>` from `@remotion/media` for footage (it falls
  back to `OffthreadVideo` for codecs it cannot read); `premountFor` on sequences that load media; asset
  names without spaces or accents.
- **Inline SVGs share ids** (`url(#grad)`): two logos with the same gradient id paint each other. Prefix
  the ids per asset.
- **`CameraMotionBlur` renders the scene several times** — measure layout with it off.

---

## 5. The vocabulary

Each entry: what it is for, the knob that matters, and a pattern. Vary by role — the same entrance on
every text is the fastest way to look generic.

### 5.1 Easing and envelopes — *testado*

```ts
/** Envelopes e easings nomeados: o vocabulario de movimento do projeto. @author Angatu Sistemas */
import { Easing } from 'remotion';

export const EASE = {
  snap: Easing.bezier(0.2, 0, 0, 1),
  glide: Easing.bezier(0.4, 0, 0.2, 1),
} as const;

/** 1 no quadro do evento, decaindo em `decay` quadros; 0 antes dele. */
export const impulse = (frame: number, at: number, decay: number): number => {
  const k = frame - at;
  return k < 0 || k > decay * 5 ? 0 : Math.exp(-k / decay);
};

/** O impulso mais forte entre varios eventos. */
export const impulses = (frame: number, ats: readonly number[], decay: number): number =>
  ats.reduce((acc, at) => Math.max(acc, impulse(frame, at, decay)), 0);
```

Enter with `snap` or a `spring` (overshoot is life); exit faster and simpler than the entrance; hold
still when the eye must read.

### 5.2 Text — *testado*

```tsx
/** Texto que bate na tela: escala, blur e opacidade em 4 quadros. @author Angatu Sistemas */
import { interpolate, useCurrentFrame } from 'remotion';
import { fitText } from '@remotion/layout-utils';
import { EASE } from '../lib/motion.ts';

const MIN_PX = 55;

export const SlamText: React.FC<{ text: string; color: string; maxWidth: number; fontFamily: string }> = ({
  text, color, maxWidth, fontFamily,
}) => {
  const frame = useCurrentFrame(); // ja e relativo a Sequence: nao subtrair o inicio da cena
  const { fontSize } = fitText({ text, withinWidth: maxWidth, fontFamily, fontWeight: '800' });
  if (fontSize < MIN_PX) throw new Error(`texto "${text}" nao cabe em ${maxWidth}px acima de ${MIN_PX}px`);
  const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
  return (
    <div style={{
      fontFamily, fontWeight: 800, fontSize: Math.min(fontSize, 260), lineHeight: 1, color, textAlign: 'center',
      scale: String(interpolate(frame, [0, 4], [1.35, 1], { ...clamp, easing: EASE.snap })),
      filter: `blur(${interpolate(frame, [0, 4], [12, 0], clamp)}px)`,
      opacity: interpolate(frame, [0, 2], [0, 1], clamp),
    }}>
      {text}
    </div>
  );
};
```

The text that cannot fit at 55 px throws — a cut-off word is a render error, not a surprise in the
review. Other entrances, chosen by role: word by word on the narration's words; a mask reveal
(`clipPath: inset(0 ${100 - p}% 0 0)`); a counter (`interpolate` + `Intl.NumberFormat('pt-BR')`); a
highlight sweep behind a keyword. Titles, labels, numbers and the CTA do not share an entrance.

### 5.3 Camera — *testado*

```tsx
/** Camera do video: punch-in e tremor com decaimento a cada batida. @author Angatu Sistemas */
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { noise2D } from '@remotion/noise';
import { MUSIC } from '../data/music.ts';
import { VISUAL_LEAD } from '../data/timeline.ts';
import { impulses } from '../lib/motion.ts';

const HITS = MUSIC.beatFrames.map((b) => b - VISUAL_LEAD);

export const Camera: React.FC<{ children: React.ReactNode; punch?: number; shake?: number }> = ({
  children, punch = 0.05, shake = 14,
}) => {
  const frame = useCurrentFrame();
  const e = impulses(frame, HITS, 3);
  const x = noise2D('tremor-x', frame * 0.35, 0) * shake * e;
  const y = noise2D('tremor-y', 0, frame * 0.35) * shake * e;
  return <AbsoluteFill style={{ scale: String(1 + punch * e), translate: `${x}px ${y}px` }}>{children}</AbsoluteFill>;
};
```

Shake is noise under an envelope that decays — never random jitter, never constant. Also: a slow
push-in across a scene; pans; **holds** (emphasis is the absence of movement); big zooms interpolated in
log space so they do not rush at the end —
`Math.exp(interpolate(frame, [0, 45], [Math.log(1), Math.log(3.5)], { easing: EASE.glide }))`; parallax
by giving each layer a depth factor and moving it `(1 - depth)` of the camera.

### 5.4 Transitions — *testado* (flash)

```tsx
/** Flash branco curto sobre o corte. Limite: 3 flashes por segundo (fotossensibilidade). @author Angatu Sistemas */
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

export const Flash: React.FC<{ at: readonly number[]; frames?: number; peak?: number }> = ({ at, frames = 4, peak = 0.85 }) => {
  const frame = useCurrentFrame();
  const opacity = Math.max(0, ...at.map((a) => (frame < a ? 0 : interpolate(frame, [a, a + frames], [peak, 0], { extrapolateRight: 'clamp' }))));
  return <AbsoluteFill style={{ backgroundColor: '#FFFFFF', opacity }} />;
};
```

A hard cut is the default. The families beyond it: flash; blur; whip pan (translate plus
`CameraMotionBlur`); zoom-through; a mask wipe in a shape from the identity; a match cut (the shape of
one scene becomes the next). `@remotion/transitions` presentations (`crossZoom`, `blurSlide`,
`zoomBlur`, `filmBurn`, `pushCut`…) are used over the cut, as an overlay, never as a timing change. Two or
three families per video, chosen in the motion thesis.

### 5.5 Effects

- `@remotion/effects` through the `effects` prop (glow, vignette, LUT grade, light leak, halftone) — the
  config already sets `angle`, which they need.
- **RGB split / glitch** only on hit frames: for text, a red and a cyan `textShadow` offset by
  `px * impulse`; for images, three stacked copies with `mixBlendMode: 'screen'`, colour-isolated,
  offset by seeded amounts (`random('glitch-' + frame)`) for two or three frames.
- Grain as a noise texture at 0.08–0.2 opacity; a light sweep across a logo; a vignette to hold the eye.
  Glow on everything is the generic look (R35).

### 5.6 Motion blur

`<CameraMotionBlur shutterAngle={180} samples={8}>` around fast moves only (whips, punches, flying
elements); `<Trail>` for one object. Slow motion does not need it.

### 5.7 Particles — stateless

```tsx
/** Faiscas no acerto: posicao = f(semente, quadro), sem estado. @author Angatu Sistemas */
import { random, useCurrentFrame } from 'remotion';

export const Sparks: React.FC<{ at: number; x: number; y: number; color: string; count?: number; life?: number }> = ({
  at, x, y, color, count = 24, life = 20,
}) => {
  const t = useCurrentFrame() - at;
  if (t < 0 || t > life) return null;
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const angle = random(`ang-${at}-${i}`) * Math.PI * 2;
        const speed = 10 + random(`vel-${at}-${i}`) * 18;
        return (
          <div key={i} style={{
            position: 'absolute', left: x + Math.cos(angle) * speed * t, top: y + Math.sin(angle) * speed * t + 0.5 * t * t,
            width: 6, height: 6, borderRadius: 3, background: color, opacity: 1 - t / life,
          }} />
        );
      })}
    </>
  );
};
```

Sparks on hits, dust for depth, streaks for a partnership lockup. Budget: about 150 on screen; particles
as filler are the generic look.

### 5.8 Masks and drawing

`clipPath` for reveals; `@remotion/shapes` for clean geometry; `evolvePath` from `@remotion/paths` to
draw a line over time — the window frame drawn stroke by stroke in the glazier reel is this.

### 5.9 Devices and screens

```tsx
/** Celular desenhado em codigo, com a captura rolando e leve giro 3D. @author Angatu Sistemas */
import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { EASE } from '../lib/motion.ts';

export const PhoneScroll: React.FC<{ src: string; scrollPx: number; width?: number }> = ({ src, scrollPx, width = 700 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
  const y = interpolate(frame, [8, durationInFrames - 8], [0, -scrollPx], { ...clamp, easing: EASE.glide });
  const tilt = interpolate(frame, [0, durationInFrames], [10, -4], clamp);
  return (
    <div style={{ perspective: '1600px' }}>
      <div style={{ width, aspectRatio: '390 / 844', borderRadius: 64, padding: 18, background: '#0D0F14',
        rotate: `y ${tilt}deg`, boxShadow: '0 40px 80px rgba(0,0,0,.45)' }}>
        <div style={{ height: '100%', borderRadius: 48, overflow: 'hidden' }}>
          <Img src={staticFile(src)} style={{ width: '100%', translate: `0 ${y}px` }} />
        </div>
      </div>
    </div>
  );
};
```

The screen is a capture from `tools/site-research.mjs` (`-celular-inteira.png` for scrolls), or a system
screenshot with fictitious data. A tap is a drawn circle that scales and fades on the cue frame.

### 5.10 Speed ramps

For footage, pre-render the ramp with FFmpeg (a `setpts` curve) into a new clip and place it as ordinary
video — `playbackRate` is constant per element and, in `@remotion/media`, changes the pitch (mute the
footage's own audio). For graphics, the ramp is the camera's easing: fast, slow, fast.

### 5.11 Backgrounds

Animated from the identity and the sector — a grid, circuit traces drawn with `evolvePath`, a slow noise
field — at low contrast, so text stays at 4.5:1. Never blurred colour blobs (R35).

### 5.12 3D

CSS perspective and `rotate: 'y 8deg'` first. `@remotion/three` only when the brief needs real 3D.

---

## 6. Typography and safe zones

- Text meant to be read is **at least 55 px on a 1080-wide frame**; a title reads at 110–260 px.
- Everything that must be read or recognised sits inside the platform's safe zone
  (`video-briefing.md`, section 4). For Reels, a `SafeArea` is a padding of `'269px 65px 672px'`.
- A guides layer shows the zone on review stills:

```tsx
/** Guia da zona segura, so para revisao (prop `guides`). @author Angatu Sistemas */
import { AbsoluteFill } from 'remotion';

export const Guides: React.FC<{ top: number; bottom: number; side: number }> = ({ top, bottom, side }) => (
  <AbsoluteFill>
    <div style={{ position: 'absolute', inset: `${top}px ${side}px ${bottom}px`, outline: '4px dashed rgba(255,0,80,.85)' }} />
  </AbsoluteFill>
);
// Composition com defaultProps={{ guides: false }}; still com guias:
// node tools/render.mjs still 120 --props=./props-guias.json   (arquivo: {"guides": true})
```

- Over footage, a scrim keeps text at 4.5:1 — measure it, do not trust it.

---

## 7. Identity

- `src/data/brand.ts` comes from the URL research (`video-briefing.md`): colours, fonts, the tone.
- Logos are the official files, never redrawn; the client's watermark follows `landing-motion.md`,
  section 6.
- The Angatu mark appears only when G5 said yes: the official file from `_marca/`, discreet, never over
  text, and the signature on the final card.
- Fonts: the client's own when the site's licence allows video use; otherwise a Google Font chosen to
  match, recorded in the plan.

---

## 8. Looking machine-generated — the video version of R35

| Tell | What to do instead |
|---|---|
| Zoom on every image | Vary the move by role; hold still when the eye must read |
| The same entrance for every text | An entrance per role (title, label, number, CTA) |
| Random transitions | Two or three families, chosen in the thesis |
| Glow and particles everywhere | Only where the plan says why |
| Generic "tech" background unrelated to the client | The client's sector as texture |
| Gradient text in violet and pink | The client's palette (`anti-ai-design.md`) |
| Everything moving at once | Something still, so the moving thing reads |

The test: cover the logo and the text. Can you still tell what the client does? If not, the identity is
not in the video yet.

---

## 9. Performance

`scale`, `translate`, `rotate` and `opacity` are cheap; `blur`, `@remotion/effects` and motion blur are
not. Iterate with `node tools/render.mjs rascunho` (half scale, JPEG — nine seconds for two seconds of
1080×1920 in the smoke test) and leave the full render for the review.

---
*Original source: patterns distilled from Angatu's own Remotion studios and verified against Remotion 4.0.527 · written and audited by Angatu Sistemas*
