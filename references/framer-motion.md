# Interface animation — Motion concepts, in vanilla

> Audit: Angatu Sistemas · adapted from `framer-motion` + `motion-principles` for the AngatuLibraries
> vanilla frontend (HTML + local Tailwind + native CSS). Original: `motion` v11
> (`import { motion, AnimatePresence } from "motion/react"`).
>
> The Angatu frontend is vanilla. This file exists to translate Motion's *ideas* into what this stack
> actually runs — not to justify adopting React.

---

## Choosing the technique

| Criterion | Native CSS (`css-native.md`) | GSAP | Motion (React) |
|---|---|---|---|
| Animated layout (`layoutId`) | View Transitions (`view-transition-name`) | manual | excellent |
| Animated exit | `@starting-style` + `allow-discrete` | reversed timeline | `AnimatePresence` |
| Gestures (drag, hover) | `:hover` + `transition` | Draggable plugin | declarative, built in |
| Scroll-driven | `animation-timeline: scroll()/view()` | ScrollTrigger (more powerful) | `useScroll` |
| Complex orchestration (5+ tweens) | simple `@keyframes` | timeline (more flexible) | variants |
| Bundle cost | 0 KB | ~25 KB gz | ~30 KB gz |

**The Angatu rule:** prefer **native CSS** for fewer than three animations, for scroll, for
`@starting-style` and for View Transitions. Use **standalone GSAP, served locally**
(`public/scripts/gsap.min.js`, downloaded — never a CDN, same reasoning as R14) only for complex
timelines, dynamic stagger or SVG morphing. `Motion` applies only if the project is already React, and
React is never adopted because of an animation (`frontend-build.md`).

---

## Vanilla equivalents

### `AnimatePresence` → `@starting-style` + native `popover` / `dialog`

Framer (React):

```tsx
<AnimatePresence mode="wait">
  {isVisible && <motion.div key="modal" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} />}
</AnimatePresence>
```

Vanilla:

```css
.modal {
  opacity: 1; transform: translateY(0);
  transition: opacity 300ms ease, transform 300ms ease,
              display 300ms allow-discrete, overlay 300ms allow-discrete;
  @starting-style { opacity: 0; transform: translateY(-8px); }
}
.modal:not([open]) { opacity: 0; transform: translateY(-8px); }
```

```html
<dialog class="modal" id="modal"><form method="dialog"><button>Fechar</button></form></dialog>
```

- `mode="wait"` → sequence with `view-transition-name`, or finish the exit before mounting the next
  state.
- `onExitComplete` → `transitionend` / `animationend`.

### Shared layout (`layoutId`) → View Transitions

Framer: `<motion.div layoutId="highlight" />`

Vanilla:

```css
.card        { view-transition-name: card-detail; }
.detail-hero { view-transition-name: card-detail; }
::view-transition-group(card-detail) {
  animation-duration: 350ms;
  animation-timing-function: var(--ease-spring);
}
```

```js
document.startViewTransition(() => { card.hidden = true; detail.hidden = false; });
```

### Variants + stagger → CSS custom properties

Framer:

```ts
const container = { hidden:{opacity:0}, show:{opacity:1, transition:{staggerChildren:0.08}}};
```

Vanilla:

```html
<ul class="stagger">
  <li style="--i:0">...</li><li style="--i:1">...</li><li style="--i:2">...</li>
</ul>
```

```css
.stagger li {
  animation: fade-up 400ms var(--ease-out-expo) both;
  animation-delay: calc(var(--i) * 80ms);
}
@keyframes fade-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

Or from JavaScript: `items.forEach((el, i) => el.style.animationDelay = i * 80 + 'ms')`.

### Gestures → `:hover` / `:active` + native pointer events

Framer: `whileHover={{scale:1.05}} whileTap={{scale:0.95}} drag`

Vanilla:

```css
.btn { transition: transform 120ms ease-out; }
.btn:hover  { transform: scale(1.03); }
.btn:active { transform: scale(0.97); }
@media (hover: hover) and (pointer: fine) { .card:hover { transform: translateY(-2px); } }
```

The `@media (hover: hover)` guard is not optional — on touch, a sticky `:hover` state is a defect
(`mobile-principles.md`).

Dragging in vanilla: `pointerdown` / `pointermove` / `pointerup` with `setPointerCapture` and
`requestAnimationFrame`. Reach for GSAP Draggable only when the physics is genuinely complex.

### Motion values without re-render → write to the DOM directly

Framer: `useMotionValue` + `useTransform`.

Vanilla:

```js
let x = 0;
function onPointerMove(e) {
  x = e.clientX;
  el.style.setProperty('--x', x + 'px');   // direto no DOM, sem estado
}
// mola: use rAF + lerp, nunca setState dentro do laço
```

Scroll tracking in vanilla is `animation-timeline: scroll()` / `view()` — zero JavaScript
(`css-native.md`).

---

## Mistakes that break things

- **Do not** update `innerHTML` or classes inside a `requestAnimationFrame` loop without throttling.
- **Do not** use an unstable key (`Math.random()`) — it breaks `view-transition-name`. Use a stable id
  from the data.
- **Do not** forget a unique `view-transition-name` on each conditional element; without it there is no
  exit animation.
- **Do not** wrap an already-animated element in another `transform` on the same axis. Separate the
  axes, or compose deliberately.
- **Do not** animate `width`, `height`, `top` or `left` — use `transform`, `opacity`, `clip-path` and
  `filter` (GPU, no reflow). `design-audit.md` greps for this.

## Motion tokens

At most 3–5 durations (for example 120ms, 220ms, 360ms, 500ms) and 3–5 named easings
(`--ease-out-expo: cubic-bezier(0.16,1,0.3,1)`, `--ease-spring: cubic-bezier(0.34,1.56,0.64,1)`).
Never scatter arbitrary values — centralise them in `tailwind.config.js` and `ds.css` `:root`, and let
`design-audit.md` prove it.

Every animation respects `prefers-reduced-motion` (R21's checklist, `design-audit.md`).

---
*Original source: `framer-motion/SKILL.md` · vanilla adaptation and audit by Angatu Sistemas*
