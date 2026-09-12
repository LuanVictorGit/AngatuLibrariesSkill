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
Console.log("Servidor iniciado");
Console.info("Usuário %s", nome);
Console.warn("Quase cheio %d%%", p);
Console.error("Falha", ex);     // the exception is always the last argument
Console.debug("detalhe %s", v); // only with -Dangatu.debug=true
Console.isDebugEnabled();
DataTime.getData();             // "dd/MM/yyyy - HH:mm"
```

Never log a secret, a token or a password (`security.md`).

### GsonAPI

`GsonAPI.get()` is a lazy-holder singleton carrying `OffsetDateTimeTypeAdapter` and
`LocalDateTypeAdapter` (both ISO). Reuse it — never scatter `new Gson()` around.

### Env

```java
Env.get().get("TURNSTILE_SECRET_KEY");
Env.get().get("CHAVE", "default");
Env.reload();
```

### Password

```java
String hash = Password.criptography("senha");
boolean ok  = Password.checkCriptography("senha", hash);
```

### StringAPI

`removeLastChar`, `capitalize`, `randomCode(n)`, `isNullOrEmpty`, `isNullOrBlank`, `repeat`,
`truncate`, `reverse`, `toCamelCase`, `toSnakeCase`, `containsOnlyDigits`, `containsOnlyLetters`,
`extractNumbers`, `maskString`, `countOccurrences`, `equalsIgnoreCaseNullSafe`.

### DataTime

`America/Sao_Paulo`, thread-safe. `getData`, `getCurrentDate/DateTime/ZonedDateTime/Timestamp`,
`formatDate/DateTime/Iso/Custom`, `parseDate/DateTime/Custom`, `addDays/Months/Years/Hours/Minutes/Seconds`,
`diffDays/Months/Years/Hours/Minutes/Seconds`, `getDay/Month/Year/Hour/Minute/Second/DayOfWeek`,
`isLeapYear`, `startOfDay`, `endOfDay`, `first/lastDayOfMonth/Year`, `isBefore/After/Between`,
`calculateAge`, `toLocalDateTime`, `toDate`, `fromTimestamp`, `toTimestamp`, `isValidDate/DateTime`.

### Task

```java
int id = Task.runAsync(() -> {});
Task.runSync(() -> {});
Task.runLater(() -> {}, 5000);
Task.runTimer(() -> {}, 0, 3600_000);
Task.runTimerWithFixedDelay(() -> {}, 0, 3600_000);
Task.cancelTask(id); Task.cancelAll(); Task.shutdown();
```

A scheduled task and a route touching the same record is the classic contested write — use
`Saveable.mutate` (R9, `backend-persistence.md`).

### Request / Response / StatusCode

```java
Response r  = Request.query("GET", "https://api.exemplo.com/users");
Response r2 = Request.query("POST", "https://api.exemplo.com/users", "{\"nome\":\"João\"}", "token");
r.isSuccess(); r.ok(); r.getBody(); r.getStatusCode(); r.getCode();
StatusCode.fromCode(404); // → NOT_FOUND
```

### Dependencies

`Dependencies.isPresent(...)`, `Dependencies.require(class, "g:a:v", feature)`, `Dependencies.check(...)`.

---

## 2. Integrations

### EmailAPI

`smtp.gmail.com:587` over TLS, asynchronous, with an anti-spam `#XXX` marker.

```java
EmailAPI.isConfigured();
EmailAPI.sendSimple("a@x.com", "Bem-vindo", "Olá").join();
EmailAPI.sendHtml("a@x.com", "Bem-vindo", html).join();
EmailAPI.sendSimpleToMultiple(List.of("a@x.com", "b@x.com"), "Assunto", "corpo");
EmailAPI.sendHtmlToMultiple(...);
EmailAPI.sendSimple(List.of(to), cc, bcc, assunto, corpo);
EmailAPI.sendWithAttachments("a@x.com", "Assunto", "corpo", List.of(new File("rel.pdf")), true);
String html = EmailAPI.loadHtmlTemplate("/emails/welcome.html", Map.of("nome", "João")); // {{nome}}
```

**The HTML itself is not free-form.** An e-mail is a rendered surface, so it carries the project's
design system translated into markup a mail client understands — see `email-design.md` (R13, R17).

### WebPushAPI / PushBootstrap / Key

```java
PushBootstrap.setup(); // Key id="key" in Saveable; generates VapidKeys when absent
WebPushAPI.initialize(pubBase64Url, privBase64Url, "mailto:contato@empresa.com");
WebPushAPI.generateVapidKeys();   // 87/43 chars Base64URL, AES128GCM
WebPushAPI.getVapidPublicKey();
WebPushAPI.createSubscription(endpoint, p256dh, auth);
WebPushAPI.sendNotification(sub, "Título", "Corpo", iconUrl);
WebPushAPI.sendNotificationAsync(sub, title, body, iconUrl);
WebPushAPI.sendBatchNotifications(list, title, body, iconUrl);
WebPushAPI.isInitialized(); WebPushAPI.testConfiguration();
// SendResult: isSuccess(), isExpired() (410/404), getStatusCode(), getError()
```

Handle `isExpired()` by deleting the subscription; otherwise the list grows with dead endpoints.

### Bot — Discord (JDA)

`.complete()` blocks; prefer `.queue()`.

```java
Bot.setup(); // DISCORD_BOT_TOKEN
Bot.sendMessage("channelId", "texto");
Bot.sendMessageWithButton("ch", "texto", "btn_ok", "Sim");
Bot.sendImageFromUrl("ch", "https://...", caption);
Bot.onButtonClick("btn_ok", e -> e.reply("Ok!").setEphemeral(true).queue());
```

### BrowserAPI — Playwright

Pool of 2 Chromium instances at 1920x1080.

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

### ImageAPI

`Image extends Saveable` (`id`, `mimeType`, `bytes`).

```java
ImageAPI.imageToBase64(img, "png"); ImageAPI.base64ToImage(b64);
ImageAPI.createThumbnail("foto.png", "mini.png", 200, 200);
ImageAPI.resize(img, 200, 200); ImageAPI.cropCenter(img, 200, 200);
ImageAPI.extractToImageObject("id", bufferedImage);
ImageAPI.createAnimatedGif(frames, "anim.gif", delayMs, loop);
```

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

### EmailFormatter

`isValidNormal` (rejects disposable domains), `isValidStrict`, `getDomain`,
`format("Nome", "email")`.

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
