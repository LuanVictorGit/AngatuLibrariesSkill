#!/usr/bin/env node
/**
 * Turns the rendered video into evidence the agent can read.
 *
 * The agent does not watch video or hear audio: it reads images and numbers.
 * This script produces both, against the plan (src/data/timeline.ts):
 *   images   sheets/  one contact sheet per scene (entrance, middle, exit)
 *            strips/  each cut from -3 to +3 frames (blink, empty frame, jump)
 *   numbers  specification and colour (ffprobe), detected against planned cuts,
 *            black, frozen and silent stretches outside the plan, flashes per
 *            second (limit 3, photosensitivity), loudness and true peak.
 *
 * Output: out/review/NN/ (NN = the next iteration) with SUMMARY.md; the same
 * table of evidence goes to the screen. Exits with 1 when any item fails.
 *
 * Usage: node tools/review.mjs [out/final.mp4]
 *
 * @author Angatu Sistemas
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const dataUrl = (name) => pathToFileURL(join(ROOT, 'src', 'data', name)).href;
const T = await import(dataUrl('timeline.ts'));
const { FPS, WIDTH, HEIGHT, SCENES, DURATION_IN_FRAMES, HOLDS = [], SILENCES = [], ON_SCREEN_TEXT } = T;

const LUFS_TARGET = -14;
const LUFS_TOLERANCE = 1;
const TRUE_PEAK_MAX = -1;
const FLASH_LUMA = 25.5; // 10% of the luma scale
const FLASH_MAX_PER_SECOND = 3;

const video = process.argv[2] ?? 'out/final.mp4';
if (!existsSync(join(ROOT, video))) {
  console.error(`${video} not found: render it first (node tools/render.mjs final)`);
  process.exit(1);
}

const reviewRoot = join(ROOT, 'out', 'review');
mkdirSync(reviewRoot, { recursive: true });
const iteration = String(readdirSync(reviewRoot).filter((d) => /^\d+$/.test(d)).length + 1).padStart(2, '0');
const dir = join(reviewRoot, iteration);
for (const sub of ['sheets', 'strips']) mkdirSync(join(dir, sub), { recursive: true });

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`${cmd} failed:\n${r.stderr}`);
  return `${r.stdout}\n${r.stderr}`;
};
const ffmpeg = (args) => run('ffmpeg', ['-hide_banner', '-nostats', ...args]);
const nullOut = ['-f', 'null', '-'];
const rows = [];
const check = (item, target, measured, ok) => rows.push({ item, target, measured, status: ok ? 'PASS' : 'FAIL' });
const note = (item, measured) => rows.push({ item, target: '-', measured, status: 'INFO' });
const sec = (fr) => (fr / FPS).toFixed(2);
const covered = (fromSec, toSec, spans) =>
  spans.some((s) => fromSec >= s.from / FPS - 0.05 && toSec <= s.to / FPS + 0.05);

// 1. specification and colour
const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', video]).trim());
const v = probe.streams.find((s) => s.codec_type === 'video');
const a = probe.streams.find((s) => s.codec_type === 'audio');
const duration = Number(probe.format.duration);
check('video codec', 'h264 or vp9', v.codec_name, ['h264', 'vp9'].includes(v.codec_name));
check('resolution', `${WIDTH}x${HEIGHT}`, `${v.width}x${v.height}`, v.width === WIDTH && v.height === HEIGHT);
check('pixel format', 'yuv420p', v.pix_fmt, v.pix_fmt === 'yuv420p');
const color = `${v.color_primaries}/${v.color_transfer}/${v.color_space}`;
check('colour', 'bt709/bt709/bt709', color, color === 'bt709/bt709/bt709');
check('range', 'tv (limited)', v.color_range, v.color_range === 'tv');
check('constant fps', `${FPS}/1`, `${v.r_frame_rate} (average ${v.avg_frame_rate})`,
  v.r_frame_rate === `${FPS}/1` && v.avg_frame_rate === `${FPS}/1`);
const frames = Number(v.nb_frames ?? Math.round(Number(v.duration ?? duration) * FPS));
check('duration', `${DURATION_IN_FRAMES} frames`, `${frames} frames (${duration.toFixed(3)} s in the file)`, frames === DURATION_IN_FRAMES);
check('audio', 'aac 48000 Hz stereo', a ? `${a.codec_name} ${a.sample_rate} Hz ${a.channels}ch` : 'no audio',
  !!a && ['aac', 'opus'].includes(a.codec_name) && a.sample_rate === '48000' && a.channels === 2);

// 2. a contact sheet per scene and a strip per cut
const select = (frames) => `select='${frames.map((n) => `eq(n\\,${n})`).join('+')}'`;
const tile = (frames, width, out) =>
  ffmpeg(['-y', '-i', video, '-vf', `${select(frames)},scale=${width}:-2,tile=${frames.length}x1`,
    '-fps_mode', 'vfr', '-frames:v', '1', out]);
SCENES.forEach((s, i) => {
  const last = s.from + s.durationInFrames - 1;
  const frames = [...new Set([0, 0.15, 0.35, 0.55, 0.8, 1].map((p) => Math.round(s.from + p * (last - s.from))))];
  tile(frames, 240, join(dir, 'sheets', `scene-${String(i + 1).padStart(2, '0')}-${s.id}.png`));
});
// A scene with a soft entrance (softIn: dissolve, crossfade) has no hard cut to find.
const plannedCuts = SCENES.slice(1).filter((s) => !s.softIn).map((s) => s.from);
plannedCuts.forEach((cut, i) => {
  const frames = [-3, -2, -1, 0, 1, 2, 3].map((d) => cut + d).filter((n) => n >= 0 && n < DURATION_IN_FRAMES);
  tile(frames, 200, join(dir, 'strips', `cut-${String(i + 1).padStart(2, '0')}-f${cut}.png`));
});

// 3. cuts: a spike of frame-to-frame difference (YDIF) on the planned frame.
// FFmpeg's scene detector does not see a text change over a dark background.
const stats = ffmpeg(['-i', video, '-vf', 'signalstats,metadata=print', '-an', ...nullOut])
  .split(/frame:\d+\s+pts:/).slice(1)
  .map((block) => Object.fromEntries([...block.matchAll(/signalstats\.(Y\w+)=([\d.]+)/g)].map((m) => [m[1], Number(m[2])])));
const ydif = stats.map((s) => s.YDIF ?? 0);
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const deltas = plannedCuts.map((cut) => {
  const around = [...ydif.slice(Math.max(0, cut - 10), Math.max(0, cut - 2)), ...ydif.slice(cut + 3, cut + 11)];
  const floor = Math.max(2, 3 * median(around));
  const candidates = [-1, 0, 1].map((d) => cut + d).filter((k) => k >= 0 && k < ydif.length);
  const best = candidates.reduce((b, k) => (ydif[k] > ydif[b] ? k : b), candidates[0]);
  return ydif[best] >= floor ? best - cut : null;
});
const missing = deltas.filter((d) => d === null).length;
const worst = Math.max(0, ...deltas.filter((d) => d !== null).map(Math.abs));
check('cuts on the planned frame', 'all, offset <= 1 frame',
  `${plannedCuts.length - missing}/${plannedCuts.length} seen, worst ${worst} frame(s)`, missing === 0 && worst <= 1);

// 4. black, frozen and silence outside the plan
const spans = (text, startKey, endKey) => {
  const starts = [...text.matchAll(new RegExp(`${startKey}:\\s*([\\d.]+)`, 'g'))].map((m) => Number(m[1]));
  const ends = [...text.matchAll(new RegExp(`${endKey}:\\s*([\\d.]+)`, 'g'))].map((m) => Number(m[1]));
  return starts.map((s, i) => [s, ends[i] ?? duration]);
};
const black = spans(ffmpeg(['-i', video, '-vf', 'blackdetect=d=0.1:pix_th=0.02', '-an', ...nullOut]), 'black_start', 'black_end')
  .filter(([s, e]) => !covered(s, e, HOLDS));
check('black frame outside the plan', 'none >= 0.1 s', black.length ? black.map(([s, e]) => `${s.toFixed(2)}-${e.toFixed(2)}s`).join(', ') : 'none', !black.length);
const EMPTY_RANGE = 20;
const emptyRuns = [];
let runStart = -1;
stats.forEach((s, i) => {
  const empty = (s.YMAX ?? 255) - (s.YMIN ?? 0) < EMPTY_RANGE;
  if (empty && runStart < 0) runStart = i;
  if ((!empty || i === stats.length - 1) && runStart >= 0) {
    const end = empty ? i + 1 : i;
    if (end - runStart >= 6 && !covered(runStart / FPS, end / FPS, HOLDS)) emptyRuns.push(`${sec(runStart)}-${sec(end)}s`);
    runStart = -1;
  }
});
check('empty frame (background only)', 'none >= 0.2 s', emptyRuns.length ? emptyRuns.join(', ') : 'none', !emptyRuns.length);
const frozen = spans(ffmpeg(['-i', video, '-vf', 'freezedetect=n=-60dB:d=0.5', '-an', ...nullOut]), 'freeze_start', 'freeze_end')
  .filter(([s, e]) => !covered(s, e, HOLDS));
check('frozen frame outside the plan', 'none >= 0.5 s', frozen.length ? frozen.map(([s, e]) => `${s.toFixed(2)}-${e.toFixed(2)}s`).join(', ') : 'none', !frozen.length);
const silent = a
  ? spans(ffmpeg(['-i', video, '-vn', '-af', 'silencedetect=n=-50dB:d=0.5', ...nullOut]), 'silence_start', 'silence_end')
      .filter(([s, e]) => !covered(s, e, SILENCES))
  : [];
check('silence outside the plan', 'none >= 0.5 s', silent.length ? silent.map(([s, e]) => `${s.toFixed(2)}-${e.toFixed(2)}s`).join(', ') : 'none', !silent.length);

// 5. flashes per second (pairs of opposite luma swings >= 10%)
const luma = stats.map((s) => s.YAVG ?? 0);
const swings = [];
let anchor = luma[0] ?? 0;
let direction = 0;
luma.forEach((y, i) => {
  const d = y - anchor;
  if (Math.abs(d) >= FLASH_LUMA && Math.sign(d) !== direction) {
    swings.push(i);
    direction = Math.sign(d);
    anchor = y;
  } else if ((direction > 0 && y > anchor) || (direction < 0 && y < anchor) || direction === 0) {
    anchor = direction === 0 ? anchor : y;
  }
});
let worstFlashes = 0;
swings.forEach((start) => {
  const inWindow = swings.filter((s) => s >= start && s < start + FPS).length;
  worstFlashes = Math.max(worstFlashes, Math.floor(inWindow / 2));
});
check('flashes per second', `<= ${FLASH_MAX_PER_SECOND}`, String(worstFlashes), worstFlashes <= FLASH_MAX_PER_SECOND);

// 6. loudness and true peak
if (a) {
  const loud = ffmpeg(['-i', video, '-vn', '-af', 'ebur128=peak=true', ...nullOut]);
  const summary = loud.slice(loud.lastIndexOf('Summary:'));
  const integrated = Number(summary.match(/I:\s*(-?[\d.]+) LUFS/)?.[1]);
  const peak = Number([...summary.matchAll(/Peak:\s*(-?[\d.inf]+) dBFS/g)].pop()?.[1]);
  check('integrated loudness', `${LUFS_TARGET} +-${LUFS_TOLERANCE} LUFS`, `${integrated} LUFS`, Math.abs(integrated - LUFS_TARGET) <= LUFS_TOLERANCE);
  check('true peak', `<= ${TRUE_PEAK_MAX} dBTP`, `${peak} dBTP`, peak <= TRUE_PEAK_MAX);
}

// 7. the text that appears on screen, for the Portuguese review (R16)
const texts = (ON_SCREEN_TEXT ?? SCENES.map((s) => s.text)).filter(Boolean);
note('on-screen text (proofread the spelling)', texts.map((t) => `"${t}"`).join(' | '));

const fails = rows.filter((r) => r.status === 'FAIL').length;
const table = [
  '| Item | Target | Measured | Status |',
  '|---|---|---|---|',
  ...rows.map((r) => `| ${r.item} | ${r.target} | ${r.measured} | ${r.status} |`),
].join('\n');
const images = [...readdirSync(join(dir, 'sheets')).map((f) => `sheets/${f}`), ...readdirSync(join(dir, 'strips')).map((f) => `strips/${f}`)];
writeFileSync(join(dir, 'SUMMARY.md'),
  `# Review ${iteration} -- ${video}\n\n${table}\n\n## Images for the eye pass\n\n${images.map((i) => `- ${i}`).join('\n')}\n`);
console.log(`\nReview ${iteration} of ${video}\n\n${table}\n`);
console.log(`images to read: out/review/${iteration}/sheets and strips (${images.length})`);
console.log(fails ? `\n${fails} item(s) failed\n` : '\nevery measured item passed -- the eye pass is still to do\n');
process.exit(fails ? 1 : 0);
