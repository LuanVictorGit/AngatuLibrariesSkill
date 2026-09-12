# Generative art — Canvas 2D

> Audit: Angatu Sistemas · adapted from `canvas-generative` for the AngatuLibraries vanilla frontend
> (Canvas 2D + local Tailwind).
>
> This is the engine behind the themed automatic art that `paint.md` requires of every frontend. On a
> **landing page**, the themed SVG background of `landing-motion.md` fills that role instead — pick one
> or the other, never both, or they compete and cost double the weight.

---

## Mandatory setup — DPR-aware, no blur on Retina

The buffer is in physical pixels, the CSS size in logical ones.

```js
function setupCanvas(canvas, width, height) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = width  * dpr;
  canvas.height = height * dpr;
  canvas.style.width  = width  + 'px';
  canvas.style.height = height + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return ctx;
}
```

**Resize with `ResizeObserver`:**

```js
function handleResize(canvas, ctx, draw) {
  const observer = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr; canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    draw();
  });
  observer.observe(canvas.parentElement);
  return () => observer.disconnect();
}
```

**The loop:**

```js
let rafId, prevTime = 0;
function loop(time) {
  const dt = Math.min((time - prevTime) / 1000, 0.1);  // cap evita espiral após aba oculta
  prevTime = time;
  update(dt);
  render(ctx);
  rafId = requestAnimationFrame(loop);
}
rafId = requestAnimationFrame(loop);
// parar: cancelAnimationFrame(rafId);
```

Stop the loop under `prefers-reduced-motion`, and when the canvas leaves the viewport — a background
animation running behind a scrolled-past section is pure battery cost (`mobile-principles.md`).

---

## Noise

| Type | Characteristics | Good for |
|---|---|---|
| Perlin | smooth, grid bias, cheap | terrain, clouds, soft textures |
| Simplex | no grid artefacts, better gradients | flow fields, organic movement, tiling |
| Worley (cellular) | distance to the nearest point | Voronoi, caustics, cracks |

**Rules:** always scale the coordinates (`x / noiseScale`); use octaves (fBm) for detail; seed it for
reproducibility.

```js
function fbm(x, y, octaves = 4, lacunarity = 2, gain = 0.5) {
  let value = 0, amplitude = 1, frequency = 1, maxAmp = 0;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2D(x * frequency, y * frequency);
    maxAmp += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }
  return value / maxAmp;
}
```

---

## Particle systems — a pool with no GC

Pre-allocate a fixed array. Never `new` or `splice` at runtime.

```js
const POOL_SIZE = 10000;
const particles = new Array(POOL_SIZE);
let aliveCount = 0;
for (let i = 0; i < POOL_SIZE; i++) {
  particles[i] = { x:0, y:0, vx:0, vy:0, life:0, maxLife:0, active:false };
}

function spawn(x, y) {
  if (aliveCount >= POOL_SIZE) return;
  const p = particles[aliveCount++];
  p.x = x; p.y = y;
  p.vx = (Math.random() - 0.5) * 2;
  p.vy = (Math.random() - 0.5) * 2;
  p.life = 0; p.maxLife = 60 + Math.random() * 60; p.active = true;
}

function update() {
  for (let i = aliveCount - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.life++;
    if (p.life >= p.maxLife) {
      particles[i] = particles[--aliveCount];
      particles[aliveCount] = p;
      p.active = false;
    }
  }
}
```

The swap-with-last removal is what keeps this allocation-free — it reorders the pool, which is fine
because nothing outside holds an index.

---

## Flow fields

A grid of vectors guiding the particles — the classic generative recipe.

```js
const cols = Math.ceil(width / cellSize), rows = Math.ceil(height / cellSize);
const field = new Float32Array(cols * rows);
for (let y = 0; y < rows; y++) {
  for (let x = 0; x < cols; x++) {
    field[y * cols + x] = noise2D(x * 0.05, y * 0.05) * Math.PI * 2;
  }
}

function followField(p) {
  const col = Math.floor(p.x / cellSize), row = Math.floor(p.y / cellSize);
  if (col >= 0 && col < cols && row >= 0 && row < rows) {
    const angle = field[row * cols + col];
    p.vx += Math.cos(angle) * force;
    p.vy += Math.sin(angle) * force;
  }
  p.vx *= 0.98; p.vy *= 0.98;   // damping
}
```

---

## Fractals and L-systems

| Component | Role |
|---|---|
| Axiom | the starting string (`"F"`) |
| Rules | productions (`"F" -> "F[+F]F[-F]F"`) |
| Angle | the turn for `+` and `-` |
| Iterations | how many times the rules are applied |

```js
function lsystem(axiom, rules, iterations) {
  let current = axiom;
  for (let i = 0; i < iterations; i++) {
    current = current.split('').map((c) => rules[c] || c).join('');
  }
  return current;
}
```

Iteration count grows the string exponentially — four or five is usually the ceiling before the draw
call becomes the bottleneck.

---

## Double buffering — trails without flicker

Render offscreen, then copy to the visible canvas.

```js
const offscreen = document.createElement('canvas');
offscreen.width = canvas.width; offscreen.height = canvas.height;
const offCtx = offscreen.getContext('2d');

function render() {
  offCtx.fillStyle = 'rgba(0,0,0,0.05)';
  offCtx.fillRect(0, 0, offscreen.width, offscreen.height);
  drawParticles(offCtx);
  ctx.drawImage(offscreen, 0, 0);
}
```

---

## Prohibitions

1. **Never `clearRect` every frame when you want a trail** — use `fillStyle = 'rgba(0,0,0,0.02)'` plus
   `fillRect` to fade.
2. **Never `getImageData` inside the loop** — reading back from the GPU is extremely slow. Cache a
   `colorMap` once and index into it.
3. **Always apply DPR** — without `ctx.scale(dpr, dpr)` the canvas is blurry on Retina.
4. **Never allocate in the hot loop** — no `new`, no spread, no array literal inside `update()` or
   `render()`. Reuse scalars.

---

## Use in the Angatu pipeline

Generative canvas is the engine for **themed automatic art** (`paint.md`):

| Product theme | Recommended background | Technique |
|---|---|---|
| Finance / data | grid plus a subtle flow field in cool `oklch` | simplex noise → `Float32Array` of angles → particles with 0.98 damping |
| Organic / nature | particles with trails, Perlin fBm at 4 octaves | `fillRect` fade instead of `clearRect`, pool with no `new` in the loop |
| Technology / SaaS | animated mesh gradient plus `backdrop-filter` | three `radial-gradient`s in `oklch` (`css-native.md`) |
| Creative / art | L-system fractal or an attractor | axiom `"F"`, rule `"F->F[+F]F[-F]F"`, turtle graphics |
| Corporate / trust | subtle noise with a grain overlay | double buffer plus `drawImage` |

Export the cover art from the same canvas: `canvas.toDataURL('image/png')` saved to
`public/assets/og-{tema}.png`, with the favicon derived from the same palette. On a landing page or any
public URL that is only the floor — the cover is per page and follows `landing-seo-og.md`.

Accessibility: decorative canvases carry `aria-hidden="true"`; anything conveying information has real
`alt` text. Storage and compression of the exported files follow `images.md`.

---
*Original source: the `canvas-generative` skill (`SKILL.md` and its `algorithms.md`) · translation and
audit by Angatu Sistemas*
