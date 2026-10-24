# Efficient command execution — a mandatory module of every CLAUDE.md

> Covers R44. Every project's `CLAUDE.md` carries the module of section 2, right after
> the AngatuLibrariesSkill block of `SKILL.md` section 3, between its own markers. It reaches every
> session through the file the agent re-reads, the same way the block does (R1).

---

## 1. Where it goes and how it is kept

- **Right after the block, never inside it**, between its own markers. What sits inside the markers is
  copied as it is — same words, same English: it is the owner's module, not a summary to rewrite.
- **Kept current like the block.** At the start of every session, after syncing this skill (R1), compare
  the project's copy with section 2; if they differ, replace it between the markers and say so in one
  line.
- Everything outside the markers belongs to the project.

## 2. The module

```markdown
<!-- AngatuCommandExecution:begin — não remover -->
## Efficient Command Execution

Optimize all terminal commands for execution speed and minimal waiting.

### Build and Tests
- Never run a full build or complete automated test suite after every code change.
- Prefer targeted tests related to the modified classes or modules.
- Run the full build and complete test suite only when necessary, especially before final delivery.
- Never repeat an identical build or test command unless the previous result is insufficient or the code has changed.
- Reuse existing build outputs and incremental compilation whenever supported.
- If a build or test suite is expected to take a long time, run it in the background when supported and continue independent tasks.
- Do not wait for unrelated builds or tests to finish before proceeding with other work.
- If a command repeatedly fails or exceeds its expected duration, stop and investigate instead of rerunning it blindly.

### Logs and Output
- Never print entire large log files unless strictly necessary.
- Read only the most recent relevant lines.
- Filter logs for ERROR, WARN, Exception, stack traces, and the specific issue being investigated.
- Never use continuous log-following commands such as `tail -f` or
  `Get-Content -Wait` unless explicitly required.
- Avoid repeated polling that produces no new information.
- Never rerun an expensive command merely to obtain cleaner output.

### Execution Limits
- Do not intentionally run foreground commands for longer than 10 minutes.
- Prefer short diagnostic commands with bounded output.
- Set explicit timeouts whenever the command supports them.
- If a command reaches its timeout, narrow the task or split it into
  smaller operations instead of blindly increasing the timeout.
- Before executing an expensive command, determine whether its result
  is actually necessary for the current task.

### Verification
- Choose the cheapest verification that provides sufficient evidence.
- Separate compilation errors, test failures, and runtime errors.
- Run a full verification before delivery when technically necessary.
- Never claim that a build or test passed without checking its result.
<!-- AngatuCommandExecution:end -->
```

## 3. How its words map onto this stack

The module agrees with the rules already in this skill; this is what it means in an Angatu project:

- **Targeted tests** are the service tests and the route tests of what changed —
  `mvn test -Dtest=OrderServiceTest` (`route-testing.md`). **The full build** — `mvn package`, the JAR
  and the container — is R29's gate before delivering and deploying, never the inner loop.
- **Incremental work** stays on the JVM (`mvn exec:java`, `target/classes`); `docker build` runs only
  before a deploy (R8).
- **Long runs go to the background**: the full suite, `docker build`, a video render (R37), a protected
  frontend build.
- **Logs**: the request log already marks what failed — `STATUS=5xx`, `ERROR=<Type>`
  (`backend-server.md` 6.4). Filter for those lines instead of reading the whole output.
