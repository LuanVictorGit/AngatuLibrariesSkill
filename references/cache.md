# Cache — do not use it unless asked

> Covers R25 and gate **G3**. Every piece of content comes from the server on every request. Do not
> introduce content caching on your own initiative. Cache exists only when the user asks for it, and
> then it is deliberate, narrow and documented.

---

## 1. Forbidden by default

- A service worker that stores screens, scripts or styles (`caches.put`, precaching, a "cache first"
  strategy).
- `Cache-Control` with a long `max-age` on a page, script, style or image.
- Turning on the library's asset cache — `AssetsAPI` ships with it **off**; leave it off.
- Storing an API response in `localStorage` / `sessionStorage` to display later as if it were current.

## 2. What to do at bootstrap, before serving traffic

```java
// Nada de conteúdo guardado no navegador. ANTES do new AngatuLib: é na criação do servidor que
// estes cabeçalhos também passam a valer para os arquivos estáticos de public/.
JavalinAPI.setSecurityHeader("Cache-Control", "no-store, no-cache, must-revalidate");
JavalinAPI.setSecurityHeader("Pragma", "no-cache");
JavalinAPI.setSecurityHeader("Expires", "0");

new AngatuLib(host, port, true);
```

The order is the part that matters. The static-file server writes its own headers **after** the
security filter — `Cache-Control: max-age=0`, which means "revalidate", not "discard". The library
hands the cache headers declared before startup to the static-file server as well, so CSS, JS and
images carry the same `no-store` as the pages. Declared after startup, they reach pages and routes
only.

Do not register an `after` handler on the running server to stamp the headers: Javalin's handler
list does not accept additions while requests are being served.

## 3. A service worker that caches nothing

It still exists, to make the app installable (PWA) and to receive push, but it stores nothing. A fetch
handler has to exist for the browser to consider the app installable; let it fall through to the
network:

```js
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (evento) => evento.waitUntil(
  // Apaga o que versões anteriores tenham guardado.
  caches.keys()
    .then((chaves) => Promise.all(chaves.map((c) => caches.delete(c))))
    .then(() => self.clients.claim())
));

// Sem respondWith: o navegador segue o caminho normal até o servidor.
self.addEventListener('fetch', () => {});
```

And on registration, force a version check and reload once when a new service worker takes over —
otherwise the device stays pinned to the previous version indefinitely:

```js
const registro = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
registro.update();
navigator.serviceWorker.addEventListener('controllerchange', () => {
  if (!window.__recarregando) { window.__recarregando = true; location.reload(); }
});
```

## 4. Why the rule is this

Content caching turns a published fix into an invisible fix: the device keeps opening the previous
version. The damage is not a stale screen — it is a screen that **opens and does not work**, because
the stored HTML no longer matches the system's code.

This already happened in production with this stack: the cached version carried a script inline in the
page, blocked by the content security policy, and the whole interface stopped responding while the API
answered normally. Debugging that is expensive, and the end user has no way to help themselves.

## 5. When cache is actually requested

If offline operation is **asked for**, implement it explicitly: network first for navigation, cache
only as an offline fallback, a versioned cache name, `skipWaiting()` + `clients.claim()`, and cleanup
of old versions in `activate`. Never "cache first" for a page.

Record the decision in `CLAUDE.md` (R2) — what is cached, for how long, and why.

## 6. Asset hashing follows this rule, it does not contradict it

While the project has no cache, `hashAssets` stays **off**: with `no-store` on every response the hash
buys nothing and only makes files harder to trace.

The day the client **asks** for cache, hashing becomes **mandatory** — a long `max-age` is only safe on
a file whose name changes when its content changes, and the HTML stays `no-store` so it always points
at the new names (`frontend-build.md`).

A hero video and heavy images (`landing-motion.md`) are the case worth raising with the client: they
are the files that suffer most under `no-store`, since they are re-downloaded on every visit.

**`renameFiles` is a different mechanism and this rule does not reach it.** Hashing renames a file so a
long `max-age` is safe; `renameFiles` renames it so the dist stops publishing the map of the frontend
(R19). One answers to R25 and stays off by default, the other answers to R19 and is on at `protected`.
A project with no cache still ships with obfuscated file names, and that is not a contradiction — it is
two unrelated reasons that happen to change the same string.

---

## The blocklist is not content (R34)

R25 bans **content** caching. It does not ban holding configuration in memory: the Spamhaus DROP list
(`ip-blocklist.md`) is ~111 KB of CIDR ranges, loaded once and refreshed hourly through `Task`.
Fetching it per request would be absurd and would get the project rate-limited by Spamhaus in minutes.

The line is what the stored thing *is*: a screen, a query result or an API response belongs to a
visitor and goes stale — that is what R25 protects. A blocklist belongs to the server and has an
explicit refresh schedule.
