# Desktop principles — pointer and keyboard UX

> Audit: Angatu Sistemas · adapted from `desktop-principles` for AngatuLibraries (vanilla + local
> Tailwind). Original covers macOS, Windows, Linux and desktop web.
>
> R15 governs how the layout side of this reaches the markup: everything responsive goes through
> Tailwind utilities. The `@media (hover: …)` and `prefers-reduced-motion` queries live in `ds.css`.

---

## Hover is mandatory

Hover is the primary affordance signal on desktop — the inverse of mobile. A pointer over a target with
no immediate feedback feels broken: the user relies on `:hover` to confirm an element is interactive
before clicking. Every clickable surface needs a distinct hover, ideally with a 100–200ms `transition`
that is perceptible without feeling slow.

```css
.btn { background: var(--surface); transition: background 120ms ease-out, transform 120ms ease-out; }
.btn:hover  { background: var(--surface-hover); transform: translateY(-1px); }
.btn:active { transform: translateY(0); }
```

**Angatu rule:** every `<button>`, `.card[role="button"]` and `.nav-item` in `public/` has `:hover`,
`:active` and `:focus-visible`. No exceptions. And per `mobile-principles.md`, hover is never the only
way to reach something.

## Pointer precision

A mouse or trackpad is far more precise than a thumb, so desktop targets can be 24–32px (icons) and
28–36px (toolbars). WCAG 2.5.8 (AA) sets the absolute floor at **24×24 CSS pixels** for a non-touch
pointer. Below that, group with spacing.

**Fitts's law in practice:** acquisition time falls with size and rises with distance. Edges and
corners are targets of infinite depth — the cursor stops there regardless of overshoot. Put
high-frequency global controls (close, system menu, dock) at corners and edges. The macOS menubar and
the Windows taskbar are literal applications of this: anchored to the edge, zero overshoot.

## Keyboard shortcuts — first class, not optional

A desktop user expects parity with native conventions. Missing `⌘+F` in an app with a list is a bug, not
minimalism.

| Action | macOS | Windows / Linux |
|---|---|---|
| New | `⌘+N` | `Ctrl+N` |
| Close window | `⌘+W` | `Ctrl+W` |
| Quit | `⌘+Q` | `Alt+F4` |
| Preferences | `⌘+,` | `Ctrl+,` |
| Find | `⌘+F` | `Ctrl+F` |
| Toggle (comment, sidebar…) | `⌘+/` | `Ctrl+/` |
| Save | `⌘+S` | `Ctrl+S` |
| Command palette | `⌘+K` or `⇧+⌘+P` | `Ctrl+K` or `Ctrl+Shift+P` |

```js
const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
window.addEventListener('keydown', (e) => {
  const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
  if (cmdOrCtrl && e.key.toLowerCase() === 'k') { e.preventDefault(); openCommandPalette(); }
});
```

Show the shortcut in the button's `title` / `aria-label` and in the menu:
`title="Novo documento (⌘N)"`.

## Multi-window patterns

Desktop users keep windows side by side. **A new window is right when:**

- the task is long enough that the user wants to keep working in the main window (a render, an export, a
  sync log);
- two parallel contexts are being compared (two documents, two chats, two issues);
- the app is document-based and each document is a peer (Pages, Figma, Xcode projects).

**A new window is wrong for** transient confirmations, brief settings panels, or anything that fits in a
sheet or popover.

In this stack: prefer `<dialog>` or a side sheet for secondary content; open a new tab or window only
for comparison or a long task, and share state through `localStorage` / `BroadcastChannel` or a
singleton — never duplicate the source of truth. That last point is the same principle as
`websocket.md`: two ways of assembling the same state will disagree.

## Focus management

Keyboard navigation is first-class input on desktop. `Tab` order has to be sane, focus rings visible,
and removing them without a replacement is an accessibility regression.

```css
.btn:focus { outline: none; }
.btn:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; border-radius: 6px; }
```

```html
<div role="button" tabindex="0" class="btn">Botão customizado</div>
```

```js
document.querySelector('.btn').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); }
});
```

**Angatu rule:** never `outline: none` without a `:focus-visible` replacement. Every `role="button"`
needs `tabindex="0"` and a keydown handler for Enter and Space.

In Tailwind:
`focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500`.

## Information density

Desktop means a 13–32" screen with a precise pointer and a full keyboard. The user can — and wants to —
process more information per viewport than on mobile. Use an 8px base grid (against 4–8px on mobile),
persistent sidebars instead of bottom tabs, a command palette (`⌘K`) for power users, and dense tables
when the data calls for it. A dense table still scrolls inside its own container
(`overflow-x-auto` + `min-w-[640px] md:min-w-0`), never the page body.

References: Linear, Things 3, Notion — information-rich without feeling cramped, every pixel justified.

## Subtle animation doctrine

A desktop app is watched for hours. Animations that delight on the first viewing become unbearable on
the hundredth. Prefer short, purely functional movement: opacity and small translations under 200ms, no
bounce on routine interactions, no playful overshoot on hover. Reserve expressive movement for singular
moments (onboarding, success states), never for daily UI.

```css
/* ERRADO — todo hover quica 600ms, exaustivo no terceiro uso */
.card { transition: transform 600ms cubic-bezier(0.34,1.56,0.64,1); }
.card:hover { transform: scale(1.05); }
```

```css
/* CERTO — 100ms de opacidade, quase subliminar, nunca cansa */
.card { opacity: 0.92; transition: opacity 100ms ease-out; }
.card:hover { opacity: 1; }
```

---

## Anti-patterns

### 1. Hiding navigation behind a hamburger on desktop

```html
<!-- ERRADO — viewport de 1440px, espaço de sobra, e a navegação colapsada -->
<header><button class="hamburger" aria-label="Menu">☰</button></header>
<nav class="drawer hidden">...</nav>
```

```html
<!-- CERTO — barra lateral persistente, que o usuário recolhe se quiser -->
<aside class="sidebar">
  <nav><a href="/inbox">Inbox</a><a href="/projects">Projetos</a><a href="/archive">Arquivo</a></nav>
  <button class="collapse-toggle" aria-label="Recolher barra lateral">⇤</button>
</aside>
```

In Tailwind that is `hidden lg:block lg:w-64`, not a hamburger at 1440px.

### 2. No shortcuts for primary actions

```html
<!-- ERRADO — "Novo" enterrado num menu, três cliques -->
<div class="toolbar"><div class="menu"><button onclick="newDoc()">Novo documento</button></div></div>
```

```html
<!-- CERTO — visível na toolbar, com o atalho anunciado -->
<button onclick="newDoc()" title="Novo documento (⌘N)"><svg aria-hidden="true">＋</svg> Novo</button>
```

### 3. Removing the focus ring with no replacement

```css
/* ERRADO — quem usa teclado não sabe onde está o foco */
button:focus { outline: none; }
```

```css
/* CERTO — clique sem anel, teclado com anel */
button:focus { outline: none; }
button:focus-visible { outline: 2px solid var(--brand-500); outline-offset: 2px; border-radius: 6px; }
```

## Checklist

- [ ] Every interactive element has a distinct `:hover` with a 100–200ms transition
- [ ] Targets ≥24×24 (ideally 24–32px), with Fitts applied to global controls
- [ ] `⌘/Ctrl+K`, `⌘/Ctrl+F`, `⌘/Ctrl+N`, `⌘/Ctrl+S` wired up and shown in tooltips or menus
- [ ] Focus visible (`:focus-visible`), no orphan `outline: none`
- [ ] Appropriate density — persistent sidebar at ≥1024px, not a hamburger
- [ ] Animations under 200ms, no routine bounce
- [ ] `prefers-reduced-motion` respected
- [ ] Checked at desktop width on a running server, and described (R21)

---
*Original source: `desktop-principles/SKILL.md` + `references/{keyboard-patterns,multi-window}.md` ·
adaptation and audit by Angatu Sistemas*
