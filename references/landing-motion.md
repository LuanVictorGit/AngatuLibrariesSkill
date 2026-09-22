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
>
> **This file is the landing hero only.** Any other video — an ad, an explainer, a reel, a PHONK edit,
> anything with sound — is `video-production.md` (R37, G5). The hero may borrow that module's planning,
> tools and review loop; its own limits here (muted, looping, weight budget) always win.

---

## 1. What Remotion is here — and what it is not

**Remotion is an authoring studio, and it lives outside the application.** It creates the video from
scratch in `~/Videos/Angatu/<cliente>-hero/`, and what enters the application is **only the rendered
files**. No `node_modules`, no React dependency in the application repository, nothing in its Docker
image, nothing in the frontend build's `package.json`.

The studio itself is **kept**, with its `node_modules` deleted after delivery: a hero gets revised — a
word, a photo, the pace — and rebuilding a studio from nothing to change one word is waste. What is
created from scratch is each new hero, not each revision of the same one.

| | |
|---|---|
| **It is** | a studio outside the application, producing `hero-desktop.mp4`, `hero-mobile.mp4` and the poster |
| **It is not** | an application dependency, a page framework, runtime animation, or part of the build |

This does **not** contradict the rule against swapping a project's technology: the page stays vanilla
HTML, CSS and JS, and receives a `<video>` tag. React lives in the studio, never in the repository.

### 1.1 The mandatory cycle

```
criar o estúdio fora do repositório (~/Videos/Angatu/<cliente>-hero/)  →  compor as cenas
        →  renderizar desktop + mobile + pôster  →  copiar os arquivos para src/main/resources/public/assets/
        →  validar na página, com o servidor rodando (R21, R29)
        →  apagar SÓ o node_modules do estúdio: código e docs ficam para a próxima revisão
        →  registrar no CLAUDE.md da aplicação onde o estúdio está, o que o vídeo comunica,
           proporções, duração e material usado
```

The `CLAUDE.md` record is what makes the video **findable and revisable** later. Without it, months
later nobody knows what that file showed, where the photos came from, or where its source is.

```bash
# fora do repositório da aplicação — nunca dentro de src/
cd ~/Videos/Angatu && npx --yes create-video@latest --yes --blank --no-tailwind <cliente>-hero
# ... compor e renderizar com as ferramentas de video-motion.md ...
cp out/hero-*.mp4 out/hero-poster.jpg <projeto>/src/main/resources/public/assets/
rm -rf ~/Videos/Angatu/<cliente>-hero/node_modules      # o estúdio fica; o peso vai embora
```

Never inside the application's repository: Remotion in the application's `package.json` drags React
into its build and its image, and `create-video --yes` refuses to run inside a Git repository anyway.
The project setup, the render configuration and the tools are the same as for any video
(`video-production.md`, section 7; `video-motion.md`, section 1).

---

## 2. The video behaves like a GIF — no audio

Every landing video produced here is **muted, short and looping**, presented as a high-quality GIF:

- **No audio track.** Render with `--muted`, and put no audio component in the composition at all.
  Unexpected sound on a landing is the fastest way to make a visitor close the tab.
- **No controls.** `muted loop playsinline`, without `controls`.
- **Short, with a natural loop: 8 to 15 seconds.** The last frame should talk to the first so the loop
  does not visibly cut.
- **`muted` is not decoration:** it is what allows autoplay to work on iOS and Android. `playsinline`
  stops the iPhone opening the video full screen.

**Accessibility consequence, and it outranks aesthetics (R20):** a muted video with no controls cannot
be the **only** carrier of any information. Everything the video communicates also exists as text on the
page. The video reinforces; the text informs.

```html
<!-- Hero: vídeo tipo GIF, mudo, com pôster e alternativa textual; a fonte é escolhida por script -->
<div class="relative overflow-hidden rounded-2xl">
  <video
    class="hero-video h-full w-full object-cover"
    poster="/assets/hero-poster.jpg"
    muted loop playsinline preload="none"
    aria-label="Demonstração do processo de montagem realizado pela empresa">
    <img src="/assets/hero-poster.jpg" alt="Equipe montando a estrutura metálica no galpão da empresa">
  </video>
</div>
<script src="/scripts/hero-video.js" defer></script>
```

```js
// Escolhe a fonte do vídeo do hero: formato pela largura, WebM só onde o navegador decodifica,
// nada baixado com movimento reduzido, e o MP4 de reserva se o WebM falhar.
// Caminhos literais e inteiros: o renome de arquivos do build (R19, frontend-build.md) só troca
// o que consegue provar, e caminho montado em tempo de execução congela a pasta inteira.
const FONTES = {
  mobile: { webm: '/assets/hero-mobile.webm', mp4: '/assets/hero-mobile.mp4' },
  desktop: { webm: '/assets/hero-desktop.webm', mp4: '/assets/hero-desktop.mp4' },
};
const video = document.querySelector('.hero-video');
const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)');
const estreito = window.matchMedia('(max-width: 767px)');

function carregar() {
  if (!video || reduzir.matches) return; // o pôster fica e nenhum byte de vídeo é baixado
  const par = estreito.matches ? FONTES.mobile : FONTES.desktop;
  const webm = par.webm && video.canPlayType('video/webm; codecs="vp9"') !== '';
  video.onerror = webm ? () => { video.onerror = null; video.src = par.mp4; video.play().catch(() => {}); } : null;
  video.src = webm ? par.webm : par.mp4;
  video.play().catch(() => {}); // autoplay recusado: o pôster continua na tela
}

carregar();
estreito.addEventListener('change', carregar); // girou o celular ou mudou a janela: troca a fonte
```

**Why a script and not `<source media>`** — tested in Chrome 153 on 2026-09-22: the browser honours the
`media` attribute only when the element loads, and keeps that choice after a resize or a rotation; with
autoplay and preload, a visitor who asked for reduced motion still downloads the file; and a WebM that
fails to decode has no way back to the MP4. The script solves the three, and it is an external file
because the static track's CSP (`script-src 'self'`) blocks inline scripts.

**The breakpoint is measured, not assumed.** 767 px is the starting point; the right one is where
`object-fit: cover` starts cropping what the hero must show (one hero needed 1024 px for its card). Set
it in the script and in the CSS together.

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
- In Remotion, use `<Img src={staticFile('...')}/>` for photos and `<Video>` from `@remotion/media` for
  footage — frame-exact, and it falls back to `OffthreadVideo` for codecs it cannot read.

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

**The Angatu mark in the hero is a question, asked every time**, suggesting yes:

> **"O vídeo do hero leva a marca da Angatu Sistemas?"**

If yes: the official Angatu logo, smaller and quieter than the client's watermark, never competing with
it, never over text. If no: the video carries only the client's mark. Record the answer in `CLAUDE.md`.

> **Either way, the page keeps the Angatu credit (R17).** The watermark in the video is the **client's**;
> the "Desenvolvido por Angatu Sistemas" credit stays in the page footer, as in every project.

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

The render configuration is the one of `video-motion.md`, section 1 — PNG frames, bt709, yuv420p — in
`remotion.config.ts`, so every command below inherits it.

```bash
# desktop — H.264 para compatibilidade universal, sem faixa de áudio
npx remotion render src/index.ts HeroDesktop out/hero-desktop.mp4 --codec=h264 --crf=23 --muted
# mobile — composition própria, não recorte do desktop
npx remotion render src/index.ts HeroMobile  out/hero-mobile.mp4  --codec=h264 --crf=24 --muted
# variante WebM/VP9 — só entra se sair pelo menos 15% menor que o MP4 da mesma composition
npx remotion render src/index.ts HeroDesktop out/hero-desktop.webm --codec=vp9 --crf=32 --muted
# pôster: o quadro vem do dado (POSTER_FRAME em src/data/timeline.ts), nunca digitado
POSTER=$(node -e "import('./src/data/timeline.ts').then((m) => console.log(m.POSTER_FRAME))")
npx remotion still  src/index.ts HeroDesktop out/hero-poster.jpg --frame="$POSTER"
```

**The poster frame is data.** Best: rotate the loop so its most representative moment is frame 0 and set
`POSTER_FRAME = 0` — the poster then matches the first frame (no jump when playback takes over), and the
visitor who asked for reduced motion sees the whole message. A frame number typed on the command line
goes stale the first time the pace changes.

> **Why the colour is tagged.** A hero rendered from JPEG frames came out full-range (`yuvj420p`) and
> untagged; its VP9 version was refused by Chrome with `PIPELINE_ERROR_DECODE` on the first frame, and the
> banner froze on the poster. With PNG frames and bt709, H.264 and VP9 both come out `yuv420p`, limited
> range, bt709 in primaries, transfer and matrix, and both play in Chrome. Before shipping, each file must
> pass `ffprobe -v error -select_streams v:0 -show_entries
> stream=pix_fmt,color_range,color_primaries,color_transfer,color_space -of compact <arquivo>` with
> `yuv420p|tv|bt709|bt709|bt709`, and play in the page's preview (R21) — WebM included.

WebM earns its place by weight: on flat vector art it saved nothing against the MP4; on photographs it
saved about a third. Measure it per hero.

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

On the page: the hero downloads nothing until the script picks its source (`preload="none"`). A video
below the fold also starts at `preload="none"` and gets its source from the same external script when it
nears the viewport (`IntersectionObserver`) — `loading="lazy"` exists for images and iframes, not for
`<video>`.

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

In the studio, kept outside the application:

```
~/Videos/Angatu/<cliente>-hero/
  src/
    Root.tsx            # compositions (uma por proporção)
    scenes/             # uma cena por arquivo, parametrizada por props
    components/         # marca d'água, títulos, cartelas, transições
    data/               # timeline.ts (POSTER_FRAME), copy.ts: textos, cores e caminhos — nunca no meio da cena
  public/
    brand/              # logos oficiais do cliente
    footage/            # fotos e vídeos reais, já tratados
  tools/                # os instrumentos de tools/video/ da skill
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

Compositions stay parameterised and editable, and scene code stays readable (R18) — the studio is kept
for the next revision, and `CLAUDE.md` records where it is and what the video shows.

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
- [ ] Muted, looping, `muted loop playsinline`, with a poster; the source chosen by the external script
- [ ] Desktop **and** mobile compositions planned separately
- [ ] Company watermark present, discreet, in a safe area, legible in both formats
- [ ] The Angatu mark in the video asked and recorded (the footer credit stays either way)
- [ ] Colour tagged bt709 and limited range (`ffprobe`), and every file played in a real browser, WebM included
- [ ] Poster frame taken from the data (`POSTER_FRAME`), not typed
- [ ] Real material used where it exists, clearly related, with **confirmed permission**
- [ ] Everything the video says also available as text (accessibility)
- [ ] `prefers-reduced-motion` shows the poster and does not play the video
- [ ] Weight budget respected (video, poster, SVG)
- [ ] No empty, generic, over-textual or off-theme section
- [ ] Every visual element has a function stateable in one sentence
- [ ] Remotion studio kept outside the application with its `node_modules` deleted; only the rendered
      files entered the project
- [ ] `CLAUDE.md` records where the studio lives, what the video communicates, ratios, duration,
      material and permissions
- [ ] SVG, image and video optimisation happening **in the build**, not in the source (R18)
- [ ] Rendered on a running server and looked at, desktop and mobile (R21)

---
*Audit and optimisation: Angatu Sistemas*
