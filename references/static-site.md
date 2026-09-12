# Static site — no Java, Coolify Static, nginx:alpine

> Track B of `landing-intake.md`, chosen through gate **G1**. No Maven, no `Saveable`, no routes — and
> no lowering of the standard: the design system, the build pipeline with obfuscation (R19), per-URL
> SEO and the Angatu footer all still apply.

---

## 1. Layout

The source/build/dist law (R18) is unchanged; only the input folder moves, since there is no
`src/main/resources`.

```
project-root/
├── src/                          # SOURCE — legível, semântico, nunca ofuscado
│   ├── index.html                # página completa, com <head> próprio
│   ├── servicos.html
│   ├── contato.html
│   ├── privacidade.html          # obrigatória quando há Turnstile (R27)
│   ├── 404.html
│   ├── styles/
│   │   ├── tailwind.css          # gerado pelo CLI local, versionado (R14)
│   │   └── ds.css                # tokens :root — única fonte visual
│   ├── scripts/
│   ├── images/
│   │   ├── angatu-sistemas.png
│   │   └── angatu-sistemas-escuro.png
│   └── assets/
│       └── og/<slug>.jpg         # capa por página (landing-seo-og.md)
├── tools/
│   ├── frontend-build.mjs        # BUILD — único lugar que minifica e ofusca
│   ├── preview.py                # espelha o nginx.conf (frontend-preview.md)
│   └── tailwindcss[.exe]
├── frontend.build.json           # níveis development / production / protected
├── dist/                         # DIST — o que o nginx serve (no .gitignore)
├── nginx.conf
├── Dockerfile
├── .dockerignore
├── .claude/launch.json           # preview temporário (frontend-preview.md)
└── CLAUDE.md                     # com o bloco AngatuLibrariesSkill (R1)
```

`tailwind.config.js` points `content` at `./src/**/*.{html,js}`.

## 2. Pages are complete files

There is no `HtmlRouteAPI` and no runtime substitution, so every page carries its own full `<head>` —
`title`, `meta description`, `canonical`, the complete Open Graph block, Twitter card, `lang="pt-BR"`,
favicon and Schema.org of the real content type (`landing-seo-og.md`).

That is a feature of this track: per-URL SEO is literal here, with nothing to wire up. The cost is that
shared markup (header, footer, nav) is duplicated across files — keep it identical, and change it in
every file when it changes. If that duplication starts hurting, the project has outgrown Track B and
wants a backend.

## 3. Forms

**No form posts to this site.** There is nothing to receive it. A form either:

- links to WhatsApp (`https://wa.me/55DDDNUMERO?text=...`, with the text pre-filled);
- opens `mailto:`; or
- posts to an external service the client already pays for.

A form that looks like it submits and silently drops the data is worse than no form at all. If the
client needs a real form, that answer to G1 was wrong — go to Track A.

Turnstile (R27) only appears here if there is a real form target that verifies it. A Turnstile widget in
front of a WhatsApp link protects nothing; do not add one.

## 4. The build still runs (R19)

`frontend-build.mjs` reads `src/` and writes `dist/`, with the same levels and the same rules as a
backend project (`frontend-build.md`). Obfuscation is on; the source is never rewritten; `emails/**`,
`sw.js` and `vendor/**` stay excluded; class renaming only where proven safe.

```bash
node tools/frontend-build.mjs --level=protected
```

Post-build validation still fails the build on a broken reference, a lost SEO tag, a lost accessibility
attribute, a secret in `dist/`, or a stray source map.

## 5. `nginx.conf`

```nginx
server {
    listen       8080;
    server_name  _;
    root         /usr/share/nginx/html;
    index        index.html;

    # R25 — sem cache. O conteúdo vem do servidor a cada requisição.
    add_header Cache-Control "no-store, no-cache, must-revalidate" always;
    add_header Pragma        "no-cache" always;
    add_header Expires       "0" always;

    # Cabeçalhos de segurança. O TLS é do Coolify (R7).
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options        "SAMEORIGIN" always;
    add_header Referrer-Policy        "strict-origin-when-cross-origin" always;

    # Turnstile precisa destes dois (turnstile.md). Remova se o projeto não usa.
    add_header Content-Security-Policy
        "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:" always;

    # URL sem extensão: /servicos serve servicos.html
    location / {
        try_files $uri $uri.html $uri/ =404;
    }

    error_page 404 /404.html;

    location = /health {
        access_log off;
        add_header Content-Type application/json;
        return 200 '{"status":"ok"}';
    }
}
```

`try_files $uri $uri.html` is what gives this track the same extensionless URLs the backend track has,
so links and canonicals match between the two.

**`tools/preview.py` mirrors this file, and the two change in the same commit** — the headers, the
CSP, the `try_files` behaviour, the `/health` response and the 404 page. Preview that does not send
what nginx sends proves nothing, and the drift is silent (`frontend-preview.md`). A project without
Turnstile drops the `challenges.cloudflare.com` entries from both at once.

`404.html` is a rendered surface and carries the project's palette, typography and footer (R13) — not
nginx's default page.

**The DROP filter applies to this track too (R34).** With no Java to filter in, the CIDRs are turned
into a `deny` include generated at build time and pulled in from this server block — which means the
list is only as fresh as the last deploy. Write that tradeoff down, and prefer network-level filtering
where the hosting offers it (`ip-blocklist.md`).

## 6. `Dockerfile`

Two stages: Node builds, nginx serves. Nothing from the build stage reaches the final image.

```dockerfile
# syntax=docker/dockerfile:1

# ---------------------------------------------------------------- build ------
FROM node:22-alpine AS build
WORKDIR /build

COPY package*.json ./
RUN npm ci --no-audit --no-fund || true

COPY . .
RUN node tools/frontend-build.mjs --level=protected

# -------------------------------------------------------------- runtime ------
FROM nginx:alpine

ENV TZ=America/Sao_Paulo

RUN rm -rf /usr/share/nginx/html/*
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/dist/ /usr/share/nginx/html/

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider "http://127.0.0.1:8080/health" || exit 1
```

Notes:

- **Port 8080**, matching the backend track, so the Coolify configuration is the same everywhere.
- **`nginx:alpine` ships `wget`, not `curl`** — hence the different `HEALTHCHECK` from
  `deploy-coolify.md`.
- The default `nginx` config is removed before copying ours; leaving it causes a confusing port 80
  listener alongside the real one.
- `dist/` is built **inside** the image. Never commit a built `dist/` and copy it in — that is how a
  stale dist reaches production.

`.dockerignore`:

```
dist/
node_modules/
.git/
.github/
.claude/
docs/
*.md
*.log
```

## 7. Coolify panel

1. **Application → Build Pack: Dockerfile**, pointing at the repository and branch.
2. **Port**: `8080`.
3. **Domain**: the project's domain — Coolify issues and renews the certificate. No TLS in nginx (R7).
4. **Persistent Storage**: none. A static site stores nothing; if it needs to, it is not static.
5. **Environment Variables**: only what the build needs. `TURNSTILE_SITE_KEY` is public and may be
   baked in at build time; `TURNSTILE_SECRET_KEY` has no place here at all — there is no server to
   verify with (`turnstile.md`).
6. **Health Check**: the one in the `Dockerfile`.

## 8. Preview and delivery

Preview through the temporary static server — the narrow R29 exception, shut down afterwards
(`frontend-preview.md`). Run the loop against `dist/`, not only `src/`: obfuscation defects live only
in the built output.

Before delivering: `design-audit.md`, the per-page SEO validation in `landing-seo-og.md`, and
`docker build` locally to confirm the image serves what you expect.

```bash
docker build -t minha-landing .
docker run --rm -p 8080:8080 minha-landing
# valide http://localhost:8080/ , /servicos , /health e uma URL inexistente (404)
```
