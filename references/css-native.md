# Native CSS — animation and visual technique with no dependencies

> Audit: Angatu Sistemas · adapted from `css-native` for AngatuLibraries (local Tailwind + `ds.css`).
>
> This is the first place to look for any animation. `framer-motion.md` translates Motion concepts into
> the same primitives; `canvas-generative.md` takes over when the effect needs a canvas.

---

## Native CSS or a library

| Situation | Decision |
|---|---|
| Fewer than 3 animations on the page | native CSS |
| Scroll reveal or parallax | native CSS (`animation-timeline`) |
| Entering or leaving `display: none` | native CSS (`@starting-style` + `allow-discrete`) |
| Tooltip or popover | native CSS (anchor positioning) |
| Page transition (MPA or SPA) | native CSS (View Transitions) |
| Timeline with 5+ tweens | GSAP, served locally (`public/scripts/gsap.min.js`) |
| Stagger in a dynamic list | GSAP, or vanilla `delay: index * 50ms` |
| Interruptible physical spring | React only (Motion) — not this stack |

**Golden rule:** if it fits in `@keyframes` plus `animation-timeline`, stay in CSS. Reach for a library
only when you need imperative control, sequence coordination, or values computed at runtime. A library
is served from the project, never from a CDN — the same reasoning as R14.

---

## Scroll-driven animation

### Scroll progress timeline (a progress bar)

```css
.progress-bar { animation: grow-width linear both; animation-timeline: scroll(root block); }
@keyframes grow-width { from { transform: scaleX(0); } to { transform: scaleX(1); } }
```

`scroll(<scroller> <axis>)` — `nearest | root | self`, `block | inline | x | y`. The default is
`scroll(nearest block)`.

### View progress timeline (reveal on entering the viewport)

```css
.reveal { animation: fade-in linear both; animation-timeline: view(); animation-range: entry 0% entry 100%; }
@keyframes fade-in {
  from { opacity: 0; transform: translateY(2rem); }
  to   { opacity: 1; transform: translateY(0); }
}
```

### `animation-range`

```css
animation-range: entry 0% entry 100%;     /* só durante a entrada */
animation-range: contain 0% contain 100%; /* enquanto totalmente visível */
animation-range: entry 25% exit 75%;
```

---

## View Transitions API

### Same document (SPA)

```js
document.startViewTransition(() => updateContent());
```

```css
::view-transition-old(root) { animation: fade-out 200ms ease-out; }
::view-transition-new(root) { animation: fade-in  300ms ease-in;  }

.hero-image { view-transition-name: hero; }
::view-transition-group(hero) {
  animation-duration: 400ms;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Between pages (MPA)

```css
@view-transition { navigation: auto; }

.card        { view-transition-name: card-detail; }  /* origem */
.detail-hero { view-transition-name: card-detail; }  /* destino */

.card { view-transition-class: card; }
::view-transition-group(*.card) { animation-duration: 350ms; }
```

A `view-transition-name` has to be unique per element and stable across states — a name generated at
random breaks the transition silently (`framer-motion.md`).

---

## `@starting-style`

Native entry from `display: none`, with no `setTimeout` workaround:

```css
.dialog {
  opacity: 1; transform: translateY(0);
  transition: opacity 300ms ease, transform 300ms ease,
              display 300ms allow-discrete, overlay 300ms allow-discrete;
  @starting-style { opacity: 0; transform: translateY(-1rem); }
}
.dialog[hidden] { opacity: 0; transform: translateY(-1rem); display: none; }
```

`transition-behavior: allow-discrete` (or `allow-discrete` in the shorthand) is **mandatory** for
`display` and `overlay`. Without it the transition from `display: none` is ignored entirely. Pair it
with `[popover]` and `<dialog>` for modals that need no animation JavaScript at all.

---

## Anchor positioning

```css
.trigger { anchor-name: --my-trigger; }
.tooltip {
  position: fixed;
  position-anchor: --my-trigger;
  position-area: top center;
  margin-bottom: .5rem;
  position-try-fallbacks: --bottom;
}
@position-try --bottom { position-area: bottom center; margin-top: .5rem; }
```

With animation:

```css
.tooltip[popover]:popover-open {
  opacity: 1; transform: scale(1);
  transition: opacity 150ms ease, transform 150ms ease,
              display 150ms allow-discrete, overlay 150ms allow-discrete;
  @starting-style { opacity: 0; transform: scale(0.96); }
}
```

Always define a fallback, or the tooltip clips outside the viewport.

---

## Container queries

Animate by the component's size, not the viewport's:

```css
.card-container { container-type: inline-size; container-name: card; }

@container card (min-width: 400px) {
  .card-content { animation: slide-in-right 400ms var(--ease-out-expo); }
}
@container card (max-width: 399px) {
  .card-content { animation: fade-in 300ms ease; }
}
@keyframes slide-in-right {
  from { transform: translateX(10cqw); opacity: 0; }
  to   { transform: translateX(0);     opacity: 1; }
}
```

This is not a way around R15 — page layout still goes through Tailwind's responsive utilities.
Container queries answer a different question: how a component behaves inside whatever space it was
given.

---

## Advanced visual techniques

Pick these by theme (`paint.md`), not by novelty.

### `clip-path` reveal

```css
.reveal-clip { clip-path: inset(0 100% 0 0); transition: clip-path 600ms cubic-bezier(0.77, 0, 0.175, 1); }
.reveal-clip.is-visible { clip-path: inset(0 0 0 0); }
```

Morphing between `circle()`, `ellipse()`, `polygon()` and `inset()` works when the type and point count
match.

### `backdrop-filter` (glass)

```css
.glass {
  background: oklch(0.98 0.01 250 / 0.6);
  backdrop-filter: blur(12px) saturate(1.8);
  -webkit-backdrop-filter: blur(12px) saturate(1.8);
}
```

### `mix-blend-mode`

```css
.overlay-text { mix-blend-mode: difference; color: white; }
```

### Mesh gradients

```css
.mesh {
  background:
    radial-gradient(at 20% 30%, oklch(0.7  0.2  310) 0%, transparent 50%),
    radial-gradient(at 80% 60%, oklch(0.6  0.18 250) 0%, transparent 50%),
    radial-gradient(at 50% 80%, oklch(0.75 0.15 170) 0%, transparent 50%),
    oklch(0.15 0.02 280);
}
```

### `conic-gradient` spinner

```css
.spinner {
  background: conic-gradient(from 0deg, transparent 0%, oklch(0.7 0.15 250) 100%);
  border-radius: 50%;
  mask: radial-gradient(farthest-side, transparent calc(100% - 4px), black calc(100% - 4px));
  animation: spin 1s linear infinite;
}
```

---

## Prohibitions

| Wrong | Right | Why |
|---|---|---|
| `transition: all 300ms` | `transition: opacity 300ms, transform 300ms` | `all` fires on every change and blocks optimisation |
| Animating `width`/`height`/`top`/`left` | `transform`, `opacity`, `clip-path`, `filter` | layout properties force a reflow every frame |
| No fallback for `animation-timeline` | `@supports (animation-timeline: scroll()) { … }` | support is recent; older browsers get nothing |
| `@starting-style` without `allow-discrete` | always `allow-discrete` for `display` / `overlay` | without it the transition from `display: none` is ignored |
| Anchor with no `position-try-fallbacks` | always define a fallback | it clips outside the viewport |
| `animation-fill-mode: forwards` on scroll-driven | use `both` | `forwards` sticks at the final state when scrolling back |

`design-audit.md` greps for the first two.

## Compatibility

Check `Can I Use` for `animation-timeline`, View Transitions, `@starting-style` and anchor positioning,
and offer a progressive fallback — a reveal through `IntersectionObserver` plus `transform` where
`animation-timeline` is unsupported. Every one of these respects `prefers-reduced-motion`
(`mobile-principles.md`), and every one gets looked at on a running server before delivery (R21).

---
*Original source: the `css-native` skill (`SKILL.md` and its `modern-css.md`) · translation, compression
and audit by Angatu Sistemas*
