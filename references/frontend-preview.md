# Previewing a frontend — and actually looking at it

> Covers R21. Nothing visual is finished until it has been rendered on a running server, inspected at
> desktop and mobile widths, and described.
>
> **Starting a server is not the verification. Looking is.** "I started the server and the page loads"
> says nothing about whether the design matches what was asked for. The deliverable of this loop is a
> statement about what is on the screen.

---

## 1. Which server (this is where R29 is decided)

### 1.1 The project has a backend — the preview server *is* the project

There is no separate preview. Build and run the project, exactly as `testing.md` describes:

```bash
mvn package -DskipTests && java -jar target/<app>.jar
# aguarde o banner, depois abra http://localhost:8080/<pagina>
```

R29 stands untouched: no `python -m http.server`, no `npx serve`, no Live Server, no `file://`. Outside
the real server there is no cookie session, no API, no WebSocket, no `{content}` substitution and no
security headers — and a screen that *looks* right there is hiding precisely the defects that matter.

Stop the process when you are done, instead of leaving it holding the port and the database.

### 1.2 The project is static-only — the narrow exception

A static project (G1, `static-site.md`) has no JAR, so the rule above has nothing to point at. **Only
in that case** may a temporary static server serve the build output, and it is shut down afterwards.

Create `.claude/launch.json`:

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "landing-preview",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["--yes", "serve", "dist", "-l", "4173"],
      "port": 4173
    }
  ]
}
```

Then start the preview by name and stop it when the work is done.

The exception is about **not having a JAR**. It never applies to a project that has one, and it is not
a shortcut for "the Maven build is slow".

## 2. The loop

This is the part that is usually skipped.

**1. Render it.** Open the page in the browser pane.

**2. Look at desktop width.** Set the viewport to a desktop size, take a screenshot, and read it.

**3. Look at mobile width.** Set the viewport to the `mobile` preset (375×812), reload — load-time
device gates need the reload — take a screenshot, and read it.

**4. Compare against what was asked for**, out loud, in writing. Not "it looks good": name the things.
Hierarchy, spacing rhythm, alignment, contrast, the hero's intent, whether the primary action is
obvious, whether anything overflows, whether text is trapped against an edge, whether the mobile layout
is a real layout or a squeezed desktop.

**5. List what is wrong.** If nothing is wrong, say what you checked and why it passes. A pass with no
observations is indistinguishable from not having looked.

**6. Fix, and go back to step 1.** Re-render and re-capture after the fix — do not describe the fix as
if it were the result.

**7. Reset the viewport** to `desktop` when the visual work is finished.

## 3. What else to check while you are there

- **Console clean.** Read the console messages; an error there is a defect even when the page looks
  right. This is how a script blocked by the content security policy is caught — the API answers
  perfectly and the interface is dead (`cache.md` has the production story).
- **Keyboard focus is visible.** Tab through the interactive elements; `:focus-visible` must be
  obvious on every one.
- **`prefers-reduced-motion`** is respected — animation reduced or removed, nothing essential lost.
- **Nothing scrolls horizontally at 375px.** Wide content (tables, code, diagrams) scrolls inside its
  own container, never the page body.
- **Touch targets** are at least 44px with spacing between them (`mobile-principles.md`).
- **Hover states** exist on desktop and are not the only way to reach anything
  (`desktop-principles.md`).

## 4. Test the `dist` too, not only the source

When the project has a frontend build (`frontend-build.md`, and R19 means it does), the readable build
is not what ships. Run the loop **twice**:

```bash
mvn package -DskipTests && java -jar target/<app>.jar                    # source legível
node tools/frontend-build.mjs --level=protected                          # gera o dist
mvn -Pfrontend-dist package -DskipTests && java -jar target/<app>.jar    # é isto que sobe
```

A minification or obfuscation defect **does not appear** in the readable mode. The classic one is a
dead screen with the API answering 100%, because the minifier renamed a top-level identifier and `UI`,
`net` or `Auth` disappeared. Looking at the `dist` is the only thing that catches it.

In the `dist` pass, exercise the things that break silently: forms, API calls, WebSocket, PWA, service
worker, and any class that Java injects into the markup (`{%nome_active}`).

## 5. Which surfaces get this treatment

Every rendered surface (R13), not only the main screens:

- application screens and landing pages;
- **error and blocked pages** — 404, 500, and the inline 429/403 pages the rate limiter serves. Trigger
  them deliberately: request a missing route, and hammer a rate-limited route until it blocks. These
  are the pages nobody looks at, shown at the worst possible moment;
- login and password recovery, including the Turnstile widget at 375px (`turnstile.md`);
- **e-mails**, through the development preview route, at 600px and with images blocked
  (`email-design.md`);
- print and report views — use the browser's print emulation, and check the page breaks;
- Open Graph covers, by looking at the generated image file (`landing-seo-og.md`).

## 6. What this loop is not

- **Not a replacement for the design audit.** `design-audit.md` still runs before delivery, greps and
  all. This loop catches what the eye catches; the audit catches what greps catch.
- **Not a substitute for real-device testing** when the project's audience is mostly mobile. An
  emulated 375px viewport is a good proxy, not the thing itself.
- **Not optional because the change was small.** A one-line CSS change is exactly the kind that moves
  something else by 4px on a breakpoint nobody thought about.
