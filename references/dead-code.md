# Dead code and orphan files — cleaned up, with proof first

> Covers R32. A project carries no junk: unused classes, orphan files and leftovers from abandoned
> approaches are removed, so the next person reading the repository sees only what is alive.
>
> **But "unused" is a claim that has to be proven, not observed.** In this stack a live production
> endpoint has zero static references, and deleting by grep is how you take one down. This file is
> mostly about the proof, because the deletion is the easy part.

---

## 1. Why grep lies here

Three mechanisms in AngatuLibraries make a living thing look dead to a text search:

- **`Route` subclasses are discovered by reflection.** `org.reflections:reflections:0.10.2`
  (`backend-server.md`) scans the classpath for `extends Route` and registers what it finds. Nothing
  ever writes `new CreateUserRoute()`, so `grep -r CreateUserRoute` returns exactly one hit: the file
  itself. **That is what a healthy route looks like.**
- **`HtmlRouteAPI.registerAllRoutes` publishes every HTML file under `/public`** as a URL
  (`backend-server.md` 5.2). A page nothing links to is still a live address, possibly indexed,
  bookmarked or linked from outside.
- **`Saveable` entities** follow the same reflective pattern, and the SQLite table keeps its rows long
  after the class stops being referenced.

To which the frontend adds two more, already settled in `frontend-build.md`: a JS function called only
from an `onclick=` attribute, and a CSS class applied only by `classList.add()` or by the server
through `{%nome_active}`.

**This rule does not loosen any of that.** The dead-code and CSS sections of `frontend-build.md`
remain the authority for JavaScript and CSS, and they still forbid removing what merely *looks*
unused. R32 adds the procedure for everything else; it overrules nothing.

---

## 2. Band 0 — never removed, under any circumstance

- **The database.** `database.db`, its `-wal` and `-shm` companions, and any file `ANGATU_DB_PATH`
  points at. No `DROP TABLE`, no `DROP COLUMN`, no deleting rows in the name of tidiness. A column that
  no code reads is not junk — it is a record, and it may be the only copy.
- **User uploads and everything under `/data`.** A customer's file, an order photo, an attachment, a
  signed document. Orphaned in the code does not mean disposable: it may be a tax document or proof of
  delivery (`images.md`). The volume exists precisely because this data outlives deploys.

These two are not subject to proof. There is no evidence that makes them deletable — if the owner wants
data removed, that is a migration they ask for explicitly, not cleanup.

---

## 3. Band 1 — never silently: prove, list, ask

Everything reached by reflection, by URL, or by data. The agent may **propose**, never delete on its own
initiative. What the proof must cover, per candidate:

| Candidate | Why grep is not enough | What the proof requires |
|---|---|---|
| `extends Route` | found by `org.reflections` | no screen calls the URL, **and the owner confirms the endpoint is retired**. Whether an API is still in use is a product fact, not a code fact |
| `extends Saveable` | reflection, plus rows in the table | a decision about the existing data first — the class is the only thing that knows how to read those rows |
| `public/**.html` | auto-registered as a URL | retiring a public page is a **301 redirect**, not a delete (`landing-seo-og.md`). The URL may be indexed, linked by a third party, or saved by someone |
| Schema migration | already applied in production | deleting it breaks rebuilding the database from scratch |
| `emails/**`, `vendor/**`, `sw.js` | already build exclusions | same exclusion here, for the same reason: they are reached in ways the build cannot see |
| A class named in a string | `Class.forName`, a name in configuration or in a `.env` | the proof greps **string literals**, not just identifiers |

How to present it — a list, with the evidence and the gap, never a diff already applied:

```
Candidatos a remoção (R32, faixa 1) — nenhum foi apagado:

  routes/ExportLegacyRoute.java   GET /api/export-legacy
      nenhuma tela chama esta URL; o último commit que a tocou é de 2023.
      Falta: confirmar que nenhum cliente externo ainda consome o endpoint.

  public/promo-natal-2024.html    /promo-natal-2024
      campanha encerrada. Aposentar com 301 para /promocoes, não apagar.
```

---

## 4. Band 2 — removed in the same commit, no question asked

Provably dead **and** out of reach of reflection. The agent deletes these as part of the change that
orphaned them:

- **A class in `utils/` or `services/`** with no reference anywhere — not as an identifier, not inside a
  string literal — that does not extend `Route` or `Saveable`, does not live in `routes/` or
  `entities/`, and is not `Main`. These layers are pure by construction (R11), which is exactly what
  makes them safe to remove;
- **unused imports**, uncalled `private` methods, unread local variables;
- **commented-out code.** Git history is where old code lives. A commented block is a comment that
  lies — it looks like context and is actually debris;
- **the agent's own scratch files**: `.bak`, `-old`, `-copy`, `-v2`, `Teste2.java`, a file created to
  try something and never removed;
- **leftovers from an approach abandoned inside the current task.** If you wrote `OrderHelper`, then
  replaced it with `OrderCalculator`, `OrderHelper` does not survive the commit.

The proof for a `utils/`/`services/` class, in full:

```bash
# 1. nenhuma referência como identificador, em qualquer fonte
grep -rn '\bMoneyFormatter\b' --include='*.java' src/ | grep -v 'utils/MoneyFormatter.java'

# 2. nenhuma referência dentro de literal de string (reflexão por nome)
grep -rn '"[^"]*MoneyFormatter' --include='*.java' --include='*.json' src/ .env* 2>/dev/null

# 3. não é alcançada por reflexão
grep -n 'extends Route\|extends Saveable' src/main/java/**/MoneyFormatter.java
```

Three empty results, and the file is in `utils/` or `services/` — remove it. Any hit, and it is not
band 2; re-classify it.

### Scope discipline

Band 2 cleanup is **part of the change that created the orphan**, in the same commit, and it is
described in the commit body like any other change (R3). It is not a licence to tidy unrelated corners
of a repository while doing something else — the same boundary R19 draws when it installs a build
pipeline without rewriting the project (`frontend-build.md` 1.1). The one moment a wider sweep is
correct is section 5, and it happens once.

---

## 5. The first-use sweep

**On the first use of this skill in a project** — the same moment R1 writes the
`AngatuLibrariesSkill` block into `CLAUDE.md` — run one inventory of the whole repository. Once, not
every session.

1. **Remove band 2** — orphan utilities and services, commented-out blocks, stray `.bak` and `-old`
   files, build leftovers that are not gitignored.
2. **List band 1** with the evidence and the missing piece, as in section 3. Nothing is deleted.
3. **Do not touch band 0**, and say so, so the owner knows it was considered and excluded.
4. **Record the outcome in `CLAUDE.md`**, next to the other gate decisions, so the sweep is not
   repeated and the deferred items are not forgotten:

```markdown
### Decisões registradas deste projeto
- Limpeza inicial (R32): varredura feita em 2026-09-12 — removidos 4 utilitários órfãos e
  2 arquivos .bak. Faixa 1 pendente de decisão: ExportLegacyRoute (endpoint externo?) e
  promo-natal-2024.html (aposentar com 301). Banco e /data intocados.
```

After that entry exists, later sessions clean only what they touch (section 4).

### Before deleting anything: check whether git can get it back

```bash
git status --short <caminho>
```

**A committed file comes back from history. An untracked one does not.** If a file has never been
committed, it has no copy anywhere — treat it as band 1 regardless of what it looks like, and ask.
This matters most during the first-use sweep on a repository whose working tree you did not create.

---

## 6. Checklist

- [ ] Nothing under the database or `/data` was touched (band 0)
- [ ] Every band 1 candidate listed with its evidence, and **none deleted** without an explicit yes
- [ ] Public page retired with a 301, never deleted outright
- [ ] Band 2 removals proved with all three greps, including string literals
- [ ] Route and entity classes never judged by static references alone
- [ ] JS and CSS left to `frontend-build.md` (its dead-code and CSS sections) — R32 did not loosen it
- [ ] Untracked files checked with `git status` before removal
- [ ] Removals described in the commit body (R3), in the same commit as the change that orphaned them
- [ ] First-use sweep recorded in `CLAUDE.md` (R2), with the deferred items named
- [ ] `mvn test` green afterwards — the suite is what proves the removal broke nothing
      (`route-testing.md`)
