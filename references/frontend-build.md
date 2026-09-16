# Frontend build — readable source, protected dist

> Audit: Angatu Sistemas · Angatu stack (Java 21 + Javalin + vanilla HTML/CSS/JS + local Tailwind).
>
> **The law governing this whole file:**
>
> **SOURCE** = readable and easy to develop · **BUILD** = minify, optimise, obfuscate, rename, protect ·
> **DIST** = the final version for production.
>
> No protective transformation exists in the source. No protection decision survives a conflict with
> correct behaviour, real security, accessibility or SEO (R20).

---

## 1. The three laws

1. **The source is always readable.** Semantic names, files separated by responsibility, easy to read,
   debug, change, test and review. It is forbidden to write into the source: obfuscated JavaScript,
   random variable names, random classes or IDs, strings encoded to hinder reading, or artificial
   structures created only to frustrate reverse engineering.
2. **The build never writes into the source.** The process reads `src/main/resources/public/` and writes
   `dist/public/`. Rebuilding from scratch, at any time, must produce the same result.
3. **Only the dist is published.** What Coolify runs is the JAR packaged from the dist, never from the
   source.

```
src/main/resources/public/   →   build (tools/frontend-build.mjs)   →   dist/public/
   legível, versionado             lê o source, não altera nada          minificado/ofuscado
```

What the source must continue to look like:

```js
/** Calcula o total do pedido somando subtotal e frete. */
function calculateOrderTotal(items) {
    const subtotal = calculateSubtotal(items);
    const shipping = calculateShipping(items);
    return subtotal + shipping;
}
```

Writing this by hand into the source is a violation, even if it "works":

```js
function _0x81ab(a,b){return _0x19c(a)+_0x71f(b)}   // PROIBIDO no source
```

That form is **build output**, and only the build has the right to produce it.

### 1.1 Obfuscation is mandatory (R19), and bounded (R18, R20)

Obfuscation is not an optional level chosen when someone asks for hardening. **Every published frontend
ships obfuscated**, and applying this skill to an existing project means installing the pipeline even
though nobody asked for it.

Three boundaries make that workable rather than destructive, and they are not negotiable either:

- **What is mandatory is the build, never a source rewrite.** Law 2 stands. Installing the pipeline is
  not rewriting the project, and it does not license a rewrite of anything that already works
  (section 17).
- **Always on does not mean always maximum.** R20's priority order still decides every conflict:
  **1** correct behaviour · **2** real security · **3** accessibility · **4** SEO · **5** compatibility ·
  **6** performance · **7** maintainability · **8** obfuscation. A transformation that cannot be proven
  safe is not applied — which is why `renameClasses` needs the proof in section 9 and `renameIds` stays
  off (section 10).
- **The exclusions hold.** `emails/**` is never transformed at all; `sw.js` and `vendor/**` are never
  obfuscated and never renamed; already-obfuscated legacy stays frozen in `vendor/` (section 17.1).
  Those two also keep their comments, for reasons that are not about taste: `<!--[if mso]>` is a
  **functional** conditional comment — it is how Outlook receives its table layout — and a third-party
  licence header is a legal obligation that has to travel with the code.

And the principle that keeps this honest:

> «Obfuscation is not encryption.»
> «Code sent to the browser must be considered accessible to the client.»
> «Dynamic classes and IDs are not authentication and are not security.»
> «Real protection of data, authorization and critical rules lives in the backend.» (`security.md`)

Obfuscation raises the cost of trivial automation. It does nothing against an attacker with an
intercepting proxy, which is R22's subject and a backend problem.

---

## 2. Directory map

```
src/main/resources/public/       SOURCE — legível, versionado, nunca transformado no lugar
  index.html                       shell ({content} {page} {%nome_active})
  <pagina>.html                    fragmentos servidos por HtmlRouteAPI
  styles/tailwind.css              GERADO pelo Tailwind CLI (exceção documentada — 3.4)
  styles/ds.css                    tokens + componentes do Design System (escrito à mão)
  scripts/*.js                     ui.js net.js auth.js app-state.js messages.js
  assets/ images/ fonts/           arte generativa, logotipos, tipografia
  emails/*.html                    NUNCA transformados (clientes de e-mail)
  sw.js manifest.webmanifest       PWA

tools/frontend-build.mjs         O BUILD — único lugar autorizado a ofuscar
frontend.build.json              configuração dos níveis
build/                           área temporária do build            → .gitignore
dist/public/                     DIST — entra no JAR                 → .gitignore (ver 15.3)
dist/.build-info.json            nível, salt e os mapas de renomeação (não é servido)
```

`dist/public/` becomes `target/classes/public/` at packaging time (section 15.1) — that is what
`AssetsAPI` serves in production.

For a static project there is no Maven and no JAR; the layout and the nginx image are in
`static-site.md`, and everything else on this page applies unchanged.

---

## 3. Levels and configuration

### 3.1 The three levels

| Level | When | Minify | Obfuscate | Rename classes | Rename files | Rename names | Hash | Source maps |
|---|---|---|---|---|---|---|---|---|
| `development` | day to day, debugging | no | no | no | no | no | no | yes |
| `production` | a publish where Node is unavailable (section 3.3) | yes | no | no | no | no | optional | no |
| `protected` | **the publishing default (R19)** | yes | yes | proven only | proven only | proven only | optional | never |

**Minify implies no comments.** At `production` and `protected` the dist ships without a single comment,
including the licence comments a minifier preserves by default (sections 5, 6.1, 7 and 8). The two
exceptions are the ones in 1.1, and they are exceptions because a comment there is load-bearing. At
`development` comments stay — that is the entire point of the level.

**Rename files** covers file and folder names (11.1). **Rename names** covers CSS custom properties,
`@keyframes` and friends, the shared JavaScript globals and `data-*` (9.5 to 9.7). Every renaming column
runs the same proof (9.3), and a name that cannot be proven safe keeps its original spelling.

`development` is the local default and **needs no tooling beyond the Tailwind CLI** that is mandatory
anyway (R14): it only copies the source. A project without Node is still developed and run normally.

`production` is no longer the normal publishing level. It exists for the case in section 3.3, where Node
cannot be in the pipeline at all — and that limitation is recorded in `CLAUDE.md` rather than chosen.

**A reproducible build needs two things, not one.** `ANGATU_BUILD_SALT` pins every generated name, and
the obfuscator's `seed` pins the rest — left at its default of `0` it draws its own randomness, so the
same source at the same salt still produces different bytes. Derive the seed from the salt and law 2
holds end to end. Without the env var the salt is random per build, and every name in the dist changes
on every deploy.

**Aggressiveness is configurable and reducible.** If a `protected` transformation inflates the JS,
increases parse time, stalls execution or blows up memory, turn that technique down — never keep a heavy
technique just because it exists. That is R20 in practice, not an exception to R19.

### 3.2 `frontend.build.json`

```json
{
  "level": "protected",
  "source": "src/main/resources/public",
  "out": "dist/public",
  "levels": {
    "development": { "minify": false, "obfuscate": false, "renameClasses": false, "renameIds": false, "renameFiles": false, "renameVars": false, "renameGlobals": false, "renameData": false, "hashAssets": false, "removeDeadCode": false, "transformStrings": false, "controlFlowProtection": false, "sourceMaps": true },
    "production":  { "minify": true,  "obfuscate": false, "renameClasses": false, "renameIds": false, "renameFiles": false, "renameVars": false, "renameGlobals": false, "renameData": false, "hashAssets": false, "removeDeadCode": false, "transformStrings": false, "controlFlowProtection": false, "sourceMaps": false },
    "protected":   { "minify": true,  "obfuscate": true,  "renameClasses": true,  "renameIds": false, "renameFiles": true,  "renameVars": true,  "renameGlobals": true,  "renameData": true,  "hashAssets": false, "removeDeadCode": true,  "transformStrings": true,  "controlFlowProtection": true,  "sourceMaps": false }
  },
  "keepClasses": [],
  "keepIds": [],
  "keepVars": [],
  "keepGlobals": [],
  "keepData": ["data-sitekey", "data-theme", "data-testid"],
  "neverTransform": ["emails/**", "vendor/**"],
  "neverRename": ["**.html", "sw.js", "**/sw.js", "manifest.webmanifest", "**/manifest.webmanifest", "robots.txt", "sitemap.xml", "favicon.ico", "apple-touch-icon*", ".well-known/**", "emails/**", "vendor/**", "assets/og/**"],
  "reservedGlobals": ["UI", "net", "Auth", "AppBus", "showToast"],
  "cacheAutorizado": false
}
```

> **Do not invent a configuration format if the project already has one.** If it uses `package.json`,
> `vite.config.js`, `webpack.config.js` or its own pipeline, **adapt to it** and keep only the key names
> (`minify`, `obfuscate`, `renameClasses`, `renameIds`, `renameFiles`, `renameVars`, `renameGlobals`,
> `renameData`, `hashAssets`, `removeDeadCode`, `transformStrings`, `controlFlowProtection`). The file
> above is the default only for a project that has nothing.

**`neverRename` is the single list of fixed names**, and it serves both renaming for protection (11.1)
and hashing for cache (11.2), because every entry is there for the same reason: the name is a contract
with something outside the build. It replaces the old `neverHash`, which meant the same thing under a
narrower name.

**The globs are anchored with `**` on purpose.** `casa()` compiles `*` into `[^/]*`, which does not
cross a slash — so a bare `*.html` protects `index.html` and **misses `pages/contato.html`**. That was
harmless while `hashAssets` was off by default; with `renameFiles` on it would rename a page and delete
its public URL. Write `**.html`, and list both `sw.js` and `**/sw.js`.

**`reservedGlobals` changes role with `renameGlobals`** — it is the list of names shared across classic
scripts either way. With `renameGlobals: false` they are excluded from renaming; with `true` they are
renamed **together, program-wide** (9.6). `keepGlobals` is the escape for a name that must survive even
then.

### 3.3 Tooling — build time only

| Tool | Role | Level |
|---|---|---|
| Tailwind standalone CLI | generates `styles/tailwind.css` (R14) | all |
| `esbuild` | minifies JS and CSS | `production`, `protected` |
| `html-minifier-terser` | minifies HTML preserving SEO and accessibility | `production`, `protected` |
| `javascript-obfuscator` | obfuscates JS | `protected` |

```bash
npm init -y && npm i -D esbuild html-minifier-terser javascript-obfuscator
```

**Node is a build tool, not an application dependency.** What ships is still vanilla HTML/CSS/JS served
by Javalin. **Never** introduce React, Vue, Angular or Svelte because "the protection bundler works
better with it". If the project solves its problem with HTML, CSS and JavaScript, it stays that way.

If the project genuinely cannot have Node, it falls back to `production` **without** JS and HTML
minification (the Tailwind CLI already emits minified CSS). The loss is bytes, not behaviour. Record the
limitation in `CLAUDE.md` — it is the one documented way a project ships without R19's obfuscation, and
it is a constraint, not a preference.

### 3.4 The `tailwind.css` exception

`styles/tailwind.css` lives inside the source but is **generated**, not hand-written: nobody edits it,
nobody debugs it line by line, and it is committed because Coolify builds from the repository (R14). It
is the **only** generated artefact allowed to sit in the source, and even so:

- its classes are never renamed;
- it is the source of the rename exclusion list — every class appearing in it is untouchable
  (section 9.1);
- it is minified by the Tailwind CLI itself (`--minify`), which is already its final form.

---

## 4. Canonical pipeline order

The build runs in **exactly** this order. Changing it breaks synchronisation between HTML, CSS and JS.

```
0. Tailwind CLI                     → styles/tailwind.css (no source, 3.4)
1. Análise                          → inventário de arquivos, classes, IDs, referências
2. Validação de entrada             → segredos, CDN proibida, referência já quebrada no source
3. Limpeza + cópia integral         → source → dist (byte a byte, sem tocar no source)
4. Renomeação de nomes              → classe, variável CSS, global e data-* PROVADOS seguros (9, 10)
5. Minificação CSS                  (5)
6. Minificação + ofuscação JS       (6) — nunca em emails/**, nunca ofusca sw.js
7. Minificação HTML                 (7) — preservando SEO, a11y e placeholders
8. Renomeação e hash de arquivos    (11) — nome ofuscado + hash opcional, numa passada só
9. Atualização das referências      → HTML, CSS, JS, manifest, sw
10. Gravação do dist/.build-info.json
11. Validação pós-build             → falha com exit 1 se qualquer referência quebrou (14)
```

Rename *names* **before** minifying — a readable file makes the substitution provable. Rename and hash
*files* **after** minifying, and never before: steps 5 to 7 walk the **source** list and write to
`path.join(OUT, f)`, so a file renamed earlier would pull those paths out from under them. The hash also
has to be taken of the final content.

---

## 5. CSS

Apply minification, optimisation and dead-code removal **only when it is safe**.

- **Tailwind already does its own dead-code removal** through `content` in `tailwind.config.js`. Do not
  run an unused-CSS remover over `tailwind.css`.
- In `ds.css` and page CSS, **do not remove an "unused" rule automatically**: a class applied by
  `classList.add()`, by a server attribute (`{%nome_active}`) or by a third-party library appears in no
  HTML and would be deleted by mistake. Dead CSS removal only with manual analysis and a test.
- Minify with `esbuild` (`loader: 'css'`): it compresses, keeps the cascade and does not reorder
  selectors. Pass **`legalComments: 'none'`** with it — esbuild preserves `/*!` and `@license` comments
  by default, so without it a banner in `ds.css` sails straight into the dist.
- The `<link>` order stays `tailwind.css` before `ds.css` (R14).

---

## 6. JavaScript

### 6.1 Safe minification for classic scripts

The Angatu shell scripts are classic and **share globals** (`UI`, `net`, `Auth`, `AppBus`, `showToast`).
A minifier that renames top-level identifiers breaks everything silently.

```js
// seguro para script clássico: encolhe sem renomear o que é global
await transform(code, { loader: 'js', minifyWhitespace: true, minifySyntax: true,
                        minifyIdentifiers: false, legalComments: 'none' });
```

Only enable `minifyIdentifiers: true` for a file whose entire content is inside an IIFE or an ES module —
there is no top-level symbol to break there.

**`legalComments: 'none'` is not decoration.** esbuild keeps `//!`, `/*!`, `@license` and `@preserve` by
default, and this transform is the *only* thing that runs over `sw.js`, which is never obfuscated. Leave
it out and the service worker ships commented.

### 6.2 Obfuscation

```js
JavaScriptObfuscator.obfuscate(code, {
  compact: true, simplify: true, target: 'browser',
  renameGlobals: false,                    // não confundir com a chave renameGlobals do build (9.6):
                                           // aqui é por arquivo, e por arquivo quebra tudo
  identifierNamesGenerator: 'mangled',
  seed: derivadoDoSalt,                    // 0 = sorteia: dois builds iguais sairiam diferentes
  reservedNames: ['^UI$','^net$','^Auth$','^AppBus$','^showToast$'],

  stringArray: true,                       // transformação de strings
  stringArrayThreshold: 0.75,
  stringArrayEncoding: ['base64'],
  stringArrayRotate: true, stringArrayShuffle: true, stringArrayIndexShift: true,
  stringArrayWrappersCount: 1, stringArrayWrappersType: 'variable',
  splitStrings: false,                     // muito tamanho para pouco ganho

  controlFlowFlattening: true,             // transformação de controle de fluxo
  controlFlowFlatteningThreshold: 0.35,    // 1.0 chega a 1,5x mais lento — não use

  numbersToExpressions: true,
  deadCodeInjection: false,                // +200% de tamanho; só com orçamento medido
  transformObjectKeys: false,              // quebra objeto lido por chave dinâmica
  unicodeEscapeSequence: false,            // dobra o tamanho do arquivo

  selfDefending: false,                    // quebra se qualquer etapa reprocessar o arquivo
  debugProtection: false,                  // PROIBIDO: trava as ferramentas de desenvolvimento
  disableConsoleOutput: false              // PROIBIDO: cega quem está depurando de boa-fé
}).getObfuscatedCode();
```

**Permanent prohibitions**, because they hit people who are not the target: `debugProtection`,
`disableConsoleOutput`, devtools-detection loops, and `selfDefending` combined with any post-processing.
Blocking a developer's tools punishes the honest reader and stops no attacker.

**Never obfuscate, and never rename:**

- `sw.js` — a broken service worker stays stuck on the user's device, and they have no way to help
  themselves. Minify it, nothing more. Section 12 has the reason its *name* is untouchable too.
- `vendor/**` and already-minified third-party libraries — zero gain, high risk, larger file.
- `emails/**` — a mail client does not execute JS and the file leaves the domain entirely
  (`email-design.md`).

### 6.3 Dead-code removal

Only what the tool proves unreachable. It is forbidden to "clean up" a function that looks unused: it
may be called from an `onclick=` attribute, from another script, or from markup generated on the server.
Every function referenced from HTML goes into `reservedGlobals`.

**And so does every name read across files.** `window.UI`, `window.Live`, anything written in one file
and used in another: outside the list, the name is renamed in each file separately, and the result does
not look like an error — the page loads and the feature simply does not exist, with no line in the build
console. The list is the only guard.

> **The list has two jobs, and `renameGlobals` picks which one.** It always names the surface shared
> across classic scripts. With `renameGlobals: false` that surface is *excluded* from renaming — the
> historical behaviour, and the one the obfuscator's own `renameGlobals: false` enforces file by file.
> With `renameGlobals: true` the same list becomes the *input* to a program-wide rename, where one name
> gets one replacement across every file at once, `onclick=` attributes included (9.6). What is never
> allowed is the third possibility: renaming a shared global file by file.

> **R32 does not loosen this.** The rule that orphan code is removed applies to Java classes and files,
> and it explicitly defers JavaScript and CSS to this section (`dead-code.md`). A function that looks
> unused here stays, and a CSS rule that looks unused stays — the reasons above did not stop being
> true because cleanup became mandatory elsewhere.

---

## 7. HTML

```js
await minifyHtml(html, {
  collapseWhitespace: true, conservativeCollapse: false,
  removeComments: true, ignoreCustomComments: [/^\s*\{/],  // só o placeholder do shell sobrevive
  removeAttributeQuotes: false,        // atributo sem aspas quebra valor com placeholder
  removeRedundantAttributes: false,    // preserva semântica declarada de propósito
  useShortDoctype: false, keepClosingSlash: true,
  sortAttributes: false, sortClassName: false,
  minifyCSS: true, minifyJS: false     // JS de página é arquivo externo
});
```

**Never remove, at any level:** `<title>`, `meta description`, `meta robots`, `canonical`, Open Graph,
Twitter Card, Schema.org (`application/ld+json`), `hreflang`, `lang`, `alt`, `aria-*`, `role`,
`label for`, form field `name`, the `for`/`id` pair, `tabindex`, and `<noscript>` with real content.
Those are priorities 3 and 4 in R20, and obfuscation is priority 8.

**The comment list lost `/^!/`, and keeping `/^\s*\{/` is not optional.** `/^!/` existed to preserve
`<!--! ... -->`, which is the opposite of what is wanted now. `/^\s*\{/` protects the `HtmlRouteAPI`
placeholders, and deleting the whole line — the obvious move for someone told to "remove every comment"
— breaks the rendering of every page in the project.

**`HtmlRouteAPI` placeholders:** `{content}`, `{page}` and `{%nome_active}` pass through the build
intact. `{%nome_active}` usually appears **inside `class="..."`** — the renaming step ignores any token
containing `{` or `}`, and the class the server injects is untouchable (section 9.2).

A page's `<script>` stays an external file — an inline script is blocked by the content security policy,
and the build does not fix that.

---

## 8. Assets

- Generated art (`canvas-generative.md`) is already optimised; the build only copies and, when enabled,
  renames and hashes it.
- **SVG passes through a comment strip and nothing else.** It is the one text format with no branch in
  the minification loop, so an `<!-- Generator: ... -->` from the drawing tool survives the whole
  pipeline. Remove `<!--...-->` and stop there: an SVG is markup that a designer reopens, and a
  "minified" path is a path nobody can edit again.
- A user-uploaded image never passes through here — it goes to `/data/uploads` with the compression
  strategy asked of the developer (G2, `images.md`).
- `favicon.ico`, `apple-touch-icon` and the Open Graph covers (`assets/og/**`, `landing-seo-og.md`) are
  **neither hashed nor renamed**: they are referenced by convention, by search engines and by social
  networks, which cache the URL themselves. They are in `neverRename` for that reason.
- A **font family name** is frozen even though it looks renameable: it is read back as a string by
  `ctx.font = '16px Inter'` in canvas work (`canvas-generative.md`) and by `local()` inside
  `@font-face`, and neither is a reference the build can rewrite.

---

## 9. Name renaming — only with proof of safety

Four things are renamed under this section: **classes** (9.1 to 9.4), **CSS custom properties and the
other named CSS constructs** (9.5), the **shared JavaScript globals** (9.6) and **`data-*` attributes**
(9.7). They share one proof (9.3), one naming scheme, one salt and one report. File and folder names
run the same proof from section 11.1.

> **The real and limited objective:** to raise the cost of trivial automation that depends on a
> predictable name. **It is not security.** A bot that executes JavaScript reads the DOM and finds the
> current name in seconds.

**The transformation happens at build and deploy time, never on every page load.** Randomising a class
at runtime to frustrate a bot is forbidden: it breaks accessibility, testing and debugging, and fools
nobody. A new build may produce new identifiers; that is expected:

```
build 1:  product-card → a81Kx      checkout-button → Q72Lm
build 2:  product-card → z91Pw      checkout-button → m42Rt
source :  product-card              checkout-button          (sempre igual)
```

### 9.1 What can be a candidate

A class enters the candidate list only if **all** of these are true:

1. It is declared in project CSS (`ds.css` or page CSS) — never in `styles/tailwind.css`, never in
   `vendor/**`.
2. It is kebab-case with **at least one hyphen** (`product-card`, `nav-tile`, `ds-credito`). A
   single-word name (`active`, `card`, `open`) is out by construction: too short, collides easily, and
   usually added dynamically. A hyphenated name also cannot be a JavaScript identifier, which removes
   the risk of renaming a variable by mistake.
3. It does not appear in `styles/tailwind.css` — a Tailwind utility is untouchable: the project's entire
   responsiveness depends on it (R15).
4. It does not appear in `src/main/java/**` — server-generated markup does not pass through the build.
5. It does not appear in `emails/**` or anything listed in `neverTransform`.
6. It does not match `keepClasses`.

### 9.2 Mandatory exclusion list

Never rename automatically:

- Tailwind utilities and third-party library classes (`swiper-*`, `leaflet-*`, `choices__*`);
- a class used by an ARIA attribute, by a `label`, by an anchor (`href="#..."`) or by a form;
- a class injected by the Java server, including the one behind `{%nome_active}`;
- a class used by an automated test (`js-*` and the matching `data-testid`), an external integration, a
  Web Component, a browser API, or a hook declared public;
- any class in `/emails/*.html`;
- a class whose CSS rule carries the comment `/* build:keep */` on the previous line.

**When safety cannot be proven, the transformation is not applied.** No exception — and R19 does not
override this, because R20 sits above both.

### 9.3 The proof

This is the gate for every rename in the build — class, custom property, global, `data-*`, file and
folder. A name is only replaced when **all eight** hold:

1. it does not match `neverRename`, `neverTransform` or the relevant `keep*` list;
2. **every reference to it is literal** — the whole token in `class="..."`, a CSS selector, an absolute
   path from the site root (`/scripts/ui.js`), `var(--espaco-6)`, `UI.metodo`, a string literal
   (`'product-card'`, `'.product-card .title'`);
3. it does not appear in `src/main/java/**` — server-generated markup never passes through the build,
   and the server may serve a file by name (`AssetsAPI.serveAsset(ctx, "scripts/ui.js")`);
4. it does not appear in any `neverTransform` file — nobody rewrites those, so the reference would be
   left dangling;
5. it does not appear in `nginx.conf`, `tools/preview.py` or the `Dockerfile` — server configuration
   that lives **outside** the tree the build reads;
6. it is **not assembled at runtime**. Any literal glued to a concatenation (`'product-' + kind`,
   `'/assets/' + nome`) or an interpolation (`` `product-${kind}` ``) freezes every name that has that
   fragment as a prefix or a piece — and, for a path, the whole folder;
7. it is not a platform name — `window`, `document`, `fetch`, `JSON`, `Math`, a `--webkit-*` property.
   A builtin list is checked before anything is emitted;
8. the generated name does not collide with any existing or already-emitted name.

The build report lists, per name: `renamed`, `kept (reason)` or `unsafe (file)`. **A failed proof never
fails the build** — the name simply survives untouched and the report says why. That is the difference
between this and section 14, where a *desynchronised* rename does stop everything.

### 9.4 Application and synchronisation

One map, applied to all three places at once:

```html
<div class="product-card">        →   <div class="a81Kx">
```
```css
.product-card { ... }             →   .a81Kx { ... }
```
```js
document.querySelector('.product-card')  →  document.querySelector('.a81Kx')
```

**Shipping HTML with `a81Kx`, CSS with `a81Kx` and JS with `product-card` is a build error**, not a
detail: the validation in section 14 looks for the old name in the dist and fails if it finds any
remnant of a mapped class.

The new name is an initial letter plus base36 of `sha256(class + build salt)`, checked against every
existing class name in the project (including those in `tailwind.css`) so it cannot collide. The salt
lives in `dist/.build-info.json` alongside the map — that is how you discover, months later, that
`a81Kx` was `product-card`. Every rename in this section and in 11.1 uses that same construction and
that same salt.

### 9.5 CSS custom properties and the other named constructs

`renameVars`. The design system introduces itself in the dist otherwise: `--brand-600`, `--space-6`,
`--text-lg`, `--radius-md`, `--ease-out-expo`, `--surface`, `--ring`, `--muted`. Along with them go
`@keyframes`, `@layer`, `@property`, `container-name`, `view-transition-name`, CSS counters and the
names inside `grid-template-areas`.

The rewrite has to reach three places beyond the `.css` file, and missing any one of them is a silent
break:

- **`style="--i: 3"` inline in the HTML.** The skill's own stagger pattern sets it there and reads it
  from CSS (`animation-delay: calc(var(--i) * 80ms)`) — which means the *candidate scan* has to read the
  HTML too, not only the `.css`. A property that is declared nowhere but the markup is invisible to a
  CSS-only scan, survives untouched, and quietly makes this section a half-measure.
- **`getPropertyValue('--cor')` and `style.setProperty('--x', v)` in JavaScript.**
- **A property assembled in a loop** (`'--space-' + n`) — proof 6, and the whole `--space-` prefix
  freezes with it.

A real font family name is never renamed (section 8).

### 9.6 The shared globals

`renameGlobals`. `UI`, `net`, `Auth`, `AppBus` and `showToast` survive obfuscation today by design, so
the dist still reads `Auth.login`, `net.post`, `UI.showToast`. This is the highest-value rename in the
build and **the highest-risk one**, and the risk has a name: renaming a shared global *per file* is the
documented way to make a whole feature vanish with no error at all (section 18).

What makes it safe is that it is not per file. `reservedGlobals` becomes the input list, each name gets
one replacement, and step 9 applies it to every text file in the dist in a single pass. Two things it
has to reach along with the JavaScript:

- **`onclick="novoDoc()"` in the HTML**, which is a live pattern in this skill and already the cause of
  one catalogued error;
- **nothing in `src/main/java/**`** — proof 3 freezes any global the server writes into markup.

Proof 7 is what stops `fetch` or `JSON` from being renamed, and `keepGlobals` is the manual escape.

### 9.7 `data-*` attributes

`renameData`. `data-action="excluir-usuario"` and `data-page="orcamentos"` hand over the intent of the
screen in plain Portuguese. The attribute name is renamed under the same proof; the **value** is left
alone, because it is content as often as it is a key.

**The trap that matters most is `dataset`, and it is silent.** The DOM exposes the same attribute
under a second name: `data-action-change` is read as `element.dataset.actionChange`. Renaming only the
attribute leaves every script looking up a key that no longer exists — and `dataset` of a missing key
returns `undefined`, with no error and no console output. On a project that dispatches through
`data-action`, that is the whole product going mute while the network tab stays green. **So the rename
maps both forms in the same pass**, the attribute and its camelCase property. It was found on a
codebase with 106 `dataset.*` reads; a build that renames the attribute without it is worse than one
that renames nothing.

Two more: `querySelectorAll('[data-action]')` built from a variable falls to proof 6, and
`data-sitekey` / `data-theme` are read by Cloudflare's own script, so they ship in `keepData` from the
start — along with `data-testid`, which an automated test depends on.

---

## 10. ID renaming — off by default

`renameIds: false` at every level, `protected` included. An ID carries contracts the build cannot see:

`href="#secao"` · `<label for="email">` · `aria-labelledby` · `aria-describedby` · `aria-controls` ·
`form=` · `list=` (datalist) · `headers=` (table) · `url(#gradiente)` in SVG ·
`document.getElementById(variavel)` · an external link pointing at a page anchor · a screen reader that
depends on the `for`/`id` pair.

Enable it only when: the project has no public anchors, every ID is internal, the proof in section 9.3
passes, and a manual keyboard and screen-reader test was done afterwards. Record the decision in
`CLAUDE.md`.

**This is the one name that did not follow the others**, and the asymmetry is deliberate. Classes, custom
properties, globals, `data-*` and file names all flipped on at `protected` because a build can prove
their references. An ID's references reach places no build reads: a bookmark somebody saved, a link on
another site, and a screen reader walking the `for`/`id` pair. Proof 2 cannot hold for something the
build cannot see, and accessibility is priority 3 against obfuscation's 8 (R20).

---

## 11. File names

Two mechanisms rename a file, for two unrelated reasons, in one pass: **11.1 renames to protect** (R19,
on by default at `protected`) and **11.2 hashes to bust cache** (R25, off unless the client asked for
cache). Either can run without the other.

### 11.1 Renaming for protection

`renameFiles`. Without it the dist hands over the map of the frontend for free: `ui.js`, `net.js`,
`auth.js`, `app-state.js`, `messages.js`, sitting in `scripts/`, readable in the network tab before
anyone looks at a single obfuscated line.

`scripts/ui.js` → `scripts/x8k2d.js`, built exactly as 9.4 builds a class name, from the same salt.
**Never `ui.8f91c2ad.js`** — a content hash keeps the original stem and leaks the very thing being
hidden, which is why this is not simply `hashAssets` turned on.

**No `.html` is ever renamed. The file name is the route.** `HtmlRouteAPI` registers one route per
**file name** (`public/orcamentos/novo.html` becomes `/novo`, `public/index.html` becomes `/`), so
renaming a page does not obscure it — it deletes a public address that may be indexed, linked from
another site, or sitting in somebody's bookmarks. `**.html` is the first entry in `neverRename` for
exactly that reason, and retiring a page stays a 301 redirect, never a rename (`dead-code.md`,
`landing-seo-og.md`). On the static track the same name carries the URL through
`try_files $uri $uri.html`, and `404.html` is reached by name from `error_page`.

**The extension never changes.** It decides the `Content-Type` (`AssetsAPI.getContentType`, nginx's
`mime.types`) and, on the static track, the `try_files $uri $uri.html`.

**Folder segments are renamed too** — `scripts/` → `x7f1a/` — and that is cheap here for a reason worth
writing down: this stack's CSP is origin-based (`script-src 'self'`, `turnstile.md`), not path-based,
and the `nginx.conf` carries a single generic `location /` (`static-site.md`). Neither notices the
change. `.well-known/` is the exception and never moves; it is a path fixed by specification.

A folder holding both a page and a renameable file **splits, and that is the intended result**:
`pages/contato.html` stays exactly where it is while `pages/extra.js` becomes `x1yvai/x1kk3j.js`, with
the `<script src>` inside the page rewritten to match. Routing is by file name, so the page never needed
the folder to keep its address — and the half-emptied `pages/` is not a defect to tidy up by dragging
the HTML along with it.

The proof is 9.3, unchanged, and proof 6 is the one that earns its keep: a single `'/assets/' + nome`
anywhere in the source freezes the whole `assets/` folder, because no build can rewrite a path that does
not exist until runtime.

When `hashAssets` is on as well, the two compose into one name — obfuscated folder, obfuscated stem,
`.hash`, original extension — computed and applied in a single rename pass.

### 11.2 Hashing and the cache rule

Hashing is **cache busting**: `app.js` → `app.8f91c2ad.js`, with every reference updated automatically.

**Interaction with R25 (no cache):**

- **Project on the default (no cache):** `hashAssets: false`. With `no-store` on every response the hash
  buys nothing and makes files harder to trace. Do not enable it out of habit.
- **Project where the client asked for cache:** `hashAssets: true` becomes **mandatory**.
  `Cache-Control: public, max-age=31536000, immutable` is only safe on a file whose name changes when
  its content changes. The HTML stays `no-store` forever — it is what points at the new names.

Pay attention when updating references: `<link rel="preload">`, `<link rel="modulepreload">`, dynamic
`import()`, `manifest.webmanifest`, `sw.js`, and any path assembled in JS.

**What makes either of them provable:** in the source, every asset reference is **absolute from the site
root** (`/styles/ds.css`, `/scripts/ui.js`). A path assembled at runtime (`'/assets/' + nome + '.png'`)
cannot be rewritten — leave those files in `neverRename`, or publish the generated map at
`/assets/manifest.json` and read the final name from there.

---

## 12. PWA and service worker

- `sw.js` and `manifest.webmanifest` are **never** renamed, **never** hashed and **never** obfuscated.
  They are minified and have their references updated last, once everything else has its final name.
- **The name `sw.js` is a contract twice over.** `navigator.serviceWorker.register('/sw.js', {scope:'/'})`
  records that exact path, and the path is what **defines the scope** a service worker may control. And
  a worker renamed on every build is a *new* worker on every build, while the old one stays registered
  on the user's device with nobody left to update it.
- If the service worker lists files, that list is rewritten from the build's rename and hash maps. A
  service worker pointing at a file that no longer exists is a build failure.
- Under R25 the service worker stores nothing: `install` with `skipWaiting()`, `activate` deleting every
  cache, `fetch` with no `respondWith` (`cache.md`). The build must not introduce a caching strategy the
  project did not ask for.
- If offline operation was requested, the cache is versioned with the build identifier and `activate`
  deletes previous versions.
- Test installation, first open and update **after** the build, with the server running (R21, R29).

---

## 13. Source maps

| Level | Source map |
|---|---|
| `development` | yes, beside the file |
| `production` | only if explicitly configured, and written to `dist/maps/`, **outside** `dist/public/` |
| `protected` | never |

Publishing a map inside `dist/public/` cancels the obfuscation: the browser reconstructs the original
source. Keep it with the release artefact, for internal debugging.

---

## 14. Post-build validation — the build fails here

Every check below runs over `dist/` and **fails the build with `exit 1`**:

| # | Check | Fails when |
|---|---|---|
| 1 | Referential integrity | a `src=` / `href=` / `url()` starting with `/` that does not exist in the dist |
| 2 | Class synchronisation | the old name of a mapped class still appears in any dist file |
| 3 | JS syntax | `new Function(code)` fails on any generated `.js` |
| 4 | Secrets | a key, token or password pattern found in the dist |
| 5 | Forbidden CDN | `cdn.tailwindcss` or `unpkg.com/tailwindcss` present (R14) |
| 6 | SEO preserved | `<title>`, `canonical`, `og:`, `twitter:`, `ld+json` or `meta` in smaller quantity than the source |
| 7 | Accessibility preserved | the count of `aria-`, `alt=`, `role=`, `for=` lower than in the source |
| 8 | Stray source map | a `.map` inside `dist/public/` without `sourceMaps: true` |
| 9 | Inline script | a `<script>` without `src` in a page, except `application/ld+json` |
| 10 | Unrequested cache | `caches.put` / `caches.match` in the dist with `cacheAutorizado: false` (R25) |
| 11 | Name synchronisation | the old spelling of a renamed file, folder, custom property, global or `data-*` still appears anywhere in the dist |
| 12 | Comment in the dist | `/*` in a `.css` or `.js`, or `<!--` in an `.html` or `.svg`, outside `emails/**` and `vendor/**` |

Checks 6 and 7 are R20 enforced mechanically: they make it impossible for obfuscation to quietly cost
SEO or accessibility. Check 11 is the counterpart of 2 for everything section 9 and 11.1 renamed — a
half-applied rename produces a page that loads and does nothing, which is the failure mode this whole
document exists to prevent.

**Check 11 searches the whole dist for the old spelling, so only map a name the project actually uses.**
A global listed in `reservedGlobals` but absent from the source has nothing to rename, and mapping it
anyway turns the check into a search for a common word — `net` matches inside `exemplo.net` and fails an
honest build.

**Check 12 must not look for `//`.** `https://` appears in every canonical, every Open Graph tag and
every `fetch` URL, so a bare search for `//` would reject every honest build and the fix would be to
switch the check off. Line comments are already covered: the obfuscator rebuilds the AST at `protected`,
and `legalComments: 'none'` handles `production` and `sw.js`. If a belt-and-braces check is still
wanted, anchor it to the start of a line (`^\s*//`) and never leave it loose.

```bash
grep -rn "cdn.tailwindcss\|unpkg.com/tailwindcss" dist/public && echo "FALHA: CDN"
grep -rn "caches.put\|caches.match" dist/public && echo "FALHA: cache nao pedido"
grep -rn "<script>" dist/public/*.html && echo "FALHA: script embutido"
grep -rniE "api[_-]?key|secret|password|bearer [a-z0-9]{20,}|AKIA[0-9A-Z]{16}|sk_live_" dist/public && echo "FALHA: possivel segredo"
find dist/public -name "*.map" | grep . && echo "FALHA: source map publicado"
grep -rn --include=*.css --include=*.js -- "/\*" dist/public && echo "FALHA: comentario no dist"
grep -rn --include=*.html --include=*.svg -- "<!--" dist/public | grep -vE "^dist/public/(emails|vendor)/" && echo "FALHA: comentario no dist"
```

And the validation no script replaces: **start the server and open the screens** (R21, R29,
`frontend-preview.md`). A minification defect exists only in the dist, so the dist is what gets looked
at.

---

## 15. Packaging — Maven, Docker and Coolify

### 15.1 The Maven profile that swaps source for dist

```xml
<profiles>
  <profile>
    <id>frontend-dist</id>
    <build>
      <resources>
        <resource>
          <directory>src/main/resources</directory>
          <excludes><exclude>public/**</exclude></excludes>
        </resource>
        <resource>
          <directory>dist</directory>
          <includes><include>public/**</include></includes>
        </resource>
      </resources>
    </build>
  </profile>
</profiles>
```

Without the profile, Maven copies the readable source — which is exactly what you want in development.

```bash
# desenvolvimento (source legível dentro do JAR)
mvn package -DskipTests && java -jar target/<app>.jar

# produção protegida (dist dentro do JAR)
node tools/frontend-build.mjs --level=protected
mvn -Pfrontend-dist package -DskipTests && java -jar target/<app>.jar
```

### 15.2 Three-stage Dockerfile

Coolify builds the image from the repository, so the frontend build runs **inside** the image:

```dockerfile
# 1) frontend: source legível -> dist protegido
FROM node:22-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json* frontend.build.json ./
RUN npm ci --omit=optional || npm install
COPY tools/ tools/
COPY src/main/resources/public/ src/main/resources/public/
COPY src/main/java/ src/main/java/
RUN node tools/frontend-build.mjs --level=protected

# 2) java: empacota usando o dist
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src/ src/
COPY --from=frontend /app/dist/ dist/
RUN mvn -B -Pfrontend-dist package -DskipTests

# 3) runtime: idêntico ao de deploy-coolify.md
FROM eclipse-temurin:21-jre
# ... ENV TZ/ANGATU_ENV/ANGATU_DB_PATH/PORT/JAVA_OPTS, WORKDIR /data, EXPOSE, HEALTHCHECK, ENTRYPOINT
```

Stage 1 does not enter the final image — the runtime stays JRE plus JAR. `src/main/java/` is copied into
the frontend stage because the rename safety proof has to read the server code (section 9.1, item 4).

Without this stage, Coolify packages the readable source: it works, but it is not what R19 requires.

### 15.3 Alternative without Node in the image

If the pipeline cannot have Node, `dist/` is generated on the machine and **committed** (as already
happens with `tailwind.css`). In that case `dist/.build-info.json` stores the source hash, and the build
validates it at the start:

> dist out of date relative to the source → **error**, with the instruction to run the build again.

Without that check, a stale dist is published against new source, and the defect only appears in
production.

---

## 16. Reference implementation — `tools/frontend-build.mjs`

A working skeleton to adapt. Run it first at `--level=production`, validate, then switch to `protected`.

The code below keeps its comments in Portuguese, because it is code that lands in a project (R12).

```js
#!/usr/bin/env node
/**
 * Build de frontend Angatu — lê o source legível e grava o dist protegido.
 * Nunca escreve em src/. Sai com código 1 quando a validação falha.
 *
 * Uso: node tools/frontend-build.mjs --level=development|production|protected
 *
 * @author Angatu Sistemas
 */
import { readFile, writeFile, mkdir, rmdir, rm, readdir, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import path from 'node:path';
import { transform } from 'esbuild';
import { minify as minifyHtml } from 'html-minifier-terser';
import JavaScriptObfuscator from 'javascript-obfuscator';

const cfg = JSON.parse(await readFile('frontend.build.json', 'utf8'));
const level = (process.argv.find(a => a.startsWith('--level=')) ?? '').split('=')[1] || cfg.level;
const opt = cfg.levels[level];
if (!opt) { console.error(`Nível desconhecido: ${level}`); process.exit(1); }

const SRC = cfg.source, OUT = cfg.out, JAVA = 'src/main/java';
const salt = process.env.ANGATU_BUILD_SALT || randomBytes(4).toString('hex');
// com seed 0 o obfuscator sorteia a própria semente, e dois builds do mesmo source
// com o mesmo salt saem diferentes — o que contraria a lei 2 (reprodutibilidade)
const seed = Number(BigInt('0x' + createHash('sha256').update(salt)
  .digest('hex').slice(0, 12)) % 2147483647n);
const falhas = [];

/** Lista recursivamente os arquivos de um diretório, em caminhos relativos com barra normal. */
async function walk(dir, base = dir) {
  const saida = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) saida.push(...await walk(p, base));
    else saida.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return saida;
}
/** Escapa os caracteres especiais de expressão regular de um texto literal. */
const escapa = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Casa caminho relativo contra padrões glob simples (`*` e `**`). */
const casa = (rel, padroes = []) => padroes.some(p => new RegExp('^' + p.split('**')
  .map(parte => parte.split('*').map(escapa).join('[^/]*')).join('.*') + '$').test(rel));
const ehTexto = rel => /\.(html|css|js|mjs|json|webmanifest|svg|txt|xml)$/.test(rel);

// 1-3) análise, validação de entrada e cópia integral --------------------------
const arquivos = await walk(SRC);
const javaSrc = existsSync(JAVA)
  ? (await Promise.all((await walk(JAVA)).filter(f => f.endsWith('.java'))
      .map(f => readFile(path.join(JAVA, f), 'utf8')))).join('\n')
  : '';
// conteúdo dos arquivos que o build não pode tocar (e-mails, vendor): o que aparece
// aqui não pode ser renomeado em lugar nenhum, sob pena de dessincronizar
const intocavelSrc = (await Promise.all(arquivos
  .filter(f => ehTexto(f) && casa(f, cfg.neverTransform))
  .map(f => readFile(path.join(SRC, f), 'utf8')))).join('\n');
// configuração de servidor: vive FORA da árvore do build, e ninguém a reescreve
const foraDaArvore = (await Promise.all(['nginx.conf', 'tools/preview.py', 'Dockerfile']
  .filter(existsSync).map(f => readFile(f, 'utf8')))).join('\n');
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await cp(SRC, OUT, { recursive: true });          // o source nunca é tocado a partir daqui

// 4) renomeação de nomes com prova de segurança (9) ----------------------------
const BUILTINS = new Set(['window', 'document', 'navigator', 'location', 'history', 'console', 'fetch',
  'JSON', 'Math', 'Date', 'Promise', 'Array', 'Object', 'String', 'Number', 'Boolean', 'RegExp', 'Map',
  'Set', 'URL', 'FormData', 'Headers', 'Event', 'CustomEvent', 'localStorage', 'sessionStorage']);

const tailwind = existsSync(path.join(SRC, 'styles/tailwind.css'))
  ? await readFile(path.join(SRC, 'styles/tailwind.css'), 'utf8') : '';
const intocaveis = new Set([...tailwind.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map(m => m[1]));

// fragmentos dinâmicos: literal colado a concatenação ou a interpolação
const fragmentos = new Set();
for (const f of arquivos.filter(f => /\.(js|mjs|html)$/.test(f) && !casa(f, cfg.neverTransform))) {
  const txt = await readFile(path.join(SRC, f), 'utf8');
  for (const m of txt.matchAll(/['"]([^'"\n]{2,})['"]\s*\+|\+\s*['"]([^'"\n]{2,})['"]/g))
    fragmentos.add(m[1] ?? m[2]);
  for (const m of txt.matchAll(/`([^`$]{2,})\$\{/g)) fragmentos.add(m[1]);
}

const usados = new Set(intocaveis);
/** Nome curto e estável, derivado do salt do build, que ainda não está em uso. */
function nomeNovo(nome) {
  let novo, i = 0;
  do {
    novo = 'x' + BigInt('0x' + createHash('sha256').update(nome + salt + i++)
      .digest('hex').slice(0, 12)).toString(36).slice(0, 5);
  } while (usados.has(novo));
  usados.add(novo);
  return novo;
}
/** Casa a palavra inteira, para nunca atingir pedaço de outro nome. */
const bordas = n => new RegExp(`(?<![\\w-])${escapa(n)}(?![\\w-])`, 'g');
/** Congela caminho montado em runtime: '/assets/' + nome congela a pasta assets/ inteira. */
const montado = alvo => [...fragmentos].some(fr => fr.includes(alvo) || alvo.includes(fr));
/** A prova da 9.3. Devolve o MOTIVO de não renomear, ou null quando é seguro. */
function provado(nome, manter = []) {
  return casa(nome, manter)            ? 'lista keep'
    : BUILTINS.has(nome)               ? 'nome de plataforma'
    : intocaveis.has(nome)             ? 'utilitário do Tailwind'
    : bordas(nome).test(javaSrc)       ? 'usado no Java (servidor)'
    : bordas(nome).test(intocavelSrc)  ? 'usado em arquivo intocável'
    : bordas(nome).test(foraDaArvore)  ? 'usado em configuração de servidor'
    : [...fragmentos].some(fr => nome.startsWith(fr) || nome.includes(fr)) ? 'montado dinamicamente'
    : null;
}

const mapaNomes = new Map();                      // tudo junto, para a passada única de 4.5
const mapaClasses = new Map(), mapaVars = new Map();
const mapaGlobais = new Map(), mapaData = new Map();
const textoSrc = arquivos.filter(f => ehTexto(f) && !casa(f, cfg.neverTransform));
/** Registra a troca, ignorando um nome que outra etapa já mapeou. */
function mapear(mapa, velho, novo) {
  if (mapaNomes.has(velho)) return;
  mapa.set(velho, novo); mapaNomes.set(velho, novo);
}

// 4.1) classes (9.1)
if (opt.renameClasses) {
  const candidatas = new Set();
  for (const f of arquivos.filter(f => f.endsWith('.css')
      && f !== 'styles/tailwind.css' && !casa(f, cfg.neverTransform))) {
    const css = (await readFile(path.join(SRC, f), 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '');
    for (const bloco of css.split('}')) {
      const seletor = bloco.split('{')[0] ?? '';
      for (const m of seletor.matchAll(/\.([a-z][a-z0-9]*(?:-[a-z0-9]+)+)/g)) candidatas.add(m[1]);
    }
  }
  for (const c of [...candidatas].sort()) {
    const motivo = provado(c, cfg.keepClasses);
    if (motivo) { console.log(`  mantida  ${c}  (${motivo})`); continue; }
    mapear(mapaClasses, c, nomeNovo(c));
  }
}

// 4.2) variáveis CSS, @keyframes e companhia (9.5)
if (opt.renameVars) {
  const candidatas = new Set();
  for (const f of arquivos.filter(f => f.endsWith('.css') && !casa(f, cfg.neverTransform))) {
    const css = await readFile(path.join(SRC, f), 'utf8');
    for (const m of css.matchAll(/(--[a-zA-Z][\w-]*)\s*:/g)) candidatas.add(m[1]);
    for (const m of css.matchAll(/@keyframes\s+([\w-]+)/g)) candidatas.add(m[1]);
    for (const m of css.matchAll(/@property\s+(--[\w-]+)/g)) candidatas.add(m[1]);
    for (const m of css.matchAll(/(?:container-name|view-transition-name)\s*:\s*([\w-]+)/g))
      candidatas.add(m[1]);
  }
  // uma variável pode nascer fora do CSS: style="--i: 3" no HTML, setProperty no JS
  for (const f of textoSrc.filter(f => /\.(html|js|mjs)$/.test(f))) {
    const txt = await readFile(path.join(SRC, f), 'utf8');
    for (const m of txt.matchAll(/(--[a-zA-Z][\w-]*)\s*:/g)) candidatas.add(m[1]);
    for (const m of txt.matchAll(/(?:setProperty|getPropertyValue)\(\s*['"](--[\w-]+)/g))
      candidatas.add(m[1]);
  }
  for (const c of [...candidatas].sort()) {
    const motivo = /^--(webkit|moz|ms|o)-/.test(c) ? 'prefixo de fabricante' : provado(c, cfg.keepVars);
    if (motivo) { console.log(`  mantida  ${c}  (${motivo})`); continue; }
    mapear(mapaVars, c, c.startsWith('--') ? '--' + nomeNovo(c) : nomeNovo(c));
  }
}

// 4.3) globais compartilhados: um nome, uma troca, o programa inteiro (9.6)
if (opt.renameGlobals) {
  const usoSrc = (await Promise.all(textoSrc
    .map(f => readFile(path.join(SRC, f), 'utf8')))).join('\n');
  for (const g of (cfg.reservedGlobals ?? [])) {
    // um nome que o projeto não usa não entra no mapa: mapeado, a validação 11
    // passaria a procurá-lo no dist inteiro e reprovaria em 'exemplo.net'
    if (!bordas(g).test(usoSrc)) continue;
    const motivo = provado(g, cfg.keepGlobals);
    if (motivo) { console.log(`  mantido  ${g}  (${motivo})`); continue; }
    mapear(mapaGlobais, g, nomeNovo(g));
  }
}

// 4.4) atributos data-*: só o nome do atributo, nunca o valor (9.7)
if (opt.renameData) {
  const candidatas = new Set();
  for (const f of textoSrc) {
    const txt = await readFile(path.join(SRC, f), 'utf8');
    for (const m of txt.matchAll(/\b(data-[a-z][\w-]*)\s*[=\]]/g)) candidatas.add(m[1]);
  }
  for (const c of [...candidatas].sort()) {
    const motivo = provado(c, cfg.keepData);
    if (motivo) { console.log(`  mantido  ${c}  (${motivo})`); continue; }
    const novo = nomeNovo(c);
    mapear(mapaData, c, 'data-' + novo);
    // a METADE QUE FALTA: o DOM le `data-action-change` como dataset.actionChange,
    // e sem esta linha o script procura uma chave que nao existe mais — undefined,
    // sem erro, com o clique deixando de fazer efeito (9.7)
    const camelo = c.replace(/^data-/, '').replace(/-([a-z0-9])/g, (_, l) => l.toUpperCase());
    mapaNomes.set('dataset.' + camelo, 'dataset.' + novo);
  }
}

// 4.5) uma passada só, com os quatro mapas juntos
if (mapaNomes.size) for (const f of textoSrc) {
  const p = path.join(OUT, f);
  let txt = await readFile(p, 'utf8');
  for (const [velho, novo] of mapaNomes) txt = txt.replace(bordas(velho), novo);
  await writeFile(p, txt);
}
console.log(`  ${mapaClasses.size} classes, ${mapaVars.size} variáveis, ${mapaGlobais.size} globais ` +
            `e ${mapaData.size} data-* renomeados`);

// 5-7) minificação e ofuscação — e nenhum comentário sobrevive a partir daqui ---
if (opt.minify) for (const f of arquivos) {
  if (casa(f, cfg.neverTransform)) continue;
  const p = path.join(OUT, f);
  if (f.endsWith('.css')) {
    const css = await readFile(p, 'utf8');
    await writeFile(p, (await transform(css, {
      loader: 'css', minify: true, legalComments: 'none'    // 'none' tira /*! e @license
    })).code);
  } else if (f.endsWith('.js')) {
    let js = (await transform(await readFile(p, 'utf8'), {
      loader: 'js', minifyWhitespace: true, minifySyntax: true,
      minifyIdentifiers: false, legalComments: 'none'       // única etapa que roda sobre o sw.js
    })).code;
    if (opt.obfuscate && f !== 'sw.js' && !f.startsWith('vendor/')) {
      js = JavaScriptObfuscator.obfuscate(js, {
        compact: true, simplify: true, target: 'browser', renameGlobals: false,
        identifierNamesGenerator: 'mangled', seed,   // sem seed o build não é reprodutível
        // os globais já foram trocados em 4.3: o que se reserva aqui é o nome FINAL
        reservedNames: (cfg.reservedGlobals ?? [])
          .map(g => `^${escapa(mapaGlobais.get(g) ?? g)}$`),
        stringArray: !!opt.transformStrings, stringArrayThreshold: 0.75,
        stringArrayEncoding: ['base64'], stringArrayRotate: true,
        stringArrayShuffle: true, stringArrayIndexShift: true,
        controlFlowFlattening: !!opt.controlFlowProtection, controlFlowFlatteningThreshold: 0.35,
        numbersToExpressions: true, deadCodeInjection: false, transformObjectKeys: false,
        unicodeEscapeSequence: false, splitStrings: false,
        selfDefending: false, debugProtection: false, disableConsoleOutput: false
      }).getObfuscatedCode();
    }
    await writeFile(p, js);
  } else if (f.endsWith('.html')) {
    await writeFile(p, await minifyHtml(await readFile(p, 'utf8'), {
      collapseWhitespace: true, removeComments: true,
      ignoreCustomComments: [/^\s*\{/],   // só o placeholder do shell; o /^!/ saiu de propósito
      removeAttributeQuotes: false, removeRedundantAttributes: false, useShortDoctype: false,
      keepClosingSlash: true, sortAttributes: false, sortClassName: false,
      minifyCSS: true, minifyJS: false
    }));
  } else if (f.endsWith('.svg')) {
    // SVG não é minificado: um path "otimizado" é um desenho que ninguém reabre.
    // Sai só o comentário de gerador, que é o que vazaria para o navegador.
    await writeFile(p, (await readFile(p, 'utf8')).replace(/<!--[\s\S]*?-->/g, ''));
  }
}

// 8-9) renomeação e hash de arquivos, e reescrita das referências --------------
const mapaArquivos = new Map();
if (opt.renameFiles || opt.hashAssets) {
  const pastas = new Map();
  /** Decide o nome de um segmento de pasta uma única vez, e reusa a decisão. */
  function pastaNova(seg) {
    if (!pastas.has(seg)) {
      const motivo = seg === '.well-known' ? 'caminho de especificação'
        : provado(seg) ?? (montado('/' + seg + '/') ? 'caminho montado dinamicamente' : null);
      if (motivo) console.log(`  mantida  pasta ${seg}/  (${motivo})`);
      pastas.set(seg, motivo ? seg : nomeNovo(seg));
    }
    return pastas.get(seg);
  }

  const folhas = arquivos.filter(f => /\.(png|jpe?g|webp|avif|gif|svg|woff2?|ttf|otf|ico|mp4|webm)$/.test(f));
  const codigo = arquivos.filter(f => /\.(css|js|mjs)$/.test(f));
  for (const grupo of [folhas, codigo]) {          // folhas primeiro; código depois
    for (const f of grupo) {
      if (casa(f, cfg.neverRename) || casa(f, cfg.neverTransform)) continue;
      const dir = path.posix.dirname(f), base = path.posix.basename(f);
      const ext = base.slice(base.indexOf('.'));   // preserva .min.js inteiro; a extensão NUNCA muda
      const motivo = provado(base) ?? (montado('/' + f) ? 'caminho montado dinamicamente' : null);
      if (motivo) { console.log(`  mantido  ${f}  (${motivo})`); continue; }

      const buf = await readFile(path.join(OUT, f));
      let nome = opt.renameFiles ? nomeNovo('/' + f) : base.slice(0, -ext.length);
      if (opt.hashAssets) nome += '.' + createHash('sha256').update(buf).digest('hex').slice(0, 8);
      const pasta = dir === '.' ? ''
        : (opt.renameFiles ? dir.split('/').map(pastaNova).join('/') : dir) + '/';
      const novo = pasta + nome + ext;
      if (novo === f) continue;

      await mkdir(path.join(OUT, path.dirname(novo)), { recursive: true });
      await writeFile(path.join(OUT, novo), buf);
      await rm(path.join(OUT, f));
      mapaArquivos.set('/' + f, '/' + novo);
    }
    for (const f of await walk(OUT)) {             // reescreve HTML, CSS, JS, manifest e sw
      if (!ehTexto(f) || casa(f, cfg.neverTransform)) continue;
      const p = path.join(OUT, f);
      let txt = await readFile(p, 'utf8'), mudou = false;
      for (const [velho, novo] of mapaArquivos)
        if (txt.includes(velho)) { txt = txt.split(velho).join(novo); mudou = true; }
      if (mudou) await writeFile(p, txt);
    }
  }
  // pasta vazia não entra no dist: o nome dela vazaria sozinho. rmdir falha de
  // propósito quando ainda há arquivo dentro, que é exatamente a guarda desejada.
  for (const d of [...new Set(arquivos.map(f => path.posix.dirname(f)))]
        .filter(d => d !== '.').sort().reverse())
    await rmdir(path.join(OUT, d)).catch(() => {});
}

// 10) informações do build (fora de public/, não é servido) --------------------
const conteudoSource = (await Promise.all([...arquivos].sort()
  .map(f => readFile(path.join(SRC, f))))).map(b => b.toString('base64')).join('');
await writeFile('dist/.build-info.json', JSON.stringify({
  level, salt, geradoEm: new Date().toISOString(),
  sourceHash: createHash('sha256').update(conteudoSource).digest('hex'),
  classes: Object.fromEntries(mapaClasses), vars: Object.fromEntries(mapaVars),
  globais: Object.fromEntries(mapaGlobais), data: Object.fromEntries(mapaData),
  arquivos: Object.fromEntries(mapaArquivos)
}, null, 2));

// 11) validação pós-build ------------------------------------------------------
const gerados = await walk(OUT);
const existe = new Set(gerados.map(f => '/' + f));
for (const f of gerados.filter(ehTexto)) {
  const txt = await readFile(path.join(OUT, f), 'utf8');
  for (const m of txt.matchAll(/(?:src|href)=["'](\/[^"'#?]+)|url\((\/[^)"']+)\)/g)) {
    const ref = (m[1] ?? m[2]).split('?')[0];
    if (ref !== '/' && !ref.endsWith('.html') && !existe.has(ref))
      falhas.push(`referência quebrada em ${f}: ${ref}`);
  }
  if (/cdn\.tailwindcss|unpkg\.com\/tailwindcss/.test(txt)) falhas.push(`CDN do Tailwind em ${f}`);
  if (/api[_-]?key\s*[:=]\s*["'][^"']{12,}|sk_live_|AKIA[0-9A-Z]{16}/i.test(txt))
    falhas.push(`possível segredo em ${f}`);
  if (f.endsWith('.js') && !/\b(import|export)\b/.test(txt)) {
    try { new Function(txt); } catch (e) { falhas.push(`JS inválido em ${f}: ${e.message}`); }
  }
  if (f.endsWith('.html')) {                       // script embutido é bloqueado pela CSP
    for (const m of txt.matchAll(/<script\b([^>]*)>/gi))
      if (!/\bsrc=/i.test(m[1]) && !/application\/ld\+json/i.test(m[1]))
        falhas.push(`script embutido em ${f} (use arquivo externo)`);
  }
  if (!cfg.cacheAutorizado && /caches\.(put|match)\s*\(/.test(txt))
    falhas.push(`cache não autorizado em ${f} (R25)`);

  if (!casa(f, cfg.neverTransform)) {
    for (const velho of mapaNomes.keys())          // 2 e 11) nome dessincronizado
      if (bordas(velho).test(txt)) falhas.push(`nome não sincronizado em ${f}: ${velho}`);
    for (const velho of mapaArquivos.keys())
      if (txt.includes(velho)) falhas.push(`caminho antigo em ${f}: ${velho}`);
    // 12) comentário no dist. NUNCA procurar '//': https:// está em toda URL.
    if (opt.minify && /\.(css|js|mjs)$/.test(f) && txt.includes('/*'))
      falhas.push(`comentário no dist em ${f}`);
    if (opt.minify && /\.(html|svg)$/.test(f) && /<!--(?!\s*\{)/.test(txt))
      falhas.push(`comentário no dist em ${f}`);
  }

  if (f.endsWith('.html') && existsSync(path.join(SRC, f))) {
    const src = await readFile(path.join(SRC, f), 'utf8');
    const conta = (s, re) => (s.match(re) ?? []).length;
    for (const [nome, re] of [['meta', /<meta\s/gi], ['aria', /aria-[a-z]+=/gi],
                              ['alt', /\salt=/gi], ['role', /\srole=/gi], ['for', /\sfor=/gi]])
      if (conta(txt, re) < conta(src, re)) falhas.push(`${nome} perdido na minificação de ${f}`);
  }
}
if (!opt.sourceMaps && gerados.some(f => f.endsWith('.map')))
  falhas.push('source map publicado dentro do dist');

if (falhas.length) {
  console.error('\nBUILD REPROVADO:');
  falhas.forEach(f => console.error('  - ' + f));
  process.exit(1);
}
console.log(`\nBuild ${level} concluído: ${gerados.length} arquivos em ${OUT}`);
```

---

## 17. Existing project — audit before touching anything

**Never assume the project already follows this skill.** Before any change, survey the 20 points and
compare against this document:

| # | Point | What to check |
|---|---|---|
| 1 | Structure | where the frontend lives; is there a source/dist separation? |
| 2 | Technology | vanilla, framework, bundler |
| 3 | Build system | does it exist? does it run? is it reproducible? |
| 4 | Dependencies | build time versus runtime |
| 5 | HTML | shell, fragments, placeholders, inline scripts |
| 6 | CSS | local Tailwind or CDN, `ds.css`, hand-written `@media` (R15) |
| 7 | JavaScript | shared globals, modules, dead code |
| 8 | Assets | origin, weight, external hotlinks |
| 9 | SEO | title, description, canonical, OG, `ld+json` |
| 10 | Accessibility | focus, ARIA, contrast, `prefers-reduced-motion` |
| 11 | Performance | initial weight, request count, Core Web Vitals |
| 12 | PWA | manifest, installability |
| 13 | Service worker | what it stores |
| 14 | Cache | `Cache-Control`, `AssetsAPI`, storage (R25) |
| 15 | Security | backend authorization, CSP, headers (R22, R23) |
| 16 | Minification | does it exist? in the source or in the build? |
| 17 | Obfuscation | does it exist? **is it in the source?** (a violation to fix) |
| 18 | Classes and IDs | semantic, or already random in the source? |
| 19 | API exposure | endpoints and data exposed without need |
| 20 | Secrets | a key, token or credential in the frontend |
| 21 | Asset references | absolute from the site root, or assembled at runtime? This is what decides how much of 11.1 the project can actually use |
| 22 | Comments | is there anything in them worth not publishing — a TODO, an internal URL, the name of a system? |

**After the audit:** list the deviations, fix the architecture where it is incompatible, **preserve the
features**, and avoid an unnecessary rewrite. Do not stack a new build on an incompatible architecture,
and do not swap the project's technology (section 3.3).

R19 applies here: the pipeline with obfuscation gets installed even though this project never asked for
it. R18 bounds that: installing a pipeline is not rewriting the source.

### 17.1 When the source is already obfuscated

A real and delicate situation: the project arrived with its source already obfuscated, or with random
classes written by hand.

1. **Do not "de-obfuscate" by guessing.** Recovering a semantic name from `_0x81ab` is guesswork and
   breaks what works.
2. **Freeze what works:** treat the obfuscated file as legacy, move it to `vendor/` (listed in
   `neverTransform`) and keep using it.
3. **Every new change is born in a new, readable file**, to this skill's standard.
4. Rewrite the legacy module by module, with a test at each step, **only when there is a reason** (a
   defect, a rule change, an evolution). Rewriting for aesthetics does not pay for the risk.
5. Record the plan and what has been migrated in `CLAUDE.md`.

---

## 18. Known errors

- **Dead screen in production with the API answering perfectly:** the minifier renamed a top-level
  identifier and `UI` / `net` / `Auth` vanished. `minifyIdentifiers: false` (6.1) and
  `renameGlobals: false`.
- **Styling disappears after enabling `renameClasses`:** a class injected by Java (`{%nome_active}`) was
  renamed only in the CSS. The proof in 9.3 has to read `src/main/java/**`.
- **Responsiveness broken:** a Tailwind utility entered the candidate list. Nothing present in
  `styles/tailwind.css` is renameable (9.1).
- **A button stops working after obfuscation:** a function called from `onclick=` in the HTML was not in
  `reservedGlobals`.
- **A whole feature disappears with no error at all:** a global shared across files (`Live`, `UI`,
  `AppBus`) outside `reservedGlobals` — each file started seeing a different name.
- **Service worker stuck on an old version:** `sw.js` was hashed, renamed or obfuscated. Never (12).
- **404 on a script that exists in the dist:** its path was assembled at runtime (`'/scripts/' + nome`)
  and the build could not rewrite it. Proof 6 should have frozen it — check whether the fragment is in a
  file the scan does not read.
- **Every page renders `{content}` as literal text:** `ignoreCustomComments` lost `/^\s*\{/` along with
  `/^!/` when comment removal went in. Only `/^!/` was meant to go (7).
- **A staggered list animates all at once:** `--i` was renamed in the CSS but not in the
  `style="--i: 3"` inline in the HTML. The rewrite of 9.5 has to reach the attribute (9.5).
- **A button works in `development` and not in `protected`:** a global was renamed but the `onclick=`
  in the HTML kept the old name — the rename was not program-wide (9.6).
- **A Java-served page loses its styling after `renameFiles`:** a handler serves the file by name
  (`AssetsAPI.serveAsset(ctx, "scripts/ui.js")`). Proof 3 freezes it; if it did not, the string is built
  in Java rather than written literally, and the file belongs in `neverRename`.
- **Every asset changes name on every deploy:** no `ANGATU_BUILD_SALT`, so the salt is random per build
  (16). Pin it per project.
- **Two builds of the same commit produce different JS:** the salt is pinned but the obfuscator's `seed`
  is not, so it draws its own (3.1). The names match and the bytes do not.
- **`og:image` vanishes from shares:** the file was hashed without updating the meta tag, or hashed when
  it should not have been (8).
- **Stale dist published:** the build predates the last source change. The `sourceHash` in
  `.build-info.json` solves it (15.3).
- **"Free" obfuscation that cost a lot:** `controlFlowFlattening` at 1.0 with `deadCodeInjection` on —
  the page three times larger and visibly slower. Turn the aggressiveness down (3.1).

---
*Audit and optimisation: Angatu Sistemas*
