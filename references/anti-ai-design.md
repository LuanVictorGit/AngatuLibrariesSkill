# Visual tells — design that reads as machine-generated

> Covers R35. `landing-copy.md` keeps the text from sounding machine-written. This file does the same
> for the layout, and the two are equally visible to a client: a page can have flawless copy and still
> announce itself at a glance.
>
> **This is not a ban on decoration.** It is a ban on *defaults* — the handful of moves that appear in
> every generated interface, which is exactly what makes them read as generated. A deliberate choice
> that happens to use one of them, inside a real visual identity, is a different thing (section 4).

---

## 1. The dash before the label

The one that started this file:

```html
<!-- ERRADO — o traço é o vício -->
<p class="eyebrow"><span class="dash"></span> COMANDA ABERTA</p>
```

```css
.dash { width: 24px; height: 2px; background: var(--accent); }
```

A small coloured rule before an uppercase, letter-spaced label. It shows up on every generated
interface because it is free: it adds "design" without a decision behind it. It carries no
information, it is not part of any brand, and a reader who has seen three of these recognises the
fourth immediately.

**The eyebrow label itself is fine.** Small caps, letter-spaced, a muted colour above a heading is a
legitimate typographic device and it stays. What goes is the decorative rule bolted to its left:

```html
<!-- CERTO — o rótulo continua, o enfeite sai -->
<p class="eyebrow">Comanda aberta</p>
```

```css
.eyebrow {
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
```

If the label needs more separation from what is above it, that is a spacing problem, and spacing is
what solves it — not a 24-pixel line.

---

## 2. The rest of the family

The dash never travels alone. These are the siblings, and a page with three of them looks generated no
matter how good the copy is:

| Tell | Why it reads as generated | What to do instead |
|---|---|---|
| Decorative rule before or under a label | adds "design" with no decision behind it | spacing, weight, colour |
| Violet→pink or indigo→cyan gradient | the default palette of every generated page | the project's real palette (`paint.md`) |
| Gradient text on a heading | never chosen for a reason, always for effect | solid colour; let the type carry it |
| Blurred colour blobs floating behind the hero | pure filler, and expensive to paint | real material, or nothing (`landing-motion.md`) |
| Glass card — `backdrop-blur` on everything | one effect applied everywhere instead of hierarchy | surfaces from `ds.css`, contrast from tokens |
| Emoji as a section or feature icon | a placeholder that shipped | a real icon set, or no icon |
| ✨ 🚀 🔥 in headings or buttons | same | words |
| Pill badge with a pulsing dot ("● Ao vivo") | decoration pretending to be status | show the state only when there is one |
| Three feature columns, circled icon on top | the default shape of a generated section | a layout that follows this project's content |
| Everything centred inside a narrow column | the safe default, applied to the whole page | vary alignment and width by section |
| Uniform oversized radius on every element | one value applied without hierarchy | the radius scale in `ds.css` |
| Heading at weight 800 with tight tracking everywhere | one emphasis level used as the whole scale | the type scale (`frontend-design.md`) |

None of these is illegal on its own. **What is forbidden is reaching for them by default** — and the
reliable signal is that you cannot say why this page has one. If the answer to "why is that dash
there" is "it looked bare", it comes out.

---

## 3. The check, and when to run it

It is an eye check, so it belongs to the preview loop (R21, `frontend-preview.md`), not to a grep. When
the page is rendered in front of you, ask it once:

> **Could this be a screenshot of any other product?**

If yes, the page is generic, and generic is what "AI look" actually means. What makes it specific is
the client's material: their photography, their palette, their words, the shape of their actual
content (`brand-landingpage.md`, `landing-motion.md`).

A useful second pass: cover the logo and the copy, and look only at the shapes and colours. If nothing
remains that belongs to this client, the decoration was doing no work.

Greps help only for the crudest ones:

```bash
# emoji em título e botão, gradiente roxo-rosa, blobs de fundo
grep -rnE '✨|🚀|🔥|💡|⚡' --include='*.html' src/main/resources/public
grep -rnE 'from-(purple|violet|fuchsia|indigo)-[0-9]+.*to-(pink|rose|cyan)-[0-9]+' \
  --include='*.html' --include='*.css' src/main/resources/public
grep -rn 'backdrop-blur' --include='*.html' --include='*.css' src/main/resources/public | wc -l
```

The greps are the floor, not the check. The check is looking.

---

## 4. Where the line is, so the rule stays usable

A rule that forbids all ornament gets ignored the first time a page needs a divider. So:

- **A device the project's visual identity actually defines is not a tell.** If `MASTER.md` establishes
  an accent rule as part of the brand, used consistently, it belongs — it was decided
  (`frontend-design.md`).
- **The client's own material is never a tell**, however decorative. Their pattern, their texture,
  their photography.
- **Applies to everything the skill renders** (R13), so the same scrutiny covers e-mails, error pages
  and print views — a 404 with a gradient blob is the same mistake in a quieter place.
- **It does not override accessibility or clarity** (R20's ordering). Removing an element that carried
  meaning, because it resembled an item in the table above, is a worse outcome than the element.

The question is never "is this decorative". It is **"did anyone decide this"**.

---

## 5. Checklist

- [ ] No decorative rule or dash attached to a label
- [ ] No gradient text, and no default violet→pink palette
- [ ] No blurred gradient blobs standing in for real material
- [ ] No emoji as icon, in headings or in buttons
- [ ] `backdrop-blur` used deliberately and rarely, not as the house style
- [ ] Section layout follows this project's content, not the three-column default
- [ ] Radius, weight and spacing come from the scales in `ds.css`, not from one repeated value
- [ ] Looked at rendered, at both widths, and it could not be a screenshot of another product (R21)
- [ ] Same pass applied to e-mails, error pages and print views (R13)
