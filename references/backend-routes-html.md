# Routes, pages and assets

> Covers `Route` / `RouteType`, `HtmlRouteAPI`, `AssetsAPI` and `IP`. R10 applies: `Route` is used
> only through `extends`.
>
> **A `Route` subclass is never instantiated by your code.** `org.reflections` finds it by scanning for
> `extends Route`, so `grep -r CreateUserRoute` returns only the file itself — that is what a healthy,
> live route looks like, not a sign of dead code. The same holds for every HTML file under `/public`,
> which `HtmlRouteAPI` publishes as a URL whether or not anything links to it. Before proposing to
> delete either, read R32 (`dead-code.md`).

---

## 1. `Route` / `RouteType`

```java
import br.com.angatusistemas.lib.javalin.routes.Route;
import br.com.angatusistemas.lib.javalin.routes.RouteType;

/**
 * Rota de verificação de saúde, usada pelo HEALTHCHECK do contêiner.
 *
 * @author Angatu Sistemas
 */
public class HealthRoute extends Route {
    public HealthRoute() { super("/health", RouteType.GET, ctx -> ctx.json("{\"status\":\"ok\"}")); }
}
```

```java
/**
 * Rota de criação de usuário.
 *
 * @author Angatu Sistemas
 */
public class CreateUserRoute extends Route {

    public CreateUserRoute() { super("/api/users", RouteType.POST, CreateUserRoute::handle); }

    private static void handle(io.javalin.http.Context ctx) {
        try {
            var account = Guard.requireAccount(ctx);   // porteiro central — R23
            if (account == null) return;               // o porteiro já escreveu a resposta

            var body = GsonAPI.get().fromJson(ctx.body(), com.google.gson.JsonObject.class);

            // Campos aceitos são listados um a um: nunca vincule o corpo inteiro na entidade — R22.
            var user = new User();
            user.setName(body.get("name").getAsString());
            user.setTenantId(account.getTenantId());   // vem da sessão, nunca da requisição
            user.save();

            ctx.result(GsonAPI.get().toJson(java.util.Map.of("id", user.getId())))
               .contentType("application/json")
               .status(StatusCode.CREATED.code());
        } catch (Exception e) {
            Console.error("CreateUserRoute", e);
            ctx.result("Error").status(StatusCode.INTERNAL_SERVER_ERROR.code());
        }
    }
}
```

`RouteType`: `GET, POST, PUT, DELETE, PATCH, WS`.

**A `WS` route has its own gate and its own rules — read `websocket.md` (R24).** The upgrade request
goes through the block and the rate limit, but through none of the other filters, and the library
authenticates nobody: the route checks the session itself, in `onConnect`, before accepting any
message.

Constructors are `protected`. Discovery uses Reflections: every concrete subclass with an empty
constructor is instantiated and registered during `setup`, **before the server accepts its first
connection** — also under `mvn exec:java` and from a JAR whose classpath lives in the manifest.
Path parameters: `"/api/users/{id}"` → `ctx.pathParam("id")`. Never instantiate a `Route` directly,
and never call `register()` before setup.

### 1.1 What belongs in a route, and what does not

A route is HTTP plumbing. It parses input, calls the gate, delegates to a service and writes a
status. Pricing, stock, permission and any other business rule live in `services/`
(`conventions.md`). A route that computes a total is a route that will disagree with another route
that computes the same total.

Every route validates authorization in the backend (R23) and treats every incoming value as hostile
(R22) — including identifiers, which are authorised against the session before use.

---

## 2. `HtmlRouteAPI` — one page per file name

Every `.html` under `src/main/resources/public/` becomes a route named after the **file**
(`public/orcamentos/novo.html → /novo`, `public/index.html → /`), except the `emails/` and `others/`
folders. Names must be unique: a second file with the same name is skipped with a warning in the log,
and the first one wins. A GET/HEAD of any `.html` path redirects to the page route, on the same site
(`//evil.com/x.html` cannot become an open redirect), case-insensitively (`/Sobre.HTML → /sobre`) and
keeping the query string; `/index.html` goes to `/`.

```java
HtmlRouteAPI.registerAllRoutes(javalin); // uses /index.html as the base shell
HtmlRouteAPI.registerAllRoutes(javalin, "/index.html", () -> java.util.List.of("/sobre.html"));
HtmlRouteAPI.addIgnoredPath("admin");
HtmlRouteAPI.isPage("/sobre");               // true when /sobre is a registered page
HtmlRouteAPI.extractPageName("/a/Meu.html"); // "meu"
HtmlRouteAPI.getAllHtmlPages();              // /public/*.html except /emails and /others
```

Rendering: `baseHtml` + `pageContent`, substituting `{page}`, `{content}` and `{%nome_active}`. Pages
are read on every request — nothing is cached (R25).

**The shell** carries the single `<head>`, `#nav-menu`, `<main id="app">{content}</main>` and the
global scripts. Page files are fragments without their own `<head>`.

> **This is why a landing page needs a decision (G1).** The `<head>` lives in the shared shell, so
> several URLs end up with the same `<head>` — which is an incomplete delivery for a public page.
> Either the landing is a complete page with its own `<head>` served by a dedicated route, or the
> shell gains markers (`{title}`, `{description}`, `{canonical}`, `{og_image}`) that the route fills
> in before responding. See `landing-intake.md` and `landing-seo-og.md`.

The build carries `{content}`, `{page}` and `{%nome_active}` through untouched, and the class behind
`{%nome_active}` is on the never-rename list (`frontend-build.md`).

---

## 3. `AssetsAPI`

Serves from the classpath at `public/`.

```java
AssetsAPI.readAssetAsString(path);   AssetsAPI.readAssetAsBytes(path);
AssetsAPI.assetExists(path);         AssetsAPI.getContentType(path);
AssetsAPI.serveAsset(ctx, path);
AssetsAPI.listAssets(dir);           AssetsAPI.listAssetsByExtension(dir, ext);
AssetsAPI.listClasspathResources(f); AssetsAPI.listAllAssetsRecursive(dir);
AssetsAPI.getAssetSize(path);        AssetsAPI.getAssetLastModified(path);
AssetsAPI.setCacheEnabled(true);     // off by default (R25) — only when asked
AssetsAPI.setDefaultCacheTtl(ttl);   AssetsAPI.putInCache(path, bytes, ttl);
```

`AssetsAPI` ships **with caching off** (R25), and `serveAsset` sets no `Cache-Control` — the cache
policy is the project's (`cache.md`). A path with `..`, `./` or a backslash never leaves `public/`:
it reads as missing. Listings return paths relative to `public/` (`/css/app.css`). `.mjs` goes out as
`text/javascript`, which `nosniff` requires for a module script.

---

## 4. `IP`

```java
IP.get(ctx); // the client's address — the same rule as the rate limiter, the logs and the DROP filter
```

The rule, in order: a header declared with `JavalinAPI.setClientIpHeader("CF-Connecting-IP")` (only
when **all** traffic goes through that CDN); a proxy count declared with `setTrustedProxyHops(n)`,
counting `n` hops from the **right** of `X-Forwarded-For`; with nothing declared, the last
`X-Forwarded-For` hop only when the connection comes from a private network (the Coolify proxy), and
the socket address otherwise. The left end of `X-Forwarded-For`, `X-Real-IP`, `CF-Connecting-IP` and
`True-Client-IP` are written by the client and are never trusted on their own. Behind Coolify declare
`setTrustedProxyHops(1)` (2 with Cloudflare in front) — too many hops hands the address back to the
client; too few makes every client look like the proxy (`deploy-coolify.md`).
