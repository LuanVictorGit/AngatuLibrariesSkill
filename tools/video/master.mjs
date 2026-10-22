#!/usr/bin/env node
/**
 * Mastering of the rendered video's audio: -14 LUFS integrated and a true peak
 * of at most -1 dBTP, without touching the picture (-c:v copy) and with +faststart.
 *
 * -14 LUFS / -1 dBTP is a market convention for social video, not a
 * specification published by Instagram, TikTok or YouTube.
 *
 * Chain: measure -> limiter on the peaks only -> static gain -> measure again.
 * No "automatic" compression: the balance between voice, music and effects was
 * decided in the composition, and here the whole is only raised without clipping.
 *
 * Trap: FFmpeg's alimiter looks ahead (attack) and DELAYS the audio by that
 * much unless latency=1 is on -- a video synchronised to the frame would come
 * out of the master out of sync. level=0 turns off the automatic gain.
 *
 * Usage: node tools/master.mjs [out/final.mp4] [out/final-master.mp4]
 *
 * @author Angatu Sistemas
 */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TARGET_LUFS = -14;
const TARGET_TP = -1.0;
const MARGIN_DB = 0.8; // AAC raises the true peak by a few tenths of a dB
const input = process.argv[2] ?? 'out/final.mp4';
const output = process.argv[3] ?? input.replace(/\.mp4$/, '-master.mp4');

function ffmpeg(args) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`ffmpeg failed:\n${r.stderr}`);
  return r.stderr;
}

function measure(file) {
  const log = ffmpeg(['-i', file, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const s = log.slice(log.lastIndexOf('Summary:'));
  return {
    lufs: Number(s.match(/I:\s*(-?[\d.]+) LUFS/)[1]),
    tp: Number([...s.matchAll(/Peak:\s*(-?[\d.]+) dBFS/g)].pop()[1]),
  };
}

function apply(gainDb, limitDb) {
  const limit = Math.min(1, 10 ** (limitDb / 20)).toFixed(4);
  const chain = `alimiter=limit=${limit}:attack=5:release=60:level=0:latency=1,volume=${gainDb.toFixed(2)}dB`;
  ffmpeg(['-y', '-i', input, '-map', '0:v', '-map', '0:a', '-c:v', 'copy', '-af', chain,
    '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-movflags', '+faststart', output]);
  return chain;
}

const before = measure(join(ROOT, input));
let gain = TARGET_LUFS - before.lufs;
let margin = MARGIN_DB;
let chain;
let after;
// Up to 5 tries: the true peak decides first (if it went over, more margin on the
// limiter); then the loudness (if it drifted, correct the gain). The limiter only touches peaks.
for (let attempt = 0; attempt < 5; attempt++) {
  chain = apply(gain, TARGET_TP - margin - gain);
  after = measure(join(ROOT, output));
  const peakOk = after.tp <= TARGET_TP;
  const loudOk = Math.abs(after.lufs - TARGET_LUFS) <= 0.4;
  if (peakOk && loudOk) break;
  if (!peakOk) margin += after.tp - TARGET_TP + 0.2;
  if (!loudOk) gain += TARGET_LUFS - after.lufs;
}

console.log(`before: ${before.lufs} LUFS, true peak ${before.tp} dBTP`);
console.log(`chain : ${chain}`);
console.log(`after : ${after.lufs} LUFS, true peak ${after.tp} dBTP -> ${output}`);
const depth = before.tp + gain - (TARGET_TP - margin);
if (depth > 6) {
  console.log(`warning: the limiter cuts ~${depth.toFixed(1)} dB of peak -- the mix is crushed; lower the peaks in the composition (the effects' gainDb, the music volume) and render again`);
}
const ok = Math.abs(after.lufs - TARGET_LUFS) <= 1 && after.tp <= TARGET_TP;
console.log(ok ? 'master ok' : 'master OFF target: review the mix in the composition (effect and music gains)');
process.exit(ok ? 0 : 1);
