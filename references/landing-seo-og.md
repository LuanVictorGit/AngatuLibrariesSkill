# SEO and Open Graph — an editorial cover per page

> Audit: Angatu Sistemas · Angatu stack (Javalin + `HtmlRouteAPI` + vanilla, or the static track).
> Applies to every landing page and **every public URL**.
>
> **The expected result:** whoever receives the shared URL understands immediately *"essa é a página
> desta empresa sobre este assunto"*, and not *"esse é o site de alguma empresa"*.
>
> Prioritise: the real logo, specific content, a real image where one exists, the visual identity, a
> professional composition, objective information.
> Avoid: an isolated logo, a generic background, generic text, and the same image across the whole site.

---

## 1. The complete set — it is not just `title` and `description`

Every page delivers, in its own `<head>`:

```html
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">

  <title>Instalação de ar-condicionado em Porangatu | Clima Norte</title>
  <meta name="description" content="Instalação de split residencial e comercial em Porangatu, com equipe própria e garantia de 1 ano no serviço. Orçamento no mesmo dia.">
  <link rel="canonical" href="https://climanorte.com.br/servicos/instalacao-de-ar-condicionado">

  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Clima Norte">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:url" content="https://climanorte.com.br/servicos/instalacao-de-ar-condicionado">
  <meta property="og:title" content="Instalação de ar-condicionado em Porangatu">
  <meta property="og:description" content="Split residencial e comercial instalado por equipe própria, com garantia de 1 ano no serviço.">
  <meta property="og:image" content="https://climanorte.com.br/assets/og/instalacao-ar-condicionado.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Técnico da Clima Norte instalando um split, com a logo da empresa no canto">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Instalação de ar-condicionado em Porangatu">
  <meta name="twitter:description" content="Split residencial e comercial instalado por equipe própria, com garantia de 1 ano.">
  <meta name="twitter:image" content="https://climanorte.com.br/assets/og/instalacao-ar-condicionado.jpg">

  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <link rel="manifest" href="/manifest.webmanifest">
  <script type="application/ld+json">{ "@context": "https://schema.org", "@type": "Service", "...": "só dado real" }</script>
</head>
```

Also include, where they make sense: PWA icons, `robots`, `hreflang`, and structured data of the right
type (`LocalBusiness`, `Organization`, `Service`, `Product`, `FAQPage`).

### 1.1 Serving a per-URL `<head>` in this stack

This depends on which track gate G1 chose (`landing-intake.md`).

**Static track:** nothing to do. Each page is its own file with its own complete `<head>`
(`static-site.md`).

**Backend track:** `HtmlRouteAPI` assembles the page by substituting `{page}`, `{content}` and
`{%nome_active}` inside a base HTML, and the `<head>` lives in that base. So a landing needs one of two
exits:

**Option A, recommended for a landing** — the landing is a **complete page** with its own `<head>`,
served by a dedicated route.

```java
/**
 * Serve a landing de um serviço com o <head> específico da página.
 *
 * @author Angatu Sistemas
 */
public class ServiceLandingRoute extends Route {
    public ServiceLandingRoute() { super("/servicos/{slug}", RouteType.GET, ServiceLandingRoute::handle); }

    /** Aceita apenas slug em minúsculas com hífen: qualquer outra coisa vira 404. */
    private static final java.util.regex.Pattern SLUG = java.util.regex.Pattern.compile("[a-z0-9-]{1,60}");

    private static void handle(Context ctx) {
        String slug = ctx.pathParam("slug");
        if (!SLUG.matcher(slug).matches()) { ctx.status(404); return; }

        String asset = "others/landing-" + slug + ".html";
        if (!AssetsAPI.assetExists(asset)) { ctx.status(404); return; }

        ctx.html(AssetsAPI.readAssetAsString(asset));
    }
}
```

The slug pattern is not cosmetic: the path parameter comes from the client, so it is validated before it
touches the filesystem (R22, and the traversal rule in `security.md`).

**Option B** — the base HTML gains its own `<head>` markers (`{title}`, `{description}`, `{canonical}`,
`{og_image}`) and the route substitutes them before responding.

What does not pass: several URLs delivering the same `<head>`. A landing without its own `title`,
`description`, `canonical` and Open Graph is incomplete.

### 1.2 The crawler does not log in

`og:image` and the page itself have to be **public**, at an absolute `https` URL on the production
domain. A local path (`/home/...`, `file://`, `http://localhost:8080`) is not a share image. A page
behind a session generates no preview.

---

## 2. The image is a cover, not an ornament

**Never use one generic image for every page.** The `og:image` is the **editorial cover** of that URL.
Compose it from: the company logo, the company name, the product or service name, the page's main title,
a real image of the business, identity graphics, brand colours, SVG elements, sector patterns, and one
short piece of information that identifies the content.

**The logo goes into the composition, not alone in the middle of an empty background:**

```
LOGO + imagem/ilustração do negócio + título da página + elemento gráfico da identidade
```

The artwork has to look produced for that company. The brand is identifiable **before** the reader
finishes the title.

### 2.1 One cover per URL

A project with several landings has several covers — same identity, different content:

| URL | Cover |
|---|---|
| `/servicos/instalacao-de-ar-condicionado` | logo + real installation photo + installation title + brand graphics |
| `/servicos/manutencao` | same identity + maintenance visuals + its own title |
| `/sobre` | same identity + the real team or premises + the company name |

Reuse one artwork only when specific covers genuinely cannot be generated, and record the reason in
`CLAUDE.md`.

### 2.2 Real photography before illustration

Where a real photo or video of the company, product, service or location exists, it takes priority in
the composition when relevant. For a local business this is decisive: a photo of the work done conveys
more context than any illustration. Random stock imagery to fill the composition does not. The same
permission rule as `landing-motion.md` applies.

### 2.3 Geographic context

A landing for a city, neighbourhood or region may incorporate the place discreetly **when it is genuinely
part of the content**: "Instalação de ar-condicionado em Porangatu". Never insert a location with no real
relationship to the page.

### 2.4 What the cover must not look like

A square with a centred logo. A generic gradient. A stock photo with text over it. The same artwork on
every page. A generic SaaS banner. An automatic composition with no identity.

---

## 3. Generating the covers

Build a **reusable** process fed by the page data:

```
dados da página (slug, título, subtítulo, foto)
        ↓
logo + identidade visual + cores da marca
        ↓
composição 1200×630
        ↓
/assets/og/<slug>.jpg   (otimizado)
```

Three routes, in order of preference:

1. **Remotion `still`** — the best result, and the studio already exists if the landing has a video hero
   (`landing-motion.md`). One `OgCover` composition parameterised by props, one render per page, and the
   studio is deleted at the end:

```bash
npx remotion still src/index.ts OgCover out/og/instalacao.jpg \
  --props='{"titulo":"Instalação de ar-condicionado em Porangatu","foto":"footage/instalacao-01.jpg"}'
```

2. **Canvas 2D** with the same engine as `canvas-generative.md`: a local generator page draws the
   composition from a pages JSON and exports with `canvas.toBlob()`. No new tooling.

3. **HTML/CSS rendered** by a headless browser, when the project already has that in its pipeline.

Keep the page data in a single file (`docs/design/pages.json`: slug, title, subtitle, photo, schema
type) and generate every cover in a loop. A new page then gets a new cover with no manual work.

**Generation happens in development or in the build; the final file is optimised**
(`frontend-build.md`, `images.md`). What goes to production is the finished `.jpg` in
`public/assets/og/`.

---

## 4. Size, compatibility and weight

| Item | Rule |
|---|---|
| Dimensions | 1200×630 (1.91:1), landscape |
| Format | **JPEG or PNG.** Avoid WebP and AVIF: several preview engines do not render them |
| Weight | ≤ 300 KB (target 150 KB) |
| Colour | sRGB |
| Safe area | critical content inside the central 1000×500, ≥ 60px margin |
| Text | few words, large size, high contrast — the preview is shown small |
| Logo | whole, uncropped, with breathing room |

Test the crop: some apps show the preview almost square. If the title touches the edge or the logo sits
in the extreme corner, it disappears in the crop. Nothing essential in the outer sides.

---

## 5. SEO text cannot be generic either

`title`, `description`, `og:title`, `og:description`, Schema.org and share text all follow
`landing-copy.md`: specific, true, and written for that page.

```
Ruim:  Conheça nossas soluções e descubra como podemos ajudar você.
Bom:   Instalação de split residencial e comercial em Porangatu, com equipe própria
       e garantia de 1 ano no serviço.
```

The description explains what the visitor finds at that URL. And **nothing invented**: no rating, no
client count, no award, no certification that did not come from supplied data.

**Coherence between text and image.** A service page shows the service. A product page shows the
product. An institutional page shows the company. Beautiful artwork unrelated to the URL's content is an
error, not a style.

---

## 6. A new landing is not done until the cover is done

Creating a landing includes, in the same pass: **page content + SEO + Open Graph + share image + favicon
and identity where needed**. There is no "SEO comes later" — the page and its share identity are born
together.

---

## 7. Validation, page by page

1. Its own `title`.
2. Its own `description`.
3. A correct, absolute `canonical`.
4. `og:title` matches the page.
5. `og:description` matches the page.
6. `og:url` is the correct URL.
7. `og:image` exists and is publicly reachable.
8. The image does not point at a local path.
9. Dimensions declared in `og:image:width` / `height`.
10. Logo present where a logo exists.
11. The image visually represents the page.
12. Twitter/X configured (`summary_large_image` plus title, description and image).
13. Schema.org of the content's real type.
14. Nothing invented.
15. No generic image reused without need.

```bash
LP=src/main/resources/public

# páginas sem canonical, sem og:image ou sem description
grep -L "rel=\"canonical\"" $LP/*.html
grep -L "og:image"          $LP/*.html
grep -L "name=\"description\"" $LP/*.html

# og:image apontando para caminho local ou relativo
grep -rn "og:image\" content=\"\(\.\|/\)" $LP --include="*.html"
grep -rn "og:image.*localhost" $LP --include="*.html"

# a mesma capa repetida em todas as páginas
grep -rhoE "og:image\" content=\"[^\"]+" $LP --include="*.html" | sort | uniq -c | sort -rn

# capas geradas e seus pesos
ls -lh $LP/assets/og/
```

After the build, validate the dist: the same checks run over `dist/public`, and the build already fails
when a `meta` tag is lost relative to the source (`frontend-build.md`). Then test the real preview by
pasting the production URL into a messaging app before calling it delivered.

---
*Audit and optimisation: Angatu Sistemas*
