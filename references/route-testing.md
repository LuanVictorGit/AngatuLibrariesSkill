# Route and service testing — fast, real, and repeatable

> Covers R29. The rule was never "only the JAR" — it is **never a fake server**. A fake server
> (`python -m http.server`, `npx serve`, `file://`) has no session, no filters, no security headers
> and no routes, so it proves nothing. The real server proves everything, and it does not need to be
> packaged into a JAR to run.
>
> This file exists because "test it" used to mean "start it and curl it by hand". That is slow, it is
> not repeatable, and nothing stops a fixed bug from coming back next week.

---

## 1. Three layers, cheapest first

| Layer | What it boots | Cost per run | What it proves |
|---|---|---|---|
| **1. Service** | nothing | milliseconds | pricing, totals, validation, permission decisions |
| **2. Route** | the real `AngatuLib`, in-process | ~1–3 s once per suite | status codes, JSON shape, cookies, filters, headers, rate limiting, stock and ownership against the real database |
| **3. JAR and container** | `mvn package`, `docker build` | tens of seconds | classpath, bundled resources, the image that actually deploys |

Run layer 1 constantly, layer 2 on every change to a route, and layer 3 **before delivering and before
deploying** — not after every edit. Layer 3 stays mandatory (section 5); it just stops being the loop.

**The container half of layer 3 is production-only** (R8, `testing.md` 2). Development never runs
inside Docker: `mvn exec:java` and `java -jar` are the working environment, and `docker build` is what
you do before the image goes up.

---

## 2. Layer 1 — services, with no HTTP at all

R11 already requires the rule to live in `services/`, with no `Context`. That separation is what makes
this possible, and it is the reason to keep it: a route that calculates a total inside the handler
cannot be tested without a server, and a route that delegates can be tested in a millisecond.

```java
/**
 * Layer-1 tests of the order price rule: no server and no database, only the decision (R22).
 *
 * @author Angatu Sistemas
 */
class OrderServiceTest {

    @Test
    void pricesFromTheStoredProduct() {
        assertEquals(new BigDecimal("30.00"), OrderService.total(product("10.00"), 3));
    }

    @Test
    void keepsTheCentsOfTheStoredPrice() {
        assertEquals(new BigDecimal("29.97"), OrderService.total(product("9.99"), 3));
    }

    private static Product product(String price) {
        Product product = new Product();
        product.setPrice(new BigDecimal(price));
        return product;
    }
}
```

The request record has no price field (`java-standard.md` 7), so a forged price cannot even reach
this method: the type already enforces what a test used to check.

**Every pure R22 decision is a layer-1 test** — price, discount, totals, what a role may do. Each is a
decision, each decision belongs to a service, and each service test runs in a millisecond: the cheapest
place to prove the security rules, and the only one fast enough to do it always. What is decided
against the database or the session — stock inside the transaction, another account's record answering
404 — is proved at layer 2, one route call each.

---

## 3. Layer 2 — routes, against the real server, without packaging

The server boots **once for the whole suite** on an ephemeral port, backed by a throwaway database.
It is the same `AngatuLib` that runs in production: same before-handler chain, same SQLi/XSS screen,
same security headers, same rate limiting, same `Saveable` — and the same configuration, because the
harness calls `Main.configure()` (`backend-server.md` 5.1) instead of repeating it.

> **`AngatuLib` is never instantiated twice in the same process** (`backend-server.md`). So the harness
> is a singleton booted on first use, not a `@BeforeEach`, and not one per test class. Surefire runs
> the whole suite in one JVM by default, which is exactly what this needs.

```java
/**
 * The production server, started once for the whole suite on an ephemeral port, with the database
 * in a throwaway file under target/.
 *
 * @author Angatu Sistemas
 */
public final class TestServer {

    private static String origin;

    private TestServer() {
    }

    public static synchronized String ensureRunning() {
        if (origin == null) {
            Main.configure();
            // Port 0 lets the OS pick a free port, so the suite never collides with a dev server on 8080.
            // AngatuLib registers its own shutdown hook (server, tasks, database): nothing to add here.
            new AngatuLib("localhost", 0, true);
            origin = "http://127.0.0.1:" + JavalinAPI.get().port();
        }
        return origin;
    }
}
```

The HTTP client is the JDK's — no extra dependency — and it keeps cookies, so a login flow and every
request after it share the session exactly as a browser would:

```java
/**
 * Base of the route tests: the shared server and an HTTP client that keeps the session cookie.
 *
 * @author Angatu Sistemas
 */
public abstract class RouteTestBase {

    protected static String origin;
    protected static HttpClient http;

    @BeforeAll
    static void openClient() {
        origin = TestServer.ensureRunning();
        http = HttpClient.newBuilder()
                .cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    @AfterAll
    static void closeClient() {
        if (http != null) {
            http.close();
        }
    }

    protected HttpResponse<String> get(String path) throws IOException, InterruptedException {
        return http.send(HttpRequest.newBuilder(URI.create(origin + path)).GET().build(),
                HttpResponse.BodyHandlers.ofString());
    }

    protected HttpResponse<String> post(String path, String json) throws IOException, InterruptedException {
        return http.send(HttpRequest.newBuilder(URI.create(origin + path))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build(), HttpResponse.BodyHandlers.ofString());
    }
}
```

And the tests themselves:

```java
/**
 * Layer-2 tests of POST /api/orders and its neighbours, against the real server.
 *
 * @author Angatu Sistemas
 */
class CreateOrderRouteTest extends RouteTestBase {

    @Test
    void healthAnswersWithoutSession() throws Exception {
        assertEquals(200, get("/health").statusCode());
    }

    @Test
    void refusesWithoutSession() throws Exception {
        var response = post("/api/orders", "{\"productId\":\"SKU-1\",\"quantity\":1}");

        assertEquals(401, response.statusCode());
    }

    @Test
    void refusesQuantityAboveStock() throws Exception {
        signInAs("customer-a");

        var response = post("/api/orders", "{\"productId\":\"" + productWithTwoInStock + "\",\"quantity\":5}");

        assertEquals(409, response.statusCode());
    }

    @Test
    void anotherAccountsOrderIsNotFound() throws Exception {
        signInAs("customer-a");

        var response = get("/api/orders/" + orderOfCustomerB);

        // 404, not 403: a 403 would confirm that the order exists (security.md).
        assertEquals(404, response.statusCode());
    }

    @Test
    void sendsTheSecurityHeaders() throws Exception {
        var response = get("/health");

        assertTrue(response.headers().firstValue("X-Content-Type-Options").isPresent());
        assertTrue(response.headers().firstValue("Cache-Control").orElse("").contains("no-store"));
    }
}
```

**This is the layer that catches what the eye does not:** a route registered without its guard, a
cookie missing `HttpOnly`, a 403 where R22 requires 404, a `Cache-Control` that slipped (R25), a
security header lost when someone tightened the CSP.

### 3.1 The test database, and why it goes in `target/`

The database path comes from the environment, so the test JVM gets its own through Surefire — not
through a system property, and never by pointing at the development database:

```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-surefire-plugin</artifactId>
  <version>3.5.4</version>
  <configuration>
    <argLine>--enable-native-access=ALL-UNNAMED "-Djdk.net.unixdomain.tmpdir=${project.build.directory}"</argLine>
    <environmentVariables>
      <ANGATU_DB_PATH>${project.build.directory}/test-database.db</ANGATU_DB_PATH>
      <ANGATU_ENV>development</ANGATU_ENV>
    </environmentVariables>
  </configuration>
</plugin>
```

Directly under `target/`, never in a subfolder: SQLite does not create a missing folder, and `target/`
is the one that always exists by the time tests run. `mvn clean` wipes it and `.gitignore` already
covers it. A suite that writes into the
development database corrupts the data you were about to demo. The `argLine` lets `sqlite-jdbc` load
its native library without the Java 24+ warning (`backend-server.md` 1.1), and moves the socket that
Java's NIO selector opens out of `TEMP`: on Windows with `TEMP` under a short 8.3 name
(`C:\Users\NAME~1\...`) Jetty fails with `SocketException: Invalid argument: connect` and no server
starts — the same fix the library's own suite carries.

### 3.2 Rate limiting will bite

The real rate limiter is running, because that is the point. A suite that hammers `/api/login`
20 times will start getting 429 — which is correct behaviour and a bad test failure. Either assert the
429 deliberately (it is worth one test), or give the test routes their own limit through
`JavalinAPI.setRateLimitingEnabled(false)` inside the harness when the suite is not testing limits.
Decide it once, in the harness, and write down which you chose.

The request log is running too: every call prints a line to `System.out`. That is useful when a test
fails; if the suite is noisy, `JavalinAPI.setRequestLogMode(RequestLogMode.ERRORS)` in the harness
keeps only the failures. Never assert on it by sleeping — the lines are written by another thread.

### 3.3 Why not `javalin-testtools`

`io.javalin:javalin-testtools` exists for 7.2.3 and is a good tool — but it does not fit this stack.
`JavalinTest.test(app, ...)` calls `app.start(0)` itself, and in AngatuLibraries the server is already
started: `JavalinAPI.setup(...)` calls `start(port)` during `new AngatuLib(...)`
(`backend-server.md` 5.2). Handing it an already-running instance is not what it expects.

The singleton above gives the same thing — real routes, real port, cookies carried across requests —
with one fewer dependency. If `AngatuLib` ever gains a "configure but do not start" entry point, revisit
this.

---

## 4. `pom.xml`

```xml
<dependency>
  <groupId>org.junit.jupiter</groupId>
  <artifactId>junit-jupiter</artifactId>
  <version>5.14.4</version>
  <scope>test</scope>
</dependency>
```

That is the whole addition. The HTTP client is `java.net.http`, in the JDK since 11.

```bash
mvn test                            # the first two layers
mvn test -Dtest=OrderServiceTest    # layer 1 only, in milliseconds
```

Note that `mvn package -DskipTests`, used everywhere in this skill for speed, **skips all of this**.
That flag is for when you want the artifact, not for when you want to know whether it works.

---

## 5. What the fast layers do not prove — the JAR stays (R29)

Layers 1 and 2 run against `target/classes`. They cannot see:

- **a resource that does not reach the JAR** — a page under `public/`, an e-mail template, a Tailwind
  stylesheet that was never committed;
- **a shading or classpath problem** that only appears in the packaged artifact;
- **the `dist`**, where obfuscation defects live and nowhere else (R19, `frontend-build.md`);
- **the container** — the base image, the `/data` volume, `PORT`, the healthcheck;
- **the screen**, which is a human looking at it (R21, `frontend-preview.md`).

So before delivering, the full path still runs, exactly as `testing.md` describes:

```bash
mvn package && java -jar target/<app>.jar
docker build -t <app> . && docker run --rm -p 8080:8080 -v <app>-data:/data <app>
```

The change is **when**, not whether. The JAR stops being the inner loop and becomes the gate before
delivery — which is both faster to work with and stricter, because now a regression has a test that
fails instead of a person who has to remember to check.

---

## 6. Checklist

- [ ] Every R22 decision (total, stock, ownership, role) covered by a layer-1 service test
- [ ] Every new route has a layer-2 test for its success case and for its refusal case
- [ ] Protected route tested **without** a session: 401, before any business rule
- [ ] Another account's resource tested: 404, never 403
- [ ] Security headers and `no-store` asserted at least once (R25)
- [ ] Test database under `target/`, via Surefire environment variables — never the development one
- [ ] Rate-limiting behaviour in the suite decided and written down (3.2)
- [ ] `mvn test` green before the commit
- [ ] `mvn package` + `java -jar`, and the container, before delivering (R29, `testing.md`)
- [ ] Frontend rendered and looked at (R21, `frontend-preview.md`)
