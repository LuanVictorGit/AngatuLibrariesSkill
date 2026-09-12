# IP blocklist — Spamhaus DROP, on every project

> Covers R34. Every project filters incoming traffic against the Spamhaus **DROP** list, which
> enumerates netblocks that are hijacked or under criminal control. It is mandatory, including on
> projects that never asked for it.
>
> **Source of truth:** <https://www.spamhaus.org/blocklists/do-not-route-or-peer/> · terms at
> <https://www.spamhaus.org/drop/terms/>. Read the terms before shipping — the data is free to use
> under conditions, and this file does not restate them.

---

## 1. What the list is, and what it is not

DROP is **not** a spam filter and not a reputation score. It is a short list of ranges you should
exchange no traffic with at all — *Don't Route Or Peer*. A request from one of them is not a customer
having a bad day.

| List | Address | Size today |
|---|---|---|
| DROP (IPv4) | `https://www.spamhaus.org/drop/drop_v4.json` | 1.723 CIDRs, ~105 KB |
| DROPv6 | `https://www.spamhaus.org/drop/drop_v6.json` | 92 CIDRs, ~6 KB |
| ASN-DROP | `https://www.spamhaus.org/drop/asndrop.json` | needs IP→ASN mapping the app does not have — out of scope here |

**eDROP no longer exists separately.** It was merged into DROP on 10 April 2024; configuring DROP
alone gets that coverage. Anything telling you to fetch `edrop.txt` is out of date.

**Cover both families.** A project that filters only IPv4 is bypassed by any client with IPv6, which
on most mobile networks is the default. Together the two lists are ~111 KB and under 1,900 entries —
there is no size argument for skipping v6.

**Spamhaus intends this for the edge** — "network gateways, firewalls, web-proxies, DNS resolvers".
Be honest about what the application-level filter is: a layer, not the ideal placement. The best place
is the host firewall or the Coolify network, and if the project has access to that, put it there too.
The in-app filter exists because it is the part this skill controls and it travels with the image.

---

## 2. The trap that makes this a no-op — or an outage

**The application is behind Coolify's reverse proxy.** The socket address is the proxy's, not the
visitor's. Get this wrong and the filter does one of two things, both silent:

- reads the proxy address on every request, matches nothing, and **blocks no one** — the feature looks
  installed and does nothing;
- or, if that address ever falls inside a listed range, **blocks one hundred percent of traffic**.

So the filter reads the client address the same way everything else in this stack does — through the
library's `IP` helper, with `setTrustedProxyHops(1)` already configured
(`backend-routes-html.md`, `backend-server.md`). Never `ctx.req().getRemoteAddr()`, and never a raw
`X-Forwarded-For` — the header is client-supplied and the hop count is what makes it trustworthy
(R22: what the client sends is input, not fact).

**Verify it before trusting the filter**, by checking that the address you are about to test is the
one you think it is:

```bash
# do lado de fora, contra o ambiente publicado
curl -s https://<dominio>/health -H 'X-Forwarded-For: 1.10.16.1'
# se essa requisição for bloqueada, o número de hops está errado e o cabeçalho
# do cliente está sendo obedecido — isso é pior que não ter filtro nenhum
```

---

## 3. Rules that decide the implementation

### It fails **open**

If the list cannot be downloaded, parsed, or has never loaded yet, **every request is served**. A
blocklist that cannot reach Spamhaus must never become an outage of your own making.

> This is the opposite of Turnstile, which fails **closed** (`turnstile.md`), and the difference is
> not an inconsistency. A missing Turnstile token means *this visitor did not prove anything*. A
> missing blocklist means *we know nothing about anyone* — and unknown is not hostile.

### The list is held in memory, and R25 does not forbid that

R25 bans **content** caching: no service worker storing screens, no long `Cache-Control`, every page
from the server on every request (`cache.md`). A 111 KB blocklist held in memory and refreshed on a
timer is not content — it is configuration. Fetching 1,800 CIDRs per request would be absurd, and
would get the project rate-limited by Spamhaus within minutes.

Refresh on a schedule through the library's `Task` (`backend-utilities.md`), not a bare `Thread`, so
it stops with `Task.shutdown()` in the shutdown hook like everything else. **Do not fetch more often
than hourly** — the list changes slowly and hammering it is abuse of a free service. **Never fetch
synchronously at startup**: the first load happens in the background and the filter stays inert until
it succeeds, which is the fail-open rule applied to boot.

### Three things are never blocked

- **`/health`** — the container healthcheck calls it from inside, and Coolify restarts on failure.
  Block it and the project restart-loops. It is already outside the rate limit
  (`addIgnoredPath("/health")`); it is outside this too.
- **Loopback and private ranges** — `127.0.0.0/8`, `::1`, `10/8`, `172.16/12`, `192.168/16`. They are
  not in DROP, but a bug in address resolution that yields a private address must not become a block.
  Short-circuit them before the lookup.
- **A blocked address never gets a designed page.** R13 puts every rendered surface on the design
  system; this is not a rendered surface. Answer a bare `403` with no body. Serving a styled page to
  hostile traffic spends bandwidth and tells a scanner the filter exists.

### Logging

Count blocks; do not log each one at info level. A single scanner produces thousands of hits and will
bury everything else in `Console`. Log the list refresh — record count and timestamp — because a
refresh that silently started failing is the realistic way this decays.

---

## 4. Parsing — the file is JSON Lines, not a JSON array

This is where a first implementation usually breaks. The file is one JSON object per line:

```
{"cidr":"1.10.16.0/20","sblid":"SBL256894","rir":"apnic"}
{"cidr":"1.19.0.0/16","sblid":"SBL434604","rir":"apnic"}
{"type":"metadata","timestamp":1789220642,"size":105134,"records":1723,"copyright":"(c) 2026 The Spamhaus Project SLU","terms":"https://www.spamhaus.org/drop/terms/"}
```

`GsonAPI.get().fromJson(conteudo, ...)` over the whole file **fails** — parse line by line.

Two consequences worth writing into the code:

- **The last line is metadata, not a range.** Skip any object whose `type` is `metadata`.
- **That metadata carries `records`.** Compare it with how many CIDRs you actually parsed, and
  **reject the refresh if they disagree** — a truncated download otherwise replaces a full blocklist
  with a partial one, silently, and nothing in the application looks wrong.

Matching is by range, not by string. Convert each IPv4 CIDR to a `[start, end]` pair of `long`, sort
once, and binary-search on lookup; IPv6 does the same over the 16-byte address. With fewer than 1,900
entries the lookup is immediate. **A `startsWith` comparison on the text of an address matches almost
nothing and is the classic wrong implementation.**

Keep the previous list in place while a refresh is being built, and swap only on success — never clear
first and repopulate, or every request in that window is unfiltered.

---

## 5. The static track has no Java

A static-only project (G1, `static-site.md`) has no application to filter in. There the list is
applied by nginx, from a generated `deny` include:

- convert the CIDRs to `deny <cidr>;` lines at **build time** and `include` the file from the server
  block;
- accept the tradeoff and write it down: the list is then only as fresh as the last deploy. A site
  that deploys monthly carries a month-old blocklist, which is still far better than none;
- the same exclusions apply — `/health` stays reachable, and a blocked address gets `403` with no body.

If the project's hosting can filter at the network level, prefer that for this track: it is the
placement Spamhaus actually recommends and it does not depend on the deploy cycle.

---

## 6. What this does not replace

- **Rate limiting stays.** DROP covers criminal netblocks, not the ordinary abusive client on a normal
  residential address (`backend-server.md`).
- **Turnstile stays** where it was decided (G4): DROP filters networks, Turnstile filters automation.
- **Authorization stays.** A request from an unlisted address is not a trusted request — R22 is
  unaffected by any of this.

A blocklist that is treated as a security boundary is more dangerous than none, because it invites
dropping the checks that actually hold.

---

## 7. Recording it

```markdown
### Decisões registradas deste projeto
- Filtro de IP (R34): DROP v4 + DROPv6, atualização de hora em hora via Task, falha aberta.
  /health e faixas privadas fora do filtro. Aplicado também no firewall do host em 2026-09-12.
```

## 8. Checklist

- [ ] Both `drop_v4.json` and `drop_v6.json` loaded — not IPv4 only
- [ ] Client address read through the library's `IP` helper with the proxy hops configured, and
      **verified** against the published environment (section 2)
- [ ] `X-Forwarded-For` never read directly
- [ ] Fails open: unreachable, unparsed or not-yet-loaded list serves every request
- [ ] First load asynchronous — startup never blocks on Spamhaus
- [ ] Refresh through `Task`, no more than hourly, stopped by `Task.shutdown()`
- [ ] Parsed as JSON Lines, metadata line skipped, count checked against `records`
- [ ] List swapped atomically on success; never cleared before a refresh
- [ ] Range matching by numeric comparison, not string prefix
- [ ] `/health`, loopback and private ranges never blocked
- [ ] Blocked address gets a bare `403`, no rendered page
- [ ] Blocks counted, not logged individually; refreshes logged
- [ ] Spamhaus terms read before shipping
- [ ] Route test covering a listed address, an unlisted one, and the empty-list fail-open path
      (`route-testing.md`)
