# Design audit — the final checkpoint

> Audit: Angatu Sistemas · adapted from `design-audit` for AngatuLibraries (vanilla + local Tailwind +
> `ds.css`), for `src/main/resources/public` and `dist/public`.
>
> **When to run it:** at the end of every frontend, before the push — even when the user said they liked
> it. Classify by severity: Critical (blocks delivery) → Important (current sprint) → Nice to have
> (backlog).
>
> This is the grep half of verification. The eye half is `frontend-preview.md` (R21), and both are
> required: greps do not see an ugly layout, and looking does not catch an inconsistent easing token.

---

## 0. Scope — every rendered surface (R13)

Run the audit over everything the project renders, not only the main screens:

- application screens and landing pages;
- error and blocked pages — 404, 500, and the inline 429/403 pages the rate limiter serves;
- login, password recovery and public screens;
- e-mail templates (with the caveats in `email-design.md` — table layout and inline CSS are correct
  there, and the movement greps do not apply);
- print and report views;
- development preview pages created by the agent.

A surface that was never audited because nobody thought of it as "the frontend" is exactly what R13
exists to catch.

---

## 1. Movement gaps

In this stack, an exit animation is `@starting-style` + `allow-discrete` or `view-transition-name` —
never a library (`css-native.md`).

### Conditional renders with no exit animation

```bash
grep -rn '{.*&&\s*<\|{.*?\s*:\s*<' --include='*.html' --include='*.js' src/main/resources/public \
  | grep -vE 'starting-style|view-transition|allow-discrete|popover|dialog'
```

Every conditional mount and unmount needs an exit animation.

### Hover states with no transition

```bash
grep -rn ':hover' --include='*.css' src/main/resources/public | grep -vE 'transition|animation'
```

Every `:hover` rule needs a `transition` on the base selector. An instant swap looks broken.

### Dynamic lists with no stagger

```bash
grep -rn '\.map(' --include='*.js' src/main/resources/public \
  | grep -vE 'stagger|delay.*index|animationDelay|animation-delay'
```

Lists built with `.map()` should stagger their entry
(`animation-delay: calc(var(--i) * 80ms)`). Everything arriving at once looks cheap.

### Style changes with no transition

```bash
grep -rn 'style\.\|style="' --include='*.js' --include='*.html' src/main/resources/public \
  | grep -vE 'transition|transform|opacity'
```

---

## 2. Accessibility

### Reduced motion — mandatory

```bash
grep -rn 'prefers-reduced-motion' --include='*.css' --include='*.js' src/main/resources/public
```

**Zero results in an animated project is a critical violation.** The minimum:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Contrast 4.5:1

DevTools → inspect → the colour swatch shows the ratio; or `npx pa11y <url>`, or Lighthouse. Check
animated text mid-transition too — above `opacity: 0.4` it still has to be legible. On a landing page
this is where a themed background most often fails: text over art needs its own veil or surface
(`landing-motion.md`).

### Visible focus on everything interactive

```bash
grep -rn 'outline:\s*none\|outline:\s*0' --include='*.css' src/main/resources/public
```

Every `outline: none` must come with a custom `:focus-visible`. Removing the focus ring with no
replacement is a WCAG failure (`desktop-principles.md`).

### Semantic HTML — no clickable div

```bash
grep -rn 'onClick\|onclick' --include='*.html' --include='*.js' src/main/resources/public \
  | grep -E '<div|<span' | grep -v 'role='
```

Every `<div onclick>` should be a `<button>` or `<a>`, or carry `role="button"` + `tabindex="0"` + a
keydown handler.

### ARIA on decorative animation

```bash
grep -rn '<canvas\|class=".*particles\|class=".*ambient' --include='*.html' src/main/resources/public \
  | grep -v 'aria-hidden'
```

Purely decorative animation (background particles, a generative canvas) carries `aria-hidden="true"`.

---

## 3. Performance

### Layout thrashing

```bash
grep -rn 'transition.*\(width\|height\|top\|left\|right\|bottom\|margin\|padding\)' \
  --include='*.css' src/main/resources/public
```

Replace with `transform` and `opacity` — GPU, no reflow.

### Excessive paint triggers

```bash
grep -rn 'will-change' --include='*.css' src/main/resources/public
```

Should be rare and scoped. More than five elements with a permanent `will-change` costs more GPU memory
than it buys. Apply it dynamically, on hover or focus.

### Animation bundle cost

```bash
npx source-map-explorer dist/**/*.js 2>/dev/null | head -n 20
```

| Library | gz cost | When it is justified |
|---|---|---|
| Pure CSS | 0 KB | fewer than 3 animations, scroll, `@starting-style` |
| GSAP | ~25 KB | timelines of 5+ tweens, dynamic stagger, morphing |
| Motion (Framer) | ~30 KB | React only |

If the project only does fade and slide, 30 KB is excessive — stay in native CSS.

### `requestAnimationFrame`, not `setTimeout`

```bash
grep -rn 'setTimeout\|setInterval' --include='*.js' src/main/resources/public \
  | grep -iE 'anim|motion|scroll|position|style|transform'
```

`setTimeout` drops frames and does not pause in an inactive tab.

---

## 4. Consistency

### Durations

```bash
grep -rnoE 'duration[:"'\''= ]+[0-9.]+' --include='*.css' --include='*.js' src/main/resources/public \
  | sort | uniq -c | sort -rn
```

A well-designed project uses 3–5 distinct durations. More than 8 means extracting tokens into `ds.css`
and `tailwind.config.js`.

### Easings

```bash
grep -rnoE 'ease[A-Za-z]*|cubic-bezier\([^)]+\)' --include='*.css' --include='*.js' src/main/resources/public \
  | sort | uniq -c | sort -rn
```

Same rule: 3–5 named easings, centralised in `--ease-*`.

### Symmetry of entry and exit

- Entry duration ≥ exit duration, never the reverse.
- Entry uses `ease-out`, exit uses `ease-in`.
- Entry can be fully choreographed (`translate` + `opacity` + `scale`); exit stays simpler.

---

## 5. Stack checks

- [ ] Lighthouse plus DevTools Performance (target under 16.67ms per frame)
- [ ] `grep -r "cdn.tailwindcss"` empty (R14)
- [ ] `grep -rn "caches.put\|caches.match"` empty, unless cache was requested (R25)
- [ ] `grep -rn "<script>" public/*.html` empty — page scripts live in external files, or the content
      security policy blocks them
- [ ] No hand-written `@media (min-width` outside `ds.css` (R15):
      `grep -rn "@media.*min-width" --include="*.css" src/main/resources/public`
- [ ] Angatu watermark present on every page, **block pages included** (R17) — open a 429 on purpose
      and look at it, instead of assuming
- [ ] R35 pass done by eye: cover the logo and the copy — if nothing left on screen belongs to this
      client, the decoration was doing no work (`anti-ai-design.md`)
- [ ] `grep -rnE '✨|🚀|🔥' --include='*.html' src/main/resources/public` empty, and no
      `from-purple-*.*to-pink-*` gradient
- [ ] Generative canvas uses the DPR-aware `setupCanvas` (`canvas-generative.md`)
- [ ] `og:image` generated, `json-ld` present, `meta description` reviewed — and on a landing or any
      public URL, the per-page cover of `landing-seo-og.md`
- [ ] `prefers-reduced-motion` implemented and tested
- [ ] Run again against `dist/` after the build — obfuscation defects exist only there
      (`frontend-build.md`)
- [ ] Content protection applied per element, never page-wide, with contact data and form fields still
      copyable (R30, `content-protection.md`):
      `grep -rn "oncontextmenu\|document.oncontextmenu\|addEventListener..contextmenu" --include='*.js' --include='*.html' src/main/resources/public`

---

## 6. Output format

### Critical — fix before delivering

- No `prefers-reduced-motion`
- A clickable `div` with no keyboard access
- `outline: none` with no `:focus-visible`
- Animation of `width` / `height` / `top` / `left`
- `cdn.tailwindcss` present
- A rendered surface that never got the design system (R13) — an error page, an e-mail or a print view
  left on browser defaults
- Anything scrolling horizontally at 375px
- A page-wide `contextmenu` block, an intercepted keyboard shortcut, or a devtools-detection loop (R30,
  `frontend-build.md`) — these punish honest visitors and stop nobody
- A machine-generated look (R35, `anti-ai-design.md`) — a decorative dash pinned to a label, gradient
  text, the violet→pink default palette, blurred gradient blobs, emoji standing in for icons
- Content protection blocking a phone number, address, PIX key, order code or form field (R30)

### Important — current sprint

- Conditionals with no exit animation
- Hover with no `transition`
- Missing `aria-hidden` on decoration
- `setTimeout` in an animation loop
- Inconsistent durations (more than 8 values)

### Nice to have — backlog

- Lists with no stagger
- Inline styles with no `transition`
- Excessive `will-change`
- Asymmetric entry and exit
- An oversized animation library

---
*Original source: `design-audit/SKILL.md` · translation, adaptation and audit by Angatu Sistemas*
