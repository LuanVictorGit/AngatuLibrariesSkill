# Running, testing and checklists

> Covers R29. Never deliver code that has not been compiled and run. For the visual half of this —
> rendering a frontend and actually looking at it (R21) — see `frontend-preview.md`.

---

## 1. The loop

1. **Compile:** `mvn package -DskipTests`. Fix compilation and Jetty errors immediately
   (`backend-server.md` for the Jetty alignment; `mvn dependency:tree -Dincludes=org.eclipse.jetty`
   when a `NoSuchMethodError` shows up).
2. **Start the server:** `java -jar target/<app>.jar`, or `mvn exec:java`. Confirm the banner: host,
   **HTTP mode**, environment, and `Javalin configurado`.
3. **Validate for real:** `curl` or `httpie` against the routes you created (`GET /health`,
   `POST /api/...`), open the HTML at `http://localhost:8080/<pagina>`, and read the `Console` output.
4. **Validate the container** whenever you touch `Dockerfile`, dependencies or startup:
   `docker build -t <app> . && docker run --rm -p 8080:8080 -v <app>-data:/data <app>`. That image is
   what Coolify will run.

> **Running through `java -jar`, copying into `target/classes/public/` has no effect** — the classpath
> is the JAR itself. Changes to HTML/JS/CSS require another `mvn package`. Copying into
> `target/classes` only works when running through `mvn exec:java`.

5. **Test both modes when the project has a frontend build** (`frontend-build.md`). First the readable
   one, then the one that ships:

```bash
mvn package -DskipTests && java -jar target/<app>.jar                    # source legível
node tools/frontend-build.mjs --level=protected                          # gera o dist
mvn -Pfrontend-dist package -DskipTests && java -jar target/<app>.jar    # é isto que sobe
```

> A minification or obfuscation defect **does not appear** in the readable mode: that is exactly why
> the second test exists. Open the screens, check the console for errors, and test forms, API,
> WebSocket, PWA and service worker against the `dist`.

6. **Clean shutdown:** make sure `Saveable.shutdown()`, `Task.shutdown()` and `BrowserAPI.shutdown()`
   (if used) run in a shutdown hook.
7. Only call it done once the server starts with no exception and the routes answer with the expected
   status and body.

## 2. Never start an external server to test (R29)

The project is tested **through its own JAR**, served by `AngatuLib`. To "see the screen working", the
following are forbidden:

- `python -m http.server`, `npx serve`, `live-server`, the editor's Live Server extension, or any other
  static server;
- opening the HTML through `file://`;
- copying the frontend into another directory or server.

**Why:** the frontend depends on the real server to exist at all. Outside it there is no cookie
session, no API, no WebSocket, no `{content}` substitution by `HtmlRouteAPI`, no security headers, and
the content policy does not apply. A static server shows a screen that *looks* right and hides exactly
the defects that matter — that is how a script blocked inline by the security policy went unnoticed,
with the API answering perfectly and the whole interface dead in the browser.

```bash
mvn package -DskipTests && java -jar target/<app>.jar
# aguarde o banner, depois valide em http://localhost:8080/<pagina>
```

Stop the process when you are finished, instead of leaving it holding the port and the database.

**The one exception** is a static-only project (G1, `static-site.md`), which has no JAR at all. There,
a temporary static server may serve `dist/` for preview and is shut down afterwards. The exception is
about not having a JAR — it never applies to a project that has one.

## 3. New-project checklist

- [ ] `Main` with `new AngatuLib(dominio, porta de PORT, true)` (HTTP, no `manageSsl`) +
      `setTrustedProxyHops(1)` + rate limits
- [ ] `Dockerfile` + `.dockerignore` at the root, `EXPOSE`/`PORT` consistent, `docker build` tested
- [ ] `GET /health` route (200) outside the rate limit, used by `HEALTHCHECK`
- [ ] `ANGATU_DB_PATH=/data/database.db` + `/data` volume configured in Coolify
- [ ] `public/styles/tailwind.css` **committed** (Coolify builds from the repository, not your machine)
- [ ] `Saveable` indexes created at startup for every queried field (R9)
- [ ] Saving images? Compression strategy **asked and recorded** in `CLAUDE.md` (G2)
- [ ] Turnstile decided (G4); if yes, keys in `.env`, backend verification, privacy policy updated
- [ ] Entities + CRUD routes + list/form/print screens
- [ ] `index.html` shell + `styles/tailwind.css` (local, R14) + `styles/ds.css` + helpers
- [ ] `tailwind.config.js` + `tailwind.input.css` + `tools/tailwindcss[.exe]`, and
      `grep -r "cdn.tailwindcss"` empty
- [ ] Every frontend string reviewed: accents, commas, agreement (R16)
- [ ] Frontend source readable: no obfuscation, no random class or ID, no secret (R18)
- [ ] Build configured with obfuscation on (R19) and `dist/`/`build/` in `.gitignore`
- [ ] Post-build validation passing, and the dist tested through the JAR before publishing
- [ ] Every rendered surface on the design system, error and block pages included (R13)
- [ ] `.env` + `.gitignore` (`database.db`, `.env`, `tools/tailwindcss*` when not committed)
- [ ] `CLAUDE.md` created, with the `angatu-skill` block (R1)
- [ ] Angatu footer on every page and e-mail (R17)
- [ ] No cache: `AssetsAPI.setCacheEnabled(false)`, `no-store` on every response, a service worker that
      stores nothing (R25)
- [ ] Session cookie `HttpOnly` + `SameSite` + conditional `Secure`; token never in a URL (R23)
- [ ] Totals, stock and identifiers validated server-side; no mass assignment (R22)
- [ ] Pages outside the rate limit; API and login with their own
- [ ] Charging money? Through the AngatuCRM API (R26), never `MercadoPagoAPI`
- [ ] A `WS` route? Session checked **inside** it before registering; 4401 agreed with the page; pings
      on; the channel pushes nothing the screen would not ask for (R24)
- [ ] AI? Through the AngatuCRM API (R26), never `DeepSeek`, never a provider key
- [ ] A landing page? G1 answered, and the landing pipeline applied (`landing-intake.md`)
- [ ] Rendered on a running server and looked at, desktop and mobile (R21)
- [ ] Detailed commit with no mention of AI, pushed to `development` (R3)

## 4. Traps that cost hours

- `.java` needs recompiling; HTML/JS copied into `target/classes/public/` only counts under
  `mvn exec:java`.
- `Saveable.query` always with `?`, never concatenation. `Saveable.shutdown()` + `Task.shutdown()`
  (+ `BrowserAPI.shutdown()`) in the shutdown hook.
- **No cache in `Saveable`:** an object changed without `save()` changes nothing; `findById` returns a
  new instance each call; a contested record needs `Saveable.mutate(...)` (R9).
- **`findByField` with an enum scans the table:** only text, numbers and booleans become
  `json_extract` in SQL; pass `Role.ADMIN.name()`, not `Role.ADMIN`.
- **`mutate` returns `null` when the record does not exist** — and the change simply does not happen.
- **Port:** the one you pass is the one used; there is no redirect to 80 on localhost. Read it from
  `PORT`.
- **Never enable HTTPS in Javalin on Coolify** (R7): TLS belongs to the hosting.
- **A database with no volume disappears on deploy:** `/data` mounted plus `ANGATU_DB_PATH` (R8).
- **`isLocalhost()` now comes from the environment** (`ANGATU_ENV`) or the host, not from a certificate
  folder — check whoever depends on it (`Secure` cookie, development shortcuts).
- The default CSP is permissive — tighten it before `new AngatuLib(...)` in production, and remember
  Turnstile needs `challenges.cloudflare.com` allowed (`turnstile.md`).
- `RateLimitConfig` / `BlockInfo` are `final` — do not extend them.
- **Dead screen with the API answering perfectly:** the minifier renamed a top-level identifier and
  `UI` / `net` / `Auth` vanished. Classic scripts need `minifyIdentifiers: false` and
  `renameGlobals: false` (`frontend-build.md`).
- **Styling disappears after enabling `renameClasses`:** a class injected by Java (`{%nome_active}`)
  was renamed only in the CSS. The safety proof has to read `src/main/java/**`.
- **Responsiveness broken in the dist:** a Tailwind utility got caught by the renaming. Nothing that
  appears in `styles/tailwind.css` is renameable.
- **`mvn package` without the profile publishes the readable source** — the dist only enters the JAR
  with `-Pfrontend-dist`.
- **Old dist in production:** the build predates the last source change; check `sourceHash` in
  `dist/.build-info.json`.
