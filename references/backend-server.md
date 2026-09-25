# Backend server — dependencies, startup and JavalinAPI

> Covers R4 (newest version of every Angatu library), R5 (only the modules used), R6 (Jetty from
> Javalin) and R7 (HTTP only). Read this before writing `pom.xml` or `Main`.

---

## 1. Always the newest version (R4)

**The repository publishes no tags and no releases** — measured, not assumed, and the same is true
of `AngatuWhatsappSDK`. So there is no "latest release" to take: the newest version is the
**latest commit on `main`**, and JitPack accepts a commit hash where a version goes.

```bash
curl -s https://api.github.com/repos/LuanVictorGit/AngatuLibraries/commits/main | grep -m1 '"sha"'
# ou, sem a API:  git ls-remote https://github.com/LuanVictorGit/AngatuLibraries.git HEAD
```

Then:

1. Use `com.github.LuanVictorGit:AngatuLibraries:COMMIT_HASH`.
2. Align every third-party coordinate with the `pom.xml` of that commit (section 3 below).
3. Record the hash in the project's `CLAUDE.md` (R2), so the next session knows what is pinned
   without reading `pom.xml`.

**This check is run every time, including when nobody asked for it.** On a new project it is
obvious; on an existing one it is the whole point — the pinned hash is read and compared against
`main` before it is trusted, and a project that is behind is **said out loud**, with the decision
to move left to the owner. A version copied out of another project's `pom.xml` is how a codebase
silently freezes a year behind.

**The same rule covers every other Angatu library** the project pulls in — today that means
`AngatuWhatsappSDK` (R36), which has its own coordinates. → `references/whatsapp.md`

```xml
<!-- pom.xml -->
<repositories>
  <repository><id>jitpack.io</id><url>https://jitpack.io</url></repository>
</repositories>
<dependencies>
  <dependency>
    <groupId>com.github.LuanVictorGit</groupId>
    <artifactId>AngatuLibraries</artifactId>
    <version>VERSION</version>
  </dependency>
</dependencies>
```

```groovy
// build.gradle
repositories { maven { url 'https://jitpack.io' } }
dependencies { implementation 'com.github.LuanVictorGit:AngatuLibraries:VERSION' }
```

## 2. `.env` and debug

`.env` at the project root, never committed — `ignoreIfMissing` / `ignoreIfMalformed`:

```env
EMAIL_KEY=voce@gmail.com
EMAIL_PASSWORD=senha_de_app
DISCORD_BOT_TOKEN=xxx
TURNSTILE_SITE_KEY=xxx
TURNSTILE_SECRET_KEY=xxx
```

> `DEEPSEEK_API_KEY` and `MP_ACCESS_TOKEN` do **not** belong in a client project (R26). If either
> exists in a `.env`, it is in the wrong place — the right credential is an AngatuCRM token.
> See `crm-payments-ai.md`.

Debug: `java -Dangatu.debug=true -jar app.jar`, or `Console.setDebugEnabled(true)`.

## 3. Dependencies per module (R5)

Declare only what the project actually uses.

| Module | Coordinates | Class that needs it at classload |
|---|---|---|
| Web / HTML / assets / routes | `io.javalin:javalin:7.2.3`, `org.reflections:reflections:0.10.2` + an SLF4J binding (`org.slf4j:slf4j-simple:2.0.17`), **plus the Persistence row** (blocks and route limits are stored through `Saveable`). Never `javalin-ssl`: the library has no HTTPS mode (R7) | `JavalinAPI` |
| Persistence | `org.xerial:sqlite-jdbc:3.51.3.0`, `com.zaxxer:HikariCP:7.0.2`, `com.google.code.gson:gson:2.13.2` | — |
| JSON | `com.google.code.gson:gson:2.13.2` | `GsonAPI`, type adapters |
| `.env` | `io.github.cdimascio:dotenv-java:3.2.0` | — |
| Passwords | `org.mindrot:jbcrypt:0.4` | — |
| Web Push | `nl.martijndwars:web-push:5.1.2`, `org.bouncycastle:bcprov-jdk18on:1.86`, `org.bitbucket.b_c:jose4j:0.9.6`, `org.apache.httpcomponents:httpclient:4.5.14`, `com.google.code.gson:gson:2.13.2`, **plus the Persistence row** (`PushBootstrap` stores the VAPID keys) | — |
| E-mail | `com.sun.mail:jakarta.mail:2.0.2` (2.0.1 has the SMTP injection CVE-2025-7962) + dotenv | — |
| Discord | `net.dv8tion:JDA:6.4.1` + dotenv (the token comes from `Env`) | — |
| Payments | `com.mercadopago:sdk-java:2.9.2` — **AngatuCRM only** (R26) | — |
| Browser | `com.microsoft.playwright:playwright:1.58.0` (plus `mvn exec:java -e -Dexec.mainClass=com.microsoft.playwright.CLI -Dexec.args="install chromium"` once) | — |
| Images | `net.coobird:thumbnailator:0.4.21`, `com.twelvemonkeys.imageio:imageio-webp:3.12.0` / `imageio-tiff:3.12.0` | — |
| QR Code | `com.google.zxing:core:3.5.3`, `com.google.zxing:javase:3.5.3` | — |
| Lombok | `org.projectlombok:lombok:1.18.44` (`provided`) | — |

Guard: `Dependencies.require("io.javalin.Javalin", "io.javalin:javalin:7.2.3", "Web Server (Javalin)")`
prints Maven/Gradle instructions and throws `MissingDependencyException`. Every class links without
its optional dependencies and shows that message on first use, except the ones whose public
signature carries a third-party type: `JavalinAPI` (Javalin types) and the Gson type adapters (they
extend `TypeAdapter`). Those fail with `NoClassDefFoundError` naming the missing class.

## 4. Jetty follows Javalin (R6)

Javalin 7.2.3 brings Jetty in **transitively** — Jetty 12.1.12, which carries the fixes for the three
Jetty CVEs of 2026 that 12.1.8 (Javalin 7.2.2) did not. **Do not pin Jetty by hand.** Confirm the
real version with `mvn dependency:tree -Dincludes=org.eclipse.jetty` and let the transitive
dependency decide.

- Do not declare `org.eclipse.jetty:*` in `pom.xml` unless you must override something.
- If you must declare one (`jetty-alpn`, `jetty-http`), use exactly the version that
  `mvn dependency:tree` shows coming from `javalin:7.2.3`.
- On a clash (`NoSuchMethodError` / `ClassNotFoundException` from Jetty), run the tree and align
  everything to Javalin's version.
- `javalin-ssl` is no longer a dependency of anything: remove it from an old `pom.xml` (R7).

---

## 5. Startup — `AngatuLib`

### 5.1 The constructor: HTTP only (R7)

```java
import br.com.angatusistemas.lib.AngatuLib;
import br.com.angatusistemas.lib.javalin.JavalinAPI;

/**
 * Ponto de entrada da aplicação.
 *
 * @author Angatu Sistemas
 */
public class Main {
    public static void main(String[] args) {
        // A porta vem do ambiente: o Coolify publica o contêiner nela.
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));

        // Tudo antes do new AngatuLib: vale desde a primeira requisição
        JavalinAPI.setTrustedProxyHops(1);                // proxy do Coolify na frente (2 com Cloudflare)
        JavalinAPI.addIgnoredPath("/health");             // usada pelo HEALTHCHECK
        JavalinAPI.configureApiRateLimit("/api/*");
        JavalinAPI.configureLoginRateLimit("/api/login");

        new AngatuLib("loja.angatusistemas.com.br", port, true);
    }
}
```

Configuration called after the constructor still works, but only from that moment on — requests
that arrive in between see the defaults. And `bloqByMaxRequisitions` from the constructor overrides an
earlier `setRateLimitingEnabled`.

**Signature:**

```java
new AngatuLib(String host, int port, boolean bloqByMaxRequisitions) // HTTP; the TLS belongs to Coolify
```

- `host` — the project's public domain (`loja.angatusistemas.com.br`), or `localhost` in development.
- `port` — the port Javalin listens on. **It is always honoured** (the old redirect to port 80 on
  localhost is gone). Read it from `PORT`, defaulting to `8080`.
- `bloqByMaxRequisitions` — enables rate limiting and blocking.

> **There is no HTTPS mode.** The library runs only behind Coolify, whose edge proxy issues, renews
> and terminates the certificate; the application speaks HTTP inside the container network. The old
> four-argument constructor `(host, port, bloq, manageSsl)` is deprecated for removal: `false` behaves
> like the three-argument one, and `true` throws `UnsupportedOperationException` before touching
> anything (no `System.out` redirect, no server). `isManageSsl()` is always `false`;
> `getCertsPath()` and `getFolderCerts()` return `null`. An old project that passed `true` moves to
> Coolify and drops `javalin-ssl` from its `pom.xml`.

**Environment (`isLocalhost()`)** is decided in this order:

1. `-Dangatu.env=` / `ANGATU_ENV` / `ENVIRONMENT` — a value starting with `prod` is production; one
   starting with `dev`, or `local`/`test`, is development;
2. a local host (`localhost`, `127.0.0.1`, `0.0.0.0`, `::1`, `[::1]`, `host.docker.internal`,
   `*.local`) → development;
3. any other host → **production** (conservative: `Secure` cookie, no development shortcuts).

The template `Dockerfile` already sets `ANGATU_ENV=production`. In development use `localhost` as the
host — or `-Dangatu.env=development` when you need to run locally against the real domain.

**Public URL** — `AngatuLib.getInstance().getOriginHost()` returns `http://localhost:<port>` in
development and `https://<host>` in production (even over internal HTTP, because Coolify is what
terminates TLS). If you publish without TLS, declare the real origin with `setOriginHost(...)`.

### 5.2 What happens on startup

1. `Dependencies.require` for Javalin.
2. `System.out` goes through `InterceptorOutputStream` (UTF-8) → `Console` (the original stream stays
   reachable through `getOriginalOut()`).
3. Resolve the environment (production vs development).
4. `JavalinAPI.setup(...)` — headers, rate limiting, SQLi/XSS filter and static files, over HTTP.
   The `Route` subclasses and the `/public` pages are registered **before** the server accepts its
   first connection.
5. **If the server does not come up** (port in use, `src/main/resources/public` missing), the
   constructor throws `IllegalStateException`. The process no longer stays
   alive without a server, answering nothing while the health check hides it.
6. The library registers **its own shutdown hook**: it stops the server, waits for queued `Task` work
   (`Task.drain`) and closes the database (`Saveable.shutdown`). E-mail and Web Push have their own
   queues, and each gets up to 8 s to empty on shutdown. **Do not call `Task.shutdown()` in a hook of
   your own** — it discards the queue that `drain` is waiting on.
7. Banner with host, mode and environment.

Never instantiate `AngatuLib` twice in the same process. Everything that does not need a web server
(`Saveable`, `Task`, `StringAPI`…) works without it.

### 5.3 Recommended layout

Packages and classes always in English (R12).

```
project-root/
├── src/main/java/com/company/store/
│   ├── Main.java                 // new AngatuLib(...)
│   ├── routes/                   // extends Route (auto-discovered) — e.g. CreateUserRoute.java
│   ├── entities/                 // extends Saveable — e.g. User.java, Order.java
│   ├── services/                 // business rules — e.g. CreateOrderService.java
│   └── utils/                    // utilities — e.g. Validators.java, MoneyUtils.java
├── src/main/resources/
│   └── public/                   // HTML served automatically
│       ├── index.html            // base shell {content} {page} {%nome_active}
│       ├── css/ js/ img/
│       └── emails/               // templates: EmailAPI.loadHtmlTemplate("/emails/x.html") — PUBLIC, see email-design.md
├── Dockerfile                    // Coolify deploy (R8) — mandatory
├── .dockerignore                 // lean build context, no .env and no database
├── CLAUDE.md                     // carries the AngatuLibrariesSkill block (R1)
├── .env                          // local only; in production these are Coolify variables
└── pom.xml
```

---

## 6. `JavalinAPI` — server and security

`JavalinAPI.setup(int port, boolean enableRateLimit)` — and
`setup(int port, boolean enableRateLimit, Consumer<Javalin> beforeStart)`, whose callback registers
whatever must exist before the first connection — builds
`Javalin.create { cors anyHost; staticFiles classpath /public; contextPath "/"; ignoreTrailingSlashes;
maxRequestSize 16 MiB }` and calls `start(port)` over HTTP. `JavalinAPI.get()` exposes the instance.
The old overload that took `manageSsl` and a certificate folder is deprecated for removal, and
`manageSsl = true` throws `UnsupportedOperationException` (R7).

**Body size:** a body read into memory (`ctx.body()`, `bodyAsClass`) is capped at **16 MiB** (it was
1 GB, and one request that size took the container down). A bigger body gets 413.
`JavalinAPI.setMaxRequestSize(bytes)` before `new AngatuLib` raises it; multipart uploads are not
bound by it.

Before-handler chain: `SECURITY_HEADERS` (with `X-Content-Type-Options: nosniff`) → ignored paths →
CORS preflight passes → blocking and rate limiting → SQLi/XSS screen, 403 without counting a
violation. The limit comes first, so a blocked IP costs no scan, and a request the screen refuses
still counts toward the limit. The screen matches whole words with a bounded distance
(`select … from` within 100 characters, `union select`, `<script`, `javascript:`, `eval(`…), over the
query string, headers and **text** bodies up to 64 KiB — form fields one by one after URL decoding,
JSON with its `\uXXXX` escapes resolved. Ordinary JSON such as `updatedAt`, `setor` or `offset` is
not refused.

### 6.1 Rate limiting

Sliding window counter, `ArrayDeque`, O(1).

```java
JavalinAPI.configureRateLimit("/api/*", new RateLimitConfig(3, 20, 120));
JavalinAPI.configureApiRateLimit("/api/*");       // 3/s, 20/min, 120s
JavalinAPI.configureLoginRateLimit("/api/login"); // 2/s (a double click passes), 5/min, 900s
JavalinAPI.setGlobalRateLimit(5, 30, 300);
JavalinAPI.setRateLimitingEnabled(false);
JavalinAPI.removeRateLimit("/api/old/*");         // limits are stored and reloaded; this deletes one
JavalinAPI.addUnlimitedPath("/downloads/*");
JavalinAPI.addIgnoredPath("/health");             // per segment: /health and /health/db, not /healthcare
JavalinAPI.setTrustedProxyHops(1);                // 0=socket only, 1=Coolify/nginx, 2=Cloudflare+Coolify
JavalinAPI.setClientIpHeader("CF-Connecting-IP"); // only when ALL traffic goes through Cloudflare
JavalinAPI.setSecurityHeader("Content-Security-Policy", "default-src 'self' ..."); // null removes it
JavalinAPI.getActivePermanentBlocks();
JavalinAPI.unblockPermanently(ipHash);
JavalinAPI.unblockAll();
```

- `RateLimitConfig(reqSec, reqMin, blockSec[, perIp=true])`, fields `public final`.
- Patterns: exact (`/login`), prefix (`/api/*` covers `/api` and below, not `/apiary`), or a variable
  segment (`/api/orders/{id}`). The exact match wins, then the most specific.
- **The counter belongs to the route, not the URL.** The key is `ipHash|<route template>` when
  `perIp=true`, otherwise just the template: `/api/orders/1` and `/api/orders/2` both count on
  `/api/orders/{id}`, so a coupon code tried in series hits the limit, and a scanner's invented URLs
  cannot grow memory — a path that is no route shares a single `(sem rota)` counter per IP. A limit
  on `/api/*` therefore applies **per route** under `/api`, not to the folder as a whole. A screen
  that fetches many items of one parameterised route in a row needs its own limit on that route.
- The path is canonical, so `/api//login` or a trailing slash cannot dodge the limit. IPv6 counts per
  `/64` (one machine owns the whole block), and under a configured limit the whole `/48` is capped at
  16 times one client's limit, against whoever rotates `/64`s; that network brake is only a temporary
  429, never a violation or a long block.
- Only a **GET/HEAD of a static file that is not a route** (`.css/.js/.png/.woff2/.pdf/.json/.wasm`…)
  is exempt, and so are `/image` and the CORS preflight (`OPTIONS` with
  `Access-Control-Request-Method`, answered by the CORS plugin without running a route — counting it
  spent the login limit of the real call behind it). A `POST` to `/x.css`, or a route that ends in
  `.json`, is counted.
- Exceeding a limit blocks for that rule's `blockSec`. A burst above 30 req/s blocks for 3600 s. Ten
  violations within one hour create a **24 h block**, kept in memory, persisted as `PermanentBlock`
  and reloaded on startup. Public pages (GET of a `/public` page) stay reachable during a long block,
  so a person caught by mistake still sees the site. Loopback and private ranges never get the long
  block.
- **Client IP is `IP.get(ctx)`, the same rule for the limiter, logs and the DROP filter (R34).** With
  `setTrustedProxyHops(n)` it counts `n` proxies from the **right** of `X-Forwarded-For` (the left end
  is whatever the client wrote). With nothing declared, a proxy is assumed only when the connection
  comes from a private network (the Coolify proxy); a direct connection from the internet uses the
  socket address (without brackets) and reads no header. Every `X-Forwarded-For` header line is read,
  in order — a line of the client's own cannot hide behind the proxy's. `CF-Connecting-IP`,
  `True-Client-IP` and `X-Real-IP` are **not** trusted unless declared, because a client can send them.
- The default CSP is permissive — tighten it before `new AngatuLib(...)` in production. If the
  project uses Turnstile, the tightened policy must allow `challenges.cloudflare.com` in `script-src`
  and `frame-src`, or the widget silently fails to render (`turnstile.md`).
- Block pages are inline, served with `skipRemainingHandlers()` (429 / 403). **They are a rendered
  surface, so R13 and R17 apply** — see 6.2.

### 6.2 The block page is read by a real person (R13, R17)

The rate limiter catches ordinary users: someone clicking twice, a page that fired three requests, a
person reloading because the connection stalled. They are not attackers, and the 429 is often the only
screen of the system they will see that day. It gets the same care as any other surface.

**How the project renders it:** `JavalinAPI.setDenyPage(...)`, before `new AngatuLib`. The library
keeps the status, the `Retry-After` header and the JSON that API calls receive; the function returns
the full HTML for a browser, built from the project's own template:

```java
JavalinAPI.setDenyPage(notice -> DenyPageTemplate.render(
        notice.status(),            // 429 ou 403
        notice.title(),             // "Muitos acessos seguidos", "Acesso bloqueado", "Pedido recusado"
        notice.message(),           // uma frase em PT-BR, texto puro — escape ao pôr no HTML
        notice.retryAfterSeconds()  // tempo real até liberar; 0 quando não há prazo exato
));
```

If the function fails in any way (a checked exception or a stack overflow included) or returns
blank, the library serves its default page (plain, with a "Desenvolvido por Angatu Sistemas"
credit) and logs the first failure. The default is a fallback, not the delivery: every project sets
its own.

**What it carries:**

- **The Angatu Sistemas watermark** (R17). This is the part most often missed, because nobody thinks
  of a block page as "a page". It is.
- **The project's palette and typography**, from `ds.css` tokens (`paint.md`).
- **How long the block lasts, in plain PT-BR** — "Espere 4 minutos e tente de novo", with the real
  remaining time from `notice.retryAfterSeconds()`, not a generic "tente mais tarde". A person who
  knows when to come back does not hammer the server, so this is a load control as much as a courtesy.
- **`<meta name="robots" content="noindex">`** — a 429 must never be indexed in place of the real page.

**What it must not carry:** the limit values, the counters, how many violations remain, the internal
rule name, or anything else that hands an attacker the shape of the defence. Say that there were too
many requests and when to return; nothing else.

**It is self-contained.** Inline `<style>`, no external stylesheet and no script. The client is already
being throttled, and a block page that depends on a second request is a block page that renders
unstyled at the worst moment. The default CSP allows `style-src 'unsafe-inline'`, so this is the one
rendered surface where an inline `<style>` is correct rather than a violation — and the logo comes from
its asset URL, which the limiter never throttles (static assets are outside the limit), never redrawn
as inline SVG.

**The `403` for a DROP-listed netblock is the exception, and the only one** (R34,
`ip-blocklist.md`): that response has no body at all. The distinction is who is on the other end — the
rate limiter catches a person you want back, while DROP catches a network you want no traffic with.
Never apply this section's treatment to a DROP refusal, and never strip it from a rate-limit page.

See `paint.md` and `email-design.md` for how tokens travel to non-app surfaces.

### 6.3 What rate limiting is not

It filters traffic volume, not intent. Authorization still happens on every route (R23), values
coming from the browser are still recalculated server-side (R22), and Turnstile — when present —
sits beside the limit, never replacing it (R27).

### 6.4 The request log — one line per request, already there

Every request that reaches the server prints one line — route, page, static file, 404, a refusal by
the security filter, an error, a WebSocket upgrade — with **no per-route code**:

```text
[25/09 22:14:03] GET     /api/pedidos/42          IP=189.40.12.7 STATUS=200 TIME=14ms
[25/09 22:14:04] GET     /api/produtos            IP=189.40.12.7 STATUS=200 TIME=3ms PARAMS=pagina=2&token=***
[25/09 22:14:05] POST    /api/login               IP=189.40.12.7 STATUS=429 TIME=<1ms DENIED=too_many_requests
[25/09 22:15:21] POST    /api/usuarios            IP=189.40.12.7 STATUS=500 TIME=142ms ERROR=NullPointerException
```

- **Never write an access log in a route.** A `Console.log("GET /x")` in a handler duplicates the
  line. Log what only the route knows (a business event), never that the request happened.
- **It never slows the response.** Javalin's `requestLogger` only enqueues; a daemon thread formats
  and writes in batches through `Console`. A full queue drops lines and says how many — the request
  never waits for the terminal. On server stop the queue is written out.
- **What stays out:** request and response bodies, uploads, headers, cookies, and the exception
  message (the line carries only its type). A query value whose name looks secret or personal
  (password, token, key, code, e-mail, CPF, phone, card...) prints as `***`. **The path prints as
  it came** — one more reason a token never goes in the URL (R23).
- **The IP is `IP.get(ctx)`** — the proxy rule of 6.1, never the `X-Forwarded-For` the client wrote.
- **Errors:** an exception that escapes a route shows as `ERROR=Type`, through Javalin's
  `handlerWrapper`, which records and rethrows — Javalin's error response is unchanged. A route that
  catches the exception and answers by itself calls `JavalinAPI.markRequestError(ctx, e)`.
- **Reduce or silence it:** `ANGATU_REQUEST_LOG=errors` (status ≥ 400 or an exception) or `off`, as a
  Coolify service variable; in code, `JavalinAPI.setRequestLogMode(RequestLogMode.ERRORS)`, which
  applies at once and beats the variable. The default is `all` — leave it on in production; the
  `HEALTHCHECK` shows up too, which is the price of seeing every request.
