# Payments and AI go through the AngatuCRM API

> Covers R26. **This rule beats `backend-utilities.md`.**
>
> **Source of truth, and it is not this file:**
> AI → <https://crm.angatusistemas.com.br/docs-ia>
> Money → <https://crm.angatusistemas.com.br/docs-pagamentos>
> Full contract → <https://crm.angatusistemas.com.br/openapi.json>
>
> This page summarises what matters when deciding. Before writing the first line of an integration,
> **read the page** — it is generated from `openapi.json`, which a CRM test checks against the routes
> that actually exist, in both directions. This file can age; that page cannot.
>
> **Login goes through the CRM too (R33)**, and by the same reasoning — one credential, in one place.
> That path has its own file: `references/auth-oauth.md`. The discipline is identical: read the CRM
> documentation before integrating, and if the endpoint is not published there, stop and say so
> instead of inventing it.

---

## 1. The rule

Every Angatu project that charges money or generates text with AI **calls the AngatuCRM API**. Never
the provider directly, never the provider's SDK, and **never this library's own convenience classes** —
`MercadoPagoAPI` and `DeepSeek` are outside this path.

They stay documented because **AngatuCRM itself** uses them: it is what talks to the provider, and the
only place the credential exists.

## 2. Why, one sentence each

- **There is one key, and it pays.** Spread across five projects it exists in five places to leak
  from, there is no way to tell which one burned the month's credit, and revoking it takes down all
  five at once.
- **Spend is attributed to whoever asked.** Each project authenticates with a **CRM** token that can
  be revoked on its own, and consumption shows up per application.
- **The ceiling exists before the call.** A faulty loop in one project would consume the entire credit
  in minutes; the quota is checked before the call leaves, and a refusal costs nothing.
- **Money needs more than creating a charge.** Split to the client's account, reconciliation against
  the official statement, idempotent refunds and signature-verified webhooks are already done in the
  CRM. Redoing that per project is redoing the bugs too.

## 3. AI — three formats, one ceiling

Choose by the client the project **already has**, not by what looks nicer:

| Format | Base address | When |
|---|---|---|
| Native | `https://crm.angatusistemas.com.br/api/v1` | new code, no dependency |
| OpenAI | `https://crm.angatusistemas.com.br/api/v1/ai/openai` | OpenAI SDK, LangChain, LlamaIndex |
| Anthropic | `https://crm.angatusistemas.com.br/api/v1/ai/anthropic` | Claude Code, Anthropic SDK |

The credential is always the **AngatuCRM token** with the `ai:chat` permission, in
`Authorization: Bearer` or `x-api-key`. **Never in a query string.**

```java
/**
 * The native AngatuCRM chat contract, POST /api/v1/ai/chat with the CRM token as a Bearer credential.
 *
 * @author Angatu Sistemas
 */
public final class CrmChat {

    private CrmChat() {
    }

    public record ChatRequest(String model, List<ChatMessage> messages, @SerializedName("max_tokens") int maxTokens) {
    }

    public record ChatMessage(String role, String content) {
    }

    public record ChatResponse(String content, @SerializedName("finish_reason") String finishReason, Usage usage,
            @SerializedName("latency_ms") long latencyMs) {
    }

    public record Usage(@SerializedName("prompt_tokens") int promptTokens,
            @SerializedName("completion_tokens") int completionTokens, BigDecimal cost) {
    }
}
```

Send `GsonAPI.get().toJson(new ChatRequest("openai/gpt-4o-mini", messages, 400))` through `Request` —
the model is an OpenRouter id enabled on the CRM — and read the answer with
`GsonAPI.get().fromJson(response.getBody(), ChatResponse.class)`. `@SerializedName` keeps the wire's
snake_case while the Java names stay camelCase (R12); confirm the fields against the CRM page before
coding, as section 1 says.

For **Claude Code**, two variables and it starts spending against the CRM ceiling:

```bash
export ANTHROPIC_BASE_URL="https://crm.angatusistemas.com.br/api/v1/ai/anthropic"
export ANTHROPIC_AUTH_TOKEN="<token do CRM>"
export ANTHROPIC_MODEL="anthropic/claude-3.5-sonnet"
```

**Three things that change the integrating code:**

1. `stream: true` returns valid SSE, but **the text arrives all at once** — there is no incremental
   delivery. An interface that depends on text being typed out needs to know that.
2. **Text blocks only.** Images, tool use and tool results are refused by block name, never silently
   dropped.
3. `429` is a **money** limit, not a traffic one: respect `Retry-After` and **do not retry in a loop**.
   Every attempt generates text and costs again.

`model` is always an **OpenRouter** id (`openai/gpt-4o-mini`, `anthropic/claude-3.5-sonnet`) in all
three formats, and it must be enabled in the CRM. There is no alias translation —
`GET /api/v1/ai/models` lists the valid ones.

## 4. Money — what the project calls

```
POST /api/v1/payments                  PIX
POST /api/v1/payments/card             cartão, a partir do token gerado no navegador
POST /api/v1/payments/boleto           boleto, com pagador completo
POST /api/v1/checkout/preferences      checkout hospedado
POST /api/v1/checkout/international    comprador estrangeiro: página do CRM, cartão, en-US, sem CPF
GET  /api/v1/payments/{id}             consulta  (?refresh=true força o provedor)
POST /api/v1/payments/{id}/cancel      cancela o que ainda não foi aprovado
POST /api/v1/payments/{id}/refund      estorna o que já foi, total ou parcial
```

**Four rules that avoid the expensive mistakes:**

- **Money travels as a decimal string** (`"49.90"`), never as a JSON number: a JSON number becomes a
  binary float, and cents in floating point drift.
- **Every creation carries `X-Idempotency-Key`.** The same key returns the same charge, with `200`
  instead of `201`. Without it, a user's double click becomes two charges.
- **A charge created is not a charge paid.** The CRM confirms it with Mercado Pago. The provider's
  notification reaches the **CRM**, not your project: there is nothing to configure in the Mercado
  Pago panel and nothing to implement at `/api/v1/webhooks/...`. To learn about approval without
  asking, use the outbound webhook (section 5). Polling in a loop is still wrong.
- **`422` is a refusal by rule and is not retried; `502` is a provider failure and may be.** Treating
  both the same is how duplicates are born.

Also: the amount charged is computed by the server from the database, never from the browser (R22).

### 4.1 Buyers outside Brazil — the international checkout, not the Payment Brick

**The Payment Brick does not serve a foreign buyer.** On a Brazilian Mercado Pago account its card
form demands a valid CPF or CNPJ in every language, `en-US` included, and has no setting to hide the
field; the hosted checkout asks the same. A foreigner sees "Cardholder ID (CPF)", has no number, and
leaves. So the answer to "accept payments from abroad" is never the Brick — not even translated, and
not embedded in the project with a guessed or borrowed CPF, which is someone else's identity.

The CRM solves it on its side: `POST /api/v1/checkout/international` (`payments:checkout`) returns
the usual charge, `pending`, with `checkout_url` pointing at a CRM page — card only, English by
default, no Brazilian document. The page builds its own form on Mercado Pago's secure fields, so the
card number never reaches the project or the CRM. What the integrating project does:

1. Its **server** creates the link with the amount, `title`, `external_reference`, optionally
   `payer_email` (prefills the page), `locale` (`en-US` default; `pt-BR` and the SDK's Spanish ones
   too), `back_url` and `expires_in_minutes` (one day by default, thirty at most).
2. It sends the buyer to `checkout_url` — a redirect, an e-mail link, a button.
3. It waits for the outbound webhook (section 5). The charge leaves `pending` only when a card passes
   (`approved`, or `in_process` while the issuer reviews it).

Three things that change the integrating code:

- **A declined card does not mark the charge `rejected`.** The buyer may try another card while the
  link is valid; five declines close the link. Never cancel the order on a decline you did not see —
  you will not see one.
- **It charges in BRL, single installment.** The issuer converts to the buyer's currency; the page
  says so. There is no PIX or boleto on that page: both need a Brazilian bank account or document.
- **Whoever tests it signed in to the CRM panel gets a "use a private window" notice** instead of the
  form. That is deliberate: the page loads Mercado Pago's script, and it never runs beside a panel
  session.

Read the CRM page before integrating, as always: section `#international` of
[docs-pagamentos](https://crm.angatusistemas.com.br/docs-pagamentos#international).

## 5. Learning about approval without asking — the CRM's outbound webhook

The CRM `POST`s to an `https` address you register in its panel (under **Aplicações**), on every status
change of a charge belonging to your application. The body is
`{ id, type: "payment.updated", previous_status, payment }`, with `payment` in the **same shape** as
`GET /api/v1/payments/{id}`.

```
X-Angatu-Event: payment.updated
X-Angatu-Delivery: 8f3c1ab29de4771b
X-Angatu-Timestamp: 1757600000000
X-Angatu-Signature: sha256=<hmac>
```

**Verify the signature before trusting the notification, always.** Your address is on the public
internet: without verification, whoever finds it sends an `"approved"` and your project hands over the
product for free. The signature is `sha256=` plus the hexadecimal HMAC-SHA256 of
`<X-Angatu-Timestamp>.<body>` using the secret generated in the panel.

Four things that decide between working and failing silently:

- **Use the RAW body, byte for byte.** This is the most common mistake of all: a framework that already
  parsed the JSON and re-serialised it changes whitespace and key order, and the signature stops
  matching everywhere — without anything looking wrong. In Javalin, `ctx.body()` before any parse.
- **Compare in constant time and refuse anything old.** `MessageDigest.isEqual`, and discard a
  timestamp more than a few minutes out: a valid signature does not stop someone replaying tomorrow a
  legitimate notification captured today.
- **Answer `2xx` within 15 seconds, as soon as it is stored**; process afterwards. Holding the response
  while working makes the delivery time out and come back — and then you process twice what you had
  already processed once.
- **The same notification can arrive twice**, and that is not a defect. Deduplicate by
  `X-Angatu-Delivery`, which does not change between retries of the same notification and differs for
  every new event.

Without a response, the CRM retries six times (30s, 2min, 10min, 1h, 6h) and then leaves the delivery in
the panel for manual resend — nothing is lost because your system spent the night down. `4xx` is a
refusal and is **not** retried.

**The notification is not an order.** It reports what the CRM has already confirmed with the provider;
it arrives after the fact, never instead of it. To release something expensive with certainty, check
`GET /api/v1/payments/{id}` — the notification tells you *when* to ask, it does not replace the asking.

A webhook route that writes to a record also touched by a scheduled job is the exact case that needs
`Saveable.mutate` (R9, `backend-persistence.md`). That pairing is what caused the incident documented
there.

## 6. What never to do

- Request, generate or store `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `DEEPSEEK_API_KEY` or
  `MP_ACCESS_TOKEN` in a client project. If one of those exists in a `.env`, it is in the wrong place —
  the right thing is an AngatuCRM token.
- Call `MercadoPagoAPI` or `DeepSeek` outside AngatuCRM itself.
- Sum charges to obtain a balance. A balance comes from the official statement, always refers to a past
  instant, and may only be displayed together with the time it was taken.
- Automatically retry an AI call or a charge creation.

## 7. Before integrating

1. Ask the project owner for an **AngatuCRM token** with the permissions needed and nothing more
   (`ai:chat`, `payments:create`, `payments:read`…). There is no self-registration.
2. Read the page for the subject: [docs-ia](https://crm.angatusistemas.com.br/docs-ia) or
   [docs-pagamentos](https://crm.angatusistemas.com.br/docs-pagamentos).
3. Check the exact fields in [openapi.json](https://crm.angatusistemas.com.br/openapi.json) — it is the
   single source, and a CRM test keeps it honest.
4. <https://crm.angatusistemas.com.br/llms.txt> carries the same index in plain text, for an agent that
   prefers reading without HTML.
