# Video review — the loop that decides "done"

> Covers the "done" half of R37: phases 5 and 6 of `video-production.md`. **The agent cannot watch a
> stream and cannot hear.** It reads images and numbers. This file turns the render into both, compares
> them with the approved plan (`docs/PLANO.md`, `src/data/timeline.ts`), and loops — PLANEJAR → CRIAR →
> RENDERIZAR → ANALISAR → IDENTIFICAR PROBLEMAS → CORRIGIR → RENDERIZAR NOVAMENTE — until they match.
> The loop is the skill's own discipline, written into `docs/REVISAO.md`; the `/goal` command is not used.

---

## 1. The objective, written first

At the start of phase 5, at the top of `docs/REVISAO.md`, derived from the plan:

```markdown
# Revisão — <cliente> · <peça>

## Objetivo
`entrega/<cliente>-<peca>-reels.mp4`: as 8 cenas do PLANO.md, na ordem, com os cortes na grade da música
(diferença de no máximo 1 quadro), os 14 efeitos do cue sheet no lugar, −14 LUFS e pico real até
−1 dBTP, cor bt709, nenhum texto fora da zona segura, português revisado, marca da Angatu conforme o
briefing — aprovado pelo usuário depois de ouvir.
```

Every iteration is judged against this paragraph and nothing else.

---

## 2. Render modes

| Mode | Command | For |
|---|---|---|
| still | `node tools/render.mjs still <frame>` | layout, one frame, seconds |
| draft | `node tools/render.mjs draft [--frames=a-b]` | motion and timing at half scale, JPEG |
| final | `node tools/render.mjs final` | the review render (PNG, bt709, CRF 18, AAC 320k) |
| master | `node tools/master.mjs out/final.mp4` | loudness and peak, picture untouched |
| web | `node tools/render.mjs webm` | VP9 for a page — only if at least 15 % smaller than the MP4 |

`render.mjs` runs the determinism check, the plan check and the effects bus before every video render.
For the user, the Remotion Studio (`npx remotion studio`) opens in the app's browser pane, where they can
scrub and listen:

```json
{ "version": "0.0.1", "configurations": [
  { "name": "studio", "runtimeExecutable": "npx", "runtimeArgs": ["remotion", "studio", "--port=3000"], "port": 3000 } ] }
```

(`.claude/launch.json` in the video folder.)

---

## 3. The measured half — `tools/review.mjs`

```bash
node tools/review.mjs out/final-master.mp4     # -> out/review/NN/SUMMARY.md, sheets/, strips/
```

| Item | Target |
|---|---|
| codec, resolution | H.264 (or VP9), the composition's size |
| pixel format, colour | `yuv420p`; **bt709** in primaries, transfer and matrix; limited range (`tv`) |
| frame rate, length | constant `30/1`; exactly `DURATION_IN_FRAMES` frames |
| audio | AAC, 48 kHz, stereo |
| cuts | every planned cut seen on its frame, at most 1 frame off (spike of frame-to-frame difference, YDIF) |
| black | no true black (`blackdetect`, pixel threshold 0.02) outside `HOLDS` |
| empty | no stretch of 0.2 s or more that is only background (luminance range < 20) |
| frozen | no still stretch of 0.5 s or more (`freezedetect`) outside `HOLDS` |
| silence | no silence of 0.5 s or more (`silencedetect`) outside `SILENCES` |
| flashes | **at most three flashes in any second** (pairs of opposite luminance swings of 10 % or more) — photosensitivity |
| loudness | −14 ± 1 LUFS integrated (`ebur128`) |
| true peak | at most −1 dBTP |
| text | every on-screen string listed, for the Portuguese review (R16) |

It exits with 1 when any item fails. Two lessons already built into it: FFmpeg's scene detector does not
see a text change on a dark background (hence the frame-difference spike), and `blackdetect` with its
usual threshold calls a navy background "black" (hence true black plus a separate empty-frame check).

---

## 4. The eye half

Read **every** image the review wrote:

- `sheets/` — each scene at six moments, from its entrance to its exit;
- `strips/` — each cut from three frames before to three after: a blink, an empty frame, a jump, an
  element that pops instead of moving;
- a still with the safe-zone guides (`video-motion.md`, section 6) for every scene that carries text.

Look for, one by one: hierarchy · legibility · contrast · spacing · alignment · proportion · consistency ·
typography · image quality · cuts · composition · safe zones · elements off screen · overlaps · text cut
off · abrupt animation · empty frames · frozen frames · blinking elements. Then the question of R35:
*could this be a frame of any other brand's video?* If yes, the identity is not there yet.

Write what was seen — "cena 5: o selo encosta na borda direita a 40 px" — not "looks good".

---

## 5. The ear half

The agent cannot hear. The numbers above cover level and timing; taste is the user's. At the first full
draft and at the final, ask for a listen with specific questions:

- "O whoosh do corte de 3,9 s adianta ou atrasa a imagem?"
- "A voz fica clara por cima da música no trecho de 8 a 12 s?"
- "O impacto do drop está forte demais?"

The answers become findings of the next iteration, in the user's words.

---

## 6. `docs/REVISAO.md` — one entry per iteration

```markdown
## Iteração 03 — out/final-master.mp4 (2026-09-22 18:40)

| Critério | Meta | Medido | Status |
|---|---|---|---|
| cortes na grade | 8/8, ≤ 1 quadro | 8/8, pior 1 | PASS |
| loudness | −14 ± 1 LUFS | −14,2 | PASS |
| pico real | ≤ −1 dBTP | −1,0 | PASS |
| zona segura | nenhum texto fora | cena 5: selo a 40 px da borda | FAIL |
| passe do olho | nenhum defeito | 1 (cena 5) | FAIL |

### Achados
1. [crítico] cena 5: selo fora da zona segura → mover para dentro do padding de 65 px.

### Correções feitas
- ...

### Verificação na próxima iteração
- cena 5 conferida na folha de contato e no still com guias.
```

Severity: **crítico** (blocks delivery) · **importante** (fixed in this loop) · **ajuste** (noted, done if
cheap).

---

## 7. Stop condition and escalation

**Stop condition — done** when all of these hold at once:

1. every measured item of `review.mjs` is PASS;
2. the eye pass found nothing critical or important;
3. the user listened to the latest render and approved it;
4. the final checklist below is all yes.

**Escalate — stop and ask**, with the evidence and two or three options, when:

- the same finding survives two consecutive iterations;
- a tool fails three times in a row;
- the fix would change the approved plan (a scene, the order, the duration, the music) — the plan is the
  user's, not the loop's.

Never loop in silence, and never lower a target to make an item pass.

---

## 8. Final checklist

**Briefing e plano**
- [ ] O vídeo corresponde ao briefing (objetivo, público, sensação, CTA)?
- [ ] Todas as cenas planejadas existem, na ordem?
- [ ] Todas as informações importantes aparecem? Os textos obrigatórios, com a grafia exata?
- [ ] A duração está correta?

**Sincronia**
- [ ] A música está sincronizada (cortes na grade, drop na maior mudança)?
- [ ] A voz está sincronizada (cada elemento entra na palavra)?
- [ ] Os efeitos sonoros estão sincronizados (carimbo do barramento = eventos atuais)?

**Imagem**
- [ ] As transições estão corretas? As animações estão suaves?
- [ ] Existem quadros problemáticos, elementos cortados, textos ilegíveis?
- [ ] Existem momentos visualmente vazios? Momentos excessivamente carregados?
- [ ] As imagens têm qualidade suficiente?
- [ ] Existem elementos desnecessários ou efeitos excessivos?

**Texto**
- [ ] Existem erros de português (R16)?

**Identidade e ritmo**
- [ ] O ritmo está coerente com o estilo escolhido?
- [ ] A identidade visual está consistente? A marca da Angatu conforme o briefing?
- [ ] O resultado corresponde ao estilo solicitado? Tem aparência profissional (R35)?

Any "no" goes back into the loop.

---

## 9. Completion criteria

The task is complete only when:

1. the plan was defined and approved;
2. the Remotion project was created from scratch;
3. every scene was implemented;
4. the visual elements are synchronised;
5. the sound is synchronised;
6. the transitions work;
7. there is no known visual error;
8. there is no known audio error;
9. the video was rendered and reviewed;
10. the problems found were fixed;
11. a new review confirmed the fixes;
12. the result matches the initial brief.

Compiling does not finish it, and neither does the first render.

---

## 10. Delivery

- **Files** in `entrega/`: `<cliente>-<peca>-<formato>.mp4` per format; the version without music when
  the licence requires it; a **cover still** for the grid, with the essential content safe for the 1:1 and
  4:5 crops of the Instagram profile.
- **Specification**: H.264 High, `yuv420p`, bt709 in primaries, transfer and matrix, limited range,
  constant 30 fps, AAC 48 kHz, `+faststart`.
- **Verified**: `ffprobe` shows the specification; a full decode passes without errors
  (`ffmpeg -v error -i <arquivo> -f null -`); it plays in a real browser — headless Chrome, no server:

```bash
chrome --headless=new --autoplay-policy=no-user-gesture-required --virtual-time-budget=6000 \
  --dump-dom "file:///<folder>/decode-test.html"      # the page plays the video and writes error/readyState/time
```

- **Records**: `docs/REVISAO.md` closed with the approval, `docs/LICENCAS.md` complete, the folder's
  `CLAUDE.md` pointing to `docs/`.
- **Clean-up**: delete `node_modules` (R32: no leftovers — renders under `out/` that are not deliverables
  go too); keep `package-lock.json`.
- **Tell the user** where the files are, the specification, the licence notes, and anything that is
  theirs to do (adding a licensed track in the app, the Remotion licence if the team grew).

---
*Original source: the Remotion Motion Graphics brief of Angatu Sistemas, and the measured review practice of Angatu's own studios · written and audited by Angatu Sistemas*
