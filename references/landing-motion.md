# Landing pages — themed background, hero motion graphics and real material

> Audit: Angatu Sistemas · Angatu stack (vanilla HTML + local Tailwind + `ds.css`).
>
> **The promise:** the landing has to look like a **professional presentation of that company** — not a
> clean template with a swapped logo. Visual identity, content, narrative, authenticity, performance and
> responsiveness, in that order of effort.
>
> **R18 applies here too:** SVG, CSS, JS and composition code stay readable during development.
> Optimisation of SVG, images and video, minification and obfuscation happen **only in the build**
> (`frontend-build.md`).
>
> Gate G1 comes first (`landing-intake.md`).

---

## 1. What Remotion is here — and what it is not

**Remotion is an authoring tool, and it is disposable.** It is used to create the video from scratch
and, once the final file is validated, **the library is deleted**. What stays in the project is **only
the video**. No 500 MB `node_modules`, no React dependency in the application repository, no
accumulated debris.

| | |
|---|---|
| **It is** | a temporary studio producing `hero-desktop.mp4`, `hero-mobile.mp4` and the poster |
| **It is not** | an application dependency, a page framework, runtime animation, or part of the build |

This does **not** contradict the rule against swapping a project's technology: the page stays vanilla
HTML, CSS and JS, and receives a `<video>` tag. React lives outside the repository, for a few hours,
and then disappears.

### 1.1 The mandatory cycle

```
criar workspace fora do repositório  →  compor as cenas  →  renderizar desktop + mobile + pôster
        →  copiar os arquivos para src/main/resources/public/assets/
        →  validar na página, com o servidor rodando (R21, R29)
        →  APAGAR o workspace inteiro (projeto + node_modules)
        →  registrar no CLAUDE.md o que o vídeo comunica, proporções, duração e material usado
```

The `CLAUDE.md` record is what makes the video **recreatable** later — and recreating from scratch is
the agreed way of working. Without it, months later nobody knows what that file showed or where the
photos came from.

```bash
# fora do repositório da aplicação — nunca dentro de src/
cd "$TEMP" && npx create-video@latest hero-<cliente>
# ... compor, renderizar ...
cp out/hero-*.mp4 out/hero-poster.jpg <projeto>/src/main/resources/public/assets/
rm -rf "$TEMP/hero-<cliente>"        # o estúdio some; o vídeo fica
```

If for any reason the workspace is created inside the project, it goes into `.gitignore` **before** the
first commit and is deleted at the end. It never reaches the repository, never enters the Docker image,
and never appears in the frontend build's `package.json`.

---

## 2. The video behaves like a GIF — no audio

Every landing video produced here is **muted, short and looping**, presented as a high-quality GIF:

- **No audio track.** Render with `--muted`; do not use `<Audio>` in the composition. Unexpected sound
  on a landing is the fastest way to make a visitor close the tab.
- **No controls.** `autoplay muted loop playsinline`, without `controls`.
- **Short, with a natural loop: 8 to 15 seconds.** The last frame should talk to the first so the loop
  does not visibly cut.
- **`muted` is not decoration:** it is what allows autoplay to work on iOS and Android. `playsinline`
  stops the iPhone opening the video full screen.

**Accessibility consequence, and it outranks aesthetics (R20):** a muted video with no controls cannot
be the **only** carrier of any information. Everything the video communicates also exists as text on the
page. The video reinforces; the text informs.

```html
<!-- Hero: vídeo tipo GIF, mudo, com pôster e alternativa textual -->
<div class="relative overflow-hidden rounded-2xl">
  <video
    class="h-full w-full object-cover"
    poster="/assets/hero-poster.jpg"
    autoplay muted loop playsinline preload="metadata"
    aria-label="Demonstração do processo de montagem realizado pela empresa">
    <source src="/assets/hero-mobile.webm"  type="video/webm" media="(max-width: 767px)">
    <source src="/assets/hero-mobile.mp4"   type="video/mp4"  media="(max-width: 767px)">
    <source src="/assets/hero-desktop.webm" type="video/webm">
    <source src="/assets/hero-desktop.mp4"  type="video/mp4">
    <img src="/assets/hero-poster.jpg" alt="Equipe montando a estrutura metálica no galpão da empresa">
  </video>
</div>
```

```css
/* Movimento reduzido: o pôster assume e o vídeo não roda. */
@media (prefers-reduced-motion: reduce) {
  .hero-video  { display: none; }
  .hero-poster { display: block; }
}
```

The page's JavaScript respects the preference too — if the visitor asked for less motion, `video.pause()`
and show the poster.

---

## 3. Compositions — desktop and mobile planned from the start

**Do not resize the desktop composition for the phone** when that makes the presentation worse. Text
that fitted at 1920px is illegible at 390px; a horizontal framing crops the team's faces; three
simultaneous pieces of information become noise.

| Format | Dimensions | When |
|---|---|---|
| Desktop | 1920×1080 (16:9) @30fps | full-width hero, demonstration with lateral space |
| Mobile | 1080×1920 (9:16) @30fps | phone hero, when a 16:9 crop would destroy the framing |
| Square | 1080×1080 (1:1) | inner section, product card, when 9:16 is too tall |

Use separate compositions **when the result is significantly better** — not for symmetry. An animated
chart usually survives the crop; a video with people, machines or on-screen text almost never does.

```tsx
// src/Root.tsx — cada proporção é uma composition própria, parametrizada
export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="HeroDesktop" component={HeroScene}
      width={1920} height={1080} fps={30} durationInFrames={360}
      defaultProps={{ safeArea: 96, logoScale: 1, headline: 'Estruturas metálicas sob medida' }}
    />
    <Composition
      id="HeroMobile" component={HeroScene}
      width={1080} height={1920} fps={30} durationInFrames={360}
      defaultProps={{ safeArea: 72, logoScale: 0.8, headline: 'Estruturas sob medida' }}
    />
  </>
);
```

**What changes between the two** — decide scene by scene, not at the end: safe area, text size, logo
position, distance from the edges, element proportions, animation speed, framing of real footage, and
**how much information appears at once**. On a phone, one idea per scene.

Animation is driven by Remotion's own system (`useCurrentFrame`, `interpolate`, `spring`, `Sequence`,
`useVideoConfig`), never by `setTimeout` or improvised CSS inside the composition. Scenes are
parameterised by props; text, colours and asset paths come from a data file, never written inline in a
scene.

---

## 4. The script — an audiovisual presentation, not a sequence of effects

A reference structure, adapted per sector:

1. The company logo.
2. A real image or video related to the business.
3. A camera move or reframe.
4. Graphic elements from the visual identity.
5. Short text highlighting **one** piece of information.
6. A transition.
7. A demonstration of the product or service.
8. A figure or benefit presented graphically.
9. Another real image or video.
10. A close with the logo and a call to action.

The video has a **communication function**: how the product works, the flow of use, the main features,
the transformation the service delivers, the company's process, the working environment, results,
differentiators, before and after, a visual demonstration, identity elements, or important company
information. If the video communicates nothing, it should not exist.

---

## 5. Real material — photo, footage, documentary

**Where relevant real material exists, it outranks generic illustration.** Photos of the company, the
team, the premises, machines and equipment, products, processes, completed works, vehicles, clients and
projects the company itself publicises, historical records, institutional video, a documentary, or a
real image of the location.

**Rules of use:**

- **Permission before incorporating.** Confirm the right to use each item with the client — a photo of a
  person, someone else's building, a documentary clip and a client's image all have an owner. Without
  confirmed permission, it does not go in. Record where each piece came from in `CLAUDE.md`.
- **A clear relationship with the content.** No random real image to fill space. If the photo does not
  explain, demonstrate, contextualise or reinforce the identity, it comes out.
- **Combine with the graphics**, do not stack: `foto real → animação gráfica → destaque de informação →
  transição → outra imagem real → explicação visual → produto/serviço`.
- **Treat it before use:** framing thought through for each aspect ratio, exposure corrected where
  needed, and the same colour temperature across pieces so the video does not look like a collage.
- In Remotion, use `<Img src={staticFile('...')}/>` and `<OffthreadVideo/>` for video footage —
  `OffthreadVideo` is what renders the correct frame.

---

## 6. The company watermark

The company's mark **stays identifiable throughout the video**, as a visual signature.

- It uses the client's **official logo** (the supplied file, never redrawn by hand).
- It sits in a **safe area**, with a constant margin from the edge.
- **Discreet:** typically 6–10% of the width on desktop, 10–14% on mobile.
- **Opaque enough to identify, not enough to dominate** — generally 0.55 to 0.8, tuned to the background.
- **Contrast guaranteed:** on a light background use the dark variant, on a dark background the light
  one. If the background changes through the video, switch the variant per scene or add a soft shadow
  behind it.
- **Never over text or an important element.** Where there is a risk of overlap, move it to the
  alternative safe area (the opposite corner) for that scene.
- **Proportion and quality preserved** — never stretched; exported at a resolution sufficient for 1920px.

> **Do not confuse it with the Angatu credit (R17).** The watermark is the **client's**. The
> "Desenvolvido por Angatu Sistemas" credit stays in the page footer, as in every project.

```tsx
// Marca d'água em área segura, com reposicionamento por cena
const Watermark: React.FC<{corner: 'br' | 'bl'; safeArea: number; scale: number}> = ({corner, safeArea, scale}) => (
  <AbsoluteFill style={{padding: safeArea, alignItems: corner === 'br' ? 'flex-end' : 'flex-start', justifyContent: 'flex-end'}}>
    <Img src={staticFile('brand/logo-light.png')} style={{width: 220 * scale, opacity: 0.7}} />
  </AbsoluteFill>
);
```

---

## 7. Rendering and optimising the video

```bash
# desktop — H.264 para compatibilidade universal, sem faixa de áudio
npx remotion render src/index.ts HeroDesktop out/hero-desktop.mp4 --codec=h264 --crf=23 --muted
# mobile — composition própria, não recorte do desktop
npx remotion render src/index.ts HeroMobile  out/hero-mobile.mp4  --codec=h264 --crf=24 --muted
# variante moderna, menor: WebM/VP9 (a página oferece as duas fontes)
npx remotion render src/index.ts HeroDesktop out/hero-desktop.webm --codec=vp9 --crf=32 --muted
# pôster: quadro representativo, é ele que aparece antes do vídeo e com movimento reduzido
npx remotion still  src/index.ts HeroDesktop out/hero-poster.jpg --frame=45
```

**Budget — not a suggestion, a limit:**

| Asset | Target | Ceiling |
|---|---|---|
| Desktop video | ≤ 1.5 MB | 2.5 MB |
| Mobile video | ≤ 800 KB | 1.2 MB |
| Poster | ≤ 120 KB | 200 KB |
| Duration | 8–15 s | 20 s |

Over the ceiling? Shorten it, drop the resolution (1600×900 is enough for most heroes), raise the `crf`,
cut a scene, or simplify the movement — never ship an 8 MB hero. Remember that under the no-cache
default (R25) this file is downloaded **on every visit**: this is the case where it is worth raising the
cache exception with the client, with hashed assets (`cache.md`, `frontend-build.md`).

On the page: `preload="metadata"` for the hero, and `preload="none"` plus `loading="lazy"` for a video
below the fold.

---

## 8. The `<body>` background SVG — themed, exclusive, legible

**The landing's background is never visually empty.** It gets an SVG drawn for **that** sector — never
the same SVG reused from another project.

**The SVG must:** be detailed and visually interesting · speak directly of the sector · complement the
content · create depth and identity · use shapes, patterns, illustrations or abstractions from the
client's world · work on desktop and mobile · be light · **not harm the legibility of the text** · not
compete with the main elements.

**Vocabulary by sector — a starting point, not a fixed recipe:**

| Sector | Visual vocabulary |
|---|---|
| Construction | plans, dimensions, trusses, cranes, rebar mesh, metal profiles |
| Clinic / health | organic curves, heartbeat, cells, instruments, calm gradient |
| Restaurant | ingredients, steam, table textures, utensils, tile patterns |
| Haulage | routes, road networks, containers, delivery timeline, stylised map |
| Law firm | columns, seals, paper textures, guilloche, typography as ornament |
| Technology | network topology, isometrics, data grids, circuits |

**Legibility comes before beauty** (priorities 3 and 4 of R20). Over the SVG, keep the content layer on
its own surface, a brand-coloured veil (70–85%) or a darkening gradient — and **measure**: 4.5:1 for
body text. If the text is borderline, the background gives way, not the text.

```css
/* Fundo temático + véu que garante contraste, sem custo de repaint no scroll */
body {
  background-color: var(--surface);
  background-image: url('/assets/bg-<segmento>.svg');
  background-size: cover;
  background-attachment: fixed;         /* trocado por scroll no mobile, ver abaixo */
  background-position: center top;
}
@media (max-width: 767px) {
  body { background-attachment: scroll; background-image: url('/assets/bg-<segmento>-mobile.svg'); }
}
@media (prefers-reduced-motion: reduce) { body { background-attachment: scroll; } }
.section-content { background: color-mix(in oklch, var(--surface) 82%, transparent); }
```

**Mobile is not the desktop shrunk.** An SVG full of fine detail turns to mud at 390px: deliver a
simplified variant with fewer elements and heavier strokes. `background-attachment: fixed` is expensive
on a phone — use `scroll`.

**Weight:** ≤ 60 KB after optimisation (SVGO in the build). If it is over that, the drawing is too
detailed for a background — simplify, reduce the node count, replace repeated detail with `<pattern>` and
`<use>`, and save the fine detail for section illustrations.

**Decoration is decoration:** an inline background SVG carries `aria-hidden="true"`, and never holds
information that exists nowhere else.

> **One background only.** `paint.md` requires intentional generated art on every frontend; on a landing
> **this themed SVG fulfils that requirement**. Choose one: the themed SVG **or** the generative canvas
> (`canvas-generative.md`). Together they fight each other, weigh twice as much, and signal a lack of
> direction.

---

## 9. Visually poor sections

Walk through **every** section and ask: *"essa informação poderia ser comunicada visualmente de uma
maneira melhor?"*

If a section is excessively textual, static or thin, consider: motion graphics · an illustrative SVG · a
micro-animation · a diagram · a process animation · an animated screenshot · a real photo · real video ·
a photo-plus-graphic composition · a product demonstration · an interactive visual element.

**Every visual element needs a function you can state in one sentence:** to explain, demonstrate,
highlight, contextualise or reinforce the identity. If you cannot say in one sentence what it does for
the visitor, it is ornament — and ornament costs weight, DOM nodes and battery while returning nothing.
**Do not add animation for its own sake.**

For an inner section the order of preference is: **native CSS** (`css-native.md`) → animated SVG → short
video. Video in an inner section only when it demonstrates something a still image cannot.

---

## 10. Performance

- **SVG:** optimised in the build (SVGO), `<pattern>` and `<use>` instead of repeated nodes, no editor
  metadata.
- **Images:** real dimensions matching the displayed size, `width` and `height` in the HTML (avoids CLS),
  `loading="lazy"` below the fold, a modern format with a fallback.
- **Video:** the budget in section 7, correct `preload`, always a poster, and never two videos playing
  at once on the same screen.
- **DOM:** a complex illustration becomes `<img src="*.svg">`, not 4,000 inline nodes. Inline only the
  SVG that has to be animated or themed by CSS.
- **Simultaneous animation:** few, and one at a time; only `transform`, `opacity`, `clip-path` and
  `filter`.
- **The phone sets the ceiling:** test on a modest device. If the hero stutters while scrolling, cut
  movement — do not compensate with more.

---

## 11. Development layout

In the temporary authoring workspace:

```
hero-<cliente>/
  src/
    Root.tsx            # compositions (uma por proporção)
    scenes/             # uma cena por arquivo, parametrizada por props
    components/         # marca d'água, títulos, cartelas, transições
    data/copy.ts        # textos, cores e caminhos — nunca no meio da cena
  public/
    brand/              # logos oficiais do cliente
    footage/            # fotos e vídeos reais, já tratados
  out/                  # renderizações
```

What remains in the application is only this:

```
src/main/resources/public/assets/
  hero-desktop.mp4  hero-desktop.webm
  hero-mobile.mp4   hero-mobile.webm
  hero-poster.jpg
  bg-<segmento>.svg  bg-<segmento>-mobile.svg
```

Compositions stay parameterised and editable, and scene code stays readable during development (R18) —
even knowing the workspace will be deleted. The script has to be comprehensible while it is being made,
and `CLAUDE.md` has to record enough to recreate it.

---

## 12. Visual identity — the final test

Every landing must look **made specifically for that company**. Taking a generic visual structure and
swapping only the logo, text, colours and images is forbidden.

Layout, background SVG, motion graphics, hero composition, illustrations, animation and image treatment
all consider the sector and the identity: a construction firm, a clinic, a restaurant, a haulage company,
a law firm and a technology company must come out **visibly different** — not the same page with a
different palette.

**The test:** cover the logo and the text. Can you still tell what industry the company is in? If not,
the identity is not there yet.

---

## 13. Checklist

- [ ] `<body>` background with a themed SVG **exclusive** to this project, with a mobile variant
- [ ] Text contrast over the background measured (≥ 4.5:1)
- [ ] Hero video that **communicates** something rather than decorating
- [ ] Muted, looping, `autoplay muted loop playsinline`, with a poster
- [ ] Desktop **and** mobile compositions planned separately
- [ ] Company watermark present, discreet, in a safe area, legible in both formats
- [ ] Real material used where it exists, clearly related, with **confirmed permission**
- [ ] Everything the video says also available as text (accessibility)
- [ ] `prefers-reduced-motion` shows the poster and does not play the video
- [ ] Weight budget respected (video, poster, SVG)
- [ ] No empty, generic, over-textual or off-theme section
- [ ] Every visual element has a function stateable in one sentence
- [ ] Remotion workspace **deleted**; only the video stayed in the project
- [ ] `CLAUDE.md` records what the video communicates, ratios, duration, material and permissions
- [ ] SVG, image and video optimisation happening **in the build**, not in the source (R18)
- [ ] Rendered on a running server and looked at, desktop and mobile (R21)

---
*Audit and optimisation: Angatu Sistemas*
