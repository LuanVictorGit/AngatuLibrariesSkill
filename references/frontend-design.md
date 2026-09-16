# Frontend design — Angatu principles

> Audit: Angatu Sistemas · adapted from `frontend-design` for the AngatuLibraries stack (vanilla HTML +
> local Tailwind + `ds.css`).
>
> These are the principles. The pipeline that applies them is `paint.md`, and R15 governs how any of it
> reaches the markup: all responsiveness through Tailwind utilities.

---

## Role

Act as the design lead of a small studio known for delivering unmistakable visual identities. The
client has already rejected generic proposals and is paying for an opinionated point of view: make
deliberate palette, typography and layout choices specific to *this* brief, and take **a real aesthetic
risk** you can justify.

## Anchor in the subject

If the brief does not pin down the subject, pin it down yourself: name one concrete subject, its
audience and the unique job of the page, and state the choice. The subject's world — its materials,
instruments, artefacts and vocabulary — is where distinctive choices come from. Build with the real
content of the brief from beginning to end.

## Principles

- **The hero is a thesis.** Open with the most characteristic element of the subject's world — a
  headline, an image, an animation, a demo or an interactive moment — deliberately. Avoid the easy
  template (big number + small label + gradient).
- **Typography is identity.** Pair display and body with intent; define a clear scale with weights,
  widths and spacing. Typography should be memorable, not a neutral vehicle.
- **Structure is information.** `01/02/03`, eyebrows, dividers and labels belong only when they encode
  real information (a sequence, a timeline). Question them before using them.
- **Movement with intent.** Choose where animation serves the subject: a loading sequence, a scroll
  reveal, hover micro-interactions, atmosphere. One orchestrated moment beats effects scattered
  everywhere; excess is what gives machine-made work away.
- **Complexity to measure.** Maximalist demands elaborate execution; minimal demands precision in
  spacing and typography. Elegance is executing the chosen vision well.
- **Writing is design.** Name things by what the user controls ("Gerenciar notificações", not "config
  de webhook"), use the active voice ("Salvar alterações"), and keep the same name from beginning to
  end (`Publicar` → `Publicado`). Failures and empty states direct; they do not apologise. The text
  itself follows R16 and `landing-copy.md`.

## Process: brainstorm → explore → plan → critique → build → critique again

To calibrate, three current machine-made clichés: (1) cream `#F4F1EA` background + high-contrast serif +
terracotta; (2) near-black background + acid green or bright red; (3) broadsheet layout with hairlines
and zero radius. All three are legitimate for some briefs, but they are defaults — do not reach for
them out of inertia. If the brief pins a direction, follow it faithfully; if it leaves an axis free, do
not spend that freedom on the default.

**Two passes:**

1. **Brainstorm** — a compact token system: `Colour` (4–6 named hex values), `Type` (display + body +
   utility), `Layout` (short prose plus an ASCII wireframe), `Signature` (the single memorable element
   that embodies the brief).
2. **Review** — if any part looks like the generic default you would produce for any similar page,
   revise it, and say what changed and why. Only then write code, deriving every decision from the
   revised plan.

Watch CSS specificity: `.section` and `.cta` selectors can cancel each other out; plan padding and
margins between sections.

## Restraint and self-critique

Spend boldness in one place. The signature is the single memorable thing; everything else stays
disciplined. Remove one accessory before delivering (Chanel). The quiet quality baseline: responsive
down to 375px, visible focus, `prefers-reduced-motion` respected. Critique against screenshots — which
is what R21 and `frontend-preview.md` make a required step, not an optional one. Keep memory of what
you already tried.

## Implementation on Angatu application pages

- Use the existing framework and conventions: `public/index.html` (the shell), `styles/tailwind.css`
  (local, R14) plus `styles/ds.css`, and `scripts/ui.js`, `net.js`, `auth.js`. Those are **source**
  names; in the published `dist` the files, folders, classes and design-system custom properties all
  carry generated names (R19, `frontend-build.md`). Write against the source names and never against
  what the browser shows in production.
- Follow `routes/` / `entities/` / `services/` / `utils/` in English with Javadoc in Portuguese and
  `@author Angatu Sistemas` (R12).
- Design **every** state: empty, loading, error and populated — not just the happy path.
- Remember R13: the same care applies to error pages, blocked pages, e-mails and print views. They are
  not leftovers.

**Forbidden anti-patterns:** identical grids; component-library aesthetics with no customisation; the
generic `centred hero → features → testimonials → CTA`; poor legibility; overuse of
`border-radius: 9999px` and blobs; `div` soup with no semantics; `hover` states with no `focus`,
`active` or `disabled`; and skipping an image that would strengthen the design.

## Generating images

Generate images whenever they improve the design — do not accept a CSS substitute. Prefer raster
(PNG/JPG) over complex SVG; keep SVG for icons and diagrams. Never hotlink Unsplash or Pexels. Generate
early so the image can influence the layout, save into `public/assets/` with a descriptive name, and
write reviewed `alt` text (R16). Storage and compression follow `images.md`.

---
*Original source: `frontend-design/SKILL.md` · rewritten and audited by Angatu Sistemas*
