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
  obfuscated; already-obfuscated legacy stays frozen in `vendor/` (section 17.1).

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
dist/.build-info.json            nível, salt, mapa de classes e de hashes (não é servido)
```

`dist/public/` becomes `target/classes/public/` at packaging time (section 15.1) — that is what
`AssetsAPI` serves in production.

For a static project there is no Maven and no JAR; the layout and the nginx image are in
`static-site.md`, and everything else on this page applies unchanged.

---

## 3. Levels and configuration

### 3.1 The three levels

| Level | When | Minify | Obfuscate | Rename classes | Hash | Source maps |
|---|---|---|---|---|---|---|
| `development` | day to day, debugging | no | no | no | no | yes |
| `production` | a publish where Node is unavailable (section 3.3) | yes | no | no | optional | no |
| `protected` | **the publishing default (R19)** | yes | yes | only where proven safe | optional | never |

`development` is the local default and **needs no tooling beyond the Tailwind CLI** that is mandatory
anyway (R14): it only copies the source. A project without Node is still developed and run normally.

`production` is no longer the normal publishing level. It exists for the case in section 3.3, where Node
cannot be in the pipeline at all — and that limitation is recorded in `CLAUDE.md` rather than chosen.

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
    "development": { "minify": false, "obfuscate": false, "renameClasses": false, "renameIds": false, "hashAssets": false, "removeDeadCode": false, "transformStrings": false, "controlFlowProtection": false, "sourceMaps": true },
    "production":  { "minify": true,  "obfuscate": false, "renameClasses": false, "renameIds": false, "hashAssets": false, "removeDeadCode": false, "transformStrings": false, "controlFlowProtection": false, "sourceMaps": false },
    "protected":   { "minify": true,  "obfuscate": true,  "renameClasses": true,  "renameIds": false, "hashAssets": false, "removeDeadCode": true,  "transformStrings": true,  "controlFlowProtection": true,  "sourceMaps": false }
  },
  "keepClasses": [],
  "keepIds": [],
  "neverTransform": ["emails/**", "vendor/**"],
  "neverHash": ["*.html", "sw.js", "manifest.webmanifest", "robots.txt", "sitemap.xml", "favicon.ico", ".well-known/**", "emails/**", "assets/og/**"],
  "reservedGlobals": ["UI", "net", "Auth", "AppBus", "showToast"],
  "cacheAutorizado": false
}
```

> **Do not invent a configuration format if the project already has one.** If it uses `package.json`,
> `vite.config.js`, `webpack.config.js` or its own pipeline, **adapt to it** and keep only the key names
> (`minify`, `obfuscate`, `renameClasses`, `renameIds`, `hashAssets`, `removeDeadCode`,
> `transformStrings`, `controlFlowProtection`). The file above is the default only for a project that
> has nothing.

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
4. Renomeação de classes/IDs        → só o que foi PROVADO seguro (9, 10)
5. Minificação CSS                  (5)
6. Minificação + ofuscação JS       (6) — nunca em emails/**, nunca ofusca sw.js
7. Minificação HTML                 (7) — preservando SEO, a11y e placeholders
8. Hash de assets                   (11) — folhas primeiro, depois CSS/JS; nunca HTML/sw/manifest
9. Atualização das referências      → HTML, CSS, JS, manifest, sw
10. Gravação do dist/.build-info.json
11. Validação pós-build             → falha com exit 1 se qualquer referência quebrou (14)
```

Rename **before** minifying (a readable file makes substitution provable). Hash **after** minifying (the
hash has to be of the final content).

---

## 5. CSS

Apply minification, optimisation and dead-code removal **only when it is safe**.

- **Tailwind already does its own dead-code removal** through `content` in `tailwind.config.js`. Do not
  run an unused-CSS remover over `tailwind.css`.
- In `ds.css` and page CSS, **do not remove an "unused" rule automatically**: a class applied by
  `classList.add()`, by a server attribute (`{%nome_active}`) or by a third-party library appears in no
  HTML and would be deleted by mistake. Dead CSS removal only with manual analysis and a test.
- Minify with `esbuild` (`loader: 'css'`): it compresses, keeps the cascade and does not reorder
  selectors.
- The `<link>` order stays `tailwind.css` before `ds.css` (R14).

---

## 6. JavaScript

### 6.1 Safe minification for classic scripts

The Angatu shell scripts are classic and **share globals** (`UI`, `net`, `Auth`, `AppBus`, `showToast`).
A minifier that renames top-level identifiers breaks everything silently.

```js
// seguro para script clássico: encolhe sem renomear o que é global
await transform(code, { loader: 'js', minifyWhitespace: true, minifySyntax: true, minifyIdentifiers: false });
```

Only enable `minifyIdentifiers: true` for a file whose entire content is inside an IIFE or an ES module —
there is no top-level symbol to break there.

### 6.2 Obfuscation

```js
JavaScriptObfuscator.obfuscate(code, {
  compact: true, simplify: true, target: 'browser',
  renameGlobals: false,                    // scripts clássicos compartilham globais
  identifierNamesGenerator: 'mangled',
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

**Never obfuscate:**

- `sw.js` — a broken service worker stays stuck on the user's device, and they have no way to help
  themselves. Minify it, nothing more.
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

---

## 7. HTML

```js
await minifyHtml(html, {
  collapseWhitespace: true, conservativeCollapse: false,
  removeComments: true, ignoreCustomComments: [/^!/, /^\s*\{/],
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

**`HtmlRouteAPI` placeholders:** `{content}`, `{page}` and `{%nome_active}` pass through the build
intact. `{%nome_active}` usually appears **inside `class="..."`** — the renaming step ignores any token
containing `{` or `}`, and the class the server injects is untouchable (section 9.2).

A page's `<script>` stays an external file — an inline script is blocked by the content security policy,
and the build does not fix that.

---

## 8. Assets

- Generated art (`canvas-generative.md`) is already optimised; the build only copies and, when enabled,
  hashes it.
- A user-uploaded image never passes through here — it goes to `/data/uploads` with the compression
  strategy asked of the developer (G2, `images.md`).
- `favicon.ico`, `apple-touch-icon` and the Open Graph covers (`assets/og/**`, `landing-seo-og.md`) are
  **not** hashed: they are referenced by convention, by search engines and by social networks, which
  cache the URL themselves.

---

## 9. Class renaming — only with proof of safety

> **The real and limited objective:** to raise the cost of trivial automation that depends on a
> predictable selector. **It is not security.** A bot that executes JavaScript reads the DOM and finds
> the current name in seconds.

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

For each candidate, the build scans all source JS and HTML:

- **Static occurrence** — the complete token inside `class="..."`, inside a CSS selector, or inside a
  string literal (`'product-card'`, `'.product-card .title'`, `'card product-card'`). That is
  renameable.
- **Dynamic fragment** — any literal glued to a concatenation (`'product-' + kind`) or an interpolation
  (`` `product-${kind}` ``). If such a fragment is a prefix or a piece of the candidate's name, it is
  marked **UNSAFE** and not renamed.

The build report lists, per class: `renamed`, `kept (reason)` or `unsafe (file)`. An unsafe class does
**not** fail the build — it simply keeps its original name, and the report says why.

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
`a81Kx` was `product-card`.

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

---

## 11. Asset hashing and the cache rule

Hashing is **cache busting**: `app.js` → `app.8f91c2ad.js`, with every reference updated automatically.

**Interaction with R25 (no cache):**

- **Project on the default (no cache):** `hashAssets: false`. With `no-store` on every response the hash
  buys nothing and makes files harder to trace. Do not enable it out of habit.
- **Project where the client asked for cache:** `hashAssets: true` becomes **mandatory**.
  `Cache-Control: public, max-age=31536000, immutable` is only safe on a file whose name changes when
  its content changes. The HTML stays `no-store` forever — it is what points at the new names.

Pay attention when updating references: `<link rel="preload">`, `<link rel="modulepreload">`, dynamic
`import()`, `manifest.webmanifest`, `sw.js`, and any path assembled in JS.

**What makes hashing provable:** in the source, every asset reference is **absolute from the site root**
(`/styles/ds.css`, `/scripts/ui.js`). A path assembled at runtime (`'/assets/' + nome + '.png'`) cannot
be rewritten — leave those files out of hashing (`neverHash`), or publish the generated map at
`/assets/manifest.json` and read the final name from there.

---

## 12. PWA and service worker

- `sw.js` and `manifest.webmanifest` are **never** hashed and **never** obfuscated. They are minified and
  have their references updated last, once everything else has its final name.
- If the service worker lists files, that list is rewritten from the build's hash map. A service worker
  pointing at a file that no longer exists is a build failure.
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

Checks 6 and 7 are R20 enforced mechanically: they make it impossible for obfuscation to quietly cost
SEO or accessibility.

```bash
grep -rn "cdn.tailwindcss\|unpkg.com/tailwindcss" dist/public && echo "FALHA: CDN"
grep -rn "caches.put\|caches.match" dist/public && echo "FALHA: cache nao pedido"
grep -rn "<script>" dist/public/*.html && echo "FALHA: script embutido"
grep -rniE "api[_-]?key|secret|password|bearer [a-z0-9]{20,}|AKIA[0-9A-Z]{16}|sk_live_" dist/public && echo "FALHA: possivel segredo"
find dist/public -name "*.map" | grep . && echo "FALHA: source map publicado"
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
import { readFile, writeFile, mkdir, rm, readdir, cp } from 'node:fs/promises';
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
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await cp(SRC, OUT, { recursive: true });          // o source nunca é tocado a partir daqui

// 4) renomeação de classes com prova de segurança ------------------------------
const mapaClasses = new Map();
if (opt.renameClasses) {
  const cssProjeto = arquivos.filter(f => f.endsWith('.css')
    && f !== 'styles/tailwind.css' && !casa(f, cfg.neverTransform));
  const tailwind = existsSync(path.join(SRC, 'styles/tailwind.css'))
    ? await readFile(path.join(SRC, 'styles/tailwind.css'), 'utf8') : '';
  const intocaveis = new Set([...tailwind.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map(m => m[1]));

  const candidatas = new Set();
  for (const f of cssProjeto) {
    const css = (await readFile(path.join(SRC, f), 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '');
    for (const bloco of css.split('}')) {
      const seletor = bloco.split('{')[0] ?? '';
      for (const m of seletor.matchAll(/\.([a-z][a-z0-9]*(?:-[a-z0-9]+)+)/g)) candidatas.add(m[1]);
    }
  }

  // fragmentos dinâmicos: literal colado a concatenação ou a interpolação
  const fragmentos = new Set();
  for (const f of arquivos.filter(f => /\.(js|mjs|html)$/.test(f) && !casa(f, cfg.neverTransform))) {
    const txt = await readFile(path.join(SRC, f), 'utf8');
    for (const m of txt.matchAll(/['"]([^'"\n]{2,})['"]\s*\+|\+\s*['"]([^'"\n]{2,})['"]/g))
      fragmentos.add(m[1] ?? m[2]);
    for (const m of txt.matchAll(/`([^`$]{2,})\$\{/g)) fragmentos.add(m[1]);
  }

  const usados = new Set(intocaveis);
  for (const c of [...candidatas].sort()) {
    const motivo =
        intocaveis.has(c)                                         ? 'utilitário do Tailwind'
      : casa(c, cfg.keepClasses)                                  ? 'keepClasses'
      : new RegExp(`(?<![\\w-])${escapa(c)}(?![\\w-])`).test(javaSrc) ? 'usada no Java (servidor)'
      : new RegExp(`(?<![\\w-])${escapa(c)}(?![\\w-])`).test(intocavelSrc) ? 'usada em arquivo intocável'
      : [...fragmentos].some(fr => c.startsWith(fr) || c.includes(fr)) ? 'montada dinamicamente'
      : null;
    if (motivo) { console.log(`  mantida  ${c}  (${motivo})`); continue; }
    let novo, i = 0;
    do {
      novo = 'x' + BigInt('0x' + createHash('sha256').update(c + salt + i++)
        .digest('hex').slice(0, 12)).toString(36).slice(0, 5);
    } while (usados.has(novo));
    usados.add(novo); mapaClasses.set(c, novo);
  }

  for (const f of arquivos.filter(f => ehTexto(f) && !casa(f, cfg.neverTransform))) {
    const p = path.join(OUT, f);
    let txt = await readFile(p, 'utf8');
    for (const [velho, novo] of mapaClasses)
      txt = txt.replace(new RegExp(`(?<![\\w-])${escapa(velho)}(?![\\w-])`, 'g'), novo);
    await writeFile(p, txt);
  }
  console.log(`  ${mapaClasses.size} classes renomeadas`);
}

// 5-7) minificação e ofuscação -------------------------------------------------
if (opt.minify) for (const f of arquivos) {
  if (casa(f, cfg.neverTransform)) continue;
  const p = path.join(OUT, f);
  if (f.endsWith('.css')) {
    const css = await readFile(p, 'utf8');
    await writeFile(p, (await transform(css, { loader: 'css', minify: true })).code);
  } else if (f.endsWith('.js')) {
    let js = (await transform(await readFile(p, 'utf8'), {
      loader: 'js', minifyWhitespace: true, minifySyntax: true, minifyIdentifiers: false
    })).code;
    if (opt.obfuscate && f !== 'sw.js' && !f.startsWith('vendor/')) {
      js = JavaScriptObfuscator.obfuscate(js, {
        compact: true, simplify: true, target: 'browser', renameGlobals: false,
        identifierNamesGenerator: 'mangled',
        reservedNames: (cfg.reservedGlobals ?? []).map(g => `^${g}$`),
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
      collapseWhitespace: true, removeComments: true, ignoreCustomComments: [/^!/, /^\s*\{/],
      removeAttributeQuotes: false, removeRedundantAttributes: false, useShortDoctype: false,
      keepClosingSlash: true, sortAttributes: false, sortClassName: false,
      minifyCSS: true, minifyJS: false
    }));
  }
}

// 8-9) hash de assets e reescrita de referências -------------------------------
const mapaHash = new Map();
if (opt.hashAssets) {
  const folhas = arquivos.filter(f => /\.(png|jpe?g|webp|avif|gif|svg|woff2?|ttf|otf|ico|mp4|webm)$/.test(f));
  const codigo = arquivos.filter(f => /\.(css|js)$/.test(f));
  for (const grupo of [folhas, codigo]) {          // folhas primeiro; código depois
    for (const f of grupo) {
      if (casa(f, cfg.neverHash) || casa(f, cfg.neverTransform)) continue;
      const buf = await readFile(path.join(OUT, f));
      const h = createHash('sha256').update(buf).digest('hex').slice(0, 8);
      const novo = f.replace(/(\.[^.]+)$/, `.${h}$1`);
      await writeFile(path.join(OUT, novo), buf);
      await rm(path.join(OUT, f));
      mapaHash.set('/' + f, '/' + novo);
    }
    for (const f of await walk(OUT)) {             // reescreve HTML, CSS, JS, manifest e sw
      if (!ehTexto(f) || casa(f, cfg.neverTransform)) continue;
      const p = path.join(OUT, f);
      let txt = await readFile(p, 'utf8'), mudou = false;
      for (const [velho, novo] of mapaHash)
        if (txt.includes(velho)) { txt = txt.split(velho).join(novo); mudou = true; }
      if (mudou) await writeFile(p, txt);
    }
  }
}

// 10) informações do build (fora de public/, não é servido) --------------------
const conteudoSource = (await Promise.all([...arquivos].sort()
  .map(f => readFile(path.join(SRC, f))))).map(b => b.toString('base64')).join('');
await writeFile('dist/.build-info.json', JSON.stringify({
  level, salt, geradoEm: new Date().toISOString(),
  sourceHash: createHash('sha256').update(conteudoSource).digest('hex'),
  classes: Object.fromEntries(mapaClasses), assets: Object.fromEntries(mapaHash)
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
  if (!casa(f, cfg.neverTransform)) for (const velho of mapaClasses.keys())
    if (new RegExp(`(?<![\\w-])${escapa(velho)}(?![\\w-])`).test(txt))
      falhas.push(`classe não sincronizada em ${f}: ${velho}`);
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
- **Service worker stuck on an old version:** `sw.js` was hashed or obfuscated. Never (12).
- **`og:image` vanishes from shares:** the file was hashed without updating the meta tag, or hashed when
  it should not have been (8).
- **Stale dist published:** the build predates the last source change. The `sourceHash` in
  `.build-info.json` solves it (15.3).
- **"Free" obfuscation that cost a lot:** `controlFlowFlattening` at 1.0 with `deadCodeInjection` on —
  the page three times larger and visibly slower. Turn the aggressiveness down (3.1).

---
*Audit and optimisation: Angatu Sistemas*
