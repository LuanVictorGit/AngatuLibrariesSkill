# Cloudflare Turnstile

> Covers R27 and gate **G4**. Ask on every new project, and on every existing project that does not
> have it yet: *"Will this system use Cloudflare Turnstile?"*
>
> Half an implementation is worse than none. A widget on the screen with no server-side verification
> protects nothing — it only teaches the team that the system is protected.
>
> Cloudflare's own documentation is the source of truth for parameters and error codes:
> <https://developers.cloudflare.com/turnstile/>

---

## 1. The two keys, always from `.env`

Cloudflare's own naming:

| Key | Who sees it | Environment variable |
|---|---|---|
| **Site key** — public, goes into the page | the browser | `TURNSTILE_SITE_KEY` |
| **Secret key** — private, never leaves the server | the backend only | `TURNSTILE_SECRET_KEY` |

```env
TURNSTILE_SITE_KEY=0x4AAAAAAA...
TURNSTILE_SECRET_KEY=0x4AAAAAAA...
```

In production these are Coolify environment variables, not a committed file (`deploy-coolify.md`).
`Env.get().get("TURNSTILE_SECRET_KEY")` reads either one the same way.

**The site key is public, but it is still not hand-written into the HTML.** Hard-coding it means a key
rotation becomes a code change across every page. Deliver it to the page from configuration — a small
config route, or a marker the shell substitutes before responding, the same mechanism
`landing-seo-og.md` uses for per-URL head tags.

The secret key **never** reaches the frontend. The build scans `dist/` for secret patterns and fails
(`frontend-build.md`), but that is the last net, not the first.

## 2. The widget

```html
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>

<form method="post" action="/api/login">
  <!-- campos do formulário -->
  <div class="cf-turnstile" data-sitekey="{turnstile_site_key}" data-theme="light"></div>
  <button type="submit" class="btn-primary">Entrar</button>
</form>
```

The widget writes a token into a field named `cf-turnstile-response`. On a JavaScript-driven submit,
read it with `turnstile.getResponse()` and send it in the body.

**It is a rendered surface, so R13 applies.** The widget sits inside the form's rhythm, not bolted on:
respect the spacing scale, match `data-theme` to the project's palette, and keep the layout from
jumping when the widget loads — reserve its height, or the button moves under the user's finger.

## 3. Verification is in the backend — this is the whole point

The token is proof for the **server**, not a flag for the client. A request claiming it passed proves
nothing (R22).

```java
/**
 * Confere o token do Turnstile junto à Cloudflare.
 *
 * <p>Chamada antes de qualquer regra de negócio: token ausente, recusado ou já usado
 * encerra a requisição. Nunca confie no que a tela diz ter feito.</p>
 *
 * @author Angatu Sistemas
 */
public final class TurnstileGuard {

    private static final String VERIFY_URL =
            "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    private TurnstileGuard() {}

    /** @return true quando a Cloudflare confirma o token; false em qualquer outro caso. */
    public static boolean verify(String token, String remoteIp) {
        if (token == null || token.isBlank()) return false;

        String secret = Env.get().get("TURNSTILE_SECRET_KEY");
        if (secret == null || secret.isBlank()) {
            Console.error("TURNSTILE_SECRET_KEY ausente: recusando por segurança");
            return false;   // sem chave, recusa — nunca libera
        }

        String form = "secret=" + URLEncoder.encode(secret, StandardCharsets.UTF_8)
                    + "&response=" + URLEncoder.encode(token, StandardCharsets.UTF_8)
                    + (remoteIp == null ? "" : "&remoteip=" + URLEncoder.encode(remoteIp, StandardCharsets.UTF_8));

        Response r = Request.query("POST", VERIFY_URL, form, null);
        if (!r.isSuccess()) return false;

        JsonObject body = GsonAPI.get().fromJson(r.getBody(), JsonObject.class);
        return body.has("success") && body.get("success").getAsBoolean();
    }
}
```

Use it at the top of the route, before anything else happens:

```java
if (!TurnstileGuard.verify(body.get("cf-turnstile-response").getAsString(), IP.get(ctx))) {
    ctx.status(StatusCode.FORBIDDEN.code()).result("Verificação de segurança falhou.");
    return;
}
```

**Four things that decide between protecting and pretending:**

- **A token is single-use and short-lived.** Verifying the same token twice fails with
  `timeout-or-duplicate`. That is the intended behaviour, not a bug to work around — never cache a
  successful verification and reuse it.
- **Failing closed.** A missing secret, a network error or an unparseable response all mean *refuse*.
  Code that returns `true` when the check could not run is code that disables itself the first time
  Cloudflare has an outage.
- **Verify before the business rule, not after.** Verifying after creating the record means the record
  exists.
- **Read `error-codes` into the log, never into the response.** The user gets one plain message; the
  detail goes to `Console`.

## 4. System-wide, not one screen

The decision of which routes are covered is recorded in `CLAUDE.md` (R2). The usual set:

- login and password recovery — the brute-force targets;
- registration — where fake accounts come from;
- contact, quote and any public form — where spam arrives;
- any unauthenticated route that costs money or sends a message (an e-mail trigger, an AI call).

Authenticated routes normally do **not** need it: the session already identifies the caller, and a
challenge on every action is hostile to the real user.

## 5. Content Security Policy — the silent failure

The skill requires tightening the CSP before production (`backend-server.md`). Turnstile needs two
allowances, and without them **the widget simply does not render** — no console error the user will
notice, no server error, just a form that can never be submitted:

```java
JavalinAPI.setSecurityHeader("Content-Security-Policy",
    "default-src 'self'; "
  + "script-src 'self' https://challenges.cloudflare.com; "
  + "frame-src https://challenges.cloudflare.com; "
  + "style-src 'self' 'unsafe-inline'; img-src 'self' data:");
```

Check this first whenever a Turnstile widget "does not appear".

## 6. Privacy policy — mandatory, not optional

Turning Turnstile on means Cloudflare processes visitor data. The system's privacy page —
`/privacidade`, already linked from the footer (R17) — gets a notice and the link:

```html
<h2>Proteção contra automação</h2>
<p>
  Utilizamos o Cloudflare Turnstile para distinguir pessoas de robôs nos formulários deste site.
  Para isso, a Cloudflare recebe dados técnicos da sua conexão e do seu navegador. O tratamento
  desses dados é descrito na
  <a href="https://www.cloudflare.com/en-gb/turnstile-privacy-policy/"
     target="_blank" rel="noopener">política de privacidade do Turnstile</a>.
</p>
```

**Turnstile enabled without this notice is an incomplete delivery**, and it is a checklist item in
`testing.md`. If the project has no privacy page yet, creating one is part of enabling Turnstile — and
that page is a rendered surface like any other (R13).

## 7. It does not replace anything

- **Not rate limiting.** Turnstile filters automation; the per-IP limit still bounds volume, including
  from a human. Keep both (`security.md`).
- **Not authorization.** A verified token says "probably a person", never "allowed to do this".
- **Not input validation.** A person can send a malformed or hostile body just as easily (R22).

## 8. Testing

Cloudflare publishes test keys that always pass, always fail, or force an interactive challenge — use
them in development instead of the real keys, and check the current list in Cloudflare's docs. Test all
three paths: success, refusal, and a token replayed a second time.

Do this against the running JAR (R29), and look at the form at both widths (R21) — a widget that
overflows its container at 375px is a defect the server test never sees.
