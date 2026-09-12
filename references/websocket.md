# Live channel — WebSocket

> Covers R24. Applies to every `RouteType.WS` route. Written after a chat channel and a dashboard
> channel went to production in AngatuCRM; what follows was established by reading the library's
> `JavalinJettyServlet`, not inferred.

---

## 1. The upgrade request passes through no filter at all

**The gate is inside the route, or there is no gate.** Javalin's servlet diverts the upgrade request
**before** the `before` handlers — and that is where `AngatuLib` keeps the malicious-input filter, the
rate limit and the security headers. Only `WEBSOCKET_BEFORE_UPGRADE` handlers run, and the library
does not use them.

The consequence: a `WS` route that forgets to check the session **produces no error**. It serves
whoever arrives, the console shows real data, and the defect only surfaces the day someone discovers
the address. There is no second layer to catch it.

```java
// WRONG — and nothing warns you.
public class ChatRoute extends Route {
    public ChatRoute() { super("/ws/chat", ws -> ws.onMessage(ctx -> ctx.send(ctx.message()))); }
}
```

This is the shape the API takes, not a model to copy. R22 applies with more force here than anywhere
else: no filter ran, so everything arriving on this socket is unvalidated.

## 2. The cookie travels in the handshake — keep the token out of the URL

The handshake is an ordinary HTTP `GET`: the browser sends the same-domain session cookie without the
code asking. With an `HttpOnly` cookie session, **there is no exception to make** — check the cookie
exactly as the HTTP routes do.

The exception in `security.md` (a token in the query string, because the browser's `WebSocket` API
cannot send custom headers) applies **only** when the project has no cookie session. A token in a URL
leaks into history, proxy logs and `Referer`; using one when a cookie is available gives that away for
nothing.

## 3. One gate, not one per channel

With two channels, two copies of the check are two chances to forget — and forgetting breaks nothing,
it just opens the door. Concentrate the door in one place and let each channel carry only its payload:

```java
/**
 * Porta única dos canais ao vivo do projeto.
 *
 * @author Angatu Sistemas
 */
public final class LiveHub {

    private static final int PING_SECONDS = 25;
    public static final int SESSION_EXPIRED = 4401;

    private final Set<WsContext> viewers = ConcurrentHashMap.newKeySet();

    /** @param ask o que fazer com mensagem da tela; null quando o canal só empurra. */
    public void accept(WsConfig ws, BiConsumer<WsContext, String> ask) {
        ws.onConnect(ctx -> {
            if (Auth.accountOf(ctx) == null) {            // 1. confere
                ctx.closeSession(SESSION_EXPIRED, "Sessao expirada");
                return;
            }
            ctx.enableAutomaticPings(PING_SECONDS, TimeUnit.SECONDS);
            viewers.add(ctx);                              // 2. só então registra
            send(ctx, event("ready"));
        });
        ws.onMessage(ctx -> {
            if (ask == null || !viewers.contains(ctx)) return;   // não passou, não pede
            ask.accept(ctx, ctx.message());
        });
        ws.onClose(viewers::remove);
        ws.onError(viewers::remove);
    }
}
```

**The order is the rule:** check, then register. Registering first delivers events to anyone who merely
found the address. And a message from an unregistered connection is discarded before it becomes a
database query — otherwise the gate only guards `onConnect`.

## 4. 4401, and why an invented number

The browser has no close code for "session expired". Use **4401** (the application-reserved range) and
handle it in the page: a dead session asks for login again, a network drop asks for patience. **Both
sides must agree on the number** — if the server changes it and the page does not know, the dashboard
reconnects in a loop against a session that will never open again, once a second, filling the log with
an error nobody reads.

## 5. The proxy drops idle connections

`ctx.enableAutomaticPings(25, TimeUnit.SECONDS)`. Coolify's proxy closes an idle connection, and an
honest channel is idle most of the time — precisely when nothing is happening is when it must not die
quietly. In the browser, back off between attempts (`1s, 2s, 5s, 10s, 20s`): reconnecting every second
against a server that is down turns one outage into two.

## 6. A live channel is never the source of truth

It pushes what **just** happened, and nothing more. Whoever opens the screen later, or comes back from
a dropped connection, reads through the usual REST route — a screen depending only on the channel
would be empty for anyone arriving late, and empty is indistinguishable from broken.

Rules that follow from that:

- **Whoever receives an event re-reads, instead of patching the screen.** Two ways of assembling the
  same list diverge the day a field changes on one side only.
- **A number the screen shows comes from the route that computes it, never from the event.** Sending
  the count along creates a second source, and the two disagree as soon as someone acts in another tab.
- **Emit a reconnection signal** (`open`) so the screen knows when to re-read. What happened during the
  outage does not come back through the channel.

## 7. One connection per tab

A channel per subject becomes three connections per tab carrying almost nothing each — and three
reconnections per drop. Open **one** and let screens subscribe:

```js
const off = Live.on("payment", function (e) { /* ... */ });   // returns the unsubscribe
```

The connector is created on the first subscription and **only when there is a session**: the login
screen loads the same scripts and has no reason to open anything. If the project has an obfuscation
pipeline, the connector's global goes into `reservedGlobals` (`frontend-build.md`).

## 8. Do not push what the screen would not have asked for

The channel is open in **every tab**. Everything travelling through it reaches someone who is on
another screen and asked for nothing — and an extra field raises no error, it just starts being sent.
Keep off the channel: secrets, tokens, received signatures, payment codes, and personal data the screen
fetches only when someone clicks. The question is "would this person ask for this right now?", not
"would this person be allowed to see it?".

## 9. Announcing must never break the announcer

The channel is a reflection, and a reflection decides nothing. Wrap the announcement in `try/catch` at
the emission point: a failure drawing a console line must not become an error in a webhook route — the
provider would read that error as unavailability and retry in cascade.

Announce **once per event**. A public method calling another public method of the same service
announces twice; solve it with a shell that announces and a private core that does not:

```java
public static Reception receive(...) { return announce(doReceive(...)); }
public static Reception process(...) { return announce(doProcess(...)); }
// doReceive calls doProcess, never process
```

And announce **only what is news**: a confirmation returning the same state as before would make
everyone's screen reload to show what was already there.

## 10. What can be tested without a server

A real connection needs Jetty running. What does **not**, and matters most:

- the gate's order (check before register) and the presence of the guard in `onMessage`;
- `onConnect(` appearing in no file other than the single door, and every `super("/ws...` route
  delegating to a hub instead of configuring itself;
- the same address and the same 4401 on both sides (server and page script);
- the shape of the line the channel pushes: the fields the screen draws present, the forbidden ones
  absent;
- the order of storing before announcing, and the `try/catch` around the announcement.

These are source-text tests and they look crude — but each one blocks a defect that produces no error
at runtime.
