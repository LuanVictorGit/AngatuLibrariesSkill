# Master pipeline — building a visual universe

> Audit: Angatu Sistemas · adapted from `paint` + `frontend-design` + `brand-landingpage` for
> AngatuLibraries (vanilla HTML + local Tailwind + `ds.css` + Canvas 2D).
>
> **This file is the orchestrator.** It joins `frontend-design.md`, `brand-landingpage.md`,
> `css-native.md`, `canvas-generative.md`, `framer-motion.md`, `mobile-principles.md`,
> `desktop-principles.md` and `design-audit.md` into one flow. It is not a quick beautifier — it is a
> five-phase pipeline that delivers a complete visual system.
>
> **Start here for any frontend.** For a landing page, `landing-intake.md` comes first (gate G1), then
> this.

---

## Voice

**While working** — short, immersive:

- "Escolhendo a paleta..."
- "Pintando o herói com o acento da marca..."

**In reports, summaries and audits** — direct and factual, written for a developer. No flourish:

- "Concluído. Sistema gerado: `docs/design/MASTER.md`, `public/styles/tailwind.css`,
  `public/styles/ds.css`. 3 páginas pintadas."

The flourish lives in the narration of the work. The moment a result lands or a question is asked, it
disappears.

---

## Iron rules

1. **Never skip the brainstorm.** Not even when the user says "just make it look good". The only
   documented exception is light scope (below), which shortens it to one question. It never removes it.
2. **One question at a time.** The second question depends on the first answer.
3. **Never proceed without both theses validated** — visual and interaction, each explicitly approved.
4. **Every token comes from the MASTER.** No magic numbers, no loose hex. In light scope, where there is
   no MASTER, they come from the project's existing tokens — read them, do not invent.
5. **Every animation obeys the interaction thesis.** Duration, easing, forbidden patterns.
6. **Never install a dependency without asking.** Animation here is native CSS (`css-native.md`) or
   local GSAP — never a CDN.
7. **Work page by page, validate page by page.** Never everything at once.
8. **The audit is not optional.** Phase 5 always runs, even when the user seems satisfied.
9. **Tailwind always local (R14).** Never `cdn.tailwindcss.com`.
10. **Impeccable Portuguese in every visible string (R16).**
11. **Themed generative art is mandatory** — at least one generated background, texture or illustration
    coherent with the theme, plus `og:image` and `favicon` (`canvas-generative.md`). On a landing page
    the themed SVG of `landing-motion.md` fills that role instead; never both.
12. **Every rendered surface is in scope (R13)** — error pages, e-mails, print views included. They do
    not each need the full pipeline, but none of them ships on browser defaults.

---

## Light scope — the only permitted shortcut

This pipeline is the wrong tool for "animate this word" or "improve this hover". Those go to direct
editing with `css-native.md`.

**It is light scope when all three hold at once:**

- the target is one component, one effect or one isolated element;
- no visual identity is being established — the project already has colours and type, or there is no
  project yet, only a sketch;
- nothing downstream depends on the result being systematised.

If two or more fail, it is not light scope. Run the full pipeline and say why in one line.

| Phase | Full | Light |
|---|---|---|
| 1 Brainstorm | 5 domains, one question at a time | **one question**, the least obvious, then stop |
| 2 Thesis | visual + interaction, both validated | interaction only, still validated |
| 3 System | generates `docs/design/MASTER.md` + tokens | **skipped.** Read the existing tokens and use them |
| 4 Implement | page by page | the single component |
| 5 Audit | full `design-audit.md` | quick check: `prefers-reduced-motion`, animated exit, 60fps |

**Announce it once:** "Isto é um único componente, então estou rodando em modo leve: uma pergunta, sem
arquivo de sistema. Diga se quiser o pipeline completo."

Light scope never skips the question, the thesis or the validation. Only the quantity shrinks — the
gates stay.

---

## Phase 1 — Brainstorm (mandatory)

Rush here and everything downstream is wrong. The goal is to understand the vision well enough to write
two theses the user would approve without hesitating.

### Stack scan — run this before asking anything

```bash
cat package.json 2>/dev/null | grep -E '"(gsap|tailwindcss)"'
ls src/main/resources/public/styles/tailwind.css src/main/resources/public/styles/ds.css 2>/dev/null
cat tailwind.config.js 2>/dev/null | head -n 30
cat docs/design/MASTER.md 2>/dev/null | head -n 80
```

Map the animation library (local GSAP or none → native CSS), the CSS setup, the mobile-versus-desktop
context, and whether a MASTER already exists.

**If this is a landing page with no defined visual direction**, use the three-part brand interview in
`brand-landingpage.md` instead of the generic brainstorm. Same phase, structured script.

### The five domains

1. **Product** — what is it? (app, landing, portfolio, SaaS, e-commerce, blog, dashboard…)
2. **Audience** — who uses it? (developers, designers, general public, enterprise, children, luxury…)
3. **Mood** — three to five adjectives defining the look.
4. **References** — sites, screenshots, moodboards, anything visual.
5. **Stack** — what already exists. (vanilla + local Tailwind + `ds.css` is the AngatuLibraries default.)

Ask one at a time, starting with the least obvious domain. If the stack scan already answered a domain,
do not ask it.

**When the answer is vague** ("moderno", "clean", "faz bonito"):

1. Validate — "É um começo. Vamos precisar."
2. Offer concrete options — "Clean como Stripe (whitespace editorial), Linear (denso mas organizado) ou
   Apple (minimalismo dramático)?"
3. Reframe — "O que seria *errado*? Quais sites te dão arrepio? Isso também ajuda."
4. Name the consequence — "Esta escolha guia toda a paleta e tipografia."

**Never** read "é, algo assim" as confirmation. Ask which part of "that" resonates.

**When the user pushes to skip:**

> "Já cobrimos [áreas cobertas]. Ainda falta [áreas faltantes], que impacta diretamente [consequência
> concreta]. Quer que eu faça mais uma pergunta ou prefere que eu assuma e você corrige depois?"

If they choose assumption, name every assumption explicitly in the thesis.

**When to stop:** when you can write both theses and would bet the user says "perfeito". If you would
still be guessing at an aspect, keep asking.

---

## Phase 2 — Thesis

### Visual thesis

One sentence capturing the whole visual identity. It must explicitly address all four:

- **Colour direction** — light or dark, palette family, accent colour.
- **Typographic spirit** — serif/sans/mono, use of weight, size contrast.
- **Spacing philosophy** — dense or airy, the feel of the base unit.
- **Component style** — rounded or sharp, bordered or filled, raised or flat.

> Example: "Interface escura neo-brutalista com tipografia mono ousada, acentos chartreuse
> fluorescentes, whitespace generoso e componentes de borda crua com sombras deslocadas."

**Self-check:** reread it. If any of the four is missing or vague ("tipografia bacana"), rewrite before
presenting.

### Interaction thesis

One sentence capturing the movement language. It must explicitly address all four:

- **Duration range** — fast (100–200ms), medium (200–400ms) or slow (400ms+).
- **Hover behaviour.**
- **Scroll behaviour** — reveals, parallax or nothing.
- **Forbidden patterns** — what this project will NOT do.

> Example: "Transições rápidas e secas (100–200ms), hover com scale sutil (1.02), reveals por scroll
> com stagger, sem bounce ou elastic — tudo ease-out nítido."

**Self-check:** if you cannot derive CSS properties directly from the thesis, it is vague. Rewrite.

**This is the first visual gate.** Present both theses — as text, and if possible a minimal preview:
swatches, a type specimen, an easing curve in SVG. Validate **both** explicitly before continuing. On
pushback, ask what sounds wrong and adjust; do not start from zero.

---

## Phase 3 — The design system

Generate the canonical `MASTER.md` plus tokens in code. Here that means local Tailwind plus `ds.css`.

- **Palette** — primary, secondary, accent, neutrals, semantics (success/warning/error/info).
- **Typography** — one characteristic display face, one complementary body face, one utility face for
  captions and data; fluid scale, weights, line heights.
- **Spacing** — base unit, scale 4/8/12/16/24/32/48/64.
- **Radii** — `none`, `sm`, `md`, `lg`, `full`.
- **Shadows** — levels 0–4, coherent with the visual thesis.
- **Base components** — button, input, card, badge, link, each with five states (default, hover, focus,
  active, disabled).
- **Motion tokens** — duration scale (fast/normal/slow), named easings, stagger.

`docs/design/MASTER.md` is the single source of truth. Every implementation decision references it.

Generated files:

- `tailwind.config.js` — `theme.extend` with colours, fonts, spacing and easings, plus
  `content: ["./src/main/resources/public/**/*.{html,js}"]`;
- `public/styles/tailwind.css` — generated by the local CLI and **committed** (R14);
- `public/styles/ds.css` — `:root { --token: … }`, complementing Tailwind with MASTER tokens.

**Decide the themed art here.** Pick the `canvas-generative.md` recipe that matches the visual thesis
and record it in the MASTER: *"Geração: flow field Simplex + partículas damping 0.98 + og:image
1200×630"*. Decide the SEO derivatives here too — favicon and `og:image` from the MASTER palette,
`meta description` and `json-ld` from the thesis copy. On a landing page, the per-URL covers of
`landing-seo-og.md` replace that single `og:image`.

**These tokens are also what an e-mail and a 404 page inherit (R13).** `email-design.md` explains how
they cross into markup a mail client understands.

**Show it before Phase 4.** Present swatches with hex and contrast ratios, a type specimen, spacing
bars, radius and shadow samples, and component states. This is the cheapest place to catch a wrong
token.

---

## Phase 4 — Implementation

Load the principles by context:

- **Always:** `mobile-principles.md` and `desktop-principles.md` plus `css-native.md`, with
  `framer-motion.md` when translating a Motion concept.
- **Generative art in the thesis:** `canvas-generative.md`.
- **Landing with no brand:** `brand-landingpage.md`.
- **Landing at all:** `landing-motion.md`, `landing-copy.md`, `landing-seo-og.md`.

Rules:

- Page by page, validated page by page. Never everything at once.
- Every colour, font, spacing, shadow and radius comes from `MASTER.md`. No magic numbers.
- Every animation obeys the interaction thesis.
- Five states on every interactive element: default, hover, focus, active, disabled.
- **Render it and look at it** as you go — R21 and `frontend-preview.md`. Validating a page means having
  seen it at desktop and mobile widths, not having written it.

---

## Phase 5 — Audit (never skipped)

Load `design-audit.md` and run the full checklist. The essentials:

- [ ] `prefers-reduced-motion` respected
- [ ] Exit animations present — nothing vanishes abruptly
- [ ] No animation of layout properties
- [ ] Visible focus, and five states on every interactive element
- [ ] Colours and spacing coherent with the MASTER — no loose hex
- [ ] `grep -r "cdn.tailwindcss"` empty
- [ ] Contrast ≥4.5:1, no clickable `div` without a role, `aria-hidden` on decoration
- [ ] Responsive at 375 / 768 / 1024 / 1440, verified by looking (R21)
- [ ] Every rendered surface covered, error pages and e-mails included (R13)
- [ ] Run again against `dist/` after the build (`frontend-build.md`, R19)

Present findings by severity: **Critical > Important > Nice to have**. Only then is it delivered.

---

## Protocol for an existing project

1. Still run the full brainstorm.
2. Acknowledge the existing design, but the thesis overrides it.
3. In Phase 4, **replace** existing tokens and styles with the new system.
4. Preserve functionality and layout structure — replace only the visual layer.

This pipeline rebuilds the visual universe deliberately. To improve what exists without rebuilding, edit
directly with `css-native.md` or `frontend-design.md`.

Note that R19 applies here independently: an existing project gets the build pipeline with obfuscation
installed whether or not its visuals are being rebuilt (`frontend-build.md`).

---

## Warning signs — you are about to violate the pipeline

| The thought | The reality |
|---|---|
| "User already said 'dark minimal', I have a thesis" | Two words are not five domains. Keep asking. |
| "I will ask all five questions at once" | One at a time. The audience answer changes how you ask about mood. |
| "User is impatient, I will jump to code" | Use the pressure protocol. A bad thesis costs days, not minutes. |
| "I will pick colours that feel right" | Every token comes from the MASTER. |
| "I will build the whole site at once" | Page by page, validated page by page. |
| "This animation would look good even though the thesis says no bounce" | The thesis is law. Want it changed? Revalidate. |
| "The audit can wait, the user seems happy" | The audit is not optional. |
| "I will read 'yeah, something like that' as a yes" | It is not confirmation. Ask which part resonates. |
| "I will list the palette as hex, that is precise" | Precise and unreviewable. Show it visually. |
| "The preview looks good, I will build from it" | A preview is disposable. Build from the MASTER. |
| "I will use the Tailwind CDN to prototype quickly" | Never. Tailwind is always local (R14). |
| "It runs, so the page is done" | Not until it has been looked at (R21). |

---
*Original source: `paint/SKILL.md` (genjutsu) · translation, compression, vanilla adaptation and audit by
Angatu Sistemas*
