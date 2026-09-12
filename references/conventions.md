# Conventions — architecture, language, CLAUDE.md and commits

> Covers R2 (`CLAUDE.md` current), R3 (commits), R11 (clean architecture) and R12 (code English,
> docs Portuguese).

---

## 1. Well-architected code (R11)

Everything generated has to be well architected. It is not optional.

- **Extract utilities** whenever there is repetition: `utils/Validators.java`, `utils/Money.java`,
  `utils/AuditLog.java`, `utils/Auth.java`, `utils/EmailTemplates.java`. Never duplicate `byToken`,
  body parsing, e-mail or CPF validation, money and date formatting, or error responses across routes.
- **Separate the layers:** `entities/` (Saveable) → `services/` (business rules, no `Context`) →
  `routes/` (HTTP only, thin, delegating) → `utils/` (pure, testable). A route never contains pricing,
  stock or permission logic — it delegates.
- Prefer composition over inheritance; `final` classes when they are not meant to be extended; private
  constructors in utility classes.
- Name with intent (`CreateOrderService`, `OrderCalculator`, `TokenAuth`) and keep methods short
  (under 30 lines). If one grew, split it.

### 1.1 Optimisation

- Reuse `GsonAPI.get()` — never scatter `new Gson()`.
- Create `json_extract(data,'$.campo')` indexes for every field filtered or sorted frequently; use
  `LIMIT`/`OFFSET` for pagination.
- Avoid `findAll` plus an in-memory filter when a `query` solves it; avoid N+1 (fetch in batch).
- Validate input early (fail fast) and use the right `StatusCode` (400/401/403/404/409/422/429).
- Prefer `StringAPI`, `DataTime` and `Password` from the library over reinventing them.
- Log through `Console` at the right level; never log a secret, token or password.

## 2. Documentation

- **Every public class and method carries Javadoc** in the AngatuLibraries style: purpose, when to use
  and when not to, integrations, flow, pre- and post-conditions, side effects, and an example when it
  helps.
- Keep `README.md` and `CLAUDE.md` consistent with the code; document non-obvious decisions (why
  `perIp=false` on a given route, why a particular `json_extract` index exists).
- Self-explanatory code beats a redundant comment. Comment the "why", never the obvious "what".

## 3. Language of code and audit tag (R12)

- **Packages and classes ALWAYS in English.** Never Portuguese in `package`, `class`, `interface`,
  `enum`, methods or variables. Correct: `com.store.core`, `com.store.entities`, `com.store.routes`,
  `com.store.services`, `com.store.utils`; classes `User`, `Company`, `Order`, `Product`,
  `CreateUserRoute`, `ListOrdersRoute`, `UpdateProductRoute`, `AuthService`, `MoneyUtils`,
  `Validators`. Forbidden: `Usuario`, `CriarUsuario`, `CriarPedidoService`, `utils/Validadores`.
- **Javadoc and explanatory comments in Portuguese (PT-BR)**, following the library's own style. The
  code itself stays 100% English.
- **Every class carries the Angatu audit tag** at the top of its class Javadoc:

```java
/**
 * Serviço responsável por criar pedidos com cálculo de totais e validação de estoque.
 * <p>Valida entrada, calcula valores no backend e persiste via Saveable.</p>
 *
 * @author Angatu Sistemas
 */
public final class CreateOrderService {
}
```

Never create a class without `@author Angatu Sistemas`. In utilities, also describe when to use and
when not to, integrations, and an example — always in Portuguese.

> This is the boundary the skill's own translation does not cross. The skill is written in English;
> what it produces is not. See also R16 for user-visible text.

---

## 4. `CLAUDE.md` (R1, R2)

Keep `CLAUDE.md` at the project root always current. Any feature or fix that changes stack, structure,
startup (`AngatuLib`), routes, entities or environment variables is reflected in `CLAUDE.md` **in the
same commit**.

It carries two things: the `angatu-skill` block from section 3 of `SKILL.md` (R1), and the project's
own documentation. Template for the project part:

```markdown
# <Nome> — one-liner

## Stack
Java 21, AngatuLibraries <versão> (https://github.com/LuanVictorGit/AngatuLibraries), Javalin 7.2.2, SQLite/HikariCP/Gson

## Estrutura
src/main/java/com/company/store/{Main, entities/, routes/, services/, utils/}
src/main/resources/public/{index.html, styles/ds.css, scripts/, *.html}

## Como rodar
mvn package -DskipTests && java -jar target/<app>.jar   # http://localhost:8080

## Inicialização
new AngatuLib("loja.angatusistemas.com.br", port, true)  // port = env PORT, padrão 8080; HTTPS é do Coolify

## Deploy (Coolify)
Dockerfile na raiz · porta 8080 · volume /data (ANGATU_DB_PATH=/data/database.db) · GET /health

## Rotas / Entidades
- GET /health — HealthRoute
- POST /api/users — CreateUserRoute
- Saveable: User, Company, Key ...

## Env
EMAIL_KEY, DISCORD_BOT_TOKEN, TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY

## Convenções
Route/Saveable só via extends; handlers enxutos; json_extract com índices; ds.css única fonte visual.
```

---

## 5. Commits (R3)

> **`main` is production. Work in progress never goes there.**
>
> Every commit of current work goes to the **`development`** branch. `main` only receives what the
> project owner **explicitly confirms** can go to production — and that confirmation is always a
> sentence from them, never an inference that "the work looks done". Finishing the task, the tests
> passing and the server starting do **not** authorise the promotion.

- Messages in PT-BR, detailed (what + why + impact). Conventional Commits: `feat:`, `fix:`, `chore:`,
  `docs:`, `refactor:`, `perf:`.
- The body always carries bullets explaining each relevant change.
- **Never mention Claude, AI, "generated by AI" or `Co-Authored-By`.** The commit must read as fully
  human and authored by the project.
- **Always `git push`** to `development` after committing. Never `--no-verify` or `--no-gpg-sign`
  unless asked.

```bash
# Trabalho do dia — sempre na development
git checkout development 2>/dev/null || git checkout -b development
git add -A
git commit -m "$(cat <<'EOF'
feat: integra Web Push com VAPID persistido

- Adiciona PushBootstrap.setup() no Main (loja.angatusistemas.com.br, porta de PORT)
- Cria rota SalvarAssinatura que persiste Subscription via Saveable
- Trata SendResult.isExpired() removendo assinatura inválida
- Atualiza CLAUDE.md com fluxo de push e env vars

EOF
)"
git push -u origin development
```

**Promotion to production — only after confirmation.** When, and only when, the project owner says it
can go up:

```bash
git checkout main
git merge --no-ff development -m "release: <o que está subindo>"
git push origin main
git checkout development
```

If the repository does not have `development` yet, create it from `main` on the first change — do not
keep committing to `main` "just this once". A stray commit on `main` is exactly what pushes a
half-finished screen to production, and nobody notices until a user opens it.

Before editing a large file, validate balanced `{}` / `()`, and for JavaScript run
`node -e "new Function(fs.readFileSync(...,'utf8'))"`.
