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

**The preview server must mirror `nginx.conf`, not merely serve files.** This is the whole condition
on the exception. A generic static server (`python -m http.server`, `npx serve`, Live Server) sends no
CSP, no security headers, no `try_files`, and its own 404 page — so an inline script that production
blocks passes here, extensionless URLs 404 here but work there, and the project's 404 never gets
looked at. That is the same failure R29 exists to prevent, just moved into the static track.

So the project ships `tools/preview.py`, which replicates the `nginx.conf` of `static-site.md`:

```python
#!/usr/bin/env python3
"""
Servidor de pre-visualizacao do site estatico (R21, trilha B de G1).

Espelha o nginx.conf de producao descrito em static-site.md: as mesmas URLs
sem extensao, os mesmos cabecalhos de seguranca, a mesma politica de cache e
o mesmo /health.

Espelhar os cabecalhos e o ponto inteiro. Preview sem CSP deixa passar o
script inline que a producao bloqueia, e a tela sobe morta com a API
respondendo perfeitamente. Servidor de preview que nao reproduz a producao
nao e preview, e ilusao.

Uso: python tools/preview.py [diretorio] [porta]
     python tools/preview.py dist 8080
"""

from __future__ import annotations

import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

# Mantenha em sincronia com nginx.conf. Divergiu aqui, divergiu em producao.
CABECALHOS = {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": (
        "default-src 'self'; "
        "script-src 'self' https://challenges.cloudflare.com; "
        "frame-src https://challenges.cloudflare.com; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:"
    ),
}


class PreviewHandler(SimpleHTTPRequestHandler):
    """Aplica try_files, os cabecalhos do nginx e a pagina 404 do projeto."""

    def end_headers(self) -> None:
        for nome, valor in CABECALHOS.items():
            self.send_header(nome, valor)
        super().end_headers()

    def do_GET(self) -> None:
        if self.path.split("?")[0] == "/health":
            self._responder_health()
            return
        super().do_GET()

    def do_HEAD(self) -> None:
        if self.path.split("?")[0] == "/health":
            self._responder_health(corpo=False)
            return
        super().do_HEAD()

    def _responder_health(self, corpo: bool = True) -> None:
        dados = b'{"status":"ok"}'
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(dados)))
        self.end_headers()
        if corpo:
            self.wfile.write(dados)

    def translate_path(self, path: str) -> str:
        """try_files $uri $uri.html $uri/ — URL sem extensao serve o .html."""
        destino = super().translate_path(path)
        if os.path.isdir(destino):
            indice = os.path.join(destino, "index.html")
            if os.path.exists(indice):
                return indice
        if not os.path.exists(destino) and os.path.exists(destino + ".html"):
            return destino + ".html"
        return destino

    def send_error(self, code, message=None, explain=None) -> None:
        """error_page 404 /404.html — o 404 do projeto, nunca o do servidor."""
        if code == 404:
            pagina = os.path.join(self.directory, "404.html")
            if os.path.exists(pagina):
                with open(pagina, "rb") as arquivo:
                    dados = arquivo.read()
                self.send_response(404)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(dados)))
                self.end_headers()
                self.wfile.write(dados)
                return
        super().send_error(code, message, explain)

    def log_message(self, formato: str, *args) -> None:
        sys.stderr.write("  %s\n" % (formato % args))


def main() -> None:
    diretorio = sys.argv[1] if len(sys.argv) > 1 else "dist"
    porta = int(sys.argv[2]) if len(sys.argv) > 2 else 8080

    if not os.path.isdir(diretorio):
        sys.exit(f"diretorio inexistente: {diretorio} — rode o build antes")

    servidor = ThreadingHTTPServer(
        ("127.0.0.1", porta), partial(PreviewHandler, directory=diretorio)
    )
    print(f"preview de {diretorio}/ em http://localhost:{porta}")
    print("espelhando nginx.conf: try_files, no-store, CSP e /health")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        servidor.shutdown()


if __name__ == "__main__":
    main()
```

Python is already on the machine — no Node, no network fetch, and nothing to install. Wire it into
`.claude/launch.json` and start the preview by name:

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "landing-preview",
      "runtimeExecutable": "python",
      "runtimeArgs": ["tools/preview.py", "dist", "8080"],
      "port": 8080
    }
  ]
}
```

Port `8080` on purpose: the same port the container uses, so nothing about the URL changes between
preview, `docker run` and Coolify.

**Whenever `nginx.conf` changes, `preview.py` changes in the same commit.** The moment the two drift,
the preview stops proving anything — and the drift is silent, which is the dangerous kind. When the
project does not use Turnstile, both lose the `challenges.cloudflare.com` entries together.

Shut the server down when the work is finished, instead of leaving it holding the port.

The exception is about **not having a JAR**. It never applies to a project that has one, and it is not
a shortcut for "the Maven build is slow" — for that, see 1.3.

### 1.3 The backend project's fast loop — no repackage per CSS tweak

The reason people reach for an external static server on a backend project is almost always that
`mvn package` feels too slow to run after every visual tweak. It does not have to be run:

```bash
mvn exec:java                                   # deixe rodando
cp -r src/main/resources/public/* target/classes/public/   # e recarregue a página
```

Under `mvn exec:java` the classpath is `target/classes`, so copying HTML, CSS and JS there and
refreshing is enough — the real server, the real session, the real API, the real headers, with none of
the wait. **This only works under `mvn exec:java`.** Running through `java -jar`, the classpath is the
JAR itself and copying into `target/classes/public/` changes nothing, which is exactly the trap in
`testing.md`. Java changes still need a recompile either way.

Before delivering, go back to the real thing — `mvn package` and `java -jar` — and, when the project
has a build, repeat against the `dist` (R19), where obfuscation defects live.

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
> While the page is in front of you, run the R35 question once: **could this be a screenshot of any
> other product?** It is an eye check and this is the only moment it can happen
> (`anti-ai-design.md`).

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
