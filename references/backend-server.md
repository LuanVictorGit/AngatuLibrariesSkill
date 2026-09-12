# Backend server — dependencies, startup and JavalinAPI

> Covers R4 (newest release), R5 (only the modules used), R6 (Jetty from Javalin) and R7 (HTTP by
> default). Read this before writing `pom.xml` or `Main`.

---

## 1. Always the newest release (R4)

Before creating or updating `pom.xml` / `build.gradle`:

1. Open <https://jitpack.io/#LuanVictorGit/AngatuLibraries> and take the **latest tag** — or run
   `git ls-remote https://github.com/LuanVictorGit/AngatuLibraries.git`.
2. Use `com.github.LuanVictorGit:AngatuLibraries:VERSION` with `VERSION` = that release.
3. Align every third-party coordinate with the `pom.xml` of that tag (section 3 below).

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
| Web / HTML / assets / routes | `io.javalin:javalin:7.2.2`, `org.reflections:reflections:0.10.2` + an SLF4J binding (`org.slf4j:slf4j-simple:2.0.17`); `io.javalin.community.ssl:javalin-ssl:7.2.2` **only** when `manageSsl=true` | `JavalinAPI` |
| Persistence | `org.xerial:sqlite-jdbc:3.51.3.0`, `com.zaxxer:HikariCP:7.0.2`, `com.google.code.gson:gson:2.13.2` | — |
| JSON | `com.google.code.gson:gson:2.13.2` | `GsonAPI`, type adapters |
| `.env` | `io.github.cdimascio:dotenv-java:3.2.0` | — |
| Passwords | `org.mindrot:jbcrypt:0.4` | — |
| Web Push | `nl.martijndwars:web-push:5.1.2`, `org.bouncycastle:bcprov-jdk18on:1.83`, `org.bitbucket.b_c:jose4j:0.9.6`, `org.apache.httpcomponents:httpclient:4.5.14` | — |
| E-mail | `com.sun.mail:jakarta.mail:2.0.1` + dotenv | — |
| Discord | `net.dv8tion:JDA:6.4.1` | — |
| Payments | `com.mercadopago:sdk-java:2.9.2` — **AngatuCRM only** (R26) | — |
| Browser | `com.microsoft.playwright:playwright:1.58.0` (plus `mvn exec:java -e -Dexec.mainClass=com.microsoft.playwright.CLI -Dexec.args="install chromium"` once) | — |
| Images | `net.coobird:thumbnailator:0.4.21`, `com.twelvemonkeys.imageio:imageio-webp:3.12.0` / `imageio-tiff:3.12.0` | — |
| QR Code | `com.google.zxing:core:3.5.3`, `com.google.zxing:javase:3.5.3` | `QRCodeAPI` (`ErrorCorrectionLevel`) |
| Lombok | `org.projectlombok:lombok:1.18.44` (`provided`) | — |

Guard: `Dependencies.require("io.javalin.Javalin", "io.javalin:javalin:7.2.2", "Web Server (Javalin)")`
prints Maven/Gradle instructions and throws `MissingDependencyException`. 39 of 43 classes link with
no dependencies at all.

## 4. Jetty follows Javalin (R6)

Javalin 7.2.2 brings Jetty in **transitively** — in recent builds that means **Jetty 12.x** (`ee10`),
not Jetty 11. **Do not pin Jetty by hand.** Confirm the real version with
`mvn dependency:tree -Dincludes=org.eclipse.jetty` and let the transitive dependency decide.

- Do not declare `org.eclipse.jetty:*` in `pom.xml` unless you must override something.
- If you must declare one (`jetty-alpn`, `jetty-http`), use exactly the version that
  `mvn dependency:tree` shows coming from `javalin:7.2.2`.
- On a clash (`NoSuchMethodError` / `ClassNotFoundException` from Jetty), run the tree and align
  everything to Javalin's version.
- The same applies to `javalin-ssl:7.2.2` — never mix Jetty 10/12 with Javalin 7.2.x.

---

## 5. Startup — `AngatuLib`

### 5.1 The constructor: HTTP by default (R7)

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

        JavalinAPI.setTrustedProxyHops(1); // proxy do Coolify na frente
        new AngatuLib("loja.angatusistemas.com.br", port, true);

        JavalinAPI.addIgnoredPath("/health");             // usada pelo HEALTHCHECK
        JavalinAPI.configureApiRateLimit("/api/*");
        JavalinAPI.configureLoginRateLimit("/api/login");
    }
}
```

**Signatures:**

```java
new AngatuLib(String host, int port, boolean bloqByMaxRequisitions)                    // HTTP (default)
new AngatuLib(String host, int port, boolean bloqByMaxRequisitions, boolean manageSsl) // HTTPS, optional
```

- `host` — the project's public domain (`loja.angatusistemas.com.br`), or `localhost` in development.
- `port` — the port Javalin listens on. **It is always honoured** (the old redirect to port 80 on
  localhost is gone). Read it from `PORT`, defaulting to `8080`.
- `bloqByMaxRequisitions` — enables rate limiting and blocking.
- `manageSsl` — **omit it.** Pass `true` only outside Coolify, on a server that has
  `/etc/letsencrypt/live/<host>/{fullchain,privkey}.pem`; Javalin then serves HTTPS on the given port
  and keeps `port+1` purely to redirect. Without the certificates, startup fails with
  `IllegalStateException` — deliberately.

> **Never enable HTTPS on your own initiative.** On Coolify the certificate is issued and renewed by
> the hosting; the application speaks HTTP inside the container network. Asking Javalin for SSL in
> there breaks the deploy.

**Environment (`isLocalhost()`)** no longer looks at a certificate folder — inside a container there
is none. The order is:

1. `-Dangatu.env=` / `ANGATU_ENV` / `ENVIRONMENT` (`production`/`prod`, or `development`/`dev`/`local`);
2. `manageSsl = true` → production;
3. a local host (`localhost`, `127.0.0.1`, `::1`, `0.0.0.0`, `*.local`) → development;
4. any other host → **production** (conservative: `Secure` cookie, no development shortcuts).

The template `Dockerfile` already sets `ANGATU_ENV=production`. In development use `localhost` as the
host — or `-Dangatu.env=development` when you need to run locally against the real domain.

**Public URL** — `AngatuLib.getInstance().getOriginHost()` returns `http://localhost:<port>` in
development and `https://<host>` in production (even over internal HTTP, because Coolify is what
terminates TLS). If you publish without TLS, declare the real origin with `setOriginHost(...)`.

### 5.2 What happens on startup

1. `Dependencies.require` for Javalin.
2. `System.setOut(new PrintStream(new InterceptorOutputStream()))` → `Console` (the original stream
   stays reachable through `getOriginalOut()`).
3. Resolve the environment (production vs development).
4. `JavalinAPI.setup(port, rateLimit, manageSsl, folderCerts)` — headers, SQLi/XSS filter, rate
   limiting, static files and, only when asked, SSL.
5. `HtmlRouteAPI.registerAllRoutes(javalin)` — templates from `/public`.
6. Banner with host, mode and environment.

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
│   ├── public/                   // HTML served automatically
│   │   ├── index.html            // base shell {content} {page} {%nome_active}
│   │   └── css/ js/ img/
│   └── emails/                   // templates (EmailAPI.loadHtmlTemplate) — see email-design.md
├── Dockerfile                    // Coolify deploy (R8) — mandatory
├── .dockerignore                 // lean build context, no .env and no database
├── CLAUDE.md                     // carries the angatu-skill block (R1)
├── .env                          // local only; in production these are Coolify variables
└── pom.xml
```

---

## 6. `JavalinAPI` — server and security

`JavalinAPI.setup(int port, boolean enableRateLimit, boolean manageSsl, File folderCerts)` — and the
shortcut `setup(int port, boolean enableRateLimit)` — builds
`Javalin.create { cors anyHost; staticFiles classpath /public; contextPath "/"; ignoreTrailingSlashes;
maxRequestSize 1GB; SslPlugin only when manageSsl }` and calls `start(port)` over HTTP.
`JavalinAPI.get()` exposes the instance. The parameter order changed on purpose: an old call fails at
compile time instead of silently inverting a boolean.

Before-handler chain: `SECURITY_HEADERS` → SQLi/XSS screen (`select..from`, `union select`,
`<script`, `javascript:`, `eval(`…) → 403 without counting a violation → rate limiting.

### 6.1 Rate limiting

Sliding window counter, `ArrayDeque`, O(1).

```java
JavalinAPI.configureRateLimit("/api/*", new RateLimitConfig(3, 20, 120));
JavalinAPI.configureApiRateLimit("/api/*");       // 3/s, 20/min, 120s
JavalinAPI.configureLoginRateLimit("/api/login"); // 1/s, 5/min, 900s
JavalinAPI.setGlobalRateLimit(5, 30, 300);
JavalinAPI.setRateLimitingEnabled(false);
JavalinAPI.addUnlimitedPath("/downloads/*");
JavalinAPI.addIgnoredPath("/health");
JavalinAPI.setTrustedProxyHops(1); // 0=socket, 1=nginx, 2=nginx+CDN
JavalinAPI.setSecurityHeader("Content-Security-Policy", "default-src 'self' ..."); // null removes it
JavalinAPI.getActivePermanentBlocks();
JavalinAPI.unblockPermanently(ipHash);
JavalinAPI.unblockAll();
```

- `RateLimitConfig(reqSec, reqMin, blockSec[, perIp=true])`, fields `public final`.
- Key is `ipHash|path` when `perIp=true`, otherwise just `path`. Static files
  (`.css/.js/.png/.woff2/.pdf`…) are never limited.
- A burst above 10 req/s blocks for 3600s; three violations create a `PermanentBlock` plus a
  `SuspectIp`, both persisted. Loopback and private ranges (`127.*`, `10.*`, `192.168.*`,
  `172.16-31.*`, `::1`, `fc/fd`) never become permanent.
- `setTrustedProxyHops` takes the IP from the right of `X-Forwarded-For` and also checks
  `CF-Connecting-IP`, `True-Client-IP` and `X-Real-IP`.
- The default CSP is permissive — tighten it before `new AngatuLib(...)` in production. If the
  project uses Turnstile, the tightened policy must allow `challenges.cloudflare.com` in `script-src`
  and `frame-src`, or the widget silently fails to render (`turnstile.md`).
- Block pages are inline, served with `skipRemainingHandlers()` (429 / 403). **They are a rendered
  surface, so R13 applies**: they carry the project's palette, typography and footer, not a bare
  default. See `paint.md` and `email-design.md` for how tokens travel to non-app surfaces.

### 6.2 What rate limiting is not

It filters traffic volume, not intent. Authorization still happens on every route (R23), values
coming from the browser are still recalculated server-side (R22), and Turnstile — when present —
sits beside the limit, never replacing it (R27).
