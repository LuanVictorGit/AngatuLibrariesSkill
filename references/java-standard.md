# Java standard — Java 25, performance first, production grade

> Covers R11 (architecture), R12 (language and documentation), R38 (Java 25), R39 (performance) and
> R40 (production quality). It applies to every line of Java the skill writes or edits, tests
> included. The library's APIs live in the `backend-*.md` references; this file says how the code
> around them is written. Section 7 is the whole standard in one working slice.

---

## 1. Priorities

When two concerns pull apart, the lower number wins:

1. **Correct** — under concurrency too (R9, 5.3).
2. **Secure** — the client is hostile (R22, R23).
3. **Efficient by design** — the query, the data structure, the I/O and the algorithm are chosen
   before the first line is written (section 4). This costs no readability and is never postponed.
4. **Readable** — intent-revealing names, short methods, one obvious way to do each thing.
5. **Micro-optimised** — only with a measurement, and only where it points (4.5).

"Performance first" is item 3, applied every time. It is never a licence for item 5 without numbers.

## 2. Java 25 (R38)

**Target.** Every project compiles with `<maven.compiler.release>25</maven.compiler.release>` and runs
on `eclipse-temurin:25-jre` — the build in `backend-server.md` 1.1, the image in `deploy-coolify.md` 2.
The library is compiled for Java 21 and runs unchanged on 25.

**Stable features only.** `--enable-preview` and `jdk.incubator.*` stay out of the build. In Java 25
that rules out `StructuredTaskScope`, `StableValue`, primitive types in patterns, the PEM API and the
Vector API. The one way in is a written justification the project owner approves, recorded in
`CLAUDE.md` — and the code moves to the final API, or out, when the feature leaves preview.

A modern feature is used where it pays, not because it is new:

| Feature | Use it for | Not for |
|---|---|---|
| `record` | every immutable carrier: request and response bodies, value objects, service outcomes, configuration | `Saveable` entities — they extend a class and are mutable by design |
| `sealed` interface + records | a closed set of outcomes (`Placed`, `OutOfStock`, `UnknownProduct`) | an open extension point |
| pattern `switch`, record patterns, `_` | branching on a sealed type exhaustively, **without `default`**, so a new case fails to compile instead of falling through | `instanceof` chains |
| `var` | locals whose type is obvious on the right-hand side | fields, parameters, a type the reader must guess |
| text blocks | SQL and multi-line templates | |
| `List.of`, `Map.of`, `List.copyOf`, `Stream.toList()` | immutable collections and defensive copies | |
| `getFirst()`, `getLast()`, `reversed()` | sequenced collections, instead of index arithmetic | |
| virtual threads, `Gatherers.mapConcurrent` | blocking I/O fanned out inside one request (4.4) | CPU-bound work; anything pooled |
| `ScopedValue` | implicit context through code you do not own | a value that can be a parameter |
| `HashMap.newHashMap(n)` | a map whose final size is known | |

`Main` keeps `public static void main(String[] args)`: compact source files and instance `main` are
for scripts. Imports are explicit, one type per line — no wildcard, no `import module`, and no fully
qualified name in code where an import works.

**Runtime.** The image turns on compact object headers (`-XX:+UseCompactObjectHeaders`, a product
feature since 25: a smaller heap and fewer collections for object-heavy work), and the JAR manifest
carries `Enable-Native-Access: ALL-UNNAMED`, because `sqlite-jdbc` loads native code and Java 24+
warns about it — a future release refuses it.

**Lombok** is allowed for one thing: `@Getter` and `@Setter` on entities. Records replace `@Value`,
`@Data` and `@Builder`; `@SneakyThrows` and `val` are never used. Since JDK 23, javac no longer
discovers annotation processors on the classpath, so Lombok is declared in `annotationProcessorPaths`
(`backend-server.md` 1.1) — without it, every getter is a compile error. On JDK 25, Lombok 1.18.44
prints a `sun.misc.Unsafe` deprecation warning while compiling: it is Lombok's own, harmless today, and
one more reason its use stays this narrow.

## 3. Structure (R11)

### 3.1 Packages and layers

```
src/main/java/com/company/store/
├── Main.java     startup only (backend-server.md 5.1)
├── entities/     extends Saveable: data and its invariants
├── services/     business rules; never sees Context
├── routes/       extends Route: HTTP only, plus the HTTP helpers the routes share (Guard, JsonBody)
└── utils/        pure, project-agnostic helpers; no Saveable, no Context
```

Dependencies point one way: `routes → services → entities`, and `utils` is used by all and uses none.
The base package is the reverse domain plus the project (`com.company.store`); there is no `core`,
`common`, `helpers`, `managers` or `impl` package.

**A layer exists only when it has a job.** A route that returns one record the session owns calls
`Saveable` directly. The moment a rule appears — a price, a stock check, a state transition, a
permission beyond ownership — it moves to a service, and every route that needs it calls that
service. A pass-through service, an interface with a single implementation, an abstract base for two
routes, a generic framework "for later": none of them are written.

### 3.2 Names

| Kind | Rule | Examples |
|---|---|---|
| Entity | singular noun, no suffix | `Order`, `User` — never `OrderEntity` |
| Route | `<Verb><Resource>Route`; `List`, `Get`, `Create`, `Update`, `Delete`, or the domain verb | `ListOrdersRoute`, `CreateOrderRoute`, `CancelOrderRoute`, `HealthRoute` |
| Service | `<Resource>Service` for one entity's rules; a flow across entities is named after the flow | `OrderService`, `CheckoutService` |
| Utility | its subject, plural when it groups checks; never `Utils`, `Helper` or `Manager` | `Money`, `Validators`, `Slugs` |
| HTTP helper | what it does at the boundary | `Guard`, `JsonBody` |
| Request and response body | a record nested in the route that owns it | `Body`, `Created` |
| Exception | `<Problem>Exception`, unchecked, only for what the caller cannot branch on | `ProviderUnavailableException` |
| Method | a verb; `is`/`has`/`can` for booleans; `find…` returns `Optional`, `require…` returns or refuses; `of`/`from` build | `findOwned`, `requireAccount`, `isExpired` |
| Constant | `UPPER_SNAKE_CASE`, `static final` | `MAX_QUANTITY` |
| Enum constant | English `UPPER_SNAKE_CASE`; the label a person reads is a field | `PAID("Pago")` |
| Test | `<Class>Test`; each method states a behaviour | `refusesQuantityAboveStock` |

### 3.3 Shape of a class

- `final` unless it is designed for extension — entities and routes included. One top-level type per
  file.
- Services and utilities are stateless: `final`, a `private` constructor, `static` methods — the
  library's own style (`Saveable`, `JavalinAPI`, `Task`). There is no dependency-injection container
  and no instance to wire.
- Visibility as narrow as works: `private`, then package-private, then `public` for what another
  package calls.
- Member order: constants, static fields, instance fields, constructors, public methods, private
  methods, nested types.
- One job per method. A method past ~30 lines is doing two. One statement per line.
- A route's constructor is `public` and takes no arguments: the library instantiates it by reflection.

### 3.4 Reuse first, duplicate nothing

Before writing, look in this order: **AngatuLibraries** (`Console`, `GsonAPI`, `Env`, `Password`,
`StringAPI`, `DataTime`, `Task`, `Request`, `IP`, `EmailAPI`, `ImageAPI`…), **the project's own code**,
**the JDK** — and only then **a new dependency**, with its reason in the commit body and in `CLAUDE.md`
(R5).

**Duplication is duplicated knowledge.** The second copy of a rule, a validation, a query, a format or
an error mapping is the signal to extract it — in the same commit that would have created the copy,
removing whatever the extraction orphaned (R32). Code that merely looks alike but changes for
different reasons is not duplication; merging it couples what must stay apart.

**One serializer.** JSON is read and written with `GsonAPI.get()` — `ctx.json(GsonAPI.get().toJson(x))`
and `GsonAPI.get().fromJson(...)`. `ctx.json(object)` and `ctx.bodyAsClass(...)` go through Javalin's
Jackson mapper, which this stack does not ship; when another module drags Jackson in (JDA does), it
serialises differently from Gson. `ctx.json(String)` writes the string as it is.

## 4. Performance (R39)

The choices below are made every time, before the code exists. They are what "performance first"
means here.

### 4.1 The database is the first cost

- **Query, never scan.** `findByField` / `query` on an indexed field, with `createIndex` at startup for
  every field that is filtered or sorted (`backend-persistence.md`). `findAll` and `findByPredicate`
  read and deserialise the whole table.
- **No N+1.** Collect the ids, fetch once, look up in a map:

```java
List<String> ids = orders.stream().map(Order::getProductId).distinct().toList();
String marks = String.join(",", Collections.nCopies(ids.size(), "?"));
Map<String, Product> products = Saveable.query(Product.class,
                "SELECT data FROM " + Saveable.tableName(Product.class) + " WHERE id IN (" + marks + ")",
                ids.toArray())
        .stream()
        .collect(Collectors.toMap(Product::getId, Function.identity()));
```

- **Every list a client asks for is paginated**: `LIMIT ? OFFSET ?`, with a page size the server caps.
- **Nothing slow inside `transaction` or `mutate`**: they hold the single write turn (R9). Network
  first, then the write. Batches go through `Saveable.saveAll(list)` — one transaction, not one per row.

### 4.2 I/O and external calls

- **One read per fact per request.** Pass the entity already loaded instead of reading it again by id —
  except a contested record, which is re-read inside `mutate` on purpose (R9).
- **Stream what is large.** A file goes out through `ctx.result(InputStream)`, never read whole into a
  `byte[]`; uploads are bounded (`security.md` 7).
- **Do later what the response does not need.** It goes to `Task.runAsync` and the route answers 202;
  e-mail and Web Push already queue on their own.
- **External HTTP goes through `Request`**, which carries timeouts and body caps. A call per item in a
  loop is a design error when the provider has a batch endpoint.
- **I/O is never saved with a cache (R25).** Content comes from its source on every request. A value
  derived from code alone — a compiled `Pattern`, a lookup table — is a constant, not a cache (4.3).

### 4.3 Data structures and allocation

- Lookups by key use a `HashMap` or `HashSet` built once — never a loop inside a loop over two lists.
- `ArrayList` and `ArrayDeque`; never `LinkedList`, `Vector`, `Stack` or `Hashtable`. `EnumMap` and
  `EnumSet` for enum keys. Presize when the size is known: `new ArrayList<>(n)`, `HashMap.newHashMap(n)`.
- What does not change per request is built once, in a `static final`: a compiled `Pattern` (never
  `String.matches` or `replaceAll` with a regex on a request path), a `DateTimeFormatter`, a lookup
  table. Reuse `GsonAPI.get()`; never `new Gson()`.
- `StringBuilder` for concatenation in a loop; `String.join` or `Collectors.joining` for lists.
- Primitives on hot paths: `int`, `long`, `mapToInt(...).sum()` — not boxed collections.
- Streams are welcome for clarity; a plain loop replaces one only where a measurement says so.

### 4.4 Concurrency and scale

- **Requests run in parallel, and nothing may serialise them.** No `synchronized` around I/O or around
  one shared lock: consistency of data comes from `Saveable.mutate` and `transaction`, not Java locks.
- **Independent blocking calls inside one request run concurrently on virtual threads, bounded:**

```java
List<Response> quotes = carriers.stream()
        .gather(Gatherers.mapConcurrent(4, carrier -> Request.query("GET", carrier.quoteUrl())))
        .toList();
```

  An explicit executor is opened in try-with-resources, whose `close()` waits for every task:
  `try (var executor = Executors.newVirtualThreadPerTaskExecutor()) { … }`. Virtual threads are never
  pooled; a downstream with a limit is protected by a `Semaphore`, not by a small pool.
- **CPU-bound and background work goes to `Task`**, which the library drains on shutdown — an ad-hoc
  thread is not drained.
- **Shared counters** use `LongAdder`; **shared maps** use `ConcurrentHashMap` with `computeIfAbsent`
  or `merge`, never get-then-put; **a snapshot replaced as a whole** (the DROP list, R34) is an
  immutable object behind an `AtomicReference`, swapped in one write.

### 4.5 Measure before trading readability

Every request already logs its `TIME=` (`backend-server.md` 6.4) — the first measurement, and usually
the only one needed. A micro-optimisation that makes the code harder to read ships only with a
before-and-after measurement on realistic data (a JMH benchmark or a timed run), recorded in the commit
body. Without numbers, the readable version stays.

## 5. Production quality (R40)

### 5.1 Errors are decided once, in one place

A route never catches `Exception`. A refusal is a thrown Javalin `HttpResponseException` — the
library's request log passes it through as an ordinary status, not as an error. Anything else that
escapes is a defect: Javalin answers 500 and logs the stack trace, and the request log marks
`ERROR=<Type>`.

| Situation | How | Status |
|---|---|---|
| No session | `Guard.requireAccount(ctx)` throws `UnauthorizedResponse` (`security.md` 3) | 401 |
| Malformed or invalid input | `JsonBody.read(...)` (section 7), then `throw new BadRequestResponse("…")` | 400 |
| Missing, or owned by another account | `.orElseThrow(NotFoundResponse::new)` — never 403 (R22) | 404 |
| Business refusal (stock, state) | a sealed outcome from the service, mapped in an exhaustive `switch` | 409, 422 |
| A provider is down | `Request` reports `isNetworkError()`; the route throws `ServiceUnavailableResponse` | 503 |
| Bug or broken invariant | `IllegalStateException` / `IllegalArgumentException` with an English message, never caught | 500 |

- **A refusal's message is read by the person on the screen**: PT-BR, one sentence, no internals
  (R16). An internal exception's message is for developers: English, with the ids needed to act and
  never a secret.
- **Catch the narrowest type, and only where something useful happens** — a translation into a refusal
  (`JsonBody` turns malformed JSON into a 400), a fallback, a cleanup. A route that answers a failure
  with a fallback of its own calls `JavalinAPI.markRequestError(ctx, e)`, so the request log still
  shows it.
- **Never swallow** (`catch (…) {}`), never log and rethrow (one failure, one log line), never use an
  exception for an expected outcome — the caller branches on a return type (`Optional`, a sealed
  outcome).
- **`InterruptedException` is never swallowed**: restore the flag with
  `Thread.currentThread().interrupt()` and stop.

### 5.2 Resources

- Everything `AutoCloseable` the code opens is closed by try-with-resources: streams, readers,
  `ExecutorService` (its `close()` waits for its tasks), `HttpClient`, a hand-written JDBC object.
- What the library owns, the library closes — the server, `Task` and the database, in its own shutdown
  hook (`backend-server.md` 5.2). Never `Task.shutdown()` or `Saveable.shutdown()` in a hook of yours.
- Every wait has a deadline: `Request` has one; `Future.get`, `Semaphore.tryAcquire` and `join` take
  one.

### 5.3 Thread safety

- **A `Route` is instantiated once and serves every request at the same time.** It holds no mutable
  state: no instance field that changes, no `static` field that is not an immutable constant. The same
  holds for services and utilities.
- An entity instance belongs to the request that loaded it (`Saveable` returns a fresh copy every
  time): never kept in a static field, never shared between threads.
- Shared mutable state is rare and explicit — a concurrent structure or an immutable snapshot (4.4).
  Never a `HashMap`, an `ArrayList` or a `SimpleDateFormat` shared between threads.

### 5.4 Immutability and contracts

With Javadoc on the class only (R12), a method's signature is its whole contract, so it says
everything:

- Records for data, `final` fields, collections copied on the way in (`List.copyOf`) and returned
  unmodifiable (`Stream.toList()`).
- **Absence is explicit.** `Optional<T>` is the return type when "not found" is normal (`findOwned`) —
  never a field or a parameter, never `get()` without a check (`orElseThrow`). A collection is never
  `null`, only empty. The library's `findById` returns `null`; wrap it once, at the service boundary.
- Parameters are non-null unless the name says otherwise. Input from outside is validated at the
  route; an internal method that a `null` would break far from the cause checks with
  `Objects.requireNonNull`.
- **Types carry meaning**: an enum for a closed set, a sealed outcome for a result, a record for a
  pair — never `Map<String, Object>` as a domain type, never a `boolean` argument that selects behaviour.
- **Money is `BigDecimal`**, built from a `String` or `BigDecimal.valueOf` — never `double`, never
  `new BigDecimal(double)`. Timestamps are stored as `Instant`; `DataTime` formats them for display.

### 5.5 Security in the code

The rules are in `security.md` (R22, R23). In Java they become: `?` placeholders in every
`Saveable.query`, never concatenated input; a request body parsed into a record that lists exactly the
accepted fields, never onto an entity; tokens from `SecureRandom` (`StringAPI.randomCode`); secrets
compared with `MessageDigest.isEqual`; no secret, token or personal data in a log line or an exception
message; a path from outside normalised and checked against its base folder.

## 6. Documentation and language (R12)

### 6.1 One Javadoc block per file, on the class

Every `.java` file — tests included — has exactly one Javadoc block, directly above its top-level type.
An enum, record or interface that is the top-level type of its file counts as the class. Annotations go
between the block and the declaration.

```java
/**
 * Places orders: prices them from the database and reserves stock in the same transaction.
 *
 * @author Angatu Sistemas
 */
public final class OrderService {
```

- One to three sentences in English on what the type is for — its responsibility, not a walk through
  its code. No HTML, no `{@link}` catalogue, and no tag except `@author Angatu Sistemas`, which is
  always the last line.
- **Nothing else carries Javadoc**: no constructor, method, field, constant, enum constant, record
  component, nested type (class, interface, enum or record), `package-info.java` or `module-info.java`.
  A method's contract lives in its signature (5.4).

### 6.2 Comments

A `//` comment states a *why* the code cannot show: a constraint, a trade-off, a workaround and its
reason. It never narrates what the next line does. No section banners, no commented-out code (R32),
no `TODO` or `FIXME` in delivered code.

### 6.3 English code, Portuguese product

| In English | In Brazilian Portuguese (R16) |
|---|---|
| packages, types, methods, fields, variables, parameters, constants, enum constants | what the end user reads: pages, e-mails, WhatsApp and push messages, PDFs |
| JSON keys of the API and of `Saveable` fields; path and query parameters; template placeholders (`{{name}}`) | the message of an `HttpResponseException` the screen displays |
| `/api/...` paths, environment and configuration keys | the URL of a public page (`/sobre`, `/servicos/{slug}`) |
| log lines, exception messages, comments, Javadoc, test names | the label of an enum constant shown on screen (`PAID("Pago")`) |

Values are data, not code: a customer named "João" in a test stays João. Commit messages and the
project's `CLAUDE.md` / `GEMINI.md` are not code either — they stay in PT-BR (R3, R2).

## 7. The standard in one piece

A complete slice written to every rule above, with package and imports in full — the other examples in
this skill show only the imports that locate a library class.

```java
package com.company.store.entities;

import br.com.angatusistemas.lib.database.Saveable;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/**
 * A customer order, priced and stamped by the server when it is placed.
 *
 * @author Angatu Sistemas
 */
@Getter
@Setter
public final class Order extends Saveable {

    private String id;
    private String tenantId;
    private String productId;
    private int quantity;
    private BigDecimal total;
    private Instant createdAt;
}
```

```java
package com.company.store.services;

import br.com.angatusistemas.lib.database.Saveable;
import com.company.store.entities.Account;
import com.company.store.entities.Order;
import com.company.store.entities.Product;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * Places orders: prices them from the database and reserves stock in the same transaction.
 *
 * @author Angatu Sistemas
 */
public final class OrderService {

    private OrderService() {
    }

    public static BigDecimal total(Product product, int quantity) {
        return product.getPrice().multiply(BigDecimal.valueOf(quantity));
    }

    public static Placement place(Account account, String productId, int quantity) {
        return Saveable.computeInTransaction(() -> {
            Product product = Saveable.findById(Product.class, productId);
            if (product == null || !product.getTenantId().equals(account.getTenantId())) {
                return new UnknownProduct();
            }
            if (product.getStock() < quantity) {
                return new OutOfStock(product.getStock());
            }
            product.setStock(product.getStock() - quantity);
            product.save();
            return new Placed(newOrder(account, product, quantity));
        });
    }

    private static Order newOrder(Account account, Product product, int quantity) {
        Order order = new Order();
        order.setTenantId(account.getTenantId());
        order.setProductId(product.getId());
        order.setQuantity(quantity);
        order.setTotal(total(product, quantity));
        order.setCreatedAt(Instant.now());
        order.save();
        return order;
    }

    public sealed interface Placement {
    }

    public record Placed(Order order) implements Placement {
    }

    public record OutOfStock(int available) implements Placement {
    }

    public record UnknownProduct() implements Placement {
    }
}
```

```java
package com.company.store.routes;

import br.com.angatusistemas.lib.connection.StatusCode;
import br.com.angatusistemas.lib.gson.GsonAPI;
import br.com.angatusistemas.lib.javalin.routes.Route;
import br.com.angatusistemas.lib.javalin.routes.RouteType;
import com.company.store.entities.Account;
import com.company.store.entities.Order;
import com.company.store.services.OrderService;
import com.company.store.services.OrderService.OutOfStock;
import com.company.store.services.OrderService.Placed;
import com.company.store.services.OrderService.UnknownProduct;
import io.javalin.http.BadRequestResponse;
import io.javalin.http.ConflictResponse;
import io.javalin.http.Context;
import io.javalin.http.NotFoundResponse;
import java.math.BigDecimal;

/**
 * POST /api/orders: places an order for the signed-in account.
 *
 * @author Angatu Sistemas
 */
public final class CreateOrderRoute extends Route {

    private static final int MAX_QUANTITY = 100;

    public CreateOrderRoute() {
        super("/api/orders", RouteType.POST, CreateOrderRoute::handle);
    }

    private static void handle(Context ctx) {
        Account account = Guard.requireAccount(ctx);
        Body body = JsonBody.read(ctx, Body.class);
        if (body.productId() == null || body.quantity() < 1 || body.quantity() > MAX_QUANTITY) {
            throw new BadRequestResponse("Escolha um produto e uma quantidade entre 1 e " + MAX_QUANTITY + ".");
        }

        switch (OrderService.place(account, body.productId(), body.quantity())) {
            case Placed(Order order) -> ctx.status(StatusCode.CREATED.code())
                    .json(GsonAPI.get().toJson(new Created(order.getId(), order.getTotal())));
            case OutOfStock(int available) -> throw new ConflictResponse("Só há " + available + " em estoque.");
            case UnknownProduct _ -> throw new NotFoundResponse("Produto não encontrado.");
        }
    }

    private record Body(String productId, int quantity) {
    }

    private record Created(String id, BigDecimal total) {
    }
}
```

```java
package com.company.store.routes;

import br.com.angatusistemas.lib.gson.GsonAPI;
import com.google.gson.JsonParseException;
import io.javalin.http.BadRequestResponse;
import io.javalin.http.Context;

/**
 * Reads a JSON request body into a record, turning malformed or missing input into a 400.
 *
 * @author Angatu Sistemas
 */
public final class JsonBody {

    private JsonBody() {
    }

    public static <T> T read(Context ctx, Class<T> type) {
        T body;
        try {
            body = GsonAPI.get().fromJson(ctx.body(), type);
        } catch (JsonParseException e) {
            throw new BadRequestResponse("Os dados enviados estão em um formato inválido.");
        }
        if (body == null) {
            throw new BadRequestResponse("Nenhum dado foi enviado.");
        }
        return body;
    }
}
```

What the slice shows: the price comes from the database and the body record has no field for it
(R22); stock is checked inside the transaction (R9); the route maps a sealed outcome without `default`;
refusals are thrown and carry PT-BR text, while everything else is English; one Javadoc block per file.

## 8. Review checklist

- [ ] `release 25`, no preview or incubator flag; Lombok only as `@Getter`/`@Setter` on entities.
- [ ] One Javadoc block per file, on the top-level type, in English, ending in `@author Angatu Sistemas`;
      none anywhere else.
- [ ] No Portuguese in identifiers, comments, log lines or exception messages; PT-BR only in what the
      end user reads.
- [ ] Every rule exists once — no copied validation, query, format or mapping — and nothing was left
      orphaned (R32).
- [ ] No pass-through layer, no single-implementation interface, no speculative abstraction.
- [ ] No N+1, no scan where an indexed query works, lists paginated, nothing slow inside `transaction`
      or `mutate`.
- [ ] Patterns, formatters and tables in `static final`; `GsonAPI.get()` only; collections presized
      when the size is known.
- [ ] Routes and services hold no mutable state; shared state is concurrent or an immutable snapshot.
- [ ] Refusals thrown as `HttpResponseException`; no `catch (Exception …)` in a route; nothing
      swallowed; one log line per failure.
- [ ] Every `AutoCloseable` in try-with-resources; every wait has a deadline.
- [ ] Records for data, `Optional` for absence, sealed outcomes for results, empty collections instead
      of `null`, `BigDecimal` for money.
- [ ] Every micro-optimisation that costs readability has its measurement in the commit body.
