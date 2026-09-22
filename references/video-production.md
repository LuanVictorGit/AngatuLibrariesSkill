# Video production with Remotion — start here

> Covers R37 and gate G5. **Start here for any video that is not a landing hero**: an ad, an
> explainer, an institutional piece, a product demo, a reel, a PHONK edit, the "+1 cliente satisfeito"
> post. The landing hero is `landing-motion.md` and keeps its own rules (muted, looping, budgets).
>
> The module, in the order a video meets it: `video-briefing.md` (G5) → `video-plan.md` →
> `video-motion.md` + `video-audio.md` + `video-phonk.md` → `video-review.md`. The measured
> instruments live in the skill's `tools/video/` and are copied into every project.
>
> **The code is the medium; the product is the audiovisual composition.** A video that compiles, renders
> and plays is not finished. It is finished when it matches the approved plan — looked at frame by frame,
> measured, and heard by the user.

---

## 1. Scope

| | Standalone video (this module) | Landing hero (`landing-motion.md`) |
|---|---|---|
| Sound | music, recorded voice, sound effects | none — rendered muted |
| Length | what the brief says | 8–15 s, looping |
| Output | an MP4 per platform, delivered | assets inside the application |
| Project | kept folder `~/Videos/Angatu/<cliente>-<peca>/` | studio kept outside the application |
| Angatu mark | asked in G5, every video | asked for the hero; the footer credit (R17) stays |
| Gate | G5 | G1, then the landing flow |

Borrowing between the two is fine in one direction: the hero may use this module's planning and review
discipline, but its own limits (muted, loop, weight budget) always win.

---

## 2. Who is working

Seven hats, one agent. Each owns a decision and signs an artifact:

| Hat | Owns | Signs |
|---|---|---|
| Director | what the viewer must understand and feel, and in what order | `docs/BRIEFING.md`, the theses |
| Designer | composition, type, palette, image treatment | the styleframes |
| Motion designer | movement vocabulary, easing, camera | the motion thesis, the components |
| Editor | rhythm: where every cut and hit sits on the time axis | `docs/PLANO.md`, `src/data/timeline.ts` |
| Sound designer | music use, effects, voice, the mix | the sound thesis, the cue sheet, the master |
| Remotion developer | data, components, determinism, render | the project, `tools/` passing |
| Reviewer | the loop that decides "done" | `docs/REVISAO.md`, the final checklist |

**Priority when they disagree** — the lower number wins: 1 planning · 2 direction · 3 rhythm ·
4 synchronisation · 5 composition · 6 animation · 7 audio · 8 review · 9 refinement. A beautiful
animation that breaks the rhythm loses; a perfect cut that contradicts the brief loses.

---

## 3. Iron rules

1. **G5 first.** The brief, then the theses, then the plan — each approved — before any Remotion file
   exists (`video-briefing.md`, `video-plan.md`).
2. **From scratch.** Every video is a new project created by `create-video --blank`. Never a copy of an
   earlier video, never a template from the Remotion gallery, never last month's components pasted in.
   What is copied are the instruments in `tools/video/` — they measure the video; they are not the video.
3. **The plan is data.** Scenes, beats, words and cues live in `src/data/`. Scenes, the effects bus, the
   checks and the review all read the same objects, so picture and sound cannot drift apart. No frame
   number is typed inside a scene.
4. **Time is derived, never written twice.** Frames come from seconds through one helper; cuts come from
   beat frames or word frames; the duration comes from the music or the narration.
5. **Motion comes only from `useCurrentFrame()`.** `tools/check-determinism.mjs` runs before every render.
6. **Text on screen** is impeccable PT-BR (R16), reads as written by a person (`landing-copy.md`), is at
   least 55 px on a 1080-wide frame, and sits inside the platform's safe zone.
7. **Nothing may look machine-generated** (R35, `anti-ai-design.md`). Every effect has a reason written in
   the plan; "it looked empty" is not a reason.
8. **No asset is ever invented.** A missing logo, screen, photo, number, testimonial, voice or track is
   named, and the work stops for it (`video-briefing.md`).
9. **Nothing is downloaded unasked**, and every third-party file has its licence in `docs/LICENCAS.md`.
10. **Voice and music are recorded files the user points to.** Generating them with AI would be an AI
    call, and R26 sends AI through AngatuCRM, which generates text only today — so it is not done. A
    local speech model installed on the machine is not a way around R26.
11. **The Angatu Sistemas mark is asked in G5 for every video**, suggesting yes. R17 governs pages and
    e-mails; this question governs videos.
12. **The API is the installed version.** Read `node_modules/**/*.d.ts` and the official Remotion skills
    installed in the project — never memory (`video-motion.md`).
13. **Done means the review loop closed** (`video-review.md`): "it compiled" and "it rendered once" are
    not done.
14. **Escalate instead of looping.** The same finding in two consecutive iterations, or a tool failing
    three times, stops the loop: show the evidence to the user and offer options.

---

## 4. The pipeline

| Phase | Hats | Reference | Artifact | Leaves the phase when |
|---|---|---|---|---|
| 1 Brief (G5) | Director | `video-briefing.md` | `docs/BRIEFING.md`, `out/site/`, `public/screens/` | the user confirms the summary |
| 2 Direction | Director, Designer | `video-plan.md` | three theses + 2–3 styleframes | the user approves |
| 3 Plan | Editor, Sound designer | `video-plan.md` | `docs/PLANO.md`, `src/data/*.ts` | `check-plan` passes and the user approves |
| 4 Build | Motion designer, Remotion developer | `video-motion.md`, `video-audio.md`, `video-phonk.md` | animatic first, then scene by scene | stills look right, determinism passes |
| 5 Render and review | Reviewer | `video-review.md` | `docs/REVISAO.md`, one entry per iteration | every measured item PASS, eye pass clean |
| 6 Final and delivery | Reviewer, Director | `video-review.md` | `entrega/` | final checklist yes, the user heard it |

**The animatic comes before the polish**: blocks with the scene name, on the real music or narration,
with the effects bus playing. Timing errors are cheap there and expensive after the motion is built.

**Checkpoints with the user**: the brief summary · the theses and styleframes · the plan · the first
full draft (listening) · the final.

---

## 5. The cycle — the skill's own discipline, not /goal

The improvement cycle of the brief is:

```
PLANEJAR → CRIAR → RENDERIZAR → ANALISAR → IDENTIFICAR PROBLEMAS → CORRIGIR → RENDERIZAR NOVAMENTE → …
```

It is this skill's discipline, written into `docs/REVISAO.md` — **not the harness's `/goal` command**,
which the owner decided not to use. At the start of phase 5 the objective is written at the top of
`REVISAO.md`, derived from `PLANO.md`; every iteration prints the evidence table; the stop condition and
the escalation live in `video-review.md`.

---

## 6. Where a video lives

```
~/Videos/Angatu/                     raiz do estudio
  CLAUDE.md                          fatos compartilhados: licenca do Remotion, caminhos, equipe
  _marca/                            logos oficiais da Angatu, retratos autorizados da equipe
  <cliente>-<peca>/                  um video: slug ASCII curto, sem espaco nem acento
    CLAUDE.md                        bloco R1 + ate 15 linhas apontando para docs/
    docs/                            BRIEFING.md  PLANO.md  REVISAO.md  LICENCAS.md  REFERENCIAS.md
    public/                          brand/ screens/ footage/ music/ voice/ sfx/ fonts/ audio/
    src/
      data/                          timeline.ts brand.ts music.ts narration.ts sfx.ts
      lib/                           motion.ts (easings, envelopes)
      components/                    Camera, SlamText, Flash, DeviceFrame, SafeArea, Guides...
      scenes/                        uma cena por arquivo
      Root.tsx  Main.tsx  index.ts
    tools/                           copiados de tools/video/ da skill
    out/                             renders, review/, site/, analysis/
    entrega/                         os arquivos finais
```

- **Never inside an application repository.** React, `node_modules` and renders do not belong in a
  Java project or its Docker image.
- **Keep the root path short.** Windows refuses to start a program whose path passes MAX_PATH (260
  characters), and Remotion's headless browser sits about 106 characters deep inside `node_modules`. A
  project root longer than about 150 characters fails at the first render with
  `spawn …chrome-headless-shell.exe ENOENT` — the file is there, the path is too long.
- **The studio root** (`~/Videos/Angatu/CLAUDE.md` and `_marca/`) is created on the first video, asking
  once for what every video shares: the Angatu logo files, the team portraits and their permission, the
  Remotion licence status, the local effects library. Claude reads parent `CLAUDE.md` files, so each
  video inherits it.
- **Git.** `create-video` runs `git init` and commits "Create new Remotion video". The folder keeps that
  local history and is never pushed anywhere; commits made there follow R31.
- **Retention.** After delivery only `node_modules` is deleted (about 750 MB, the headless browser
  included); `package-lock.json` stays. A revision reopens the folder, runs `npm ci` (the browser
  downloads again on the first render) and goes through the same loop as v2. "From scratch" applies to
  new videos, not to revisions of the same one.

---

## 7. Creating the project

Tested on this workstation (Node 24, npm 12, Remotion 4.0.527):

```bash
cd ~/Videos/Angatu
npx --yes create-video@latest --yes --blank --no-tailwind <cliente>-<peca>
cd <cliente>-<peca>
npm install
npm install-scripts approve esbuild        # o npm 12 bloqueia o postinstall do esbuild
V=$(node -p "require('remotion/package.json').version")
npm install -E "@remotion/media@$V" "@remotion/noise@$V" "@remotion/layout-utils@$V"   # so o que o video usa
npx remotion skills add                    # skills oficiais do Remotion (download: pedir ok)
mkdir -p tools && cp ~/.claude/skills/AngatuLibrariesSkill/tools/video/* tools/
```

Then, before the first scene:

- **Remove the Tailwind the blank template ships even with `--no-tailwind`**: `npm uninstall
  @remotion/tailwind-v4 tailwindcss`, drop `enableTailwind` from `remotion.config.ts`, delete
  `src/index.css` and its import. Animation classes do not render in Remotion, and the determinism check
  rejects them anyway.
- **`"type": "module"` in `package.json`** and **`"allowImportingTsExtensions": true` in
  `tsconfig.json`**: the tools import `src/data/*.ts` directly in Node 24, which strips the types.
- **Replace `remotion.config.ts`** with the one in `video-motion.md` (PNG frames, bt709, yuv420p, angle).
- Write `docs/BRIEFING.md` from G5 and the folder's `CLAUDE.md` (the R1 block, decisions that do not
  apply to a video marked "não se aplica", and a pointer to `docs/`).

Two traps: **`npx remotion add` fails on npm 12** with `EALLOWSCRIPTS` — install with `npm install -E`
and the same version as `remotion`; and **`create-video --yes` refuses to run inside an existing Git
repository** — one more reason the studio lives outside every repository.

**Preflight at the start of every video**: `node -v`; `ffmpeg -hide_banner -filters` lists
`blackdetect`, `freezedetect`, `ebur128` and `tile` (the FFmpeg bundled in Remotion does not — the review
needs the full build, `winget install Gyan.FFmpeg` with the user's OK); `python -c "import librosa,
faster_whisper, PIL"`; for Instagram references, Claude in Chrome connected to the user's browser.

---

## 8. The house rules on a video

**Apply**: R1 and R2 (the folder's `CLAUDE.md`), R11 and R12 (identifiers in English, comments in
PT-BR, `@author Angatu Sistemas` in file headers), R16, R26, R31 (the local history), R32 at delivery
(no leftovers), R35 — and the spirit of R4 and R5: the newest Remotion at creation, pinned exact, and
only the packages the video uses.

**Replaced**: R17 by the G5 question about the Angatu mark; R21 and R29 by the review loop; R13 by the
client's identity in `src/data/brand.ts`, taken from the URL research.

**Do not apply**, because nothing is served — the MP4 is the product: R7, R8, R9, R10, R14, R15, R18,
R19, R22 to R25, R27, R30, R33, R34, R36, and gates G1 to G4.

---

## 9. The Remotion licence

Free for individuals and for companies of up to three people; four or more need a Company License, and
renders triggered by scripts may be billed as automation (<https://www.remotion.pro/license>). Ask once,
record the answer in the studio root `CLAUDE.md`, and ask again when the team grows.

---

## 10. Warning signs

| The thought | The reality |
|---|---|
| "The user sent the music, I can start the scenes" | G5 first: brief, theses, plan. |
| "I have a nice project from the last video, I'll adapt it" | From scratch. Only `tools/video/` is copied. |
| "I'll type the cut at frame 94" | The cut comes from `beatFrame(n)`; typed frames go stale the moment the music moves. |
| "The effect lands where it sounds right" | It lands on the event's frame minus its measured anchor. |
| "It rendered, it's done" | Done is the review loop closed, with the user's ears on it. |
| "The beat looks right" | Measure it: `check-plan` and `review` print the frame differences. |
| "The client has no logo file, I'll redraw it" | Never. Ask for it; a missing asset stops the work. |
| "I'll generate the voice-over" | R26. Ask where the recorded narration is. |
| "Particles will make it feel richer" | Every effect needs a reason written in the plan (R35). |
| "Zoom on every photo" | That is the generic look. Vary by role; hold still when it matters. |
| "The FFmpeg inside Remotion is enough" | Not for review: it lacks `freezedetect`, `ebur128`, `tile`. |
| "Same failure again, one more try" | Two iterations with the same finding means escalate, with evidence. |
| "I'll put the studio next to the app" | Outside every repository, with a short path. |
| "The reference looks great, I'll copy its text" | Direction, not content (`video-phonk.md`). |

---

## 11. Done

The criteria are in `video-review.md`. In one line: the render matches the approved plan, measured and
looked at, the user has heard it, and the delivery files exist and were verified.

---
*Original source: the Remotion Motion Graphics brief of Angatu Sistemas, and the lessons of Angatu's own Remotion studios · written and audited by Angatu Sistemas*
