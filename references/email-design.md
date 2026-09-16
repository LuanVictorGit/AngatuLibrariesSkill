# E-mail HTML — the design system, in markup a mail client understands

> Covers R13 (the design system reaches every rendered surface) and R17 (the Angatu footer). An e-mail
> is not an exception to the design system — it is the design system under harsher constraints.
>
> Saying "follow the design system" without saying **how** is what produces a broken e-mail. The
> tokens are the same; the way they are expressed is not.

---

## 1. Same tokens, no parallel palette

Colours, typographic scale, spacing rhythm, corner radii and button shape come from the project's
`docs/design/MASTER.md` and `styles/ds.css` (`paint.md`). An e-mail never invents its own blue, its own
heading size or its own button.

What changes is only the mechanism: `ds.css` declares them as custom properties for a browser; the
e-mail carries the **computed value** inline, because no mail client will read your stylesheet.

```
ds.css              →  e-mail
--brand-600: #101073   →  style="background:#101073"
--radius-md: 8px       →  style="border-radius:8px"
--space-6: 24px        →  style="padding:24px"
--text-lg: 18px/1.5    →  style="font-size:18px;line-height:1.5"
```

When the project's palette changes, the templates change with it. A template still carrying last
season's brand colour is a design-system violation, not a cosmetic detail.

## 2. The translation rules

These are constraints of the medium, not preferences. Breaking one does not look slightly worse — it
breaks in Outlook, or in Gmail's clipping, or on a phone.

- **Layout in `<table>`**, not `div` + flex/grid. Nested tables for columns.
- **CSS inline**, in `style` attributes. No external stylesheet, no `<style>` block you depend on (a
  `<style>` block may be used for progressive enhancement, never for anything structural), no CSS
  custom properties — Outlook does not resolve `var()`.
- **Fixed content width of 600px**, inside a full-width wrapper table. Below that, fluid.
- **Pixels, never `rem` or `em`** for sizing.
- **No `<script>`.** It is stripped, and it marks the message as suspicious.
- **System font stack.** A webfont fails silently in most clients, so the fallback is what most people
  actually see — choose it deliberately rather than letting it default to Times:
  `font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;`
- **Absolute `https://` URLs for every image and link**, pointing at the production domain. A relative
  path resolves to nothing once the message has left the server.
- **No background image carrying meaning**, and no `position`, `float` or negative margin.

## 3. A button that survives

A styled `<a>` alone collapses in Outlook. Use a table cell as the button surface:

```html
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" bgcolor="#101073" style="border-radius:8px;">
      <a href="https://SEU-DOMINIO/pedidos/123"
         style="display:inline-block;padding:14px 28px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
        Ver meu pedido
      </a>
    </td>
  </tr>
</table>
```

The padding lives on the `<a>` so the whole area is clickable; the `bgcolor` lives on the `<td>` so
clients that drop `background` still show the shape.

## 4. The message has to work with images off

Many clients block images by default, and a good number of people never turn them on. So:

- **`alt` on every image**, written as the sentence the reader should get instead of the picture.
- **Nothing essential exists only in an image.** A price, a date, a code or a confirmation lives in
  text. An e-mail whose entire content is one exported banner is unreadable to half its recipients and
  reads as spam to the filters.
- **Preheader text**: the first line the inbox shows next to the subject. Set it deliberately, hidden
  in the body, or the client grabs whatever text comes first — usually "Ver no navegador".

```html
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">
  Seu pedido #123 foi confirmado e já está em preparação.
</div>
```

- **`width` and `height` attributes on every image**, so the layout does not collapse before they load.

## 5. Dark mode

Declare support and avoid the extremes — pure white and pure black are what clients invert most
aggressively, often turning your text invisible:

```html
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
```

Use the project's off-white and ink tokens rather than `#ffffff` and `#000000`, and never rely on a
transparent PNG logo whose dark strokes vanish on an inverted background — that is exactly why the
project keeps two logo files (section 7).

## 6. Structure of a template

```
src/main/resources/emails/
  base.html          # wrapper, header, footer — o esqueleto compartilhado
  welcome.html       # conteúdo específico
  order-confirmed.html
```

Placeholders are `{{nome}}`, filled by `EmailAPI.loadHtmlTemplate` (`backend-utilities.md`):

```java
String html = EmailAPI.loadHtmlTemplate("/emails/welcome.html", Map.of(
        "nome", user.getName(),
        "linkPedido", AngatuLib.getInstance().getOriginHost() + "/pedidos/" + order.getId()));
EmailAPI.sendHtml(user.getEmail(), "Bem-vindo à Loja", html);
```

Build the absolute URL from `getOriginHost()` rather than writing the domain into the template, so
development and production do not diverge.

**`emails/**` is never transformed by the build** — not minified, not obfuscated, no renaming of any
kind (class, custom property, `data-*`, file or folder), no asset hashing, and **no comment removal**
(R19's exclusion list, `frontend-build.md`). A mail client does not execute JavaScript, and the file
leaves the domain entirely.

The comments are the part worth being explicit about, because the rule everywhere else is that the dist
carries none. `<!--[if mso]>` is a **functional** conditional comment: it is how Outlook — the most
common corporate client there is — receives the table layout written for it. Stripping it hardens
nothing and breaks the e-mail exactly where it matters most.

## 7. The Angatu footer (R17)

Every e-mail that has a footer carries the development credit. In e-mail the logo is served by an
absolute URL from the production domain — a mail client renders neither SVG nor a relative path:

```html
<a href="https://angatusistemas.com.br" target="_blank" rel="noopener"
   style="display:inline-block;text-decoration:none;color:#5A5A66;">
  <span style="font-size:13px;vertical-align:middle;">Desenvolvido por</span>
  <img src="https://SEU-DOMINIO/images/angatu-sistemas-escuro.png"
       alt="Angatu Sistemas" width="76" height="26"
       style="vertical-align:middle;margin-left:8px;border:0;">
</a>
```

**The logo is an official file and is never redrawn.** The Angatu shield has circuit strokes specific to
the identity; any hand-made version is wrong however close it looks. Fetch it from an existing Angatu
product:

```bash
curl -sL -o src/main/resources/public/images/angatu-sistemas.png \
  https://fastcurriculo.angatusistemas.com.br/images/angatu-sistemas.png
```

The file is white on transparent, made for a dark background. For the light background the systems use,
generate a tinted variant preserving the alpha channel byte for byte — only the colour changes, the
shapes stay identical:

```java
int alfa = (origem.getRGB(x, y) >>> 24) & 0xFF;
destino.setRGB(x, y, (alfa << 24) | (r << 16) | (g << 8) | b);  // azul da marca: #101073
```

Commit both: `angatu-sistemas.png` (white, dark background) and `angatu-sistemas-escuro.png` (blue,
light background).

When the client has a brand of their own in the e-mail, it is theirs at the top and Angatu's credit in
the footer — the two never merge (`landing-motion.md`).

## 8. The copy is Portuguese, and it is reviewed

R16 applies to e-mail exactly as it applies to a screen: accents, commas, agreement and meaning
reviewed before sending. And the anti-machine-writing pass of `landing-copy.md` applies too — a
transactional e-mail that opens with "Estamos muito felizes em tê-lo conosco nesta jornada" is the same
failure as a generic landing headline.

Say what happened, what it means and what to do next. Subject lines describe the message, not the
company.

## 9. Verification — look at it (R21)

An e-mail is a rendered surface, so it gets the same treatment as a page:

1. Render it through `EmailAPI.loadHtmlTemplate` with realistic data.
2. Serve it from a **development-only** route on the running JAR — never a static server (R29):

```java
/**
 * Pré-visualização de e-mail, apenas em desenvolvimento.
 *
 * @author Angatu Sistemas
 */
public class EmailPreviewRoute extends Route {
    public EmailPreviewRoute() { super("/dev/emails/{nome}", RouteType.GET, EmailPreviewRoute::handle); }

    private static void handle(io.javalin.http.Context ctx) {
        if (!AngatuLib.getInstance().isLocalhost()) {        // nunca em produção
            ctx.status(StatusCode.NOT_FOUND.code()); return;
        }
        ctx.contentType("text/html").result(
                EmailAPI.loadHtmlTemplate("/emails/" + ctx.pathParam("nome") + ".html", sampleData()));
    }
}
```

3. Open it in the browser at **600px and at 375px**, and say what you see (`frontend-preview.md`).
4. Check it with images blocked — that is the state half the recipients are in.
5. Send one real message to a live inbox before calling it done. Gmail and Outlook are the two that
   actually matter, and neither behaves like the preview.

The preview route is itself a rendered surface, but an internal one: it follows the tokens and is
exempt from SEO and Open Graph (R13).

## 10. Checklist

- [ ] Colours, sizes, spacing and radii taken from `MASTER.md` / `ds.css`, not invented
- [ ] Table layout, inline CSS, 600px content width, no `var()`, no flex or grid
- [ ] System font stack with a deliberate fallback
- [ ] Buttons built as a table cell, not a bare styled link
- [ ] `alt` on every image; nothing essential exists only in an image
- [ ] Preheader set deliberately
- [ ] `width` and `height` on every image
- [ ] `color-scheme` declared; no pure white or pure black
- [ ] Every URL absolute `https://` on the production domain
- [ ] Angatu footer present, logo from the official file (R17)
- [ ] PT-BR reviewed, and free of machine-written phrasing (R16)
- [ ] Rendered, opened at 600px and 375px, and checked with images off (R21)
- [ ] One real message sent to a real inbox
- [ ] `emails/**` excluded from every build transformation
