# Deploy on Coolify — Dockerfile, volume and variables

> Covers R8. Use this when creating a new project, migrating an old one (VPS + Let's Encrypt), or when
> a deploy breaks. For a static project with no Java, see `static-site.md` instead.
>
> **Everything here is about production.** The `Dockerfile` exists in every project from day one
> because it is how the project deploys — but it is not the development environment, and nothing in
> this file describes a working loop. Development runs on the JVM; `docker build` happens before the
> deploy (`testing.md` 2).

---

## 1. The contract between application and hosting

| Item | Application | Coolify |
|---|---|---|
| Protocol | HTTP on `PORT` (`8080`) | terminates TLS and forwards; issues and renews the certificate |
| Client IP | `JavalinAPI.setTrustedProxyHops(1)` | injects `X-Forwarded-For` |
| Data | `ANGATU_DB_PATH=/data/database.db`, uploads under `/data/...` | persistent volume mounted at `/data` |
| Secrets | `Env.get().get("EMAIL_PASSWORD")` | *Environment Variables* in the panel |
| Health | `GET /health` (200, outside the rate limit) | uses the image's `HEALTHCHECK` and reads from it how long to wait (2.2) |
| Environment | `isLocalhost()` reads `ANGATU_ENV` | `ANGATU_ENV=production` already set in the `Dockerfile` |

## 2. Standard Dockerfile

Copy it to the project root, next to `pom.xml`. Adjust only the port, if the project uses another. The
same file ships in the library repository as `templates/Dockerfile`, with the comments in Portuguese.

```dockerfile
# syntax=docker/dockerfile:1

# ---------------------------------------------------------------- build ------
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /build

# A short-lived Maven compiles faster with C1 only and the serial collector
ENV MAVEN_OPTS="-XX:TieredStopAtLevel=1 -XX:+UseSerialGC"

COPY pom.xml .
COPY src ./src

# The Maven repository lives in a BuildKit cache shared by every project on the server, not in a layer
RUN --mount=type=cache,id=angatu-maven,target=/root/.m2 \
    mvn -B -q -Dmaven.test.skip=true \
        -Daether.dependencyCollector.impl=bf \
        -Daether.syncContext.named.factory=file-lock \
        -Daether.syncContext.named.nameMapper=file-hgav \
        package \
 && mkdir -p /out/lib \
 && cp "$(ls -S target/*.jar | head -n1)" /out/app.jar \
 && if [ -d target/lib ]; then cp target/lib/*.jar /out/lib/; fi

# -------------------------------------------------------------- runtime ------
FROM eclipse-temurin:25-jre

ENV TZ=America/Sao_Paulo \
    LANG=C.UTF-8 \
    ANGATU_ENV=production \
    ANGATU_DB_PATH=/data/database.db \
    PORT=8080 \
    JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError -XX:+UseCompactObjectHeaders -Djava.awt.headless=true"

# No apt-get: tzdata already ships in the image, and this RUN touches no network
RUN useradd --system --uid 10001 --create-home app \
 && mkdir -p /data \
 && chown app:app /data

# wget for the HEALTHCHECK (and for Coolify's own check, which tries curl and then wget)
COPY --from=busybox:1.37-musl /bin/busybox /usr/local/bin/wget

# Dependencies and application in separate layers: an unchanged lib/ is reused as it is
COPY --from=build --chown=app:app /out/lib/ /opt/app/lib/
COPY --from=build --chown=app:app /out/app.jar /opt/app/app.jar

USER app
WORKDIR /data
EXPOSE 8080

HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --start-interval=1s --retries=24 \
  CMD wget -q -T 2 -O /dev/null "http://127.0.0.1:${PORT}/health" || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /opt/app/app.jar"]
```

**Why each decision:**

| Decision | Reason |
|---|---|
| `--mount=type=cache,id=angatu-maven` instead of `COPY pom.xml` + `dependency:go-offline` | the layer trick only held while `pom.xml` did not change — and it changes on every library bump (R4), so every such deploy downloaded the whole repository again; Coolify's injected `ARG` lines did the same. The cache mount survives both, and its single id is shared by every project on the server: Javalin, SQLite and the library download once for all of them |
| `file-lock` / `file-hgav` | two deploys running at once share that repository; the named file locks keep them from writing the same artifact together |
| `dependencyCollector.impl=bf` | collects the dependency graph in parallel: a cold resolution of the library went from 61 s to 36 s |
| `-Dmaven.test.skip=true` | tests run before the push (`mvn test`, R29), never inside the deploy — not even compiled |
| `MAVEN_OPTS` with C1 and the serial GC | a Maven that lives ten seconds never reaches the C2 payoff; measured 13–22% faster |
| `cp "$(ls -S target/*.jar \| head -n1)"` + `target/lib` | works with both layouts: the thin JAR beside `target/lib/` (`backend-server.md` 1.1) and an older project's shaded JAR, the larger of the two in `target/` |
| `lib/` and `app.jar` in two `COPY` lines | BuildKit reuses a layer whose files did not change: an unchanged `lib/` is not written again, and a deploy writes only the application JAR |
| `WORKDIR /data` with the JAR in `/opt/app` | everything the application writes with a relative path (database, `.env`, uploads) lands on the volume; the code stays outside it |
| `useradd --uid 10001` | the base image already has a user at uid 1000; the named volume inherits the owner of `/data` |
| busybox `wget`, no `apt-get` | the Java 25 image ships neither curl nor wget, and installing curl cost an `apt-get update` — tens of seconds every time Coolify rebuilt that layer. The static busybox binary is copied from its image and also serves Coolify's own healthcheck (`curl … \|\| wget …`) if someone turns it on in the panel |
| `HEALTHCHECK` 5 s / 5 s, `--start-interval=1s`, 24 retries | Coolify sleeps the `--start-period` and then polls Docker every `--interval` (2.2): with the old 45 s / 30 s, every deploy waited at least 45 s for an application that answered in 3. The 24 retries give a slow start two minutes. A successful probe writes no request-log line (`backend-server.md` 6.4) |
| `exec java` in the ENTRYPOINT | Java becomes PID 1 and receives Coolify's `SIGTERM` — without it the shutdown hook never runs, the WAL is left without a checkpoint, and the deploy waits Coolify's 30 s stop grace period before the kill |
| `MaxRAMPercentage=75` | the JVM sizes itself against the **container** limit (without it the default is 25%) |
| `ExitOnOutOfMemoryError` | without it a JVM out of memory does not die — it enters continuous collection and starts answering in minutes, which `HEALTHCHECK` reads as "alive" |
| `UseCompactObjectHeaders` | a product feature since Java 25 (R38): smaller object headers, so the same data takes less heap and triggers fewer collections — R39 at no cost in code |
| no `--enable-native-access` here | it lives in the JAR manifest (`backend-server.md` 1.1), so overriding `JAVA_OPTS` in the panel cannot bring the warning back |

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

### 2.2 Deploy time: under a minute, and what Coolify waits for

What Coolify 4.5 does with a Dockerfile application, read from its source: it clones the repository,
injects `ARG` lines after **every** `FROM` (the build-time variables, `COOLIFY_*`, a hash of their
values), runs `DOCKER_BUILDKIT=1 docker build` — no `--pull`, and `--no-cache` only when the build cache
is disabled in the panel —, starts the new container, **sleeps the `--start-period`**, asks Docker for
the health status **every `--interval`** up to `--retries` times, and only then stops the old container
with `docker stop --timeout=30`. Every number in the `HEALTHCHECK` line is a wait in the deploy.

Measured with the same sample project on the template this section replaced and on the one above
(Docker 29, 6 cores; a VPS is slower in absolute terms, the proportions hold):

| Step | Old template | This template |
|---|---|---|
| Build, code changed | 13 s | 6 s with the thin JAR, 9 s shaded |
| Build, `pom.xml` changed — a library bump | 105 s | 8 s |
| Build after Coolify changed an injected `ARG` | 133 s | 7 s |
| Build with an empty cache (first deploy, server cleanup) | 128 s | 24 s |
| Wait for the new container to be healthy | 45 s | 5 s |
| Old container stopped | under 1 s | under 1 s |

Two waits live outside the `Dockerfile`, and both are settled once:

- **JitPack builds a commit only when someone asks for it**, and the library takes about four minutes.
  The library repository asks on every push to `main` (its `JitPack` workflow): bump the hash in a
  project once that check is green, or the deploy sits in Maven waiting for JitPack (R4,
  `backend-server.md` 1).
- **Coolify's Docker cleanup can wipe the Maven cache.** With *Cleanup trigger: Run on every schedule*
  it runs `docker builder prune -af` every night, and the first deploy of each day downloads everything
  again. *Only above disk threshold* keeps the cache until the disk asks for room (section 5).

What brings the minutes back, and so never goes in: `dependency:go-offline` in a layer of its own, a
`RUN` that downloads outside a cache mount (`apt-get`, `curl … | sh`), tests inside the image build, a
`--start-period` longer than the application needs, and the build cache disabled in the panel.

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
.claude/
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

Two things in `Main` exist because of Coolify, and the full class is `backend-server.md` 5.1: the port
comes from `PORT`, and `setTrustedProxyHops(1)` plus `addIgnoredPath("/health")` are declared before
`new AngatuLib(...)`. `AngatuLib` registers its own shutdown hook — server, queued tasks, database —
so `Main` registers none.

The health route is mandatory: it is what `HEALTHCHECK` queries. `HealthRoute` is in
`backend-routes-html.md` 1, ready to copy.

## 5. Configuration in the Coolify panel

1. **Application → Build Pack: Dockerfile**, pointing at the repository and branch.
2. **Port**: `8080` (the same as `EXPOSE` / `PORT`).
3. **Domain**: the project's domain — Coolify issues and renews the certificate. No SSL in the
   application (R7).
4. **Persistent Storage**: a named volume mounted at `/data` — one per project. Each application has
   its own `database.db`; nothing is shared between projects.
5. **Environment Variables**: the keys that used to live in `.env` (`EMAIL_KEY`, `EMAIL_PASSWORD`,
   `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, the AngatuCRM token…). `Env.get().get("EMAIL_PASSWORD")`
   reads an environment variable exactly as it read the file. Each one with **Build time → Not
   available during build**: the application reads them at runtime, and at build time they only became
   `ARG` lines that broke the cache whenever a value changed and left the secret in the image metadata.
6. **Health Check**: leave the panel's **off**. Coolify then uses the `Dockerfile`'s `HEALTHCHECK` and
   reads from it how long to wait (2.2). Turned on, it replaces the image's check with its own, timed by
   the panel — if someone turns it on: **Path** `/health`, **Interval** 5, **Start period** 5.
7. **Advanced**: **Build cache → Use Docker build cache**, **Build arguments → Managed manually in
   Dockerfile** (the template uses none), **Source commit availability → Runtime only**. Any of the
   other choices recompiles from scratch on every deploy.
8. **Server → Docker Cleanup → Cleanup trigger: Only above disk threshold** — the scheduled one prunes
   the build cache, and with it every project's Maven repository, every night.

The labels are Coolify 4.5's; an older panel may name the same switch differently.

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

The `eclipse-temurin:25-jre` image does not carry the Chromium libraries. Replace only the runtime
stage — with the Playwright image whose tag matches the library's Playwright version
(`backend-server.md` 3), plus the Java 25 runtime on top of it:

```dockerfile
FROM mcr.microsoft.com/playwright/java:v1.58.0-jammy
# This tag ships JDK 21 and the JAR is compiled for 25: copy the Temurin 25 runtime over it
COPY --from=eclipse-temurin:25-jre /opt/java/openjdk /opt/java/openjdk
ENV JAVA_HOME=/opt/java/openjdk \
    PATH=/opt/java/openjdk/bin:$PATH
# ... same ENV, same user, same busybox wget, same WORKDIR /data, HEALTHCHECK and ENTRYPOINT
```

Without the copy the container dies on start with `UnsupportedClassVersionError`. When the Playwright
version moves, check `java -version` inside the new image: once it reports 25, the copy can go.

Give the container more memory in the panel, because Chromium runs in a separate process and does not
count against the heap.

## 8. Test locally before publishing

```bash
docker build -t myproject .
docker run --rm -p 8080:8080 -v myproject-data:/data myproject
# check http://localhost:8080/ and http://localhost:8080/health
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
  (`ls -S`), and `target/lib/` beside it when the project uses the thin JAR.
- **Deploy waits 45 s at "Waiting for healthcheck":** the old `HEALTHCHECK` line
  (`--start-period=45s --interval=30s`). Coolify sleeps the start period before it looks (2.2).
- **Every deploy downloads the whole Maven repository:** an old `Dockerfile` (`dependency:go-offline`
  in a layer, undone by every `pom.xml` change and every injected `ARG`), the build cache disabled in the
  panel, or the Docker cleanup running on every schedule (section 5).
- **Deploy stalls resolving `com.github.LuanVictorGit:AngatuLibraries`:** JitPack is still building that
  hash. Bump only after the commit's `JitPack` check turned green.
- **New container never healthy with Coolify's check turned on:** that check runs `curl … || wget …`
  inside the container. This template ships busybox `wget`; an image with neither always fails it.

## 10. Migrating an old project (VPS + Let's Encrypt)

1. `Main`: remove the fixed port and the certificates — `new AngatuLib(domain, port, true)` with `port`
   from `PORT`.
2. Add `JavalinAPI.setTrustedProxyHops(1)` and the `/health` route.
3. Copy `Dockerfile` and `.dockerignore`.
4. Copy `database.db` (with `-shm` / `-wal`, if present) into the `/data` volume before the first
   deploy.
5. Move uploads and files that sat next to the JAR into `/data/...` and fix the paths.
6. Check whoever uses `isLocalhost()`: it now comes from `ANGATU_ENV` (the `Dockerfile` sets
   `production`) or from the local host — no longer from a certificate folder.
7. Commit `public/styles/tailwind.css` if it only existed on your machine.
8. Remove `manageSsl` and `javalin-ssl`: the library no longer serves HTTPS, and `manageSsl = true`
   throws on startup (R7). There is no deploy outside Coolify.
9. Install the frontend build pipeline with obfuscation (R19) even if nobody asked — see
   `frontend-build.md`.
