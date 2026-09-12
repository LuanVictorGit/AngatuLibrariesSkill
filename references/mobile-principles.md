# Mobile principles — touch-first UX

> Audit: Angatu Sistemas · adapted from `mobile-principles` for AngatuLibraries (vanilla + local
> Tailwind). Original is cross-platform (mobile web, iOS, Android).
>
> R15 governs how all of this reaches the markup: layout, breakpoints, visibility, spacing and
> typography go through Tailwind utilities, never a hand-written `@media (min-width: …)`. The
> `@media (hover: …)` and `prefers-reduced-motion` queries below are the exception — Tailwind does not
> cover them, and they belong in `ds.css`.

---

## Touch targets

| Platform | Minimum | Recommended | Specification |
|---|---|---|---|
| iOS | 44pt | 44pt + 8pt spacing | Apple HIG |
| Android | 48dp | 48dp + 8dp spacing | Material Design |
| Mobile web | 44px | 44px + 8px spacing | WCAG 2.5.5 |

**The golden rule:** any touchable target below the minimum is a usability bug. The hit area may exceed
the visible glyph (`padding`, `hitSlop`, a transparent spacer), but the interactive surface has to reach
the minimum. Spacing matters as much as size: two 44pt buttons touching each other are still
mis-tappable.

In Tailwind: `min-h-11 min-w-11` (44px) plus `gap-2` between targets; the hit area can grow with
`p-2` / `px-3`.

## The no-hover doctrine

`:hover` does not exist on touch. Making something visible only on hover means hiding it on every
phone. Visible-by-default is the rule; hover is a desktop enhancement, never structural interaction.

```css
.card { opacity: 1; transform: translateY(0); }
@media (hover: hover) and (pointer: fine) {
  .card { opacity: 0.85; }
  .card:hover { opacity: 1; transform: translateY(-2px); }
}
```

**Angatu standard:** every `.card` and `.btn` in `public/` must be usable without hover; add hover only
inside that media query. Never use `group-hover` with no visible fallback on mobile.

## Thumb zones (Hoober)

Portrait use is mostly one-handed, with the thumb pivoting from the bottom corner:

```
+------+----+------+
| HARD | OK | HARD |  ← topo: estica, só com duas mãos
+------+----+------+
|  OK  | OK |  OK  |  ← meio: confortável
+------+----+------+
| EASY |EASY| EASY |  ← base: arco natural do polegar
+------+----+------+
```

- **Bottom third (EASY):** primary CTA, submit, confirm, FAB, tab bar.
- **Middle (OK):** content, secondary actions.
- **Top (HARD):** back, close, search, profile — the user expects to reach for these, not hit them by
  reflex.

**Angatu rule:** the primary CTA is always in the lower half on mobile. Never put `Pagar` in the top
right corner of a phone. In Tailwind:
`fixed bottom-0 inset-x-0 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] md:static`.

## Safe areas (notch and home indicator)

| Platform | API | Insets respected |
|---|---|---|
| Web | `env(safe-area-inset-*)` + `viewport-fit=cover` | notch, home indicator |
| SwiftUI | `.safeAreaInset(edge:)` | nav/tab bar, notch |
| Compose | `WindowInsets.safeDrawing` | system bars, IME |

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

```css
.fab {
  position: fixed;
  bottom: calc(env(safe-area-inset-bottom) + 16px);
  right:  calc(env(safe-area-inset-right)  + 16px);
}
```

Always check this on a notched iPhone. A FAB or tab bar sitting under the home indicator is a critical
failure, and it is exactly what the 375px pass of `frontend-preview.md` is for.

## Reduced motion

| Platform | API |
|---|---|
| Web CSS | `@media (prefers-reduced-motion: reduce)` |
| Web JS | `matchMedia('(prefers-reduced-motion: reduce)')` |
| SwiftUI | `@Environment(\.accessibilityReduceMotion)` |
| Compose | `Settings.Global.ANIMATOR_DURATION_SCALE == 0f` |

Mandatory minimum in every Angatu project:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

When logic has to be disabled too:

```js
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const duration = reduceMotion ? 0 : 300;
```

A landing hero video also obeys this: with reduced motion the poster takes over and the video does not
play (`landing-motion.md`).

## Canonical gestures

The five gestures users already know — reusing them is free UX, reinventing them is friction:

- **Swipe-back:** iOS, from the left edge. Never override it; on Android mirror it with predictive back
  (Android 14+).
- **Pull-to-refresh:** drag down at the top to reload (feeds, lists).
- **Drag-to-dismiss:** modals and viewers close when dragged down past 100–150pt.
- **Pinch-to-zoom:** on images, maps and canvases, with min/max scale respected.
- **Row swipe:** horizontal swipe on a row reveals actions (delete, archive). Leading and trailing are
  different sets.

## Performance budgets

- **Cold start:** under 2s on a mid-range device (Pixel 4a, iPhone SE 2nd gen). If it takes 4s on a
  Pixel 4a, it takes 8s on an entry-level phone.
- **Frame:** 16.67ms at 60fps, 8.33ms at 120fps (ProMotion). Synchronous work on the main thread beyond
  that is jank.
- **Bundle:** the local minified Tailwind (R14) is already purged; avoid animation libraries over 25KB
  when all you use is fade and slide.
- **Battery:** no continuous background CPU. Use the platform's schedulers; respect `Save-Data` and
  `allowsCellularAccess`.
- On a landing page these budgets tighten further — a mobile hero video is capped at 800KB
  (`landing-motion.md`).

---

## Anti-patterns

### 1. Hover as the only reveal

```css
/* ERRADO — no celular o botão nunca aparece */
.card .actions { opacity: 0; }
.card:hover .actions { opacity: 1; }
```

```css
/* CERTO — visível por padrão, hover só no desktop */
.card .actions { opacity: 1; }
@media (hover: hover) and (pointer: fine) {
  .card .actions { opacity: 0; transition: opacity 150ms ease-out; }
  .card:hover .actions { opacity: 1; }
}
```

### 2. A target below the minimum

```css
/* ERRADO — 32px, errável */
.icon-btn { width: 32px; height: 32px; }
```

```css
/* CERTO — área de toque de 44px mesmo com ícone de 24px */
.icon-btn { width: 44px; height: 44px; display: inline-flex; align-items: center; justify-content: center; }
.icon-btn svg { width: 24px; height: 24px; }
```

### 3. Ignoring the safe area

```css
/* ERRADO — CTA sob o indicador de início */
.cta { position: fixed; bottom: 0; }
```

```css
/* CERTO */
.cta { position: fixed; bottom: calc(env(safe-area-inset-bottom) + 16px); }
```

## Checklist

- [ ] Every touchable target ≥44px with ≥8px spacing
- [ ] No action depends on hover alone
- [ ] Primary CTA in the bottom third
- [ ] `viewport-fit=cover` + `env(safe-area-inset-*)` wherever there is a fixed FAB or tab bar
- [ ] `prefers-reduced-motion` implemented
- [ ] Canonical gestures preserved (swipe-back not broken)
- [ ] Nothing scrolls horizontally at 375px
- [ ] Checked at 375px on a running server, and described (R21)

---
*Original source: `mobile-principles/SKILL.md` + `references/{accessibility-mobile,gestures-deep}.md` ·
adaptation and audit by Angatu Sistemas*
