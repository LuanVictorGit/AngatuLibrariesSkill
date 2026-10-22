# Utilities and optional integrations

> Every integration ships with a `Dependencies` guard: the class throws `MissingDependencyException`
> with Maven/Gradle instructions instead of a bare `NoClassDefFoundError`.
>
> **R26 beats this file.** Two classes documented here — `MercadoPagoAPI` and `DeepSeek` — are not
> used in client projects. See `crm-payments-ai.md`.

---

## 1. Core utilities

### Console / AnsiColor

`System.out` is wrapped by `InterceptorOutputStream` and routed to `Console`; the original stream
stays reachable through `getOriginalOut()`. Colour codes `&0..&f`, `&l` bold, `&n` underline,
`&o` italic, `&r` reset.

```java
Console.log("Server started");
Console.info("User %s signed in", userId);
Console.warn("Upload volume at %d%%", usage);
Console.error("Invoice sync failed", ex);  // the exception is always the last argument
Console.debug("Payload size %d", size);    // only with -Dangatu.debug=true
Console.isDebugEnabled();
DataTime.getData();             // "dd/MM/yyyy - HH:mm"
```

Never log a secret, a token or a password (`security.md`). **Pass data as an argument** —
`Console.info("Search: %s", term)`: a `&` inside an argument is printed as it is, while in the format
string it is a colour code. One logical line is one log line, written in English (R12): the log is read
by whoever maintains the system, not by the people who use it.

### GsonAPI

`GsonAPI.get()` is a lazy-holder singleton with ISO-8601 adapters for `LocalDate`, `OffsetDateTime`,
`LocalDateTime`, `LocalTime`, `ZonedDateTime`, `Instant` and `Duration` (the last five also read the
object form an old `--add-opens` build wrote). Reuse it — never scatter `new Gson()` around. A date in
the wrong format is `JsonSyntaxException`: catch `JsonParseException` and answer 400. `Period`,
`YearMonth`, `OffsetTime`, `ZoneId`, `Year` and `MonthDay` still have no adapter.

### Env

```java
Env.get().get("TURNSTILE_SECRET_KEY");
Env.get().get("APP_NAME", "default");
Env.reload();
```

A real environment variable beats the `.env` entry with the same name. The library's own settings
(`ANGATU_ENV`, `ANGATU_DB_PATH`, `ANGATU_DB_*`, `ANGATU_TASK_THREADS`, `ANGATU_WEBPUSH_SUBJECT`) are
read **only** from the process environment — in `.env` they do nothing; on Coolify they are service
variables. A malformed `.env` (BOM, unclosed quote, `export KEY=`) no longer stops the application:
the warning names the line and the key, never the value.

### Password

```java
String hash  = Password.hash(typedPassword);                     // sign-up / password change
boolean ok   = Password.checkCriptography(typedPassword, hash);  // login
```

`hash` always hashes (BCrypt, salt included). `criptography(value)` is for re-saving a value that may
already be a hash: it passes a stored hash through only when its cost is 4 to 12 — a higher cost made
every login cost minutes to hours of CPU. `$2a$`, `$2b$` and `$2y$` hashes verify; a malformed hash is `false`,
never an exception. Only the first 72 bytes of the password (UTF-8) count.

### StringAPI

`removeLastChar`, `capitalize`, `randomCode(n)`, `isNullOrEmpty`, `isNullOrBlank`, `repeat`,
`truncate`, `reverse`, `toCamelCase`, `toSnakeCase`, `containsOnlyDigits`, `containsOnlyLetters`,
`extractNumbers`, `maskString`, `countOccurrences`, `equalsIgnoreCaseNullSafe`.

`randomCode(n)` uses `SecureRandom`, about 5.95 bits per character: 6 characters suit a one-time
code with an attempt limit; a session or password-reset token takes 32 or more. Lower-casing uses
`Locale.ROOT`, so a JVM in Turkish does not break comparisons.

### DataTime

`America/Sao_Paulo`, thread-safe. `getData`, `getCurrentDate/DateTime/ZonedDateTime/Timestamp`,
`formatDate/DateTime/Iso/Custom`, `parseDate/DateTime/Custom`, `addDays/Months/Years/Hours/Minutes/Seconds`,
`diffDays/Months/Years/Hours/Minutes/Seconds`, `getDay/Month/Year/Hour/Minute/Second/DayOfWeek`,
`isLeapYear`, `startOfDay`, `endOfDay`, `first/lastDayOfMonth/Year`, `isBefore/After/Between`,
`calculateAge`, `toLocalDateTime`, `toDate`, `fromTimestamp`, `toTimestamp`, `isValidDate/DateTime`.

`parseDate`/`parseDateTime` are strict: `31/02/2025` is refused (it used to become 28/02). Treat the
exception where the date comes from a form. Month and weekday names are in Portuguese.

### Task

```java
int id = Task.runAsync(() -> {});
Task.runSync(() -> {});
Task.runLater(() -> {}, 5000);
Task.runTimer(() -> {}, 0, 3600_000);
Task.runTimerWithFixedDelay(() -> {}, 0, 3600_000);
Task.cancelTask(id); Task.cancelAll();
Task.drain(5_000);   // on shutdown: lets queued work finish (AngatuLib's own hook already does it)
Task.shutdown();     // discards the queue — never in a hook of your own next to AngatuLib's
```

One-off work runs on `ANGATU_TASK_THREADS` workers (16 by default); periodic tasks run on a separate
clock, so a burst of slow work never delays the server's periodic sweep. A failure inside a task —
an `Error` included — is logged, and a periodic task stays scheduled. Inside a periodic task, send
heavy work to `runAsync`: it holds a clock thread while it runs. E-mail and Web Push have queues of
their own and never occupy these threads.

The id is always positive and is never handed to another task while its own is registered — the
counter wraps (in under a month at a thousand tasks per second), and keeping the id of a timer
created at startup is safe: `cancelTask` keeps stopping that timer. `drain` also runs a delayed task
whose time had come but that the busy clock had not fired yet; after `drain`/`shutdown`, a new
submission throws `RejectedExecutionException` and leaves nothing registered.

A scheduled task and a route touching the same record is the classic contested write — use
`Saveable.mutate` (R9, `backend-persistence.md`).

### Request / Response / StatusCode

```java
Response r  = Request.query("GET", "https://api.example.com/users");
Response r2 = Request.query("POST", "https://api.example.com/users", "{\"name\":\"João\"}", "token");
r.isSuccess(); r.ok(); r.getBody(); r.getStatusCode(); r.getCode();
r.isNetworkError(); r.getError();   // no response at all: DNS, refused, timeout, too large
StatusCode.fromCode(404); // → NOT_FOUND
```

- **It never throws for a network failure** — check `isNetworkError()`. `getCode()` is the code the
  server sent (207, 522...), and `isSuccess()` covers every 2xx.
- **15 s for the whole call, body included** (`Request.setTimeout(...)`), and **10 MiB** of response
  at most (`Request.setMaxBodyBytes(...)`). A server dripping one byte a second no longer holds the
  thread forever.
- Any method, `PATCH` included. At most 4 redirects, never from `https` to `http`, and
  `Authorization`/`Cookie` are dropped on a redirect to another host.
- It is a plain HTTP client. Anything the project sends to a URL that came from outside (a webhook
  target, an image link) still needs the destination checked first (`security.md`).

### Dependencies

`Dependencies.isPresent(...)`, `Dependencies.require(class, "g:a:v", feature)`, `Dependencies.check(...)`.

---

## 2. Integrations

### EmailAPI

`smtp.gmail.com:587` with **mandatory** STARTTLS and a verified certificate and host name,
asynchronous, with an anti-spam `#XXX` marker. `jakarta.mail` **2.0.2** — 2.0.1 has the SMTP
injection CVE-2025-7962.

```java
EmailAPI.isConfigured();
EmailAPI.sendSimple("a@x.com", "Bem-vindo", "Olá").join();
EmailAPI.sendHtml("a@x.com", "Bem-vindo", html).join();
EmailAPI.sendSimpleToMultiple(List.of("a@x.com", "b@x.com"), "Assunto", "corpo");
EmailAPI.sendHtmlToMultiple(...);
EmailAPI.sendSimple(List.of(to), cc, bcc, subject, body);
EmailAPI.sendWithAttachments("a@x.com", "Assunto", "corpo", List.of(new File("report.pdf")), true);
String html = EmailAPI.loadHtmlTemplate("/emails/welcome.html", Map.of("name", "João")); // {{name}}, escaped
String page = EmailAPI.loadHtmlTemplateWithTrustedHtml("/emails/order.html", values, trustedHtml);
EmailAPI.escapeHtml(value);
```

- **The future always completes**: `true` when the SMTP server accepted the message, `false` for
  any failure — invalid recipient, a missing or unreadable attachment (nothing is sent), missing
  credentials, a full queue, an SMTP error. The reason goes to the log.
- **One address per list item.** An item with a comma, a group or a line break refuses the whole
  send: a form field cannot add recipients.
- **Templates live in `public/emails/` and are public** (`email-design.md`). Values are HTML-escaped;
  HTML the system builds goes through `loadHtmlTemplateWithTrustedHtml`.
- Sends run on a queue of their own (4 at a time, 1,000 waiting), with a deadline on connect, read
  and write. On JVM shutdown the queue gets up to 8 s to empty.

**The HTML itself is not free-form.** An e-mail is a rendered surface, so it carries the project's
design system translated into markup a mail client understands — see `email-design.md` (R13, R17).

### WebPushAPI / PushBootstrap / Key

```java
PushBootstrap.setup("mailto:contato@empresa.com"); // Key id="key" in Saveable; generates VapidKeys when absent
WebPushAPI.initialize(pubBase64Url, privBase64Url, "mailto:contato@empresa.com");
WebPushAPI.generateVapidKeys();   // 87/43 chars Base64URL, AES128GCM
WebPushAPI.getVapidPublicKey();
WebPushAPI.parseSubscriptionFromJson(ctx.body());       // IllegalArgumentException → answer 400
WebPushAPI.createSubscription(endpoint, p256dh, auth);  // same
WebPushAPI.isAllowedEndpoint(endpoint);                 // the same check, without throwing
WebPushAPI.allowPushServiceHost("push.example.com");    // at startup, for a push service off the list
WebPushAPI.sendNotification(sub, "Título", "Corpo", iconUrl);
WebPushAPI.sendNotificationAsync(sub, title, body, iconUrl);
WebPushAPI.sendBatchNotifications(list, title, body, iconUrl);
WebPushAPI.isInitialized(); WebPushAPI.testConfiguration();
// SendResult: isSuccess(), isExpired() (410/404), getStatusCode() (0 = no HTTP response), getError()
```

- **Only known push services.** The endpoint comes from the browser — or from whoever forges the
  request — so only `https` on port 443 of `fcm.googleapis.com`, `*.push.services.mozilla.com`,
  `*.push.apple.com` and `*.notify.windows.com` is accepted. It is checked again right before each
  send, so an old subscription stored with another endpoint fails as a plain failure, not "expired".
- **Subject**: the project's own contact — `setup(subject)`, else `-Dangatu.webpush.subject`, else
  `ANGATU_WEBPUSH_SUBJECT`; without any, it falls back to Angatu's.
- **`setup` fails at startup when the stored keys are invalid or do not match.** Never delete the key
  row to "fix" it: new keys invalidate every browser subscription. Fix the row.
- **Futures never complete exceptionally** — a network failure is a `SendResult` with status 0. Sends
  run on a queue of their own (32 at a time, 10,000 waiting) with 5 s to connect, 10 s per read and
  30 s in total; beyond the queue, the send fails at once, so a broadcast to more than ~10,000
  subscriptions goes in batches. On JVM shutdown the queue gets up to 8 s to empty.

Handle `isExpired()` by deleting the subscription; otherwise the list grows with dead endpoints.

### Bot — Discord (JDA)

`.complete()` blocks; prefer `.queue()`.

```java
Bot.setup(); // DISCORD_BOT_TOKEN — waits up to 30 s, returns false if Discord does not answer
Bot.sendMessage("channelId", "texto");
Bot.sendMessageWithButton("ch", "texto", "btn_ok", "Sim");
Bot.sendImageFromUrl("ch", "https://...", caption);
Bot.onButtonClick("btn_ok", e -> e.reply("Ok!").setEphemeral(true).queue());
Bot.shutdown(); // on shutdown
```

The bot no longer asks for MESSAGE_CONTENT, a privileged intent: asking for it without enabling it on
the developer portal kept the bot from connecting at all, and the class never reads messages. A
project that reads message text through `getJDA()` uses `Bot.setup(token, true)` and enables
"Message Content Intent" on the portal. Every send has a deadline (15 s for text, 60 s for a file);
an image by URL only comes from a public `http`/`https` address, up to 10 MiB.

### BrowserAPI — Playwright

A fixed pool of 2 Chromium instances at 1920x1080.

```java
BrowserAPI.captureFullPageScreenshot("https://site.com");
BrowserAPI.captureFullPageScreenshotFromHtml("<h1>oi</h1>");
BrowserAPI.captureFullPageScreenshotToFile("https://site.com", "site.png");
String html = BrowserAPI.getPageHtml("https://site.com");
String t    = BrowserAPI.extractText("https://site.com", "h1");
BrowserAPI.extractLinks(html); BrowserAPI.extractImageUrls(html);
BrowserAPI.extractMetaTags(html); BrowserAPI.stripHtml(html);
BrowserAPI.minifyHtml(html); BrowserAPI.absolutizeUrls(html, "https://site.com");
BrowserAPI.shutdown();
```

A project using this needs the Playwright runtime image and extra container memory — Chromium runs
in a separate process and does not count against the heap (`deploy-coolify.md`).

- **Public addresses only.** The browser reaches no loopback, private network or cloud metadata: the
  URL is checked first, and every connection Chromium makes goes through a local proxy that checks
  the real address — redirects, iframes, late images, WebSockets and workers included. To capture
  the project's own pages on `localhost` in development, call
  `BrowserAPI.setAllowPrivateNetworkAccess(true)` — it is JVM-wide, so never in a process that also
  captures a URL a user supplied. `file:`, `data:` and `about:` are refused as targets; for the
  project's own HTML use the `*FromHtml` methods.
- **At most two browsers.** With both busy for 30 s the call fails with "BrowserAPI ocupada" instead
  of launching more Chromium; a dead browser is replaced one for one.
- The options are honoured: `quality` (JPEG), `fullPage`, the four `clip*` fields together,
  `blockImages`/`blockCss`/`blockFonts`, `waitForNetworkIdle`, `waitForImages`. An invalid value throws
  `IllegalArgumentException`.

### ImageAPI

`Image extends Saveable` (`id`, `mimeType`, `bytes`), served by `GET /image?id=...` to anyone who
knows the id.

```java
ImageAPI.imageToBase64(img, "png"); ImageAPI.base64ToImage(b64);
ImageAPI.createThumbnail("photo.png", "thumb.png", 200, 200);
ImageAPI.resize(img, 200, 200); ImageAPI.cropCenter(img, 200, 200);
ImageAPI.extractToImageObject("id", bufferedImage);
ImageAPI.extractToImageObject("id", uploadBytes); // type from the bytes; IllegalArgumentException if not an image
ImageAPI.createAnimatedGif(frames, "anim.gif", delayMs, loop);
ImageAPI.imageUrlToBase64(url);                   // public http/https only, 20 MB, 30 s
```

Formats are recognised by content (PNG, JPEG, GIF, BMP, TIFF, WebP); SVG and HTML are refused. Every
read refuses more than 40 megapixels before allocating (`ImageAPI.setMaxPixels`). JPEG EXIF
orientation is applied on read. A write failure throws `IOException` — it used to leave no file and
say nothing.

**Before writing any image-saving code, ask G2** — compression strategy, maximum size, formats,
thumbnails (R28, `images.md`).

### QRCodeAPI — ZXing

```java
BufferedImage qr = QRCodeAPI.generateQRCode("https://site.com");
QRCodeAPI.generateQRCode("texto", 300, 300, ErrorCorrectionLevel.H, 2);
QRCodeAPI.saveQRCodeToFile(qr, "qrcode.png");
String b64 = QRCodeAPI.generateQRCodeAsBase64("texto", 300, 300);
QRCodeAPI.readQRCodeFromFile("qrcode.png");
QRCodeAPI.generateQRCodeWithLogo("texto", 300, 300, logo, 60);
```

Width and height go from 1 to 4096 px; the margin is counted in **modules** of the code, not pixels.
A logo forces error correction level H. The class loads without ZXing and shows the install message
on first use.

### EmailFormatter

`isValidNormal` (rejects disposable domains), `isValidStrict`, `getDomain`,
`format("Nome", "email")`. Surrounding spaces are ignored; a subdomain of a disposable domain is
disposable; real providers (Microsoft, GMX, mail.ru...) left the disposable list; `o'brien@...` is
valid, like the browser's `type="email"`. `format` quotes a name with a comma or other special
character, so `format("Silva, João", ...)` stays one recipient.

---

## 3. Documented, but not for client projects (R26)

### DeepSeek

> **Do not use in a client project. Text generation goes through the AngatuCRM API.** Here the
> provider key lives inside the project, spend is not attributed per application, and there is no
> ceiling: one faulty loop burns the month's credit in minutes.

```java
DeepSeek.initialize(); // DEEPSEEK_API_KEY
String r = DeepSeek.ask("Responda em português", "Capital do Brasil?");
DeepSeek.askStream("Seja criativo", "Conte uma história", chunk -> System.out.print(chunk));
DeepSeek.initialize("apiKey", "deepseek-chat"); DeepSeek.setModel("deepseek-chat");
```

`ask` has 300 s for the whole answer; `askStream` always closes the connection, stops after 120 s of
silence, and has an overload with `onComplete`/`onError` that calls exactly one of them.

### MercadoPagoAPI — sdk-java 2.9.2

> **Do not use in a client project. Charging goes through the AngatuCRM API.** This class needs the
> Mercado Pago access token inside the project, which is exactly what R26 exists to prevent: a
> credential spread across repositories, with no split, no reconciliation and no idempotent refund.
> It stays documented because **AngatuCRM itself** uses it — it is the one place that talks to the
> provider.

```java
MercadoPagoAPI.init("ACCESS_TOKEN"); // or initFromEnv() with MP_ACCESS_TOKEN
PaymentDTO pix    = MercadoPagoAPI.createPixPayment(99.90, "a@x.com", "Compra #123", "pedido-123");
PaymentDTO boleto = MercadoPagoAPI.createBoletoPayment(99.90, "a@x.com", "João", "Silva", "12345678901", "desc", "ref");
Optional<PaymentDTO> p = MercadoPagoAPI.findById(123L);
MercadoPagoAPI.isApproved(123L); MercadoPagoAPI.checkPaymentStatus(123L);
PreferenceDTO pref = MercadoPagoAPI.createPreference("Produto", 1, 99.90, "a@x.com", "ref", "https://ok", "https://fail", "https://pend");
boolean sigOk = MercadoPagoAPI.validateWebhookSignature(xSig, xReqId, dataId, secret);
```

- **A failure is never "not found"**: only HTTP 404 is empty. With the API down, `findById` throws
  `MercadoPagoException` and `processWebhook` throws `MPException` — answer the webhook with 5xx so
  Mercado Pago retries, instead of leaving a paid order unreleased.
- **Idempotency**: every creation method has a `BigDecimal` overload with `idempotencyKey` — the same
  key never charges twice. For a **card**, without a key, one is derived from the charge data when
  there is an `externalReference`, so a retry after a timeout does not charge again. PIX, boleto and
  metadata payments keep creating a new charge per call: an extra PIX only expires, and generating a
  new PIX for an order whose PIX expired has to keep working.
- **Webhook signature** exactly as the official documentation: HMAC-SHA256 of
  `id:{data.id};request-id:{x-request-id};ts:{ts};`, a missing pair left out, compared in constant
  time. The `ts` time window is **off by default** — Mercado Pago retries for up to 96 hours and the
  documentation does not say a retry is re-signed. `setWebhookTolerance(...)` turns it on, after
  checking in the sandbox how retries arrive.
