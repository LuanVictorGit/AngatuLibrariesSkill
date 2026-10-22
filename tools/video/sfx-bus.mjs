#!/usr/bin/env node
/**
 * Mixes every sound effect of the timeline into a single file:
 * public/audio/sfx-bus.wav, which the composition plays with ONE <Audio>.
 *
 * Why a bus and not one <Audio> per effect: on Windows, every audio layer
 * lengthens the command line Remotion hands to FFmpeg, and an edit with dozens
 * of hits overflows the limit (ENAMETOOLONG). Here the filter graph goes in a
 * file, and each effect file is read only once, split with asplit when it is
 * used several times.
 *
 * Synchronised by construction: the instant of each effect comes from the SAME
 * cue that moves the picture (CUES in timeline.ts), minus the measured anchor
 * of the file (sfx.ts, from tools/analyze-sfx.py) -- the peak of the whoosh
 * lands on the cut, not the start of the file. When the timeline changes, run
 * it again; the review compares the stamp written next to the WAV with the
 * current cues.
 *
 * Each effect is trimmed to MAX_MS (2.5 s by default; the cue may ask for
 * another in maxMs) with an 80 ms fade: a library impact often carries seconds
 * of tail, which muddy the mix and hide the next hit.
 *
 * Usage: node tools/sfx-bus.mjs
 *
 * @author Angatu Sistemas
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CUES, DURATION_IN_FRAMES, FPS } from '../src/data/timeline.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
// A video with no effects has no sfx.ts: the bus comes out silent, as long as the video.
const SFX_FILE = join(ROOT, 'src', 'data', 'sfx.ts');
const { SFX } = existsSync(SFX_FILE) ? await import(pathToFileURL(SFX_FILE).href) : { SFX: {} };
const OUT_DIR = join(ROOT, 'public', 'audio');
const OUT = join(OUT_DIR, 'sfx-bus.wav');
const totalSec = DURATION_IN_FRAMES / FPS;
const MAX_MS = 2500;
const FADE_S = 0.08;

const uses = CUES.filter((c) => c.sfx).map((c) => {
  const s = SFX[c.sfx];
  if (!s) throw new Error(`cue ${c.id}: effect "${c.sfx}" has no anchor in sfx.ts`);
  const delayMs = Math.round((c.frame / FPS) * 1000 - s.anchorMs);
  if (delayMs < 0) throw new Error(`cue ${c.id}: would start ${-delayMs} ms before the video`);
  const maxSec = Math.min(c.maxMs ?? MAX_MS, s.durationMs) / 1000;
  return { id: c.id, name: c.sfx, file: join(ROOT, s.file), delayMs, gainDb: c.gainDb ?? 0, maxSec };
});

mkdirSync(OUT_DIR, { recursive: true });
const args = ['-v', 'error', '-y'];
let graph;
if (!uses.length) {
  args.push('-f', 'lavfi', '-i', `anullsrc=r=48000:cl=stereo:d=${totalSec}`);
  graph = '[0:a]anull[out]';
} else {
  const files = [...new Set(uses.map((u) => u.file))];
  files.forEach((f) => args.push('-i', f));
  const parts = [];
  const labels = [];
  files.forEach((f, i) => {
    const mine = uses.filter((u) => u.file === f);
    const split = mine.map((_, j) => `[s${i}_${j}]`).join('');
    parts.push(`[${i}:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,asplit=${mine.length}${split}`);
    mine.forEach((u, j) => {
      const label = `[u${labels.length}]`;
      const trim = `atrim=0:${u.maxSec},afade=t=out:st=${Math.max(0, u.maxSec - FADE_S).toFixed(3)}:d=${FADE_S}`;
      parts.push(`[s${i}_${j}]${trim},volume=${u.gainDb}dB,adelay=${u.delayMs}:all=1${label}`);
      labels.push(label);
    });
  });
  parts.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0:dropout_transition=0,apad[out]`);
  graph = parts.join(';\n');
}

const graphFile = join(tmpdir(), `sfx-bus-${process.pid}.txt`);
writeFileSync(graphFile, graph);
// -t closes the exact duration of the video: the apad above fills silence up to it.
args.push('-/filter_complex', graphFile, '-map', '[out]', '-t', String(totalSec), '-c:a', 'pcm_s16le', OUT);
const r = spawnSync('ffmpeg', args, { stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status ?? 1);

const stamp = createHash('sha1').update(JSON.stringify(uses.map((u) => [u.name, u.delayMs, u.gainDb, u.maxSec]))).digest('hex');
writeFileSync(join(OUT_DIR, 'sfx-bus.json'), JSON.stringify({ stamp, fps: FPS, uses }, null, 2));
console.log(`${uses.length} effects, ${new Set(uses.map((u) => u.file)).size} files -> public/audio/sfx-bus.wav (${totalSec.toFixed(2)} s)`);
for (const u of uses) console.log(`  ${u.id.padEnd(14)} ${u.name.padEnd(28)} starts at ${String(u.delayMs).padStart(6)} ms  ${u.gainDb} dB`);
