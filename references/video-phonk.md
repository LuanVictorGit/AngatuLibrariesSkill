# PHONK edits and the Angatu new-client reel

> Covers type B of G5 (R37). In the house vocabulary, "PHONK" is any edit driven by the music; the
> intensity says how aggressive it is. **B1** is a normal edit; **B2** is Angatu Sistemas' own
> "+1 cliente satisfeito" post for a new client, built in the language of two reference reels. The brief
> is `video-briefing.md`; the clock is `music.ts` (`video-plan.md`); the loop is `video-review.md`.

---

## 1. The first question

After the type question, for B:

> **"É uma edição PHONK normal ou é um vídeo para um novo cliente da Angatu Sistemas?"**

B1 asks for the track, the material, theme, character or product, visual style, **intensity 1–3**,
duration, format, references and text. B2 asks what Angatu delivered, how the client worked before, the
real screens, the team to credit, the track, and the WhatsApp of the final card (`video-briefing.md`,
section 6).

---

## 2. Music event → visual event

The map every edit starts from. The intensity (section 3) scales it.

| In the music | On screen |
|---|---|
| kick | punch-in: scale +3 / +6 / +10 % by intensity, decaying in 3–6 frames |
| snare, clap | a cut, a flash (at most three a second) or a word slammed in |
| hi-hats | micro-motion — only at intensity 3 |
| 808 slide | shake: noise under a decaying envelope, 6–20 px |
| cowbell or melody phrase | one element per note (words, icons, screens) |
| riser | push-in or speed ramp into the drop |
| **drop** | **the biggest change of the video**: scene change plus flash or glitch, density peak |
| break, pause | hold, freeze, slow motion — stillness is the contrast that makes the drop hit |
| vocal chop | a word on screen |

**Cut on the beat.** The picture changes on the beat frame, at most one frame ahead of the sound
(`VISUAL_LEAD = 1`, `video-plan.md`), never after it.

---

## 3. B1 — a normal edit

| Intensity | 1 — limpa | 2 — média | 3 — agressiva |
|---|---|---|---|
| Hits per bar | 1 (downbeat) | 2 | 4 |
| Punch-in | 3 % | 6 % | 10 % |
| Shake | none | on the 808 | on kicks and 808 |
| Flash | drop only | drop and section changes | on snares, **never more than three a second** |
| Glitch, RGB split | none | on the drop | on transitions |
| Motion blur | whips only | whips and punches | everything fast |

- **Structure from the music's sections**: intro (tension, a slow reveal) → build (the cut rate rises) →
  drop (the peak) → outro (logo, CTA). The sections come from `music.ts`: energy and drop.
- **Footage**: reframed for 9:16 per shot (never one global crop), a grade that ties the shots together,
  grain, speed ramps into hits, freeze frames on accents.
- **Stills** get depth: a cut-out subject over its background (parallax), a punch, a shake, a flash, a
  mask reveal. **Never "image + auto zoom"** — a slow zoom on every photo is the generic slideshow the
  brief exists to avoid.
- **Text**: short words slammed on hits; a sentence that must be read is held for its reading time.

What not to do:

| Don't | Because |
|---|---|
| image + auto zoom, photo after photo | a slideshow, not an edit |
| an effect on every beat | noise: nothing stands out, the drop included |
| random transitions | no language — pick two or three families |
| flash strobing | photosensitivity — three flashes a second is the ceiling |
| the drop on a quiet visual | the biggest sound needs the biggest picture |

---

## 4. B2 — the Angatu new-client reel

**References** — direction, not content:

- <https://www.instagram.com/angatusistemas/reel/Dc1rntCBpNW/> (Vidraçaria Elegance)
- <https://www.instagram.com/angatusistemas/reel/DdCid4ah2HP/> (TMExpress)

The new video is original: new text, the new client's sector as texture, the new client's screens and
team — in the same language. Nothing is copied literally.

### 4.1 Analyse before producing — every time

The account restricts age: signed out, the reels do not open. The analysis runs in **Claude in Chrome,
in the user's own session**, with `tools/reel-analysis.js` pasted into the reel's page:

```
__reel.start()     -> loads, scans the frames and analyses the audio in the background
__reel.status()    -> repeat until done: true (each call of the tool is limited to ~45 s)
__reel.report()    -> cuts, holds, BPM, energy, cut vs attack
await __reel.sheet(0.25, 8.25, 0.5, 8)  -> contact sheet; screenshot it; __reel.clear()
```

- Read-only: nothing is saved to disk, nothing is liked, commented or followed, and the agent never logs
  in for the user.
- `load` stuck at `readyState` 0 → Chrome defers media in a tab that has never been visible; ask the
  user to bring the tab to the front once.
- Timing: the page's `<video>` honours the MP4 edit list, `decodeAudioData` does not — the script reads
  the audio's edit list and removes the AAC priming (about 105 ms in Instagram's HE-AAC), then the
  detector's own 19 ms lag. Calibrated on a known video that cuts one frame before the beat: it measures
  −33 ms. Real music has softer attacks: read cut against beat as ±1 frame.
- Look at every contact sheet. Write what was found in `docs/REFERENCIAS.md`: rhythm, structure, timing,
  typography, movement, transitions, image treatment, effects, particles, camera, synchronisation,
  composition, hierarchy, entrances and exits, intensity, the editing language.
- **Check the account for newer posts of the series** and analyse them too: the language may have moved.

### 4.2 The profile, measured on 2026-09-22

| | Reel 1 — Vidraçaria Elegance | Reel 2 — TMExpress |
|---|---|---|
| Format | 1080×1920, 19.3 s | 720×1280 (largest available), 19.2 s |
| Music | ~136 BPM; quiet intro to 3.5 s, steady body, fade 15→19 s | ~103 BPM; a hit at 0–1 s, low tension to 9.5 s, **drop at 9.5 s** (−27 → −11 dB), the last 3.7 s silent |
| Cuts | the big scene changes sit on attacks | all 9 scene changes on attacks, within a 24 ms spread; the biggest change on the drop |
| Motion | continuous; the only hold is the end card | continuous; no holds |

**Structure — "+1 CLIENTE SATISFEITO"**, as proportions of a ~19 s piece:

1. **Hook, 0–3 s** — "+1" → "CLIENTE" → "SATISFEITO", word by word, entering with blur or a white flash;
   one accent colour on "+1" or on "SATISFEITO"; a small seal ("✓ ORÇAMENTO APROVADO"); the client's name
   as a small label.
2. **The problem, ~2.5 s** — how the client worked before, in the client's world: graph paper with the
   sector's sketches (glass measurements), "À MÃO / DEMORADO / E COM ERRO" with the last line in red. The
   light analog world against the dark digital one.
3. **Development, ~1.5 s** — real code of the delivered system in an IDE ("DESENVOLVIMENTO · JAVA",
   `@author Angatu Sistemas` visible, "BUILD SUCCESSFUL"), in perspective, scrolling. No secrets on
   screen.
4. **Partnership, ~1 s** — the client's logo × the Angatu shield, joined by light streaks or particles.
5. **Team, ~2.5 s** — portraits (cut out or in cards), name and role, big numerals "01", "02" behind.
6. **Product, 4–5 s** — the real screens of the system in laptop or phone frames, tilted in 3D, one per
   beat, each with a short benefit caption; a transition in the sector's shape ("DO CÓDIGO À ESQUADRIA").
   The drop goes here or on the partnership.
7. **Result, ~1.5 s** — the outcome in the client's words ("ORÇAMENTO EM SEGUNDOS"), client logo and
   tagline with Angatu.
8. **Call to action, ~3 s** — "Precisa de um sistema personalizado? Basta pedir seu orçamento" or "Faça
   um orçamento com a gente", the green WhatsApp pill with the number, the Angatu logo — with the music
   fading under it, never in silence.

**Look** — navy backgrounds with a quiet tech texture (circuit traces, grid, a radar ring, particles);
white condensed uppercase titles; a blue accent, teal-green for the positive, red for the problem; blur
transitions, a white flash on the hook, light streaks on the partnership; 3D-tilted device frames; a
co-branded watermark chip (*cliente | Angatu*) held through the video. Angatu's own site gives the tokens
(navy `rgb(5, 29, 56)`, Bricolage over Inter) — confirm them with `tools/site-research.mjs` on
<https://angatusistemas.com.br>. It is clean motion design cut to the music, not aggressive PHONK: shake
and glitch stay out unless the brief asks.

### 4.3 Building a B2

| Block | Material | Who provides it |
|---|---|---|
| Hook | text, the client's name | brief |
| Problem | how it was done before; the sector's sketches drawn in code | user (the story), skill (the drawing) |
| Development | a capture or recording of the real code | user |
| Partnership | client logo (URL research), Angatu logo (`_marca/`) | site, studio |
| Team | portraits with permission | `_marca/` |
| Product | captures from `site-research`, system screens with fictitious data | site, user |
| Result | the client's own phrasing | brief |
| Call to action | WhatsApp — **confirmed every time** — and the Angatu site | user |

### 4.4 Checklist

- [ ] Type confirmed (B1 or B2) and intensity chosen
- [ ] B2: both references (and any newer post of the series) analysed with `tools/reel-analysis.js`;
      findings in `docs/REFERENCIAS.md`
- [ ] Every scene change on a beat; the biggest change on the drop
- [ ] No "image + auto zoom"; no effect on every beat; two or three transition families
- [ ] At most three flashes in any second
- [ ] B2: the eight blocks present, in the new client's material and sector
- [ ] The WhatsApp number confirmed with the user
- [ ] The final card with music, never silent
- [ ] Angatu mark as answered in G5

---
*Original source: the two reference reels of @angatusistemas, analysed frame by frame, and the Remotion Motion Graphics brief · written and audited by Angatu Sistemas*
