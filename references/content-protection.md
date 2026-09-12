# Content protection — media and text on screen

> Covers R30. Images and videos that are on the page **as presentation** are protected from casual
> saving, and page text is protected from casual copying.
>
> **Be honest about what this is.** Like obfuscation (R20), this raises the cost of the easy path. It
> stops right-click → *Save image as*, drag-to-desktop, and select → Ctrl+C. It does **not** stop
> devtools, the network tab, view-source, a screenshot, or `curl`. Anything that reached the browser can
> be extracted by someone who wants it.
>
> Real protection of media is in section 5, and it lives on the server.

---

## 1. The boundary that makes this safe

R20's priority order governs here exactly as it governs obfuscation: **accessibility (3) outranks
hardening (8)**. So this is applied **selectively**, never globally.

### What is protected

- Gallery photos, portfolio work, completed jobs, product photography;
- the hero video and any section video (`landing-motion.md`);
- client-supplied photos and institutional footage;
- illustrations, themed backgrounds and generated art;
- presentational text: headings, marketing copy, descriptions, institutional text.

### What is never protected — and blocking it is a defect

This list exists because blocking these creates support calls and hurts the people paying for the site:

- **Anything the visitor needs to copy:** an address, a phone number, a WhatsApp number, an e-mail, a
  PIX key or code, an order or tracking number, a protocol, a coupon, a price they are sending to
  someone, a bank slip line, an error code they are reporting to support;
- **form fields** — inputs, textareas and anything `contenteditable` stay fully selectable and pasteable;
- **any content in an application screen** where the user is working with their own data. This whole
  rule is about presentational surfaces, not about the product's working area;
- **the logo and legal text** in the footer;
- **anything a screen reader must read**, which is everything — see section 4.

A protection that blocks a phone number is not protection. It is a bug with a rationale.

---

## 2. Images

```html
<figure class="protected-media">
  <img src="/assets/galeria/obra-01.jpg"
       alt="Estrutura metálica montada no galpão da Transportadora Rio Verde"
       width="1200" height="800" loading="lazy" draggable="false">
</figure>
```

```css
.protected-media img,
.protected-media video {
  -webkit-user-drag: none;          /* impede arrastar para a área de trabalho */
  user-select: none;
  -webkit-touch-callout: none;      /* impede o menu de salvar no iOS */
}
```

```js
/**
 * Bloqueia o menu de contexto apenas sobre mídia de apresentação.
 *
 * <p>O bloqueio é por elemento, nunca na página inteira: menu de contexto global
 * atrapalha quem usa o navegador de boa-fé e não impede ninguém de salvar a imagem
 * por outro caminho.</p>
 */
document.querySelectorAll('.protected-media img, .protected-media video')
  .forEach(function (el) {
    el.addEventListener('contextmenu', function (evento) { evento.preventDefault(); });
    el.addEventListener('dragstart',   function (evento) { evento.preventDefault(); });
  });
```

**The right-click block is per element, and that distinction matters.** A page-wide
`document.oncontextmenu = false` is forbidden: it takes away *Open in new tab*, *Back*, *Inspect* and
*Translate* from every honest visitor, on every part of the page, and stops nobody. Blocking it on a
gallery image is a narrow, defensible deterrent. Blocking it on the document is punishing the wrong
person.

**The transparent overlay**, for media that matters more:

```html
<figure class="protected-media">
  <img src="/assets/galeria/obra-01.jpg" alt="..." draggable="false">
  <span class="media-shield" aria-hidden="true"></span>
</figure>
```

```css
.protected-media { position: relative; display: block; }
.media-shield { position: absolute; inset: 0; }
```

The shield catches the long-press and the right-click before they reach the image. It is `aria-hidden`
and has no text, so it changes nothing for a screen reader — but note it also intercepts clicks, so do
not use it on an image that has to be clickable (a lightbox trigger, a link). In that case keep the
listeners and skip the shield.

**Do not reach for `background-image` to hide the URL.** It removes `alt`, removes the image from image
search, and breaks the `width`/`height` that prevents layout shift — priorities 3 and 4 losing to
priority 8, which R20 does not allow. The URL is visible in the network tab anyway.

---

## 3. Video

```html
<video class="hero-video"
       poster="/assets/hero-poster.jpg"
       autoplay muted loop playsinline preload="metadata"
       controlslist="nodownload noremoteplayback"
       disablepictureinpicture
       oncontextmenu="return false"
       aria-label="Demonstração do processo de montagem realizado pela empresa">
  <source src="/assets/hero-desktop.mp4" type="video/mp4">
</video>
```

- `controlslist="nodownload"` removes the download item from the native menu. It only matters when the
  video has controls at all — a hero video has none (`landing-motion.md`).
- `disablepictureinpicture` stops the float-out player, which is a common capture path.
- The `<source>` URL is still readable in the network tab. If the footage genuinely must not be
  downloadable, it does not belong in a public page — see section 5.

The watermark is what actually survives copying: a client logo burned into the video frames identifies
the material wherever it ends up (`landing-motion.md`).

---

## 4. Text

```css
/* Bloco de apresentação: título, texto institucional, descrição. */
.no-copy,
.hero h1, .hero p,
.secao-institucional {
  user-select: none;
  -webkit-user-select: none;
}

/* O que continua selecionável, sempre. Esta regra vem depois e vence. */
.selectable,
address, .contato, .telefone, .email, .codigo, .pix, .pedido,
input, textarea, select, [contenteditable] {
  user-select: text !important;
  -webkit-user-select: text !important;
}
```

```js
/**
 * Impede a cópia de texto de apresentação.
 *
 * <p>Só atua quando a seleção está inteiramente dentro de um bloco marcado como
 * não copiável. Seleção em campo de formulário, em dado de contato ou em código
 * que o visitante precisa copiar passa normalmente.</p>
 */
document.addEventListener('copy', function (evento) {
  var selecao = document.getSelection();
  if (!selecao || selecao.isCollapsed) return;

  var no = selecao.anchorNode;
  var elemento = no && no.nodeType === 1 ? no : no && no.parentElement;
  if (!elemento) return;

  if (elemento.closest('.selectable, input, textarea, [contenteditable]')) return;
  if (elemento.closest('.no-copy')) evento.preventDefault();
});
```

**`user-select: none` and screen readers.** It does not hide text from assistive technology — a screen
reader reads the accessibility tree, not the selection. But it does break:

- **browser translation flows** that rely on selection;
- **the "select and search" gesture** many people use on a phone;
- **zoom users** who select text to track where they are while reading.

So it goes on presentational blocks and nowhere else. If a section carries information someone would
reasonably want to keep, it is not a presentational block.

**Never block the keyboard.** Intercepting `Ctrl+C`, `Ctrl+U`, `Ctrl+S`, `F12` or `Ctrl+Shift+I` is
forbidden — the same prohibition as `debugProtection` in `frontend-build.md`. It breaks keyboard
navigation, it breaks accessibility tooling, and it is trivially bypassed. The `copy` event above is
enough and costs nothing.

---

## 5. What actually protects media — and it is on the server

Everything above is deterrence. When the material genuinely must not be taken, the answer is
architectural:

- **Watermark it.** A visible client mark on gallery images and burned into video frames survives every
  copy path. This is the only measure that works after the file has left.
- **Publish a reduced version.** Public pages get a web-sized, watermarked image; the full-resolution
  original is never served publicly. For a portfolio, 1200px wide is plenty — nobody prints from it.
- **Gate the original behind a route.** Store originals outside the public folder and serve them through
  an authenticated route that checks the session and the tenant (`security.md`). A file in a static
  folder is public to anyone who learns the address.
- **Rate-limit the media route** so a scraper cannot walk the whole gallery (`security.md`).
- **Do not expose a predictable index.** Sequential names (`foto-01.jpg` … `foto-99.jpg`) let anyone
  enumerate the set in one loop. Name by generated ID (`images.md`).
- **Keep `Referer` checks in perspective** — they stop inline hotlinking from another site, which is a
  bandwidth problem, not a copying one. They are trivially forged.

The rule of thumb: if losing the file would actually harm the client, it does not belong in a public
page at full quality. Decide that with the client before building the gallery, not after.

---

## 6. Applying it, and what to write down

The set of protected surfaces is a project decision, recorded in `CLAUDE.md` (R2) next to the other gate
answers:

```markdown
### Decisões registradas deste projeto
- Proteção de conteúdo (R30): galeria e vídeo do hero protegidos; telefone, endereço,
  WhatsApp e código do pedido permanecem selecionáveis. Originais em /data/uploads,
  servidos com marca d'água em 1200 px.
```

The scripts live in an external file like every other page script — never inline, or the content
security policy blocks them (`frontend-build.md`).

---

## 7. Checklist

- [ ] Protection applied to presentational media and text only, never page-wide
- [ ] `contextmenu` blocked **per element**, never on `document`
- [ ] Phone, address, e-mail, PIX, order and tracking codes still selectable
- [ ] Form fields and `contenteditable` untouched
- [ ] No keyboard shortcut intercepted (`Ctrl+C`, `Ctrl+U`, `F12` and friends)
- [ ] No devtools-detection loop
- [ ] `alt` preserved on every image — no `background-image` used to hide a URL
- [ ] Video with `controlslist="nodownload"` and `disablepictureinpicture`
- [ ] Watermark present on gallery and video material
- [ ] Public images are reduced versions; originals gated behind an authenticated route
- [ ] Media route rate-limited and file names non-sequential
- [ ] Screen reader still reads everything; keyboard navigation intact
- [ ] Checked by looking, at both widths, with a keyboard (R21)
- [ ] Decision recorded in `CLAUDE.md`
