# Login — Google OAuth through AngatuCRM

> Covers R33. A login screen built from scratch authenticates with **Google OAuth brokered by
> AngatuCRM**. No password field, no local password hash, no session invented by the project.
>
> **Source of truth, and it is not this file:**
> <https://crm.angatusistemas.com.br/docs-google> — read it **before writing the first line**, every
> time, the same discipline R26 imposes for payments and AI (`crm-payments-ai.md`). This page carries
> the rule and the invariants; the endpoint shapes come from the CRM, never from memory and never from
> this file.
>
> **Go to that address directly.** The documentation index at `/docs` links only to `/docs-ia` and
> `/docs-pagamentos`, and `openapi.json` does not describe this flow — so an agent told merely to
> "read the CRM documentation" follows those two links and never finds the login contract. That is
> why the URL is written out here instead of an instruction to go looking.

---

## 1. The rule

**A login screen created from scratch uses Google OAuth through AngatuCRM.** The reasoning is the same
one that put payments and AI behind the CRM (R26):

- **The Google client secret exists in one place.** Spread across five projects it is five places to
  leak from, and rotating it means touching five deploys.
- **The project never stores a password.** No hash to leak, no reset flow to get wrong, no password
  policy to argue about, no credential-stuffing surface. The strongest password handling is the one
  that does not exist.
- **Identity is attributable and revocable centrally**, per application, like the CRM token already is.

### When it does *not* apply

- **A project that already has a working password login.** R18's boundary applies: adopting this skill
  is not a licence to rewrite what works. Propose adding Google sign-in **alongside** it, with account
  linking (section 5), and let the owner decide. Never remove an existing login path on your own.
- **An internal screen with no external users** where the owner explicitly asks for something else —
  recorded in `CLAUDE.md` like any other decision.

---

## 2. Step zero, and it is not optional

**Open <https://crm.angatusistemas.com.br/docs-google> before writing anything**, and take the
routes, parameters, callback shape and token format from there.

Two things this file will not do for you, because they age and the page does not:

- **It does not restate the endpoints.** They live on that page.
- **It does not describe the flow from memory.** `openapi.json` covers AI, payments, customers and
  reports and does not describe this one, and the `Authorization: Bearer agtu_<prefixo>_<segredo>`
  documented under `/docs` is how *your application* authenticates *to the CRM* — a different thing
  from a person signing in.

The result of reading decides what happens next:

| What the docs show | What you do |
|---|---|
| A login/OAuth endpoint is published | Use exactly what it documents — routes, parameters, callback shape, token format |
| The page is unreachable, or the endpoint is not there | **Stop and tell the project owner.** Do not invent endpoints, do not integrate Google directly, and do not silently fall back to a password login |

**Inventing the integration is the failure mode to avoid.** A login built against a guessed endpoint
compiles, renders a convincing screen and fails at the one moment that matters — and the guess is not
visible in the diff. If the capability is not documented, the honest deliverable is the screen plus a
clear statement of what is blocking, not a plausible-looking integration.

```bash
# antes de escrever a primeira linha
curl -s https://crm.angatusistemas.com.br/docs-google
```

> O CRM tem limite por IP nas próprias páginas de documentação: uma sequência de tentativas responde
> **429** e bloqueia por alguns minutos. Leia a página uma vez e trabalhe a partir dela, em vez de
> repetir a chamada — a mesma cortesia que a skill exige ao consumir a lista da Spamhaus (R34).

---

## 3. What holds regardless of the endpoint shape

These are properties of the OAuth 2.0 authorization-code flow and of this skill's own rules. They do
not change when the CRM publishes its routes, so they can be written now.

### The exchange never happens in the browser

The authorization code is exchanged for a token **on the server**, in a `Route`. Anything the browser
does is a redirect and a callback. A client secret — Google's or the CRM's — never reaches a page,
never reaches a JS file, never reaches `dist/`. R18 already forbids a secret in the frontend source;
obfuscation does not change that (R20).

### `state` is mandatory, and it is verified

The `state` parameter is generated server-side, stored against the session, and **compared on the
callback**. Without it the callback accepts a code obtained in someone else's browser — login CSRF.
A `state` that is generated but not checked is the same as no `state` at all, and it looks correct in
every screenshot.

### The identity comes from the server's verification, never from the client

R22 in its purest form: the callback receives a code, and everything about who the user is comes from
what the **server** got back by verifying it. A user id, an e-mail or a role arriving in the request
body, in a query parameter or in a hidden field is input, not identity.

- The stable identifier is the provider's subject (`sub`), **not the e-mail** — people change e-mail
  addresses, and addresses get reassigned inside a company domain.
- An unverified e-mail is not an identity. If the payload carries a `email_verified`-style flag, a
  false value stops the login.

### The session is this skill's session (R23)

Once identity is established, the project issues its **own** session cookie: `HttpOnly`, `SameSite`,
`Secure` conditional on `isLocalhost()`, and the token never in a URL (`security.md`). The provider's
token is not the session, is not stored in `localStorage`, and is not handed to the page.

### The callback route is a public route, so it is guarded like one

It is reachable by anyone with the URL. It gets its own rate limit — `configureLoginRateLimit` is the
existing shape (`backend-server.md`) — because it is a login endpoint by another name. A failed
exchange answers the same way regardless of cause: an error that distinguishes "unknown account" from
"invalid code" is an account-enumeration oracle.

### The CSP has to allow the redirect

The skill requires tightening the CSP before production, and OAuth breaks silently when it is not
accounted for: the redirect simply does not happen and **there is no visible error** — the same trap
documented for Turnstile (`turnstile.md`). Whatever origin the flow redirects to must be allowed in
`form-action` and, if anything is framed, in `frame-src`. Confirm the exact origins against the CRM
docs rather than guessing them.

### Turnstile still applies (G4)

OAuth removes password guessing; it does not remove automated account creation. If the project uses
Turnstile, the login entry point is one of the surfaces it covers (`turnstile.md`).

### The privacy policy is updated

Signing in with Google means personal data flows through Google and through AngatuCRM. The project's
privacy page — the one the footer already links — says so, exactly as it does for Turnstile
(`turnstile.md`). A login that silently shares identity data is an incomplete delivery.

---

## 4. The screen itself

The login page is a rendered surface, so R13 applies in full: project palette, typography, spacing,
the Angatu footer (R17), reviewed PT-BR copy (R16), visible focus, and it is looked at on a running
server at both widths before it is done (R21, `frontend-preview.md`).

- **One primary action.** "Entrar com o Google" as the button, following Google's own branding
  requirements for the mark and the wording.
- **Say what happens next**, in one line, before the click — which account data the system will
  receive.
- **Show the failure.** A cancelled or refused sign-in returns to the page with a readable message in
  the project's design, never a stack trace and never a blank screen.
- **Nothing else on the page.** No password field left "just in case", no e-mail input that does
  nothing. A dead field is a support call.

---

## 5. Account linking, when the project already has users

Existing accounts do not disappear because sign-in changed. Match the Google identity to an existing
record **deliberately**:

- Match on a **verified** e-mail, never on an unverified one — otherwise anyone who can claim an
  address can claim the account.
- Store the provider `sub` on the account the first time, and match on `sub` from then on.
- A contested write here is a `Saveable.mutate(...)`, not a read-then-save (R9,
  `backend-persistence.md`): two simultaneous first logins otherwise create two accounts.
- Never merge two existing accounts automatically. Surface it and let a person decide.

---

## 6. Recording the decision

Like every other gate answer, in `CLAUDE.md` (R2):

```markdown
### Decisões registradas deste projeto
- Login (R33): Google OAuth pelo AngatuCRM. Sem senha local. Identidade pelo `sub`,
  e-mail só se verificado. Sessão própria por cookie HttpOnly. Política de privacidade
  atualizada em 2026-09-12.
```

---

## 7. Checklist

- [ ] CRM documentation read **in this session**, before the first line of integration
- [ ] Endpoints taken from the docs — nothing invented, nothing recalled from another project
- [ ] If no endpoint is published: stopped, and the owner told — no direct-to-Google fallback, no
      silent password login
- [ ] No client secret anywhere outside the server
- [ ] `state` generated server-side and **verified** on the callback
- [ ] Identity from the server's verification only; `sub` as the identifier, not the e-mail
- [ ] Unverified e-mail refuses the login
- [ ] Project's own session cookie: `HttpOnly`, `SameSite`, conditional `Secure`, never in a URL (R23)
- [ ] Callback route rate-limited, and its errors indistinguishable by cause
- [ ] CSP allows the redirect origins — tested with the tightened policy, not the permissive default
- [ ] Privacy policy updated
- [ ] Account linking matches on verified e-mail, stores `sub`, uses `mutate` (R9)
- [ ] Screen on the design system, with the Angatu footer, looked at on a running server (R13, R21)
- [ ] Route tests cover the refusal cases: bad `state`, unverified e-mail, replayed code
      (`route-testing.md`)
- [ ] Decision recorded in `CLAUDE.md`
