# Deploy on Coolify — Dockerfile, volume and variables

> Covers R8. Use this when creating a new project, migrating an old one (VPS + Let's Encrypt), or when
> a deploy breaks. For a static project with no Java, see `static-site.md` instead.

---

## 1. The contract between application and hosting

| Item | Application | Coolify |
|---|---|---|
| Protocol | HTTP on `PORT` (`8080`) | terminates TLS and forwards; issues and renews the certificate |
| Client IP | `JavalinAPI.setTrustedProxyHops(1)` | injects `X-Forwarded-For` |
| Data | `ANGATU_DB_PATH=/data/database.db`, uploads under `/data/...` | persistent volume mounted at `/data` |
| Secrets | `Env.get().get("CHAVE")` | *Environment Variables* in the panel |
| Health | `GET /health` (200, outside the rate limit) | uses the image's `HEALTHCHECK` |
| Environment | `isLocalhost()` reads `ANGATU_ENV` | `ANGATU_ENV=production` already set in the `Dockerfile` |

## 2. Standard Dockerfile

Copy it to the project root, next to `pom.xml`. Adjust only the port, if the project uses another.

```dockerfile
# syntax=docker/dockerfile:1

# ---------------------------------------------------------------- build ------
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

# Dependências primeiro: enquanto o pom.xml não mudar, esta camada é reaproveitada
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -q clean package -DskipTests \
 && mkdir -p /out \
 && cp "$(ls -S target/*.jar | head -n1)" /out/app.jar

# -------------------------------------------------------------- runtime ------
FROM eclipse-temurin:21-jre

ENV TZ=America/Sao_Paulo \
    ANGATU_ENV=production \
    ANGATU_DB_PATH=/data/database.db \
    PORT=8080 \
    JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError -Djava.awt.headless=true"

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl tzdata \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --system --uid 10001 --create-home app \
 && mkdir -p /data \
 && chown -R app:app /data

COPY --from=build --chown=app:app /out/app.jar /opt/app/app.jar

USER app
WORKDIR /data
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/health" || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /opt/app/app.jar"]
```

**Why each decision:**

| Decision | Reason |
|---|---|
| `cp "$(ls -S target/*.jar \| head -n1)"` | shade leaves two JARs in `target/`; the executable one is the larger |
| `WORKDIR /data` with the JAR in `/opt/app` | everything the application writes with a relative path (database, `.env`, uploads) lands on the volume; the code stays outside it |
| `useradd --uid 10001` | the base image already has a user at uid 1000; the named volume inherits the owner of `/data` |
| `curl` installed | `HEALTHCHECK` needs it and the JRE image does not ship it |
| `exec java` in the ENTRYPOINT | Java becomes PID 1 and receives Coolify's `SIGTERM` — without it the shutdown hook never runs and the WAL is left without a checkpoint |
| `MaxRAMPercentage=75` | the JVM sizes itself against the **container** limit (without it the default is 25%) |
| `ExitOnOutOfMemoryError` | without it a JVM out of memory does not die — it enters continuous collection and starts answering in minutes, which `HEALTHCHECK` reads as "alive" |

### 2.1 Memory: no fixed heap ceiling (R8)

`-XX:MaxRAMPercentage=75` makes the JVM size itself by the **container's** limit, not the machine's.
The decision moves to the hosting panel: changing the memory there is enough, with no image rebuild and
no reopening of the `Dockerfile`.

A fixed `-Xmx` is wrong in both directions and always silently: it either suffocates a project that
grew (and the symptom arrives as slowness, not as a clear error), or it reserves less than the hosting
is already charging for. Pin a value only when a measurement justifies it — never as a precaution.

Three things that get confused here:

- **The JVM reads the container's limit, not the machine's.** Since Java 10 cgroups are respected;
  with no option at all the default is **25%** of that limit — far too conservative for anything that
  generates PDFs or processes images. Hence 75%.
- **The percentage is of the HEAP, not of the process.** Outside it there are still metaspace, code
  cache, thread stacks and native memory (SQLite, imaging, Chromium in a separate process). That is why
  it is 75% and not 100%.
- **The `Dockerfile` does not set the container limit.** That is `docker run --memory`, the
  `docker-compose` file, or the Coolify panel — and that is where a project's memory is tuned.

To adjust without rebuilding the image, set `JAVA_OPTS` in the hosting's environment variables.

**Every path whose memory use grows with the input needs a ceiling.** Upload, image generation, file
reading: if the operation accepts N concurrent requests of up to M bytes, the worst case is N×M and it
has to fit in the heap. Refusing with a clear message is the good outcome; accepting and running out of
memory takes down everyone who was connected.

## 3. `.dockerignore`

```
target/
out/
bin/
.git/
.gitignore
.github/
*.db
*.db-shm
*.db-wal
data/
uploads/
.env
.env.*
tools/
node_modules/
package.json
package-lock.json
.idea/
.vscode/
.settings/
.classpath
.project
.factorypath
docs/
*.md
*.log
*.tmp
*.bak
```

## 4. Application startup

```java
/**
 * Ponto de entrada da aplicação.
 *
 * @author Angatu Sistemas
 */
public class Main {
    public static void main(String[] args) {
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));

        JavalinAPI.setTrustedProxyHops(1);   // antes do construtor
        new AngatuLib("meusite.com.br", port, true);

        JavalinAPI.addIgnoredPath("/health");
        JavalinAPI.configureApiRateLimit("/api/*");
        JavalinAPI.configureLoginRateLimit("/api/login");

        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            Saveable.shutdown();
            Task.shutdown();
        }));
    }
}
```

The health route is mandatory — it is what `HEALTHCHECK` queries:

```java
/**
 * Rota de verificação de saúde usada pelo contêiner.
 *
 * @author Angatu Sistemas
 */
public class HealthRoute extends Route {
    public HealthRoute() { super("/health", RouteType.GET, ctx -> ctx.json("{\"status\":\"ok\"}")); }
}
```

## 5. Configuration in the Coolify panel

1. **Application → Build Pack: Dockerfile**, pointing at the repository and branch.
2. **Port**: `8080` (the same as `EXPOSE` / `PORT`).
3. **Domain**: the project's domain — Coolify issues and renews the certificate. No SSL in the
   application (R7).
4. **Persistent Storage**: a named volume mounted at `/data` — one per project. Each application has
   its own `database.db`; nothing is shared between projects.
5. **Environment Variables**: the keys that used to live in `.env` (`EMAIL_KEY`, `EMAIL_PASSWORD`,
   `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, the AngatuCRM token…). `Env.get().get("CHAVE")` reads
   an environment variable exactly as it read the file.
6. **Health Check**: the one in the `Dockerfile` is enough.

> Use a **named** volume rather than a host path: the named volume inherits the owner of `/data` from
> the image (uid 10001). With a host path, run `chown -R 10001:10001 <path>` before the first deploy,
> or the application cannot create the database.

## 6. Projects with a frontend build

The `dist/` has to be generated **inside** the image, with a `node:22-alpine` stage before the Maven
stage that runs `tools/frontend-build.mjs` and hands `dist/` to `mvn -Pfrontend-dist package`. The
frontend stage does not enter the final image — the runtime stays JRE + JAR. The complete three-stage
Dockerfile is in `frontend-build.md`.

Without that stage Coolify packages the readable source: it works, but it is not what R19 requires.

## 7. Projects with Playwright (BrowserAPI)

The `eclipse-temurin:21-jre` image does not carry the Chromium libraries. Replace only the runtime
stage:

```dockerfile
FROM mcr.microsoft.com/playwright/java:v1.58.0-jammy
# ... same ENV, same user, same WORKDIR /data, same ENTRYPOINT
```

Give the container more memory in the panel, because Chromium runs in a separate process and does not
count against the heap.

## 8. Test locally before publishing

```bash
docker build -t meuprojeto .
docker run --rm -p 8080:8080 -v meuprojeto-data:/data meuprojeto
# valide http://localhost:8080/ e http://localhost:8080/health
```

If the image builds and answers locally, Coolify will run it the same way. This is the test that catches
uncommitted CSS, the wrong JAR and a missing health route.

## 9. Errors that only appear in production

- **CSS gone:** `public/styles/tailwind.css` was generated and never committed. Coolify builds from the
  repository — what was not committed does not exist there (R14).
- **Readable frontend in production:** the build stage is missing from the image, or `mvn package` ran
  without `-Pfrontend-dist`. The JAR carried `src/main/resources/public` instead of `dist/public`.
- **Stale dist published:** `dist/` was committed and fell behind the source. The `sourceHash` in
  `dist/.build-info.json` catches this — keep the check on.
- **Database wiped on every deploy:** the `/data` volume or `ANGATU_DB_PATH` is missing.
- **Everyone sharing one IP in the rate limit:** `setTrustedProxyHops(1)` is missing; the IP seen is the
  proxy's.
- **Login disappears after publishing:** the `Secure` cookie was decided from `ctx.scheme()`, which is
  `http` inside the container. Decide from `isLocalhost()` (`security.md`).
- **Deploy starts and restarts by itself:** `HEALTHCHECK` hitting a route that does not exist or is
  blocked by the rate limit — create `GET /health` and `JavalinAPI.addIgnoredPath("/health")`.
- **`COPY target/*.jar` failed:** shade produces more than one JAR; the template copies the largest
  (`ls -S`).

## 10. Migrating an old project (VPS + Let's Encrypt)

1. `Main`: remove the fixed port and the certificates — `new AngatuLib(dominio, port, true)` with `port`
   from `PORT`.
2. Add `JavalinAPI.setTrustedProxyHops(1)` and the `/health` route.
3. Copy `Dockerfile` and `.dockerignore`.
4. Copy `database.db` (with `-shm` / `-wal`, if present) into the `/data` volume before the first
   deploy.
5. Move uploads and files that sat next to the JAR into `/data/...` and fix the paths.
6. Check whoever uses `isLocalhost()`: it now comes from `ANGATU_ENV` (the `Dockerfile` sets
   `production`) or from the local host — no longer from a certificate folder.
7. Commit `public/styles/tailwind.css` if it only existed on your machine.
8. Keep `manageSsl = true` only if the project stays outside Coolify, with its own certificates.
9. Install the frontend build pipeline with obfuscation (R19) even if nobody asked — see
   `frontend-build.md`.
