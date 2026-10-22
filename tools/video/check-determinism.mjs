#!/usr/bin/env node
/**
 * Gate that stops the same code from producing two different videos.
 *
 * Remotion renders by CAPTURE: Chrome paints frame N, takes a picture,
 * advances the clock, paints N+1 -- and with concurrency, neighbouring frames
 * come from different tabs. Two things break this with no error and no log:
 *   - Animated CSS (transition, animation, @keyframes) runs on the WALL
 *     clock: in the Studio it looks right, in the MP4 everything happens on
 *     the first frame.
 *   - Math.random, Date.now, timers and requestAnimationFrame change on every
 *     capture: the result is a flicker that differs from one render to the next.
 *
 * Allowed randomness: random('seed') from remotion and noise2D/3D/4D from
 * @remotion/noise. A legitimate and rare exception: the comment
 * "// determinism-ok: <reason>" on the line or on the line above.
 *
 * Usage: node tools/check-determinism.mjs      (exits with 1 when it finds a violation)
 *
 * @author Angatu Sistemas
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ESCAPE = 'determinism-ok';

const RULES = [
  { name: 'no-random', pattern: /\bMath\s*\.\s*random\s*\(/,
    why: "use random('seed') from remotion or noise2D from @remotion/noise" },
  { name: 'no-clock', pattern: /\b(Date\s*\.\s*now\s*\(|new\s+Date\s*\(\s*\)|performance\s*\.\s*now\s*\()/,
    why: "the video's time is useCurrentFrame(), not the machine's clock" },
  { name: 'no-animated-css',
    // Only a string value is animated CSS; `transition: Type` is a type annotation.
    pattern: /(^|[^a-zA-Z-])(transition|animation|animationName|animationDuration|transitionDuration)\s*:\s*['"`]/,
    why: 'animated CSS runs on the wall clock; compute the value from the frame' },
  { name: 'no-keyframes', pattern: /@keyframes\b/, why: 'the same trap as animated CSS' },
  { name: 'no-animated-class', pattern: /className=["'`][^"'`]*\b(animate-|transition)/,
    why: 'an animation class (Tailwind or not) does not render in Remotion' },
  { name: 'no-timer', pattern: /\b(setTimeout|setInterval)\s*\(/,
    why: "a timer does not exist in the video's time" },
  { name: 'no-raf', pattern: /\brequestAnimationFrame\s*\(/,
    why: "animating with rAF ignores the render's clock" },
];

function walk(dir, out) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== 'node_modules') walk(full, out);
    } else if (['.ts', '.tsx', '.css'].includes(extname(entry))) {
      out.push(full);
    }
  }
  return out;
}

const violations = [];
const files = walk(join(ROOT, 'src'), []);
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    const t = line.trim();
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
    if (line.includes(ESCAPE) || (lines[i - 1] ?? '').includes(ESCAPE)) return;
    for (const rule of RULES) {
      if (rule.pattern.test(line)) {
        violations.push(`  ${relative(ROOT, file)}:${i + 1} [${rule.name}]\n    ${t.slice(0, 110)}\n    -> ${rule.why}`);
      }
    }
  });
}

if (violations.length) {
  console.error(`[determinism] ${violations.length} violation(s):\n\n${violations.join('\n\n')}\n`);
  process.exit(1);
}
console.log(`[determinism] ok -- ${files.length} files, no violations`);
