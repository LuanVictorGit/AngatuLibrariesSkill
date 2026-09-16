# WhatsApp — AngatuWhatsappSDK

> Covers R36 (WhatsApp goes through AngatuWhatsappSDK) and the part of R4 that applies to it
> (always the newest version, checked every time).
>
> Library: <https://github.com/LuanVictorGit/AngatuWhatsappSDK> · Java 17+ · Apache-2.0

**Read the repository before writing a line.** The README and `EXAMPLES.md` are the contract, the
same discipline R33 imposes on the CRM: the class names, builders and listeners below are what
that repository publishes today, and a method invented from memory compiles against nothing.

---

## 1. The rule

**Any WhatsApp work uses this SDK.** Sending a message, receiving one, a bot, a broadcaster, a
notifier, a support inbox — all of it. Never Baileys directly, never `whatsapp-web.js`, never a
headless browser driving WhatsApp Web, never a Node service written alongside the Java one to do
what this library already does.

**Say the link out loud.** When WhatsApp comes up, name the library and give the address, so the
owner knows what is being pulled in and the agent has somewhere to read:

> utilizando a biblioteca <https://github.com/LuanVictorGit/AngatuWhatsappSDK>, me faça um
> automatizador de mensagens WhatsApp.

**Why a rule and not a preference.** The alternative is always the same: a second runtime, in a
second language, with a second session store and a second failure mode, bolted to a Java project.
This SDK already is that — a Node bridge the SDK owns, spawns, authenticates and kills — and it
keeps every Baileys type out of the application. A project that reaches for Baileys directly is
writing, by hand, the part that is already written, tested and versioned.

**What the SDK is built on, stated plainly.** Baileys (`baileys@6.7.24`), which is an unofficial
reverse-engineered WhatsApp Web client — **not** Meta's WhatsApp Business Platform. The library's
own README says it: automating a number this way violates WhatsApp's terms and the number can be
banned, most likely at high volume or with machine-looking send patterns. **Tell the owner that
once, before the first line**, use a disposable number while developing, and say that Meta's
official Cloud API is the other road for a commercial-critical case. This is a sentence of fact,
not a warning label repeated at every step.

---

## 2. Dependency (R4)

**The repository publishes no tags and no releases** — checked, and true of `AngatuLibraries` too.
So "the newest version" is the **latest commit on `main`**, and JitPack takes a commit hash as a
version. Do not copy a hash out of another project: read the current one every time.

```bash
curl -s https://api.github.com/repos/LuanVictorGit/AngatuWhatsappSDK/commits/main \
  | grep -m1 '"sha"'
```

```xml
<repositories>
  <repository><id>jitpack.io</id><url>https://jitpack.io</url></repository>
</repositories>

<dependency>
  <groupId>com.github.LuanVictorGit</groupId>
  <artifactId>angatu-whatsapp</artifactId>
  <version>COMMIT_HASH</version>
</dependency>
```

The README also shows `com.angatusistemas:angatu-whatsapp` on Maven Central — **that is the
post-release form and the release has not happened**. Until it does, JitPack is the path.

`mvn clean install` from a clone publishes `1.0.0-SNAPSHOT` locally; useful for hacking on the SDK
itself, wrong for a project that has to build on Coolify from the repository.

---

## 3. What the runtime needs

- **Java 17+** to consume it; this standard is on Java 21, so that is satisfied.
- **Node.js 20+ at runtime**, for the bridge. The SDK finds one already installed or downloads a
  managed one (SHA-256 checked against `nodejs.org`) on first run, into a cache directory.
- Nothing extra at **build** time — the bridge ships compiled inside the jar.

**In the container, decide where that cache lives.** A fresh download on every boot is minutes of
startup and a network dependency at the worst moment. Either install Node in the image, or point
`ANGATU_WHATSAPP_HOME` at the Coolify volume (`/data/...`) so the download survives a redeploy.
→ `references/deploy-coolify.md`

---

## 4. The session is state, and it belongs on the volume

`sessionDirectory` holds the Baileys credentials. It is what makes the number stay paired across
restarts, and **it is the single most important operational decision in a WhatsApp project**.

**On the container filesystem it is lost on every deploy, and every deploy then demands a new QR
code from a human.** Put it on the mounted volume — `/data/whatsapp/<instanceId>` — the same place
the database lives.

- One directory per instance, never shared. A `.lock` file stops two processes on the same
  machine; it does **not** stop two machines over NFS/SMB, so never put it on a network share.
- It is credential material. It never goes into the image, into git, or into a backup that is
  less protected than the database.
- **This is not a cache, and R25 does not apply to it** — same distinction the Spamhaus list
  makes: what is stored is state and configuration, not content served to a visitor.
  → `references/cache.md`

---

## 5. The shape of the code

```java
WhatsAppClient client = WhatsAppClient.builder()
        .instanceId("avisos")
        .sessionDirectory("/data/whatsapp/avisos")
        .build();

client.addQrCodeListener(qr -> /* mostrar a quem vai parear */);
client.addConnectionStateListener((state, cause, detail) -> /* registrar */);
client.addMessageListener(message -> {
    if (!message.isFromMe()) client.sendText(message.chatId(), "Recebi: " + message.text());
});

Runtime.getRuntime().addShutdownHook(new Thread(client::close));
client.connect().join();
```

- `connect()` returns when the **bridge accepted the attempt**, not when WhatsApp authenticated.
  Real progress (`QR_PENDING`, `CONNECTED`, `FAILED`) arrives on the listeners, asynchronously.
  Code that treats `connect().join()` as "we are online" is wrong and looks right.
- Senders return `CompletableFuture<String>` with the message id and never block the caller:
  `sendText`, `sendImage`, `sendVideo`, `sendAudio`, `sendDocument`, `sendSticker`,
  `sendLocation`, `sendContact`, `sendReaction`, each with its own `Send*Request.builder()`.
- Nine listener interfaces, registered independently — message, updated, deleted, reaction,
  connection state, QR code, group update, presence, error. Subscribe to what is used.
- `Message` is a record: `messageId`, `chatId`, `senderId`, `timestamp`, `text`, `type`,
  `isGroup`, `isFromMe`, `pushName`, `quotedMessage`, `rawData`.
- Chat ids are `5511999999999@s.whatsapp.net`. Build them in one helper, never inline in screens.
- **`close()` is not automatic.** The SDK registers no JVM shutdown hook; without one, the bridge
  process is orphaned. In an `AngatuLib` project the hook is where `Task.shutdown()` already is.
  → `references/backend-server.md`
- `filePath` on the media senders is read by the **bridge process**, on the same machine. A path
  that only exists inside the Java process's imagination fails there, not here.

---

## 6. Pacing is a feature, and turning it off is a decision

The SDK queues sends per instance — nothing goes out in parallel — with a random 4–12 s gap and a
ceiling of 10 per minute (`PacingOptions`), plus optional presence signals (`HumanizationOptions`:
"typing…", online/offline, read receipts).

**Those defaults are what keeps the number alive.** Raising them because a broadcast feels slow is
the fastest route to a banned account, and the README is explicit that the queue protects the
*pattern* and cannot protect the *content*: the same unsolicited message to thousands of strangers
gets the number banned at any cadence. Any change to pacing is the owner's decision, recorded in
`CLAUDE.md` like every other one.

---

## 7. Where it meets the rest of this standard

- **R22 — the client is hostile.** The recipient of a message is never whatever `chatId` the
  browser sent. Resolve it server-side from the authenticated account, exactly as with any other
  identifier, or the endpoint becomes a free relay for sending WhatsApp from your number to
  anyone. → `references/security.md`
- **R23 — the QR code is a credential in flight.** Whoever scans it pairs *your* number. It is
  shown only to an authenticated operator, never on a public page, never in a log, never in an
  e-mail. Treat the page that renders it as a privileged screen.
- **R13 / R17** — that operator screen is a rendered surface: design system, PT-BR copy and the
  Angatu footer, like any other.
- **R29 — test without connecting.** Message building, chat-id formatting, routing rules and
  templates are plain JUnit. Nothing in the automated suite pairs a number, spawns a bridge or
  reaches WhatsApp; a suite that needs a phone is a suite nobody runs.
  → `references/route-testing.md`
- **R12** — Javadoc in PT-BR on every class you write around the SDK, `@author Angatu Sistemas`.
- **R26 is untouched.** Payments and AI still go through AngatuCRM. This rule is about WhatsApp
  transport and nothing else — a bot that answers with a model still calls `ai:chat` on the CRM.
  → `references/crm-payments-ai.md`

---

## 8. Known limitations, so they are not rediscovered as bugs

- One Node process per connected instance: fine for dozens of numbers, not for thousands.
- No chat-history sync. Real-time events and point queries only.
- Editing and deleting a sent message only work inside the window WhatsApp allows (~15 minutes,
  decided by the server, with no way to ask). The server's refusal is the answer.
- The pairing-code flow is less exercised in real use than the QR flow.
- `close()` degrades to killing the process when the WebSocket is already dead.

---

*Source of truth is the repository, not this page. When they disagree, the repository wins and
this page gets fixed.*
