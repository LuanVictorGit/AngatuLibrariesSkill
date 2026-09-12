# Landing page intake — backend or static

> Covers gate **G1**. Read this the moment a landing page, homepage or campaign page is requested, and
> **before writing any file**.

---

## 1. The question

> **"Essa landing vai ter backend, ou é um site estático?"**

Ask it first. Not one line of code before the answer, because the two tracks differ in project layout,
deploy shape and how per-URL SEO is delivered — and converting one into the other afterwards means
redoing the scaffolding.

Offer the distinction in terms of what the page has to *do*, since that is what the client knows:

| It needs a backend when the page… | It can be static when the page… |
|---|---|
| receives a form and stores it, or sends an e-mail | links to WhatsApp, a phone number or an external form |
| shows data that changes (stock, prices, availability, a schedule) | shows content that only changes when someone edits it |
| has login, an area for clients, or anything per-person | is the same for every visitor |
| charges money or talks to the AngatuCRM API (R26) | does not transact |
| uses Turnstile-protected forms of its own (R27) | has no form of its own |

If the answer is "a contact form", that is a backend — or an explicit decision to send the form
somewhere else. Do not silently choose one.

Record the answer in `CLAUDE.md` (R2).

## 2. Track A — with a backend

The full Java stack: `backend-server.md`, `backend-routes-html.md`, `deploy-coolify.md`.

**The per-URL `<head>` is the thing to get right.** `HtmlRouteAPI` substitutes `{content}` / `{page}` /
`{%nome_active}` inside a shared shell, and the `<head>` lives in that shell — so by default every URL
ends up with the same `<head>`, which is an incomplete delivery for a public page
(`landing-seo-og.md`). Two ways out, and the project picks one:

1. the landing is a **complete page with its own `<head>`**, served by a dedicated route; or
2. the shell gains markers — `{title}`, `{description}`, `{canonical}`, `{og_image}` — that the route
   fills in before responding.

Testing is through the project's JAR (R29), and the preview loop is `frontend-preview.md`.

## 3. Track B — static

No Java, no Maven, no `Saveable`, no routes. The delivery is **Coolify in Static mode, served by
`nginx:alpine`**, and it still goes through the build pipeline — see `static-site.md` for the layout,
the Dockerfile and the panel configuration.

Two differences that matter while writing:

- **One file per page, each with its own complete `<head>`.** There is no runtime substitution, so
  per-URL SEO and Open Graph are literal: `index.html`, `servicos.html`, `contato.html`, each with its
  own `title`, `description`, `canonical` and `og:image`.
- **No form that posts to itself.** A form goes to WhatsApp, to `mailto:`, or to an external service the
  client already pays for. A static site that pretends to accept a form and silently drops it is worse
  than no form.

Preview is the narrow exception in R29: a temporary static server, shut down afterwards
(`frontend-preview.md`).

## 4. What does not change between the tracks

Everything that makes it an Angatu landing rather than a template:

- the design system and the five-phase pipeline (`paint.md`, `frontend-design.md`);
- Tailwind local, never CDN (R14), and all responsiveness in Tailwind (R15);
- the themed background and the hero motion graphics (`landing-motion.md`);
- copy that does not read as machine-written (`landing-copy.md`), on top of correct PT-BR (R16);
- per-URL SEO with an editorial Open Graph cover per page (`landing-seo-og.md`);
- the Angatu footer (R17);
- source readable, build protects, dist publishes (R18), with obfuscation on (R19);
- the design audit before delivery (`design-audit.md`);
- rendered, looked at, and described (R21).

A static landing is not a lesser landing. It has fewer moving parts, not a lower standard.

## 5. The order of work, once the track is known

1. **Brief.** What the company does, for whom, where, what makes it different, what real material
   exists (photos, videos, documents), and what the client actually says about their own work
   (`landing-copy.md` — vocabulary comes from them).
2. **Authorisations.** Any real photo or video needs confirmed permission to use, recorded in
   `CLAUDE.md` (`landing-motion.md`).
3. **Gates.** G4 (Turnstile) if there are forms; G2 if images will be stored.
4. **Design pipeline.** `paint.md`, phases 1 to 3 — brainstorm, theses, the MASTER system. Validate the
   theses with the client before building.
5. **Structure from the business**, never the default `hero → 3 cards → numbers → testimonials → FAQ`.
   A builder, a clinic and a haulage company do not have the same page.
6. **Build it**, page by page, with the preview loop running (R21).
7. **SEO and covers**, in the same pass — not afterwards (`landing-seo-og.md`).
8. **Audit and deliver** (`design-audit.md`, `testing.md`).

## 6. The test that decides whether it worked

Cover the logo and the text. Can you still tell what industry the company is in?

If not, the identity is not there yet, and swapping the palette will not fix it
(`landing-motion.md`).
