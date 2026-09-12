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
passes through none of the library's filters.

Constructors are `protected`. Discovery uses Reflections: every concrete subclass with an empty
constructor is `newInstance().register()`-ed during `setup` (`app.unsafe.routes.*`). Path parameters:
`"/api/users/{id}"` → `ctx.pathParam("id")`. Never instantiate a `Route` directly, and never call
`register()` before setup.

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
(`public/orcamentos/novo.html → /novo`, `public/index.html → /`). Names must be unique. A request
with `.html` redirects to the extensionless path.

```java
HtmlRouteAPI.registerAllRoutes(javalin); // uses /index.html as the base shell
HtmlRouteAPI.registerAllRoutes(javalin, "/index.html", () -> java.util.List.of("/sobre.html"));
HtmlRouteAPI.addIgnoredPath("admin");
HtmlRouteAPI.extractPageName("/a/Meu.html"); // "meu"
HtmlRouteAPI.getAllHtmlPages();              // /public/*.html except /emails and /others
```

Rendering: `baseHtml` + `pageContent`, substituting `{page}`, `{content}` and `{%nome_active}`.

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
AssetsAPI.readAssetAsString(path);  AssetsAPI.readAssetAsBytes(path);
AssetsAPI.assetExists(path);        AssetsAPI.getContentType(path);
AssetsAPI.serveAsset(ctx, path);
AssetsAPI.listAssets();             AssetsAPI.listAssetsByExtension(ext);
AssetsAPI.listClasspathResources(); AssetsAPI.listAllAssetsRecursive();
AssetsAPI.getAssetSize(path);       AssetsAPI.getAssetLastModified(path);
AssetsAPI.setCacheEnabled(false);   // R25 — turn it off; it ships enabled
AssetsAPI.setDefaultCacheTtl(ttl);  AssetsAPI.putInCache(path, bytes);
```

`AssetsAPI` ships **with caching on**. The default policy is no cache (R25), so turn it off at
startup. See `cache.md` for the full bootstrap, including the `after` handler that stamps `no-store`
on the already-built response.

---

## 4. `IP`

```java
IP.get(ctx); // X-Forwarded-For → X-Real-IP → CF-Connecting-IP → True-Client-IP → ctx.ip()
```

Prefer `JavalinAPI` with `setTrustedProxyHops(...)`, which knows how many proxies to trust. Behind
Coolify that is `1`; without it every client looks like the proxy and the rate limit blocks everyone
at once (`deploy-coolify.md`).
