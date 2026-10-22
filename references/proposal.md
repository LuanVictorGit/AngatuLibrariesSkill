# Technical proposals (orçamento técnico) — the PDF module

> Covers R41 and gate G6. **Start here whenever the owner asks for an orçamento, a proposta or a quote
> for a client** — a site, a system, an app, an Instagram setup, any mix. The house template, the build
> and the photo cropper live in the skill's `tools/proposal/`.
>
> **The product is a PDF the client reads on the phone, opened from WhatsApp.** It sells by showing:
> one idea per page, the client's future screens drawn as real mockups, very little text, and plain
> Portuguese. Angatu is the brand of the document; the client is the recipient and appears inside the
> mockups of what they are buying.

---

## 1. Scope

| | This module | Not this module |
|---|---|---|
| What | a proposal or quote document for a client | the contract (`contratos/` on the owner's machine), an invoice |
| Output | one PDF, A4 portrait, about 11 pages | slides, a web page, a `.docx` |
| Brand | Angatu Sistemas, with the client's identity only inside the mockups | the client's own letterhead |
| Gate | G6 | — |

The first proposal built this way (October 2026, approved by the owner) is the visual model, and the
template is that document with the client taken out. The real one stays on the owner's workstation
under `Desktop/AngatuSistemas/orcamentos/`: this repository is public, so no client's name, logo, phone
or price is ever committed here.

---

## 2. Gate G6 — what is asked, and what is never assumed

Read the request first: the owner usually sends the whole deal in one message (what the system does,
the prices, the options). Ask **only** what it leaves open, in one message, and never fill a commercial
term on the owner's behalf.

| Item | Where it comes from | If missing |
|---|---|---|
| Client name, phone, Instagram | the request, the client's logo file, their public profile | ask; never guess a handle |
| Client logo | the file the owner points to (often on the Desktop) | ask — it is official and **never redrawn**; a 150 px file is used small, and the owner is told |
| Scope, item by item | the request | ask |
| Prices, one-time and monthly, and optional items | the request | **ask — never invented** |
| Deadline (prazo) | the owner | leave it out and say so in the delivery message |
| Contract and minimum term | the owner (the site says it is agreed per proposal) | leave it out and say so |
| Validity | default **15 days** from issue | default allowed, stated back to the owner |
| What the monthly fee already includes | <https://angatusistemas.com.br> (FAQ and "O que está incluso") — read it every time | never from memory |
| Angatu's contact data and CNPJ | the same site's footer | never from memory |
| Photos | the client's own, or free stock (section 6) | ask which; stock is marked as illustrative |
| The client's domain | check it: `curl -s -o /dev/null -w "%{http_code}" https://rdap.registro.br/domain/<dominio>` (404 = free) | tell the owner if it is still free |

**Not one page is built before the prices and the scope are known.** Everything defaulted or left out
is listed back in the delivery message, in plain words, so the owner can correct it before sending.

---

## 3. The pages

The template carries eleven blocks; a proposal keeps the ones its scope needs, in this order, and
rewrites every line for the client. Page numbers fill themselves: footers use `{{page}}` and the
cover's index uses `{{pageof:<data-id>}}`, so removing a block renumbers everything.

| Block (`data-id`) | What it shows | Keep it when |
|---|---|---|
| `cover` | eyebrow "Proposta para …", the product or domain as the title, one line of scope, the index **"Neste orçamento"**, the client card with dates, Angatu's CNPJ line | always — **text only, no image** |
| `map` | where customers come from → the address → what they find → what only the client sees | a site or system with several parts |
| `contact` | two phones: one action across two screens (link in bio → contact page) | a link page, WhatsApp, Instagram |
| `site` | the site at desktop width and a search result, plus the ranking honesty note | any site |
| `gallery` | posting from the phone and the result on the site; before/after | a gallery or portfolio the client feeds |
| `tracking-team` | the team's screens in a status workflow and a five-photo strip | a status or tracking system |
| `tracking-customer` | the end customer's three screens: look up, status, e-mail | the same, customer side |
| `poster` | printable QR art on a wall and a phone scanning it | a QR code deliverable |
| `optional` | an add-on with its own price card | anything sold apart |
| `investment` | the main plan, what the fee includes, the optional item, the plain sum | always |
| `next-steps` | four steps, Angatu's contact card with a WhatsApp QR, validity, photo credit | always |

Every inner page follows one shape: an eyebrow naming the deliverable and its address, **one headline
with one idea**, the visual, numbered steps (1, 2, 3) only where there is a real sequence, and at most
one note. Markers on a mockup sit on the element the matching step names. The Angatu lockup and the
page number are in every footer (R17).

A new kind of deliverable gets a new block built from the same pieces (`.phone`, `.browser`, `.search`,
`.steps`, `.note`, `.points`, `.list-card`, `.film-strip`, `.plan`), never a new style.

---

## 4. Identity

- **The document is Angatu's**, and R13 makes it inherit the design system: the tokens in the template
  mirror `ds.css` of <https://angatusistemas.com.br> (`tinta` → `--ink`, `marinho` → `--navy`,
  `papel` → `--paper`, `azul-claro` → `--sky`, `verde-wa` → `--whatsapp`), Bricolage Grotesque for
  display and Inter for text. If the site's tokens change, the template changes in the same commit.
- **The client's identity lives only inside the mockups**: `--client-*` tokens sampled from their logo
  (count the saturated pixels; a JPEG logo reads darker than the real colour), and a display face that
  echoes it (Archivo Expanded for a wide, heavy logo; another OFL face when the logo asks for it).
- **The Angatu logo is the official file** (`assets/angatu-lockup-white.png` on navy, `-navy.png` on
  paper), alpha-keyed from the 1024 px official artwork; never redrawn.
- **R35 applies to print**: no gradient text, no emoji as icons, no blurred blobs, no decorative rule
  on a label. Icons are Lucide (`{{icon:name}}`) and Simple Icons for brands (`{{brand:whatsapp}}`).
- **The cover has no image.** The owner's rule: the cover says what the document is about — the title,
  one line, and the index.

---

## 5. Copy

PT-BR as the owner speaks to a small-business client (R16, `landing-copy.md`): short sentences, "a
gente", the client's own vocabulary ("oficina", "carro pronto", "chamar no WhatsApp"), no em dash as a
rhythm device, none of the marketing words `landing-copy.md` lists.

- **Headlines say what the client gets**: "O link da bio que leva direto para o WhatsApp", not
  "Presença digital completa".
- **Honesty lines stay**: ranking is Google's decision; a public lookup shows no personal data; stock
  photos are illustrative.
- **Mockup data is fictitious and plausible**: plate `ABC1D23`, "Nome completo", `email@cliente.com.br`.
  Never a real person's data, never an invented number, testimonial or result about the client.
- **"e-mail" never breaks at the hyphen**: inside running text it is `<span class="nowrap">e-mail</span>`.
- **Review the text out of the PDF**, not only by eye: `pymupdf` extracts every page; read it once for
  accents, agreement and words that wrap badly.

---

## 6. Photos

A drawn stand-in was rejected as "muito genérico": mockups show **real photos**.

1. **The client's own photos** — best; ask for them (their Instagram is where they usually are).
2. **Free stock from Unsplash** when the owner accepts it. `curl` is refused by Unsplash and Pexels, so
   search in the built-in browser (`/s/photos/<terms>?license=free`), read the result list with a
   small script in the page, and download from the CDN
   (`https://images.unsplash.com/photo-<id>?w=1800&q=85&fm=jpg`). Check the photo page says "Licença da
   Unsplash" — never an Unsplash+ image (`plus.unsplash.com`).
3. **Never drawn, never generated.**

Choosing:
- **Continuity beats variety**: a sequence (received → in progress → ready) uses one colour and one kind
  of object, ideally one photographer's series, so it reads as one job.
- **No foreign plates, logos or shirts with brands** in frame; crop them out.
- **A before/after of two different subjects is a picture-in-picture**, never a split that pretends to
  be one object.
- **Stock is declared**: "Fotos ilustrativas" on the page where they carry meaning, and the credit line
  on the last page.

Cropping (`tools/proposal/crop.py`): 4:3 for daily photos and cards, 1:1 for grids, 9:16 for reel
covers, a free ratio for a site hero; progressive JPEG at 82, so twenty photos stay under 4 MB.

---

## 7. Building

The studio is `~/Desktop/AngatuSistemas/orcamentos/`: shared caches in `_cache/`, one kept folder per
proposal. Python packages go into a virtual environment, **never the global interpreter** — a checker
installed globally once pulled numpy 2 over a pin that other tools on the machine depend on.

```bash
S=~/.claude/skills/AngatuLibrariesSkill/tools/proposal
python -m venv ~/Desktop/AngatuSistemas/orcamentos/.venv
~/Desktop/AngatuSistemas/orcamentos/.venv/Scripts/python -m pip install -r $S/requirements.txt

PY=~/Desktop/AngatuSistemas/orcamentos/.venv/Scripts/python
$PY -X utf8 $S/proposal.py new <cliente>            # folder from the template
$PY -X utf8 $S/crop.py <foto> <cliente>/photos/x.jpg 4:3
$PY -X utf8 $S/proposal.py build <cliente>          # PDF + one PNG per page
$PY -X utf8 $S/proposal.py final <cliente>          # delivery file on the Desktop
```

Edit `proposta.src.html` only; `proposta.html` is generated. Chrome prints it headless; the first
build downloads the OFL fonts and makes static instances, the icons are fetched once and cached.

Traps the build already handles, and must keep handling:

| Trap | What happens | The fix in place |
|---|---|---|
| Variable fonts | Chrome embeds them as Type3: blurry in some viewers, heavier file | static instances via fontTools; the report fails on Type3 |
| CSS `background-image` SVG | rasterised in the PDF | `<img class="bg">` behind the content |
| SVG `<mask>` | rasterised, with a visible seam at its edge | no masks in any asset |
| Flex container + inline `nowrap` span | the span becomes its own flex item and splits the line | the text goes inside one element |
| Device screens | a real phone layout at 390 px would not fit | screens are laid out at 390 px (sites at 1280 px) and scaled with `zoom` by the script at the end |
| Leftover `[[placeholders]]` or placeholder images | the client receives "[[R$ 000]]" | `final` refuses |

---

## 8. Looking at it — the review loop

"It printed" is not done. After every build, **open every PNG in `out/review/`** and check:

- each marker sits on the element its step names;
- nothing is clipped, no line wraps into a single orphan word, no hyphen breaks "e-mail";
- the white space is balanced: a mockup with an empty bottom half gets more content or a smaller frame;
- the photos read as one job where they tell a sequence, and no foreign plate or brand slipped in;
- the extracted text reads right (section 5);
- the report: TrueType fonts only, the only rasters are photos and logos, size under 8 MB, no
  placeholder left.

Zoom into a dense page at 150 dpi or more before calling it right. **The same finding in two
iterations in a row goes to the owner** with the PNG, instead of a third attempt.

---

## 9. Delivery

`final` writes `Desktop/Orcamento-Tecnico-Angatu-<Cliente>.pdf` with Angatu's metadata, and refuses
while anything from the template is left. The proposal folder is kept: a revision edits it and builds
again.

The message to the owner says, briefly: where the file is, what it covers, **every default taken**
(validity, the inclusions read from the site), **what was left out** (deadline, contract), any asset
caveat (a small logo, stock photos) and whether the client's domain is still free.

---

## 10. The house rules on a proposal

**Apply**: R13 (the design system reaches print), R16, R17 (the Angatu lockup on every page), R35, R12
for the tools and the template's identifiers (classes, tokens and comments in English; only the
visible text is Portuguese), R31 for anything committed to this repository.

**Replaced**: R21 by the review loop of section 8 — there is no server; the pages are looked at as
images.

**Do not apply**, because nothing is served: the backend, security and deploy rules (R7 to R10, R14,
R15, R18 to R20, R22 to R25, R27 to R30, R32 to R34) and gates G1 to G4.

---

## 11. Warning signs

| The thought | The reality |
|---|---|
| "No price was given, I'll use the usual one" | G6: prices come from the owner, never from memory. |
| "A three-week deadline is standard" | Left out and said so, unless the owner gives it. |
| "The cover needs a strong image" | The cover is text only: title, one line, the index. |
| "I'll draw the car, it is faster" | Rejected as generic. Real photos: the client's, or Unsplash. |
| "This stock photo has a nice red car" | One colour, one kind of object across a sequence. |
| "Before and after, split in the middle" | Two different subjects → picture-in-picture. |
| "The logo is small, I'll redraw it" | Never. Use it small and tell the owner. |
| "Quick `pip install` into Python" | A venv. A global install already broke a pinned numpy. |
| "It printed, send it" | Look at every page PNG; the report must be clean. |
| "I'll commit this client's proposal as an example" | This repository is public. Client data stays on the machine. |

---

## 12. Done

Every page looked at as an image, the report clean, `final` delivered the PDF, and the owner has read
the list of defaults and omissions.

---
*Original source: the first proposal built and revised with the owner in October 2026 · written and audited by Angatu Sistemas*
