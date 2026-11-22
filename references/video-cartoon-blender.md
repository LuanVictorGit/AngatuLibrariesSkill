# Cartoon-style motion video — animated in Blender with blender-skills (R48)

> Covers R48. When a motion video is **animated in a drawing style** — cartoon, desenho animado, anime,
> cel-shaded, comic, characters or scenes that look drawn rather than flat UI motion — the animation is
> made in **Blender** following the **blender-skills** collection
> (<https://github.com/EL4CTEO/blender-skills>, MIT). Everything else in R37 still holds: G5, the approved
> plan as data, the Remotion Studio open while it is built, the review loop. Every sound is R47 (Mirli +
> audio-analyzer).

---

## 1. When it applies

G5 asks the visual style of every video (`video-briefing.md`). The answer decides:

| Style | Built in |
|---|---|
| Flat motion graphics, UI screens, kinetic type, the Angatu "+1 cliente" language | Remotion only (`video-motion.md`) |
| **Estilo desenho** — cartoon, anime, cel shading, drawn characters, a drawn world | **Blender + blender-skills** for the animated shots, Remotion for the edit |

A mixed video is split per shot in the plan: each scene in `docs/PLANO.md` names its engine.

## 2. Setup — checked at the start, done when missing

- **Blender 5.2 LTS or newer** (5.3 recommended by the collection). On this workstation:
  `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe` (5.2.1 LTS). Missing → install it from
  blender.org with the user's OK.
- **The skills**, installed into `~/.claude/skills` (28 `blender-*` folders):

  ```powershell
  git clone --depth 1 https://github.com/EL4CTEO/blender-skills "$env:USERPROFILE\tools\blender-skills"
  & "$env:USERPROFILE\tools\blender-skills\install\install.ps1" -Agent claude
  ```

  Updating = `git pull` in that folder and the same install line (it replaces the copies).
- **Execution**: headless works without any MCP — `blender-core/scripts/run_in_blender.py` (set
  `BLENDER_EXE` to the path above; in Git Bash prefix `MSYS_NO_PATHCONV=1` and pass paths through
  `cygpath -m`). A live Blender MCP is optional, and when used, the open file is the user's work.
- First call of every session: `blender-core/scripts/env_report.py` — version, engines, GPU.

## 3. The skills used, in order

`blender-core` first (it routes and holds the 5.x API rules), then for a cartoon shot:

| Step | Skill |
|---|---|
| Scene, units, naming | `blender-scene-setup` |
| Characters and props: model, sculpt, clean | `blender-hardsurface-modeling`, `blender-sculpting`, `blender-retopology-uv` |
| Rig and faces (expressions, visemes for lip-sync with the R47 voice) | `blender-character-rigging`, `blender-facial-shapekeys` |
| **The drawn look**: toon bands, cool shadow tint, rim, outlines, Line Art, Grease Pencil | **`blender-stylized-npr`** |
| Acting: keys, NLA, loops, retarget | `blender-animation` |
| Light and camera | `blender-lighting-lookdev`, `blender-time-of-day` |
| Render | `blender-rendering` (EEVEE for toon) |
| Gate before any render counts | **`blender-asset-qa`** — mandatory on every mesh created or edited |
| Whole-asset playbooks | `blender-workflow-recipes` |

## 4. The look — `toon_setup.py`

```bash
python <skills>/blender-core/scripts/run_in_blender.py --blend shot.blend \
  <skills>/blender-stylized-npr/scripts/toon_setup.py -- --objects Hero Prop --bands 2 --rim 0.4 \
  --outline 0.004 --line-art --save shot.blend
```

- 2 bands for the classic drawn look, 3 when the shot wants a mid tone; shadow tint cool and saturated,
  never grey. The view transform becomes **Standard**, so the brand palette is the pixel that comes out.
- Outline width is in metres on an applied scale: 2–6 mm on a 1.75 m character.
- **Set base colours before `toon_setup.py`, or run it again after changing them.** Measured here: a
  base colour changed afterwards did not reach the render (the face stayed white); bands, shadow tint and
  outline did.
- The key sun's rotation shapes the shadow: art-direct it per shot, so the lit side reads at a glance.

Measured on this workstation (GTX 1660 SUPER, EEVEE): a 640×360 toon frame with outline and Line Art in
8–13 s. Budget a 1080×1920 shot from a short test render before promising a deadline.

## 5. Into the video

- Each animated shot renders to a **PNG sequence** (`public/footage/<shot>/####.png`, alpha when it is
  composited over a background), at the plan's fps and exactly the plan's frame count — Blender's frame
  range comes from `src/data/timeline.ts`, never typed twice.
- Remotion places the sequences (`<Sequence>` + image sequence), adds type, brand and transitions, and
  stays the editor; the review loop of `video-review.md` looks at the Blender shots like any other frame.
- Lip-sync and timing anchor to the R47 narration's words (`narration.ts`); effects to the cue sheet.
- Every character, prop and background is made for the video or sent by the user: no downloaded model
  stands in for a drawn character (R37 rule 8), and the `.blend` files stay in the video folder (`blender/`).

## 6. Done means

`blender-asset-qa` passed on every mesh, each shot rendered at the planned length and looked at as images
(first, middle and last frame at least), the drawn style consistent across shots (same bands, tint and
outline width), and the R37 review loop closed.

---
*Sources: the blender-skills README and SKILL files (blender-core, blender-stylized-npr) · written and audited by Angatu Sistemas*
