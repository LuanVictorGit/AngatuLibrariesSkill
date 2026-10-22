#!/usr/bin/env node
/**
 * Checks the plan BEFORE rendering: the frame table the render would only
 * show minutes later, when the error has already cost a whole render.
 *
 * Reads src/data/timeline.ts (and music.ts, narration.ts and sfx.ts when they
 * exist) straight in Node and flags:
 *   - a gap or an overlap between scenes; scenes that do not add up to the duration;
 *   - a cut off the music's grid (more than 1 frame from the right place);
 *   - a drop with neither a cut nor a 'drop' cue on it;
 *   - text on screen for less time than it takes to read it;
 *   - a sound effect with no measured anchor (run tools/analyze-sfx.py);
 *   - more than 3 flashes in any 1-second window;
 *   - a cue or a poster outside the video.
 *
 * Usage: node tools/check-plan.mjs      (exits with 1 when there is an error)
 *
 * @author Angatu Sistemas
 */
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const data = (name) => fileURLToPath(new URL(`../src/data/${name}`, import.meta.url));
const load = async (name) => (existsSync(data(name)) ? import(pathToFileURL(data(name)).href) : {});

const T = await load('timeline.ts');
const { MUSIC } = await load('music.ts');
const { SFX } = await load('sfx.ts');

const { FPS, SCENES, CUES = [], DURATION_IN_FRAMES, POSTER_FRAME, VISUAL_LEAD = 0 } = T;
if (!FPS || !SCENES || !DURATION_IN_FRAMES) {
  console.error('timeline.ts must export FPS, SCENES and DURATION_IN_FRAMES');
  process.exit(1);
}

const errors = [];
const warnings = [];
const sec = (fr) => (fr / FPS).toFixed(2);
const WORDS_PER_SEC = 2.5;
const MIN_HOLD_SEC = 0.8;

console.log(`\n${SCENES.length} scenes, ${DURATION_IN_FRAMES} frames (${sec(DURATION_IN_FRAMES)} s) at ${FPS} fps\n`);
console.log('scene                 start   end    frames    seconds   anchor');
let cursor = 0;
for (const s of SCENES) {
  const end = s.from + s.durationInFrames;
  console.log(`${s.id.padEnd(20)} ${String(s.from).padStart(6)} ${String(end).padStart(5)} ${String(s.durationInFrames).padStart(9)} ${sec(s.durationInFrames).padStart(10)}   ${s.anchor ?? ''}`);
  if (s.from > cursor) errors.push(`${s.id}: gap of ${s.from - cursor} frames before the scene`);
  if (s.from < cursor) errors.push(`${s.id}: overlaps the previous scene by ${cursor - s.from} frames`);
  if (s.durationInFrames <= 0) errors.push(`${s.id}: duration ${s.durationInFrames}`);
  if (s.text) {
    const words = s.text.trim().split(/\s+/).length;
    const need = Math.max(MIN_HOLD_SEC, words / WORDS_PER_SEC);
    if (s.durationInFrames / FPS < need) {
      (s.flash ? warnings : errors).push(`${s.id}: "${s.text}" stays ${sec(s.durationInFrames)} s; reading it takes ${need.toFixed(1)} s`);
    }
  }
  cursor = end;
}
if (cursor !== DURATION_IN_FRAMES) errors.push(`the scenes end at ${cursor}, the video at ${DURATION_IN_FRAMES}`);

if (MUSIC?.beatFrames?.length) {
  const grid = MUSIC.beatFrames.map((b) => b - VISUAL_LEAD);
  const nearest = (fr) => grid.reduce((best, g) => (Math.abs(g - fr) < Math.abs(best - fr) ? g : best), grid[0]);
  console.log('\n   cut (frame)          nearest beat      offset');
  for (const s of SCENES.slice(1)) {
    const d = s.from - nearest(s.from);
    console.log(`${String(s.from).padStart(14)} ${String(nearest(s.from)).padStart(21)} ${String(d).padStart(11)}`);
    if (Math.abs(d) > 1) errors.push(`${s.id}: cut ${d} frames off the grid (VISUAL_LEAD=${VISUAL_LEAD})`);
  }
  if (MUSIC.dropFrame != null) {
    const target = MUSIC.dropFrame - VISUAL_LEAD;
    const cut = SCENES.some((s) => Math.abs(s.from - target) <= 1);
    const cue = CUES.some((c) => c.kind === 'drop' && Math.abs(c.frame - MUSIC.dropFrame) <= 1);
    if (!cut && !cue) errors.push(`drop at ${MUSIC.dropFrame} with neither a cut nor a 'drop' cue: the biggest change has to be there`);
  }
}

for (const c of CUES) {
  if (c.frame < 0 || c.frame >= DURATION_IN_FRAMES) errors.push(`cue ${c.id} outside the video (frame ${c.frame})`);
  if (c.sfx && !SFX?.[c.sfx]) errors.push(`cue ${c.id}: effect "${c.sfx}" has no anchor in sfx.ts (run tools/analyze-sfx.py)`);
  if (c.sfx && SFX?.[c.sfx]) {
    const startMs = (c.frame / FPS) * 1000 - SFX[c.sfx].anchorMs;
    if (startMs < 0) errors.push(`cue ${c.id}: the effect would have to start ${Math.round(-startMs)} ms before the video`);
  }
}

const flashes = CUES.filter((c) => c.kind === 'flash' || c.kind === 'drop').map((c) => c.frame).sort((a, b) => a - b);
for (let i = 0; i < flashes.length; i++) {
  const inWindow = flashes.filter((fr) => fr >= flashes[i] && fr < flashes[i] + FPS).length;
  if (inWindow > 3) {
    errors.push(`${inWindow} flashes in the second that starts at ${sec(flashes[i])} s (limit: 3)`);
    break;
  }
}

if (POSTER_FRAME != null && (POSTER_FRAME < 0 || POSTER_FRAME >= DURATION_IN_FRAMES)) {
  errors.push(`POSTER_FRAME ${POSTER_FRAME} outside the video`);
}

console.log('');
for (const w of warnings) console.log(`warning ${w}`);
for (const e of errors) console.log(`ERROR   ${e}`);
console.log(errors.length ? `\n${errors.length} error(s): fix the plan before rendering\n` : '\nplan ok\n');
process.exit(errors.length ? 1 : 0);
