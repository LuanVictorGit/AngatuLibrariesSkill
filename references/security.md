# Session and API security

> Covers R22 (the client is hostile) and R23 (sessions, cookies, authorization). Authorization is
> always validated in the **backend**, on every route. A check that only exists in the frontend is
> worth nothing: anyone can edit the JavaScript of their own page.

---

> Traffic filtering happens before any of this: every project drops requests from the Spamhaus DROP
> netblocks (R34, `ip-blocklist.md`). It is a layer, not a boundary — everything below still applies
> in full to a request from an unlisted address.

## 1. The client is hostile (R22)

**Assume an intercepting proxy.** Burp Suite, mitmproxy, a browser devtools "edit and resend", or a
plain `curl` — the request that reaches the server was not necessarily built by the page you wrote.
The page is a convenience for honest users; it is not a constraint on anyone.

This is not the same statement as "obfuscation is not security" (R20). That one is about reading your
code. This one is about **rewriting your requests**, and it changes what you write in every route.

### 1.1 What it forces

- **Money is recalculated server-side.** Price, subtotal, discount, shipping and total come from the
  database and the business rules, never from the request body. A value sent by the client is a
  guess, not data. If the browser must show a total, it computes one for display; the server computes
  the one that counts, and they are allowed to disagree — the server wins.
- **Quantity and stock are checked on the server, inside the transaction.** Checking before the
  transaction checks a state that changes before the write lands (R9, `backend-persistence.md`).
- **Every identifier is authorised against the session before use.** `GET /api/orders/{id}` with
  someone else's `id` is the cheapest attack there is, and sequential identifiers make it trivial.
  Refusing access to another account's resource answers **404**, not 403 — confirming that a resource
  exists but belongs to someone else is already a leak.
- **Role, permission and tenant never come from the request.** They come from the session. A body
  carrying `"role":"admin"` is not an escalation attempt to be rejected with a message; it is a field
  that must never be read in the first place.
- **`hidden`, `disabled` and `readonly` carry no authority.** They are display states. A `hidden`
  input with the product price, a `disabled` select with the plan, a `readonly` field with the user
  id — all three are editable before the request leaves the machine.
- **Browser validation is comfort, not a barrier.** Every rule enforced in the page — required,
  maximum length, format, range, allowed option — is enforced again on the server with the same
  severity. `required` in HTML stops a typo, not an attacker.
- **Never bind the whole JSON body onto an entity.** Mass assignment is how `role`, `credits`,
  `tenantId`, `active` and `createdAt` get written by the client. List the accepted fields explicitly,
  one by one, and ignore everything else.

```java
// WRONG — the client decides what it is worth, and what it is
var order = GsonAPI.get().fromJson(ctx.body(), Order.class);
order.save();

// RIGHT — the client sends intent; the server decides the facts
var body    = GsonAPI.get().fromJson(ctx.body(), JsonObject.class);
var account = Guard.requireAccount(ctx);
if (account == null) return;

var product = Saveable.findById(Product.class, body.get("productId").getAsString());
if (product == null || !account.getTenantId().equals(product.getTenantId())) {
    ctx.status(StatusCode.NOT_FOUND.code()); return;   // 404, não 403
}

int quantity = Math.max(1, body.get("quantity").getAsInt());
var order = new Order();
order.setTenantId(account.getTenantId());               // da sessão
order.setProductId(product.getId());
order.setQuantity(quantity);
order.setUnitPrice(product.getPrice());                 // do banco
order.setTotal(product.getPrice().multiply(quantity));  // calculado aqui
order.save();
```

- **A route with no gate raises no error.** It serves whoever arrives. That is true of HTTP routes,
  and more dangerous for WebSocket, where not even the library's filters run (R24, `websocket.md`).

### 1.2 Auditing an existing project for this

Three greps that find most of it:

```bash
# valor vindo do corpo da requisição
grep -rnE '"(price|preco|valor|total|amount|desconto|discount)"' --include="*.java" src/main/java
# corpo inteiro virando entidade
grep -rnE 'fromJson\(ctx\.body\(\),\s*[A-Z][A-Za-z]*\.class' --include="*.java" src/main/java
# identificador usado sem conferir o dono
grep -rn 'pathParam("id")' --include="*.java" src/main/java
```

In the frontend, look for a computed total that is then submitted, and for `hidden` inputs that carry
meaning rather than display state.

---

## 2. The session cookie (R23)

```java
Cookie cookie = new Cookie(NOME, token);
cookie.setPath("/");
cookie.setHttpOnly(true);                  // JavaScript não lê: contém o XSS
cookie.setSameSite(SameSite.LAX);          // contém o CSRF vindo de outros sites
cookie.setSecure(!ehRequisicaoLocal(ctx)); // só HTTPS em produção; fixo em true quebra o login local
cookie.setMaxAge((int) (VALIDADE_MS / 1000));
ctx.cookie(cookie);
```

- **`HttpOnly` always.** A token in `localStorage` is readable by any injected script. An `HttpOnly`
  cookie is not readable even by the page's own script.
- **`SameSite=Lax`** covers the common CSRF case. If the API genuinely needs cross-origin requests,
  consider `None` + `Secure` plus an origin check, and document why.
- **`Secure` is conditional.** Hard-coding `true` breaks login on `http://localhost` in development;
  decide from the request host, or from `AngatuLib.getInstance().isLocalhost()`, which now comes from
  the environment (`ANGATU_ENV`) and not from a certificate folder. **On Coolify the application
  speaks HTTP inside the container and HTTPS to the world:** deciding `Secure` from `ctx.scheme()`
  without `setTrustedProxyHops(1)` drops the cookie in production.

## 3. Token in the header, never in the URL

Accept `Authorization: Bearer <token>` as well, for clients that do not send cookies:

```java
String cookie = ctx.cookie(NOME);
if (cookie != null && !cookie.isBlank()) return cookie;
String header = ctx.header("Authorization");
if (header != null && header.startsWith("Bearer ")) return header.substring(7).trim();
return null;
```

**Never accept a token as a query parameter on an HTTP route.** A URL leaks into browser history,
server logs, proxy logs and the `Referer` header when someone clicks an external link.

**The one justified exception** is the WebSocket handshake, because the browser's `WebSocket` API
cannot send custom headers. Accept the token in the query **there only**, and validate it with the
same function the HTTP routes use.

**And that exception only applies when there is no cookie session.** The handshake is an ordinary
`GET`: the browser sends the same-domain cookie by itself. With an `HttpOnly` cookie session there is
no exception to make — check the cookie as you would anywhere else (`websocket.md`).

## 4. Sessions: creation, validity, revocation

- A **256-bit** token from a secure source (`SecureRandom`), URL-safe Base64. Never sequential, never
  derived from user data.
- Store an **expiry** and refuse an expired session, deleting it on the spot.
- **Revoke every session** on password change, account lock and deletion. Without that, changing a
  password because of a suspected intrusion does not evict whoever is already inside.
- Copy role and tenant into the session to avoid querying the account on every request — and when a
  permission changes, **revoke** rather than edit, so the copied data never goes stale.

## 5. Passwords

- `Password.criptography` to store, `Password.checkCriptography` to verify. Never store a reversible
  password, never log one.
- Initial passwords are random, with a **forced change** on first access.

> **A new login screen has no password at all (R33).** Everything in this subsection applies to a
> project that already has password authentication — which is kept, not ripped out. Built from
> scratch, the screen uses Google OAuth through AngatuCRM and the project stores no password hash:
> `references/auth-oauth.md`.
- A password that will be dictated over the phone or WhatsApp uses an alphabet without ambiguous
  characters (no `0`/`O`, no `1`/`I`).
- **Identical response** for an unknown e-mail and a wrong password. Different messages reveal which
  e-mails are registered.

## 6. Authorization and account isolation

- Centralise the check in a gate (`Guard.requireX(ctx)`) that returns `null` after already writing
  the error — the route only has to return.
- In a multi-tenant system, **filter by tenant on every query**. Never trust an identifier from the
  request without verifying which account owns it.
- Denying access to another account's resource answers **404**, not 403.

## 7. Uploads and files

- Validate **by real content** (the signature in the first bytes), never by the extension the client
  claims.
- Limit size by reading at most `limit + 1` bytes and refusing anything larger.
- Store outside the public folder and serve through an authenticated route. A file in a static folder
  is public to anyone who learns the address.
- Block directory traversal: normalise the path and confirm it is still inside the target folder.
- See `images.md` for the compression gate (G2) that runs before any of this is written.

## 8. Secrets

- An integration secret (payment token, API key) is stored **encrypted in the database** and
  decrypted in memory only at the moment of use. Never in plain text, never in a committed file.
- The master key lives **outside the database** and outside version control: an isolated copy of the
  database must not be enough to open the secrets.
- No route returns a secret in plain text. For on-screen confirmation, show it masked (`****1234`).
- **The assistant never requests, types or embeds a production token.** It is entered by the
  responsible person, in the interface, after the deploy.
- Nothing secret ever reaches the frontend (`frontend-build.md`). The build scans `dist/` and fails
  on a secret pattern, but that is the last net, not the first.

## 9. Rate limiting

```java
JavalinAPI.configureApiRateLimit("/api/*");        // normal API use
JavalinAPI.configureLoginRateLimit("/api/login");  // stricter: brute force
JavalinAPI.setTrustedProxyHops(1);                 // real IP behind the reverse proxy
```

**Leave pages out of the limit.** They are content, not operations: changing screen three times in a
few seconds is normal navigation, and the legitimate user ends up looking at a rate-limit page. Limit
the API and the login, not screen reads.

Also leave out anything fed continuously (location updates) and anything third-party with automatic
retries (payment webhooks).

> **When testing:** the login limit is usually a few attempts per minute with a long block. A polling
> loop hitting `/api/login` burns that budget before the test starts — probe readiness with a
> side-effect-free route such as `GET /api/me`.

Rate limiting filters volume, not intent. It does not replace authorization (section 6), and Turnstile
does not replace it either — the two sit side by side (`turnstile.md`).
