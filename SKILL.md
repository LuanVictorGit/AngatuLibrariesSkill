---
name: AngatuLibrariesSkill
description: Angatu Sistemas engineering standard - Java 21 + Javalin backends (AngatuLib, Saveable, Route) and vanilla frontends under a mandatory design system. ALWAYS load this skill for any Angatu project; once a repo's CLAUDE.md names it, it governs every session there. Rules that override default behaviour - payments and AI go through the AngatuCRM API, never MercadoPagoAPI, DeepSeek or a provider SDK; Tailwind local, never CDN; no cache unless asked; Saveable holds nothing in RAM, so contested writes use mutate; source stays readable and only the build obfuscates into dist, mandatory even on projects that never asked for it; every project ships a Dockerfile for Coolify; WebSocket routes check the session inside the route; the client is hostile, so never trust what the browser sends. Always ask first - backend or static landing page, image compression strategy, Cloudflare Turnstile. Always preview a frontend on a running server and look at it. Triggers - AngatuLibraries, AngatuLib, Saveable, Route, JavalinAPI, Coolify, Dockerfile, deploy, new project, route, entity, screen, landing page, hero, Remotion, SEO, Open Graph, email template, frontend, design system, Tailwind, responsive, build, dist, minify, obfuscate, WebSocket, live channel, session, cookie, security, rate limit, Turnstile, captcha, cache, image, compression, payment, PIX, Mercado Pago, checkout, webhook, AI, LLM, ai:chat.
---

# AngatuLibraries — Angatu Sistemas engineering standard

> Library: <https://github.com/LuanVictorGit/AngatuLibraries> · versions via JitPack <https://jitpack.io/#LuanVictorGit/AngatuLibraries>
> Java 21+, Maven or Gradle · hosting is Coolify · frontend is vanilla HTML/CSS/JS with local Tailwind

**This file is a dispatcher, not a manual.** It carries the rules that are never broken, the
questions that are asked before any code is written, and a map to the reference that holds the
detail. Open the reference for the task at hand instead of working from memory of this page.

**Language.** This skill is written in English. What it produces is not: Javadoc and code
comments, user-visible frontend text, commit messages and the project's own `CLAUDE.md` are all
written in Brazilian Portuguese. See R12 and R16.

**Method.** Before writing a file, read one or two existing files of the same kind (`entities/`,
`routes/`, `public/*.html`) and match their style. Never reimplement what the library already does.

---

## 0. Routing — open the reference for your task

| Task at hand | Read |
|---|---|
| Starting a project, dependencies, `AngatuLib`, Javalin, rate limiting | `references/backend-server.md` |
| Entities, SQLite, queries, indexes, concurrency, porting an old project | `references/backend-persistence.md` |
| HTTP routes, path params, page serving, assets, client IP | `references/backend-routes-html.md` |
| Console, Gson, Env, Password, StringAPI, DataTime, Task, Request, e-mail, push, Discord, QR code | `references/backend-utilities.md` |
| Sessions, cookies, authorization, uploads, secrets, rate limiting, hostile client | `references/security.md` |
| Live channels, `RouteType.WS`, reconnection, event shape | `references/websocket.md` |
| Charging money, AI text generation, webhooks from the CRM | `references/crm-payments-ai.md` |
| Cloudflare Turnstile: keys, verification, privacy policy, CSP | `references/turnstile.md` |
| Saving, resizing or compressing images | `references/images.md` |
| Cache policy, service worker, asset hashing | `references/cache.md` |
| Architecture, DRY, Javadoc, naming, `CLAUDE.md`, commits | `references/conventions.md` |
| Running, testing, project checklist, known traps | `references/testing.md` |
| Dockerfile, Coolify, volumes, environment variables | `references/deploy-coolify.md` |
| **Any frontend at all — start here** | `references/paint.md` (5-phase pipeline) |
| Visual identity, typography, layout principles | `references/frontend-design.md` |
| Brand interview, for a landing with no visual direction | `references/brand-landingpage.md` |
| Animation: native CSS first | `references/css-native.md` |
| Motion concepts translated to vanilla, without React | `references/framer-motion.md` |
| Generative art, canvas backgrounds, textures | `references/canvas-generative.md` |
| Touch, thumb zones, safe areas, mobile budgets | `references/mobile-principles.md` |
| Hover, pointer precision, keyboard, multi-window | `references/desktop-principles.md` |
| Final design audit before delivery | `references/design-audit.md` |
| Build pipeline: minify, obfuscate, rename, hash, validate | `references/frontend-build.md` |
| **Landing page requested — read before anything else** | `references/landing-intake.md` |
| Themed background, hero motion graphics, real material | `references/landing-motion.md` |
| Copy that does not read as machine-written | `references/landing-copy.md` |
| Per-URL SEO and Open Graph cover art | `references/landing-seo-og.md` |
| Static site with no Java: nginx, Coolify Static | `references/static-site.md` |
| Transactional e-mail HTML | `references/email-design.md` |
| Previewing a frontend and actually looking at it | `references/frontend-preview.md` |

---

## 1. Hard rules

Stable identifiers. Cite them as `R7`; they survive reorganisation and fit in the project digest of
section 3. A rule is never traded away for convenience — where two rules collide, the text of the
rule says which one wins.

### Session and project

- **R1 — This skill is sticky.** A project that used it once keeps using it. Write the
  `angatu-skill` block of section 3 into the project's `CLAUDE.md`, and load this skill at the
  start of every session in that repository, before reading or writing code.
- **R2 — `CLAUDE.md` stays current.** Any change to stack, structure, startup, routes, entities or
  environment variables updates `CLAUDE.md` in the same commit. → `references/conventions.md`
- **R3 — Commits go to `development`.** `main` is production and receives only what the project
  owner explicitly confirms. Messages in PT-BR, detailed, Conventional Commits. Never mention
  Claude, AI or `Co-Authored-By`. → `references/conventions.md`

### Library and hosting

- **R4 — Always the newest AngatuLibraries release.** Check JitPack before writing `pom.xml`.
  → `references/backend-server.md`
- **R5 — Declare dependencies only for the modules actually used.** → `references/backend-server.md`
- **R6 — Jetty comes from Javalin, transitively.** Never pin it by hand; on a version clash run
  `mvn dependency:tree -Dincludes=org.eclipse.jetty` and align everything to Javalin.
  → `references/backend-server.md`
- **R7 — HTTP by default; HTTPS only when explicitly asked.** Coolify terminates TLS. Asking
  Javalin for SSL inside the container breaks the deploy. → `references/backend-server.md`
- **R8 — Every project ships `Dockerfile` and `.dockerignore`.** Hosting is Coolify; without them
  the project does not deploy. Never cap the heap with `-Xmx` — use `-XX:MaxRAMPercentage` together
  with `ExitOnOutOfMemoryError` and let the hosting panel own the memory limit.
  → `references/deploy-coolify.md`

### Persistence

- **R9 — `Saveable` keeps nothing in RAM.** Every read hits SQLite and returns a fresh instance;
  every change needs `save()`; a contested record needs `Saveable.mutate(...)`; a field queried
  often needs an index. Getting this wrong loses writes silently, in production, with every unit
  test still passing. → `references/backend-persistence.md`
- **R10 — `Saveable` and `Route` are used only through `extends`.** Their constructors are
  `protected` on purpose. → `references/backend-persistence.md`, `references/backend-routes-html.md`

### Code

- **R11 — Clean architecture, always.** Extract utilities, no repetition, layers kept apart
  (`entities` → `services` → `routes` → `utils`), Javadoc on every public API, short methods.
  → `references/conventions.md`
- **R12 — Code in English, documentation in Portuguese.** Packages, classes, methods and variables
  always in English; Javadoc and comments always PT-BR; every class carries
  `@author Angatu Sistemas`. → `references/conventions.md`

### Frontend and design

- **R13 — The design system covers every surface this skill renders.** Not only "the frontend":
  application screens, landing pages, login, error and blocked pages (404, 500, and the inline
  429/403 pages the rate limiter serves), e-mails, print and report and PDF templates, Open Graph
  covers, development preview pages, and any loose HTML handed over. All of them inherit the
  project's tokens, typography, spacing scale, components, Tailwind responsiveness, accessibility,
  reviewed PT-BR copy and the Angatu footer. **What they do not inherit** is the landing-page
  package — generative art, a Remotion hero and per-URL cover art stay landing requirements. A 404
  takes the palette and the footer; it does not take a hero video. Internal development surfaces
  follow the tokens but are exempt from SEO, Open Graph and the landing audit.
  → `references/paint.md`, `references/design-audit.md`
- **R14 — Tailwind is always local, never CDN.** Download the standalone binary, generate
  `public/styles/tailwind.css`, and commit the generated file — Coolify builds from the repository,
  not from your machine. → `references/frontend-build.md`
- **R15 — All responsiveness is Tailwind.** Breakpoints, grids, visibility, spacing, typography and
  order go through `sm: md: lg: xl: 2xl:`. A hand-written `@media (min-width: …)` outside `ds.css`
  is a violation. → `references/mobile-principles.md`, `references/desktop-principles.md`
- **R16 — Impeccable Portuguese in every user-visible string.** Accents, commas, agreement and
  meaning reviewed before commit — screens, toasts, errors and e-mails alike.
  → `references/landing-copy.md`
- **R17 — The Angatu Sistemas footer is on every page and every e-mail that has a footer.** The
  logo is an official file and is never redrawn. → `references/email-design.md`
- **R18 — SOURCE readable, BUILD protects, DIST publishes.** The source stays semantic and
  debuggable from beginning to end. Minification, obfuscation, class renaming and asset hashing
  exist only in the build, writing into `dist/`. **The build never rewrites `src/`.**
  → `references/frontend-build.md`
- **R19 — Obfuscation is mandatory on every published frontend**, including a project that never
  asked for it: applying this skill to an existing project means installing the pipeline. Bounded
  by R18 (what is mandatory is the build, never a source rewrite) and by R20 (always on does not
  mean always maximum). `emails/**` is never transformed, `sw.js` and `vendor/**` are never
  obfuscated, and already-obfuscated legacy stays frozen in `vendor/`. → `references/frontend-build.md`
- **R20 — Obfuscation is not security, and never outranks anything.** Priority order, lower number
  wins every conflict: **1** correct behaviour · **2** real security · **3** accessibility ·
  **4** SEO · **5** compatibility · **6** performance · **7** maintainability · **8** obfuscation.
  A transformation that cannot be proven safe is not applied. → `references/frontend-build.md`
- **R21 — Preview every frontend on a running server, and look at it.** Nothing visual is finished
  until it has been rendered and inspected at desktop and mobile widths, and what was seen has been
  stated. Starting a server is not the verification; looking is.
  → `references/frontend-preview.md`

### Security

- **R22 — The client is hostile.** Assume an intercepting proxy (Burp Suite) rewriting the request
  after the page built it. Prices and totals are recalculated server-side; every identifier is
  authorised against the session; role and tenant never come from the request; `hidden`, `disabled`
  and `readonly` fields carry no authority; browser validation is repeated on the server; the JSON
  body is never bound wholesale onto an entity. → `references/security.md`
- **R23 — Session and API security.** `HttpOnly` + `SameSite` cookie, `Secure` decided by
  environment, token never in a URL, authorization validated in the backend on every route, tenant
  filtered on every query. → `references/security.md`
- **R24 — A WebSocket route checks the session inside itself.** The upgrade request bypasses every
  filter the library installs — no input filter, no rate limit, no security headers. A `WS` route
  without a gate **raises no error**: it serves whoever arrives. One gate per project, check before
  registering, and a live channel is never the source of truth. → `references/websocket.md`
- **R25 — Never cache unless asked.** Content comes from the server on every request: no service
  worker storing screens, no long `Cache-Control`, no asset cache. Cache exists only when the client
  asks for it, and then it is deliberate, narrow and documented. → `references/cache.md`

### Integrations

- **R26 — Payments and AI go through the AngatuCRM API.** Never the provider directly, never a
  provider SDK, and never this library's own `MercadoPagoAPI` or `DeepSeek`. **This rule beats the
  integrations reference.** Truth lives at <https://crm.angatusistemas.com.br/docs-ia> and
  <https://crm.angatusistemas.com.br/docs-pagamentos>. → `references/crm-payments-ai.md`
- **R27 — Ask about Cloudflare Turnstile (G4).** When it is used: keys come from `.env`, the token
  is verified in the backend, the configuration covers the whole system, and the privacy policy
  gets Cloudflare's notice and link. → `references/turnstile.md`
- **R28 — Saving images? Ask for the compression strategy first (G2).** Storage is expensive and the
  choice changes how the result looks. Never decide alone. → `references/images.md`

### Testing

- **R29 — Test by running the project's own JAR.** `mvn package -DskipTests && java -jar
  target/<app>.jar`. Never `python -m http.server`, `npx serve`, a Live Server extension or
  `file://` — outside the real server there is no session, no API, no page assembly and no security
  headers, so a screen that *looks* right hides exactly the defects that matter. **One narrow
  exception**, defined in `references/frontend-preview.md`: a static-only project has no JAR, so a
  temporary static server may serve `dist/` for preview, and is shut down afterwards.
  → `references/testing.md`

---

## 2. Gates — questions asked before code is written

A gate is not a suggestion. Stop, ask, wait for the answer, record it in `CLAUDE.md`, then write
code. Answering on the user's behalf is the failure this section exists to prevent.

| Gate | Fires when | Ask |
|---|---|---|
| **G1 — Landing** | a landing page, homepage or campaign page is requested | *"Does this landing have a backend, or is it a static site?"* Backend → the full Java stack. Static → Coolify Static with `nginx:alpine`, still through the build pipeline. **Not one line of code before the answer.** → `references/landing-intake.md` |
| **G2 — Images** | the project starts saving images | compression strategy (A/B/C/D), maximum upload size, accepted formats, thumbnail needed. Recorded in `CLAUDE.md`, asked once per project. → `references/images.md` |
| **G3 — Cache** | anything would store content | cache is never introduced on the agent's initiative. If it looks necessary, ask; the default is no cache. → `references/cache.md` |
| **G4 — Turnstile** | a new project, and any existing project that does not have it yet | *"Will this system use Cloudflare Turnstile?"* If yes → `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` from `.env`, backend verification, system-wide coverage, and Cloudflare's notice added to the privacy policy. → `references/turnstile.md` |

---

## 3. Making the skill stick to the project (R1)

The body of a skill is loaded once, and it is the first thing a long session compacts away. A
project's `CLAUDE.md` is re-injected every session and survives. So the rules are anchored there.

**On the first use of this skill in any project**, write this block into the project's `CLAUDE.md`.
Keep the markers: they allow the block to be rewritten later without touching anything else.

```markdown
<!-- angatu-skill:begin — não remover -->
## Padrão de engenharia — AngatuLibrariesSkill

Este projeto é construído sob a **AngatuLibrariesSkill**. Carregue-a no início de toda sessão,
antes de ler ou escrever qualquer código deste repositório. Se ela não estiver carregada,
carregue-a antes de responder — não trabalhe apenas pelo resumo abaixo.

### Resumo das regras (texto completo na skill; os IDs são estáveis)

R1 skill obrigatória neste repositório · R2 CLAUDE.md sempre atualizado · R3 commits na
`development`, nunca citar IA · R4 sempre a última versão da lib · R5 só as dependências usadas ·
R6 Jetty vem do Javalin · R7 HTTP por padrão, o TLS é do Coolify · R8 Dockerfile obrigatório, sem
`-Xmx` · R9 Saveable não guarda nada em RAM, registro disputado usa `mutate` · R10 Saveable e Route
só por `extends` · R11 arquitetura limpa e DRY · R12 código em inglês, Javadoc em PT-BR,
`@author Angatu Sistemas` · R13 o sistema de design vale para toda superfície renderizada,
inclusive erro, e-mail e impressão · R14 Tailwind local, nunca CDN · R15 responsividade só em
Tailwind · R16 português impecável no texto visível · R17 rodapé da Angatu em página e e-mail ·
R18 source legível, build protege, dist publica · R19 ofuscação obrigatória, mesmo sem pedido ·
R20 ofuscação nunca vence funcionamento, segurança, acessibilidade ou SEO · R21 todo frontend é
visto rodando antes de ser entregue · R22 o cliente é hostil: presuma um proxy interceptando ·
R23 cookie HttpOnly, token fora da URL, autorização em toda rota · R24 rota WS confere a sessão
dentro dela · R25 nunca usar cache sem pedido · R26 pagamento e IA pela API do AngatuCRM ·
R27 Turnstile: chaves no `.env` e aviso na política de privacidade · R28 perguntar a estratégia de
compressão antes de salvar imagem · R29 testar pelo JAR do próprio projeto.

### Decisões registradas deste projeto
- Compressão de imagem (G2): _(a definir)_
- Turnstile (G4): _(a definir)_
- Cache (G3): não usar
<!-- angatu-skill:end -->
```

Rewrite the block when a rule changes. Everything outside the markers belongs to the project.

---

## 4. Workflows

### 4.1 New project

1. Answer G4 (Turnstile) and, if this is a landing page, G1 first.
2. `references/backend-server.md` — `pom.xml` on the newest release, `Main` with
   `new AngatuLib(host, port, true)`, proxy hops, rate limits.
3. `references/deploy-coolify.md` — `Dockerfile`, `.dockerignore`, `GET /health`, `/data` volume.
4. `references/backend-persistence.md` — entities, and indexes created at startup.
5. `references/backend-routes-html.md` — routes and the page shell.
6. `references/paint.md` — the whole frontend pipeline, plus R13 for every other surface.
7. `references/frontend-build.md` — the build, with obfuscation on by R19.
8. `references/testing.md` — the project checklist, run the JAR, then the `dist`.
9. Write the section 3 block into `CLAUDE.md`, commit to `development`.

### 4.2 Landing page

**Ask G1 before anything else.** Then `references/landing-intake.md` for the chosen track, and from
there `landing-motion.md`, `landing-copy.md` and `landing-seo-og.md`. The static track adds
`references/static-site.md`.

### 4.3 Changing an existing frontend

Analyse before touching: never assume the project already follows this skill. Read
`references/frontend-build.md` for the 20-point audit, list the deviations, fix the relevant ones,
then make the change that was asked for. R19 means the build pipeline gets installed even if nobody
asked for it; R18 means the source is not rewritten to achieve that.

### 4.4 Before calling anything done

- R21: it was rendered on a running server and looked at, at desktop and mobile widths.
- `references/design-audit.md`: run it even when the user said they liked it.
- `references/testing.md`: the JAR runs, the routes answer, and the `dist` was tested too —
  minification defects never show up in the readable build.
- `CLAUDE.md` updated (R2), commit on `development` with no mention of AI (R3).

---

## 5. Library index

One line each; the detail lives in the reference named in section 0.

**Core** — `AngatuLib` (startup), `JavalinAPI` (server, security headers, rate limiting),
`Dependencies` (classload guard), `Console` + `AnsiColor` (logging), `Env`, `GsonAPI`, `Password`,
`StringAPI`, `DataTime`, `Task`, `Request` / `Response` / `StatusCode`.

**Persistence** — `Saveable` (SQLite + Gson, no RAM cache), with `mutate`, `transaction`,
`createIndex` and `query`.

**Web** — `Route` + `RouteType` (auto-discovered), `HtmlRouteAPI` (one page per file name),
`AssetsAPI`, `IP`.

**Integrations** — `EmailAPI`, `EmailFormatter`, `WebPushAPI` + `PushBootstrap`, `Bot` (Discord),
`BrowserAPI` (Playwright), `ImageAPI`, `QRCodeAPI`.

**Present but off-limits in client projects (R26)** — `MercadoPagoAPI` and `DeepSeek`. They exist
for AngatuCRM itself, which is the only place a provider credential lives.
