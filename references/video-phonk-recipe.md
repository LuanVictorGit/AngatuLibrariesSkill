# The Angatu edit recipe — how the "+1 cliente" reels move, frame by frame

> Covers the animation language of every Angatu music edit (G5 type B2, and any B1 the owner wants
> "igual aos outros"). Measured on 2026-11-19 from the two reference reels downloaded at the owner's
> request and read at 15 frames per second (`video-phonk.md`, section 4). **Read this before the
> motion thesis of any Angatu edit.** The brief is `video-briefing.md`; the clock is `video-plan.md`;
> the loop is `video-review.md`.
>
> Why this file exists: an edit built from the written profile alone (hard cuts, a phone
> mockup sliding, a camera punch on the beat) was rejected by the owner as "parado" and "uma porcaria".
> The written profile said *what* is on screen; this file says *how it moves*.

---

## 1. The numbers that separate a good edit from a dead one

| Measure | Reference 1 | Reference 2 | A rejected draft |
|---|---|---|---|
| frames with visible change (YDIF > 1 at 360 px wide) | **71 %** | **66 %** | 48 % |
| mean frame-to-frame change (YDIF) | 8.1 | 6.2 | 5.7 |
| visual events | one on **every beat** | one on every beat | one per scene, plus a punch |
| hard cuts between blocks | almost none | few | all of them |

Measure your render the same way before showing it, and do not show it below 60 % **counting up to the final card** (the card's planned hold is the one still stretch; with it the total drops to the mid-50s — an approved edit measured 61 % without the card and 54 % with it):

```bash
ffmpeg -v error -i out/final-master.mp4 -vf "scale=360:-1,signalstats,metadata=print:key=lavfi.signalstats.YDIF:file=-" \
  -an -f null - 2>/dev/null | grep -o "YDIF=[0-9.]*" | awk -F= '{s+=$2;n++;if($2>1)m++} END{printf "mean %.2f, moving %.0f%%\n", s/n, 100*m/n}'
```

"Animado e suave" means both at once: **something changes on every beat, and every change is eased,
blurred or glowed into place — never popped.**

---

## 2. The look (constant across both reels)

- **Ground**: near-black navy (`#030B16` at the edges, `#0A2A55` glow in the middle), a radial glow
  behind the subject, a heavy vignette, a faint grid or circuit texture, and **slow floating dust**
  (a few dozen 2–3 px dots drifting upwards). The ground is never still.
- **Depth of field**: an out-of-focus horizontal band of light across the middle third of the hook
  and of the "antes" paper. It reads as a lens, not as a decoration.
- **Type**: heavy geometric sans (Inter 800 works), white, with a soft glow
  (`text-shadow: 0 0 28px rgba(159,190,228,.35)`); one accent per block (light blue on "+1", teal on
  "SATISFEITO", red on the problem's last line). Labels in small spaced caps; step captions in
  sentence case with a numbered circle.
- **Cards**: everything that is "the system" is a **glass card** — rounded, a 2 px light-blue border
  that glows (`box-shadow: 0 0 40px rgba(80,160,255,.35)`), tilted in 3D 6–12°, drifting slowly.
  Reference 1 floats UI sections as separate panels; reference 2 shows the screen as one glass card
  with no phone bezel. Neither shows a drawn phone.
- **Watermark chip** *cliente | Angatu*, small, through the whole piece.

---

## 3. Transition grammar — the part that makes it "suave"

Every block change is one of these. Timings at 30 fps.

| Transition | How it is built | Where |
|---|---|---|
| **Bloom** | a radial white gradient (not a flat white frame) at 0.55–0.85 opacity on the cut frame, fading to 0 in 5–6 frames; the incoming block starts blurred (12–18 px) and 6–10 % larger and comes into focus in 6–8 frames | hook entry, drop, every major block change |
| **Blur dissolve** | the outgoing block blurs to 10–14 px and dims over its last 3–4 frames; the incoming one enters blurred and sharpens | between team members, between UI steps |
| **Light line** | a thin white horizontal line (2–4 px, glowing) sweeps vertically across the frame in 4–6 frames over the dissolve | team, product steps |
| **Data stream** | the outgoing text dissolves into short horizontal dashes that fly sideways and assemble into code lines | hook → development |
| **Sector shape** | the client's sector drawn line by line (a glass frame for a glazier; a car body for a body shop) with orbiting light streaks around it and sector words floating at depth ("REFLETIVO", "FUMÊ"…); a glass sheen crosses it; then a bloom into the product | development → product |
| **Logo band** | a wide translucent band slides in horizontally carrying client logo × Angatu; the "×" turns into "+" with a small bloom | partnership |

A hard cut is fine **inside** a block (a new UI panel on the beat) when the new element enters with
blur. Between blocks, use the grammar above. Each block still changes on a beat frame — the bloom
sits on the beat (`video-plan.md`, `VISUAL_LEAD = 1`).

---

## 4. One event per beat — the menu

Pick one per beat; never two big ones on the same beat.

- a word or line entering: blur 12 → 0 px, scale 1.12 → 1, opacity 0 → 1 in 5–7 frames (`snap`);
- a **glow pulse**: the radial glow behind the subject brightens 30–40 % and decays in 8 frames;
- a **light sheen**: a diagonal soft white band crossing a card or a portrait in 8–10 frames;
- a **highlight box**: a glowing rounded rectangle drawing around a UI region (field, button, photo);
- a **UI change**: a chip selected (red fill), a field typed key by key, a counter rolling
  (`0,00 → 1,80 m²`, `260 → 413 km`), an item added to a list, a button pressed (scale 0.96 and a
  "✓ salvo" state);
- a **scan line**: a green line sweeping a photo, followed by the read value in a glowing box;
- a **seal** fading in ("✓ ORÇAMENTO APROVADO", "✓ PDF PRONTO PARA O CLIENTE");
- an **expanding ring** and a short burst of particles (hook and drop only).

Between beats the frame keeps moving: the ground drifts, cards drift 1–2 % in scale and a few degrees
in tilt, dust floats. Holds exist only on the final card.

---

## 5. Block by block (proportions of a ~19 s piece)

1. **Hook (0–3 s)** — start dark (a single point of light in reference 2); bloom on the first hit;
   "+1" / "CLIENTE" / "SATISFEITO" one per beat with blur, or all three in one bloom with rings and
   particles; the seal appears on the next beat; the client's name in small spaced caps with a thin
   rule; a glow pulse on each remaining beat; the block blurs and dims out.
2. **Problem (~2.5 s)** — graph paper, slightly in perspective, with the sector's sketches **drawn
   while you watch** (measurements, a frame, "área = ?", "R$ ???") in a handwritten font; a label on
   top ("ORÇAMENTO DE VIDRO"); three lines entering one per beat with blur, the last in red with a
   red blur flash; a paper note slides in; then bloom or data stream.
3. **Development (~1.5–3 s)** — the IDE fades in from blur, code types or scrolls, a terminal prints
   the build, "BUILD SUCCESSFUL" glows green with a teal pulse over the frame; "DESENVOLVIMENTO · JAVA"
   label. Real code of the delivered system, no secrets.
4. **Partnership (~1 s)** — logo band (section 3), the client's logo in a white card, the Angatu
   shield, light streaks, the "×" bloom.
5. **Team (~2.5–3 s)** — one person per beat or two: portrait card (reference 1) or cut-out
   (reference 2) entering from blur, a big faint numeral behind, name sharpening in, role in small caps
   one beat later, a sheen across the card; blur dissolve with a light line to the next person. Just
   before the drop, a fast montage of the three faces (one per half beat) builds tension.
6. **Product (4–5 s)** — on the drop: bloom, horizontal light streaks, the client's logo revealed with
   particles, the glass screen rising behind it. Then **numbered steps**, one per bar or per two beats,
   each with a caption ("① O motorista fotografa o painel") and a UI event on every beat inside the
   step (section 4). Blur dissolve or light line between steps.
7. **Result (~1.5 s)** — the outcome in the client's words, big, two lines, the second in the accent;
   the delivered artefact behind it (the PDF, the screen); small *cliente × Angatu* logos underneath;
   a seal.
8. **Call to action (~2.5–3 s)** — bloom in; Angatu lockup (shield + name) on top; "Precisa de um
   sistema personalizado?" in light blue; "Basta pedir seu orçamento" in white bold; the green
   WhatsApp button with the number; `wa.me` and the site in small text; elements in one per beat,
   then the only hold of the video, with the music under it.

---

## 6. Building it in Remotion

- **Scenes stay on beat frames** (`timeline.ts`), but each scene owns its own **entry** (blur-in from
  its first frame) and **exit** (blur-out over its last 3–4 frames). A shared `Bloom` overlay sits on
  absolute frames over the cuts that need it.
- **UI from real captures, cut into panels**: crop the real screenshot (fictitious data) into the
  regions that matter (the field, the carousel, the result card) and animate each panel; a
  highlight box is a bordered `div` positioned in capture coordinates; typing is a sequence of real
  captures or a text overlay matching the system's own font.
- **Glow and blur are expensive**: keep `filter: blur()` to the frames of a transition and render
  drafts at half scale.
- **Particles and dust are stateless** (`random(seed)` + frame), 30–60 dots, never as filler.
- **Text glow** with `text-shadow`, not with duplicated blurred layers.
- **Flashes**: blooms count as flashes for the photosensitivity check — at most three in any second;
  space blooms at least a beat apart.

---

## 7. Studying a reference — when the owner asks to download it

Downloading is allowed only when the owner asks in the conversation (the reels are Angatu's own
posts, studied and never used as material). In Claude in Chrome, on the reel's page, after it played:
find the largest video representation and the audio in `performance.getEntriesByType('resource')`
(fbcdn `/o1/v/t2/f2/` URLs, decoded by their `efg` parameter, as `tools/reel-analysis.js` does), fetch
each into a Blob and save it with an `<a download>` click — the extension blocks returning signed URLs
as text, so the file goes through Chrome's own download. Then, outside the browser:

```bash
ffmpeg -i video.mp4 -i audio.mp4 -map 0:v -map 1:a -c copy out/reference/ref1.mp4
python -X utf8 tools/study-sheets.py out/reference/ref1.mp4 out/reference/ref1 15 2 0 19.4
```

`study-sheets.py` writes labelled sheets of 30 frames (2 s at 15 fps). Read **all** of them: the
motion is in the frames between the cuts, not in the cuts. Keep the files in `out/reference/` and
delete them at delivery with the rest of `out/` (R46).

---

## 8. Checklist

- [ ] Motion share measured ≥ 60 % (section 1), mean YDIF ≥ 6
- [ ] Every block change uses the grammar of section 3; no bare hard cut between blocks
- [ ] One event on every beat (section 4); no beat with two big events
- [ ] The ground, the cards and the dust keep drifting between beats; the only hold is the final card
- [ ] The product is told in numbered steps with UI events, from real captures with fictitious data
- [ ] Blooms ≤ 3 in any second, at least a beat apart
- [ ] The eight blocks of `video-phonk.md` 4.2, team included

---
*Original source: the two "+1 cliente satisfeito" reels of @angatusistemas, downloaded at the owner's request and read frame by frame on 2026-11-19, and the drafts rejected and approved the same day · written and audited by Angatu Sistemas*
