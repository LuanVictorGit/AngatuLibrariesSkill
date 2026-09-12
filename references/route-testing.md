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
| **1. Service** | nothing | milliseconds | pricing, totals, stock, validation, permission decisions |
| **2. Route** | the real `AngatuLib`, in-process | ~1–3 s once per suite | status codes, JSON shape, cookies, filters, headers, rate limiting |
| **3. JAR and container** | `mvn package`, `docker build` | tens of seconds | classpath, bundled resources, the image that actually deploys |

Run layer 1 constantly, layer 2 on every change to a route, and layer 3 **before delivering and before
deploying** — not after every edit. Layer 3 stays mandatory (section 5); it just stops being the loop.

---

## 2. Layer 1 — services, with no HTTP at all

R11 already requires the rule to live in `services/`, with no `Context`. That separation is what makes
this possible, and it is the reason to keep it: a route that calculates a total inside the handler
cannot be tested without a server, and a route that delegates can be tested in a millisecond.

```java
/**
 * Testes da regra de preço do pedido.
 *
 * <p>Nenhum servidor sobe aqui. O que se testa é a decisão — total, desconto,
 * frete e estoque —, que é exatamente onde o erro caro acontece (R22).</p>
 *
 * @author Angatu Sistemas
 */
class OrderCalculatorTest {

    @Test
    void deveIgnorarOPrecoQueVeioDoCliente() {
        var produto = new Product("SKU-1", new BigDecimal("10.00"));
        var pedido  = new OrderRequest("SKU-1", 3, new BigDecimal("0.01")); // preço forjado

        var total = new OrderCalculator().calcular(pedido, produto);

        // O preço do corpo da requisição não participa do cálculo (R22).
        assertEquals(new BigDecimal("30.00"), total);
    }

    @Test
    void naoDeveAceitarQuantidadeMaiorQueOEstoque() {
        var produto = new Product("SKU-1", new BigDecimal("10.00"), 2);
        var pedido  = new OrderRequest("SKU-1", 5, null);

        assertThrows(EstoqueInsuficienteException.class,
            () -> new OrderCalculator().calcular(pedido, produto));
    }
}
```

**Every R22 rule is a layer-1 test.** Price recalculated server-side, quantity checked against stock,
identifiers authorised against the session, no mass assignment — each of those is a decision, each
decision belongs to a service, and each service test runs in a millisecond. This is the cheapest place
to prove the security rules, and the only place where proving them is fast enough to do it always.

---

## 3. Layer 2 — routes, against the real server, without packaging

The server boots **once for the whole suite** on an ephemeral port, backed by a throwaway database.
It is the same `AngatuLib` that runs in production: same before-handler chain, same SQLi/XSS screen,
same security headers, same rate limiting, same `Saveable`.

> **`AngatuLib` is never instantiated twice in the same process** (`backend-server.md`). So the harness
> is a singleton booted on first use, not a `@BeforeEach`, and not one per test class. Surefire runs
> the whole suite in one JVM by default, which is exactly what this needs.

```java
/**
 * Servidor real, compartilhado por toda a suíte de testes.
 *
 * <p>Sobe uma única vez, em porta efêmera, com o banco apontando para um
 * arquivo descartável em target/. É o AngatuLib de produção — os filtros, os
 * cabeçalhos e o rate limiting são os mesmos, e é por isso que o teste vale.</p>
 *
 * @author Angatu Sistemas
 */
public final class ServidorDeTeste {

    private static AngatuLib instancia;
    private static String origem;

    private ServidorDeTeste() {
    }

    /** Sobe o servidor na primeira chamada e reaproveita nas seguintes. */
    public static synchronized String garantirNoAr() {
        if (instancia == null) {
            // Porta 0: o sistema escolhe uma livre e nenhum teste colide com
            // um servidor de desenvolvimento já aberto em 8080.
            instancia = new AngatuLib("localhost", 0, true);
            origem = "http://127.0.0.1:" + JavalinAPI.get().port();

            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                Saveable.shutdown();
                Task.shutdown();
                JavalinAPI.get().stop();
            }));
        }
        return origem;
    }
}
```

The HTTP client is the JDK's — no extra dependency — and it keeps cookies, so a login flow and every
request after it share the session exactly as a browser would:

```java
/**
 * Base dos testes de rota: servidor no ar e cliente que guarda o cookie de sessão.
 *
 * @author Angatu Sistemas
 */
public abstract class RotaTestBase {

    protected static String origem;
    protected static HttpClient http;

    @BeforeAll
    static void prepararCliente() {
        origem = ServidorDeTeste.garantirNoAr();
        http = HttpClient.newBuilder()
            .cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    }

    protected HttpResponse<String> get(String caminho) throws Exception {
        return http.send(HttpRequest.newBuilder(URI.create(origem + caminho)).GET().build(),
            HttpResponse.BodyHandlers.ofString());
    }

    protected HttpResponse<String> post(String caminho, String json) throws Exception {
        return http.send(HttpRequest.newBuilder(URI.create(origem + caminho))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(json))
            .build(), HttpResponse.BodyHandlers.ofString());
    }
}
```

And the tests themselves:

```java
class CreateOrderRouteTest extends RotaTestBase {

    @Test
    void healthDeveResponderSemAutenticacao() throws Exception {
        var resposta = get("/health");

        assertEquals(200, resposta.statusCode());
    }

    @Test
    void rotaProtegidaDeveRecusarSemSessao() throws Exception {
        var resposta = post("/api/orders", "{\"sku\":\"SKU-1\",\"quantidade\":1}");

        // Sem sessão a requisição morre antes da regra de negócio (R22, R23).
        assertEquals(401, resposta.statusCode());
    }

    @Test
    void recursoDeOutraContaDeveResponder404() throws Exception {
        autenticarComo("cliente-a");

        var resposta = get("/api/orders/" + pedidoDoClienteB);

        // 404, não 403: 403 confirma que o recurso existe (security.md).
        assertEquals(404, resposta.statusCode());
    }

    @Test
    void deveEnviarOsCabecalhosDeSeguranca() throws Exception {
        var resposta = get("/health");

        assertTrue(resposta.headers().firstValue("X-Content-Type-Options").isPresent());
        assertEquals("no-store", resposta.headers().firstValue("Cache-Control").orElse(""));
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
  <version>3.2.5</version>
  <configuration>
    <environmentVariables>
      <ANGATU_DB_PATH>${project.build.directory}/test-data/database.db</ANGATU_DB_PATH>
      <ANGATU_ENV>development</ANGATU_ENV>
    </environmentVariables>
  </configuration>
</plugin>
```

Under `target/`, `mvn clean` wipes it and `.gitignore` already covers it. A suite that writes into the
development database corrupts the data you were about to demo.

### 3.2 Rate limiting will bite

The real rate limiter is running, because that is the point. A suite that hammers `/api/login`
20 times will start getting 429 — which is correct behaviour and a bad test failure. Either assert the
429 deliberately (it is worth one test), or give the test routes their own limit through
`JavalinAPI.setRateLimitingEnabled(false)` inside the harness when the suite is not testing limits.
Decide it once, in the harness, and write down which you chose.

### 3.3 Why not `javalin-testtools`

`io.javalin:javalin-testtools` exists for 7.2.2 and is a good tool — but it does not fit this stack.
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
  <version>5.10.2</version>
  <scope>test</scope>
</dependency>
```

That is the whole addition. The HTTP client is `java.net.http`, in the JDK since 11.

```bash
mvn test                      # as duas primeiras camadas
mvn test -Dtest=OrderCalculatorTest   # só a camada 1, em milissegundos
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
