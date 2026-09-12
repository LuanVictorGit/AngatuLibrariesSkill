# Persistence — Saveable

> Covers R9 (nothing in RAM) and R10 (only through `extends`). Section 4 is the procedure for
> porting a project from an older version of the library, and it is not optional: nothing there is a
> compile error.

SQLite `database.db` plus Gson — **one database per project**, in the application's working
directory, as it has always been. **There is no longer a full cache and no identity map:** every
lookup goes to the database and returns a new instance, and every change only exists after `save()`.

**The database format did not change:** table `(id TEXT PRIMARY KEY, data TEXT NOT NULL)`, written
with `INSERT OR REPLACE`. No new column, no `ALTER TABLE` — databases already in production keep
working, including with older versions of the library. What changed is in-memory behaviour and
concurrency: one HikariCP pool per application (it used to be one per entity class), WAL,
`busy_timeout`, and `IMMEDIATE` transactions.

---

## 1. The shape of an entity

```java
import br.com.angatusistemas.lib.database.Saveable;
import lombok.Getter; import lombok.Setter;

/**
 * Entidade de usuário persistida via Saveable.
 *
 * @author Angatu Sistemas
 */
@Getter @Setter
public class User extends Saveable {
    private String id;
    private String name;
    private String email;
    public User() {}
    @Override public String getId() { return id; }
}
```

Class names in English, Javadoc in PT-BR, `@author Angatu Sistemas` on every class (R12). Never
`Usuario` or `Produto`.

Table name is `SimpleName.toLowerCase()` + `s` (`User→users`, `Key→keys`). `transient` fields are not
persisted. New fields are backward compatible; use null-safe getters for collections. The constructor
is `protected` and the class is `abstract` — R10.

## 2. Reading and writing

```java
// create / store (atomic; last write wins)
User user = new User(); user.setName("João"); user.save(); // UUID when id == null

// read — always from the database, always a new instance
User found   = Saveable.findById(User.class, user.getId());
boolean has  = Saveable.exists(User.class, id);
long total   = Saveable.count(User.class);

// query by field: create the index once, at startup
Saveable.createIndex(User.class, "email");
Saveable.createIndex(User.class, "role");   // enum: index it too, and query by its name
User byEmail       = Saveable.findFirstByField(User.class, "email", "joao@exemplo.com");
List<User> byField = Saveable.findByField(User.class, "name", "João");
List<User> result  = Saveable.query(User.class,
        "SELECT data FROM users WHERE json_extract(data,'$.name')=?", "João");

// full-table scan — use it knowing the size
List<User> all      = Saveable.findAll(User.class);
List<User> filtered = Saveable.findByPredicate(User.class, x -> "João".equals(x.getName()));

// delete
user.delete(); Saveable.deleteById(User.class, id); Saveable.deleteAll(User.class);
user.reload();      // discards local changes and takes the current state
Saveable.shutdown(); // in the shutdown hook
```

**Enums and objects do not reach the SQL:**

```java
Saveable.findByField(User.class, "role", Role.ADMIN);        // scans the table in memory
Saveable.findByField(User.class, "role", Role.ADMIN.name()); // uses the index
List<User> page = Saveable.query(User.class,
        "SELECT data FROM users ORDER BY id LIMIT 100 OFFSET ?", 0);
```

Always use `?` placeholders in `Saveable.query`, never string concatenation.

## 3. Concurrency — the part that cannot be improvised

Routes, scheduled tasks and workers touch the same records at the same time. Choose by intent:

| Situation | Use | Behaviour |
|---|---|---|
| Store an object only you touch | `obj.save()` | Atomic; last write wins |
| Change a contested record (balance, stock, counter, list) | `Saveable.mutate(Class, id, obj -> …)` | Reads, changes and writes **in one transaction** — no lost update |
| Re-read before deciding | `obj.reload()` | Current state from the database, discarding uncommitted local changes |
| Two writes that must hold together | `Saveable.transaction(() -> {…})` | All or nothing; `computeInTransaction(...)` returns a value |
| Batch | `Saveable.saveAll(list)` | A single transaction |

```java
// WRONG on a contested record: between findById and save, another component writes and its change vanishes
User u = Saveable.findById(User.class, id); u.setCredits(u.getCredits() + 10); u.save();

// RIGHT
Saveable.mutate(User.class, id, x -> x.setCredits(x.getCredits() + 10));

// RIGHT: two writes that must hold together
Saveable.transaction(() -> { stock.save(); new Order(userId, productId).save(); });
```

**Stock and quantity checks belong inside the transaction**, not before it — otherwise the check is
made against a state that changes before the write lands. This is also where R22 meets R9: the
quantity comes from a hostile client, so it is validated server-side *and* applied atomically.

## 4. Consequences of having no cache

Read this before porting an older project.

- Changing an object without calling `save()` changes nothing for anyone — the old value stays in
  the database.
- `findById` twice returns **two different objects**. Do not compare with `==`, and do not expect a
  change in one to show up in the other.
- `findAll` / `findByPredicate` walk and deserialise the whole table. On a hot route, switch to
  `findByField` / `query` with an index.
- **A contested write loses updates.** Reading, changing and writing in separate steps overwrites
  whatever another component wrote in between. With the cache this never surfaced, because both
  sides held the same object.
- **`mutate` does not update the object you already had.** It writes and returns the new state; the
  caller still holds the previous copy. If a method takes the entity as a parameter and the caller
  reads fields from it afterwards, copy the stored state back.
- **Identity tests break.** `assertSame` between entities only passed because of the cache. Compare
  identifiers — which is what the business rule actually requires.
- The database itself did not change: custom queries still read `SELECT data FROM …`, and nothing
  needs migrating.

**Database in a container:** every project has its own `database.db`. On Coolify,
`ANGATU_DB_PATH=/data/database.db` (already in the template `Dockerfile`) points that project's
SQLite at its persistent volume. Without it the database dies on every deploy.
`Saveable.databasePath()` shows the path in use.

---

## 5. Porting a project from an older library version

> **The project will compile without a single change.** Nothing here is a compile error: these are
> behaviour changes. The system starts, the screens open, the unit tests pass — and the defect shows
> up in production, with two components touching the same record. Do this pass **before** calling the
> migration done.

**1. Find every contested write and convert it to `mutate`.** This is the expensive item; start here.

```bash
# where a record is read and written in separate steps
grep -rnE "findById\(|findFirstByField\(" --include="*.java" src/main/java | cut -d: -f1 | sort -u
# cross-reference with who writes: the same file in both lists is a candidate
grep -rn "\.save()" --include="*.java" src/main/java | cut -d: -f1 | sort | uniq -c | sort -rn
```

For each candidate ask: **who else writes to this record?** Convert when the answer includes a
scheduled job, a webhook (the provider retries until it is acknowledged), a WebSocket or another
route. A record touched by a single flow can stay on `save()`.

```java
// WRONG — writes the copy read earlier over what another component wrote in between
Invoice f = Saveable.findById(Invoice.class, id); f.setStatus(PAID); f.save();
// RIGHT
Saveable.mutate(Invoice.class, id, f -> f.setStatus(PAID));
```

**2. Do not rewrite the whole entity to change one field.** `save()` persists the complete object: a
`setLastAccessAt` written from a stale copy erases the edit another screen made in the meantime.
Inside `mutate`, change **only** the field that flow owns.

**3. A method that receives an entity must return the stored state.** `mutate` does not update the
caller's object. Copy the persisted state back, or the caller reads the previous state immediately
afterwards — and its test fails for a reason that looks unrelated.

**4. Decide inside the transaction, not before it.** An idempotency guard (`if (already paid) return;`)
read outside the `mutate` is worthless: the state changes between the read and the write. Move the
comparison inside the block and signal the result.

**5. Check what `mutate` returns.** It returns `null` when the record does not exist — and the change
simply did not happen, with no exception.

**6. An index for every queried field.** Without a cache, every lookup goes to SQLite.

```bash
grep -rhoE "findByField\([A-Za-z]+\.class, \"[a-zA-Z]+\"" --include="*.java" src/main/java | sort -u
```

Create a `createIndex` at startup for every pair that comes out of that. It is idempotent.

**7. Enums travel as text.** `findByField(X.class, "role", Role.ADMIN)` falls back to an in-memory
filter and reads the entire table; `Role.ADMIN.name()` reaches the SQL and uses the index.

**8. Identity tests break.**

```bash
grep -rn "assertSame" --include="*.java" src/test
```

**9. Startup and hosting.** The given port is the one used (there is no redirect to port 80 on
localhost any more) and TLS is no longer the application's job: read the port from `PORT`, remove any
request for HTTPS from Javalin, and create `Dockerfile`, `.dockerignore` and `GET /health` (R8). Also
fix whatever pointed at the old port — test scripts, `CLAUDE.md`, development URLs.

### The real case behind this procedure

A transport system in production: the billing routine ran hourly, and Mercado Pago retried the
payment notification until it was acknowledged. Both touched the same invoice. With the cache, both
mutated the same object and nothing happened. Without it, there was a window where the routine wrote
the previous state over the confirmation: **the invoice went back to pending and the account that had
just paid was blocked.** No unit test caught it — both flows passed in isolation.
