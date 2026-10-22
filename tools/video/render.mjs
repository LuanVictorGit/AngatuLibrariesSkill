#!/usr/bin/env node
/**
 * Render without a shell, with the checks first.
 *
 * Calls the Remotion CLI with Node itself (process.execPath) and the arguments
 * as a list. Through a shell, a path with a space ("Luan Victor") splits in two,
 * and Windows' npx.cmd fails with EINVAL when called without a shell.
 *
 * Before a video render: tools/check-determinism.mjs, tools/check-plan.mjs
 * and tools/sfx-bus.mjs (the effects bus is rebuilt from the current cues, so
 * it is never stale). The image and colour options come from
 * remotion.config.ts; only the ones that change per mode go here.
 *
 * Never --log=error: it hides exactly the message that explains the failure.
 *
 * Usage:
 *   node tools/render.mjs draft [--frames=0-59]     -> out/draft.mp4 (half scale, JPEG)
 *   node tools/render.mjs final                     -> out/final.mp4 (H.264, CRF 18, AAC 320k)
 *   node tools/render.mjs webm                      -> out/final.webm (VP9, for the web only)
 *   node tools/render.mjs poster                    -> out/poster.png (POSTER_FRAME of the timeline)
 *   node tools/render.mjs still <frame>             -> out/still-<frame>.png
 *
 * @author Angatu Sistemas
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMPOSITION_ID, POSTER_FRAME } from '../src/data/timeline.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CLI = join(ROOT, 'node_modules', '@remotion', 'cli', 'remotion-cli.js');
const ENTRY = join('src', 'index.ts');

function node(args, what) {
  const r = spawnSync(process.execPath, args, { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`\n${what} failed (exit ${r.status}). Read the message above before trying again.`);
    process.exit(r.status ?? 1);
  }
}

const tool = (name) => node([join(ROOT, 'tools', name)], name);
const remotion = (args) => node([CLI, ...args], `remotion ${args[0]}`);

const [mode = 'draft', ...rest] = process.argv.slice(2);
mkdirSync(join(ROOT, 'out'), { recursive: true });

if (['draft', 'final', 'webm'].includes(mode)) {
  tool('check-determinism.mjs');
  tool('check-plan.mjs');
  tool('sfx-bus.mjs');
}

switch (mode) {
  case 'draft':
    remotion(['render', ENTRY, COMPOSITION_ID, 'out/draft.mp4', '--scale=0.5', '--image-format=jpeg', ...rest]);
    break;
  case 'final':
    remotion(['render', ENTRY, COMPOSITION_ID, 'out/final.mp4', '--codec=h264', '--crf=18',
      '--audio-codec=aac', '--audio-bitrate=320k', ...rest]);
    break;
  case 'webm':
    remotion(['render', ENTRY, COMPOSITION_ID, 'out/final.webm', '--codec=vp9', '--crf=32', ...rest]);
    break;
  case 'poster':
    remotion(['still', ENTRY, COMPOSITION_ID, 'out/poster.png', `--frame=${POSTER_FRAME}`, ...rest]);
    break;
  case 'still': {
    const frame = Number(rest.shift());
    if (!Number.isInteger(frame)) throw new Error('usage: node tools/render.mjs still <frame>');
    remotion(['still', ENTRY, COMPOSITION_ID, `out/still-${frame}.png`, `--frame=${frame}`, ...rest]);
    break;
  }
  default:
    console.error('mode: draft | final | webm | poster | still <frame>');
    process.exit(1);
}
