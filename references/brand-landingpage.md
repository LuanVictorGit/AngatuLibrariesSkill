# Brand-first landing page — interview and generation

> Audit: Angatu Sistemas · adapted from `brand-landingpage` for AngatuLibraries (vanilla + local
> Tailwind). The original depends on Stitch; here the flow is local and vanilla, with no proprietary
> SDK.
>
> **Gate G1 comes first** (`landing-intake.md`): backend or static. Then this file replaces Phase 1 of
> `paint.md` whenever a landing has no defined visual direction.

---

## When to use it

Use it when the user needs a **landing page, homepage or marketing page** with no visual direction
established. Do not use it for dashboards, app UI, component-level work, multi-page apps, or a restyle
with tokens already defined — those go to `frontend-design.md`.

Tone: direct and technical. The user understands APIs, `.env` and HTML. Translate brand and design
concepts; do not hide the toolchain.

## The flow

```
PHASE 0        PHASE 1        PHASE 2         PHASE 3                   PHASE 4
PREPARATION → INTERVIEW    → DESIGN        → GENERATE AND REVIEW     → DELIVER
  brand       (4 parts)      SYSTEM          IN A LOOP                 (bundle
              A: product     (translate →    (generate → show →         ready for
              B: feeling      tokens)         feedback → edit →         deploy)
              C: visual                       repeat)
              D: brand and real material
```

State persists in `.brand/metadata.json`. If it exists with a status past `interview`, resume from the
saved phase.

---

## Phase 1 — The brand interview (mandatory)

Resist jumping to generation — without the interview you produce a generic template.

> "Antes de gerar, quero fazer algumas perguntas rápidas sobre o projeto e como você quer que ele seja
> percebido. São uns cinco minutos, e são a diferença entre um template genérico e uma página que
> combina com a sua marca."

### Part A — Product and purpose

Ask: the product or project name, what it does, who it is for, and the action the visitor should take
(sign up, try a demo, join a waiting list…).

**Move on only with all four:** name + what it does + audience + desired CTA.

### Part B — Brand feeling

Ask: three brand adjectives (offer a menu — `Confiável`, `Ousado`, `Minimalista`, `Luxuoso`, `Divertido`,
`Técnico`, `Orgânico`, `Futurista`…), a reference site they admire (optional), and light versus dark.

**Move on with:** three adjectives + a light/dark direction.

### Part C — Visual preferences

Ask: existing colours or a colour feeling, modern versus traditional type, sharp versus rounded shapes.

**Move on with:** colour direction + typographic direction + shape direction. Confirm the full summary
before generating.

### Part D — Brand and real material (mandatory)

An Angatu landing is not a template with a swapped logo: it uses the company's **official logo** and
**real material**. Always ask:

1. **The official logo** — vector or high-resolution PNG, in light and dark variants if they exist. This
   becomes the watermark on the hero video; **never redraw it by hand**.
2. **What real material exists** — photos of the company, the team, the premises, machines, products,
   processes, works, vehicles, clients the company itself publicises, historical records, institutional
   videos, documentaries.
3. **Permission to use it**, item by item. A photo of a person, someone else's building, a documentary
   clip and a client's image all have an owner. **Without confirmed permission, the material does not go
   in.** Record the source and the permission in `CLAUDE.md`.
4. **Sector and visual vocabulary** — what industry this is, what appears in their day (tools,
   environments, artefacts). This is where the exclusive themed SVG background comes from
   (`landing-motion.md`).

Save files into `.brand/user-assets/` with descriptive names, ask for a verbal description of what each
piece shows, and fold it into the design system. Real material outranks generic illustration — but only
when it genuinely relates to the content. Nothing goes in to fill space.

---

## Phase 2 — Building the design system

| Answer | Parameter |
|---|---|
| Three adjectives | palette variant |
| Light / dark | colour mode |
| Primary colour (hex) | custom colour |
| Modern / traditional | headline font + body font |
| Sharp / rounded | roundness scale |

1. **Create `.brand/DESIGN.md`:**

```
# {Nome do Projeto} — Sistema de Design
## Sensação de marca
{adj1}, {adj2}, {adj3}
## Direção de cor
Primária: {nome} ({hex}) — {por que combina}
Modo: {Claro/Escuro}
## Tipografia
Títulos: {fonte} — Corpo: {fonte}
## Forma
{descrição de roundness}
```

2. **Generate the tokens** in `docs/design/MASTER.md` following Phase 3 of `paint.md`: 4–6 hex palette,
   typography, spacing, radii, shadows, base components and motion tokens.
3. **Save state** in `.brand/metadata.json`.

---

## Phase 3 — Generate and review in a loop

### First generation

1. **Build the architecture from the business, not from a fixed taxonomy.** Never
   `hero → 3 cards → numbers → benefits → testimonials → plans → FAQ → CTA` out of inertia. A local
   service usually wants `hero → serviços → processo → trabalhos realizados → localização → contato`; a
   product wants `hero → produto → demonstração → funcionalidades → comparação → preço → FAQ`; an
   institutional page wants `hero → história → estrutura → serviços → fotos reais → localização →
   contato`. **Social proof exists only with a real, authorised, attributable testimonial**
   (`landing-copy.md`).
2. Build the generation brief from `DESIGN.md` plus the MASTER tokens.
3. Generate `desktop-v1.html` in `.brand/designs/` (and a mobile variant when needed) — vanilla HTML
   with local `styles/tailwind.css` (R14) and `styles/ds.css`. **The themed SVG background and the hero
   motion graphics are in from this first version** (`landing-motion.md`), and every string is written
   under the anti-machine-writing review (`landing-copy.md`).
4. **Validate by running it, never by `file://`** (R29). On the backend track, copy the version under
   review into `src/main/resources/public/`, run `mvn package -DskipTests && java -jar target/<app>.jar`
   and open it; on the static track, use the temporary preview server. Either way, look at it at
   desktop and mobile widths and say what you see (R21, `frontend-preview.md`). `.brand/designs/` holds
   version history — it is not where you view anything.
5. Save state.

### Presenting

1. Put the version under review where it can be served, and start the server.
2. Orient them: "Abri a versão mais recente. Hero no topo com headline e CTA, depois {seções}, rodapé no
   final."
3. Ask three questions:
   - "Qual sua reação nos primeiros cinco segundos?"
   - "Isso parece o SEU produto?"
   - "O que está estranho, faltando ou não soa certo?"

### Translating feedback

| Pattern | Action |
|---|---|
| A specific change ("mova X", "troque a headline para Y") | edit the HTML/CSS directly |
| General dissatisfaction ("não gostei", "sem graça") | generate 2–3 variants with an alternative direction |
| Partial approval ("amo o layout, odeio as cores") | a variant focused on the criticised aspect |
| Wants to compare | three variants side by side |
| "Algo totalmente diferente" | rethink completely |
| "Preferia a anterior" | roll back from `.brand/designs/` history |
| Feedback in CSS or pixels | translate it into design intent |
| Approval | leave the loop → mobile variant → Phase 4 |

**Guardrails:** always show the updated page rendered; update metadata on every change; after three
positive rounds suggest shipping; after five, focus on the single most important item.

---

## Phase 4 — Delivery bundle

```
{project-name}-landing-page/
  index.html              # HTML final desktop
  mobile.html             # mobile (se gerado)
  design/
    DESIGN.md
    color-tokens.json
  assets/
    {imagens do usuário}
  public/assets/
    og/<slug>.jpg         # capa editorial por página
    hero-desktop.mp4      # hero em motion graphics, se houver
    bg-<segmento>.svg     # background temático exclusivo
  DEPLOY.md
```

1. Copy the last approved version to `index.html` / `mobile.html`.
2. Generate `color-tokens.json`.
3. Copy `DESIGN.md` and the user's assets.
4. Generate the **per-page share cover** — logo + real image + page title + identity graphics, 1200×630,
   at `public/assets/og/<slug>.jpg` — plus the favicon (`landing-seo-og.md`). One generic artwork reused
   across every URL does not pass.
5. Write the complete `<head>` for each URL: title, description, canonical, Open Graph, Twitter card,
   Schema.org, favicon.
6. **Anti-machine-writing review:** reread every string asking *"se eu tirasse a marca, esse texto
   serviria para qualquer empresa?"* and rewrite whatever passes that test. Then run the 15-point
   validation in `landing-seo-og.md`.
7. Write `DEPLOY.md` — the checklist for whichever track G1 chose (`deploy-coolify.md` or
   `static-site.md`).
8. Run the build with obfuscation (R19, `frontend-build.md`) and test the `dist`, not only the source.

## Recovery

- **Interrupted session:** load `.brand/metadata.json`, serve the latest version, and ask where to
  continue.
- **Generation failed:** do not retry immediately; check state; try once with a simplified brief.

---
*Original source: `brand-landingpage/SKILL.md` + its `references/` · vanilla adaptation and audit by
Angatu Sistemas*
