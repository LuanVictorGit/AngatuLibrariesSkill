#!/usr/bin/env node
/**
 * Transforma o video renderizado em evidencia que o agente consegue ler.
 *
 * O agente nao assiste video nem ouve audio: le imagens e numeros. Este script
 * produz os dois, contra o plano (src/data/timeline.ts):
 *   imagens  sheets/  uma folha de contato por cena (entrada, meio, saida)
 *            strips/  cada corte de -3 a +3 quadros (piscada, quadro vazio, salto)
 *   numeros  especificacao e cor (ffprobe), cortes detectados x planejados,
 *            quadro preto, congelado e silencio fora do planejado, flashes por
 *            segundo (limite 3, fotossensibilidade), loudness e pico real.
 *
 * Saida: out/review/NN/ (NN = proxima iteracao) com RESUMO.md; o mesmo quadro de
 * evidencias vai para a tela. Sai com 1 se algum item reprovar.
 *
 * Uso: node tools/review.mjs [out/final.mp4]
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
const FLASH_LUMA = 25.5; // 10% da escala de luminancia
const FLASH_MAX_PER_SECOND = 3;

const video = process.argv[2] ?? 'out/final.mp4';
if (!existsSync(join(ROOT, video))) {
  console.error(`nao achei ${video}: renderize antes (node tools/render.mjs final)`);
  process.exit(1);
}

const reviewRoot = join(ROOT, 'out', 'review');
mkdirSync(reviewRoot, { recursive: true });
const iteration = String(readdirSync(reviewRoot).filter((d) => /^\d+$/.test(d)).length + 1).padStart(2, '0');
const dir = join(reviewRoot, iteration);
for (const sub of ['sheets', 'strips']) mkdirSync(join(dir, sub), { recursive: true });

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`${cmd} falhou:\n${r.stderr}`);
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

// 1. especificacao e cor
const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', video]).trim());
const v = probe.streams.find((s) => s.codec_type === 'video');
const a = probe.streams.find((s) => s.codec_type === 'audio');
const duration = Number(probe.format.duration);
check('codec de video', 'h264 ou vp9', v.codec_name, ['h264', 'vp9'].includes(v.codec_name));
check('resolucao', `${WIDTH}x${HEIGHT}`, `${v.width}x${v.height}`, v.width === WIDTH && v.height === HEIGHT);
check('pixel', 'yuv420p', v.pix_fmt, v.pix_fmt === 'yuv420p');
const color = `${v.color_primaries}/${v.color_transfer}/${v.color_space}`;
check('cor', 'bt709/bt709/bt709', color, color === 'bt709/bt709/bt709');
check('faixa', 'tv (limitada)', v.color_range, v.color_range === 'tv');
check('fps constante', `${FPS}/1`, `${v.r_frame_rate} (media ${v.avg_frame_rate})`,
  v.r_frame_rate === `${FPS}/1` && v.avg_frame_rate === `${FPS}/1`);
const frames = Number(v.nb_frames ?? Math.round(Number(v.duration ?? duration) * FPS));
check('duracao', `${DURATION_IN_FRAMES} quadros`, `${frames} quadros (${duration.toFixed(3)} s no arquivo)`, frames === DURATION_IN_FRAMES);
check('audio', 'aac 48000 Hz estereo', a ? `${a.codec_name} ${a.sample_rate} Hz ${a.channels}ch` : 'sem audio',
  !!a && ['aac', 'opus'].includes(a.codec_name) && a.sample_rate === '48000' && a.channels === 2);

// 2. folha de contato por cena e tira de cada corte
const select = (frames) => `select='${frames.map((n) => `eq(n\\,${n})`).join('+')}'`;
const tile = (frames, width, out) =>
  ffmpeg(['-y', '-i', video, '-vf', `${select(frames)},scale=${width}:-2,tile=${frames.length}x1`,
    '-fps_mode', 'vfr', '-frames:v', '1', out]);
SCENES.forEach((s, i) => {
  const last = s.from + s.durationInFrames - 1;
  const frames = [...new Set([0, 0.15, 0.35, 0.55, 0.8, 1].map((p) => Math.round(s.from + p * (last - s.from))))];
  tile(frames, 240, join(dir, 'sheets', `cena-${String(i + 1).padStart(2, '0')}-${s.id}.png`));
});
// Cena com entrada suave (softIn: dissolucao, fusao) nao tem corte seco para achar.
const plannedCuts = SCENES.slice(1).filter((s) => !s.softIn).map((s) => s.from);
plannedCuts.forEach((cut, i) => {
  const frames = [-3, -2, -1, 0, 1, 2, 3].map((d) => cut + d).filter((n) => n >= 0 && n < DURATION_IN_FRAMES);
  tile(frames, 200, join(dir, 'strips', `corte-${String(i + 1).padStart(2, '0')}-q${cut}.png`));
});

// 3. cortes: pico de diferenca quadro a quadro (YDIF) no quadro planejado.
// O detector de cena do FFmpeg nao ve troca de texto sobre fundo escuro.
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
check('cortes no quadro planejado', 'todos, diferenca <= 1 quadro',
  `${plannedCuts.length - missing}/${plannedCuts.length} vistos, pior ${worst} quadro(s)`, missing === 0 && worst <= 1);

// 4. preto, congelado e silencio fora do plano
const spans = (text, startKey, endKey) => {
  const starts = [...text.matchAll(new RegExp(`${startKey}:\\s*([\\d.]+)`, 'g'))].map((m) => Number(m[1]));
  const ends = [...text.matchAll(new RegExp(`${endKey}:\\s*([\\d.]+)`, 'g'))].map((m) => Number(m[1]));
  return starts.map((s, i) => [s, ends[i] ?? duration]);
};
const black = spans(ffmpeg(['-i', video, '-vf', 'blackdetect=d=0.1:pix_th=0.02', '-an', ...nullOut]), 'black_start', 'black_end')
  .filter(([s, e]) => !covered(s, e, HOLDS));
check('quadro preto fora do plano', 'nenhum >= 0,1 s', black.length ? black.map(([s, e]) => `${s.toFixed(2)}-${e.toFixed(2)}s`).join(', ') : 'nenhum', !black.length);
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
check('quadro vazio (so fundo)', 'nenhum >= 0,2 s', emptyRuns.length ? emptyRuns.join(', ') : 'nenhum', !emptyRuns.length);
const frozen = spans(ffmpeg(['-i', video, '-vf', 'freezedetect=n=-60dB:d=0.5', '-an', ...nullOut]), 'freeze_start', 'freeze_end')
  .filter(([s, e]) => !covered(s, e, HOLDS));
check('quadro congelado fora do plano', 'nenhum >= 0,5 s', frozen.length ? frozen.map(([s, e]) => `${s.toFixed(2)}-${e.toFixed(2)}s`).join(', ') : 'nenhum', !frozen.length);
const silent = a
  ? spans(ffmpeg(['-i', video, '-vn', '-af', 'silencedetect=n=-50dB:d=0.5', ...nullOut]), 'silence_start', 'silence_end')
      .filter(([s, e]) => !covered(s, e, SILENCES))
  : [];
check('silencio fora do plano', 'nenhum >= 0,5 s', silent.length ? silent.map(([s, e]) => `${s.toFixed(2)}-${e.toFixed(2)}s`).join(', ') : 'nenhum', !silent.length);

// 5. flashes por segundo (pares de variacao oposta de luminancia >= 10%)
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
check('flashes por segundo', `<= ${FLASH_MAX_PER_SECOND}`, String(worstFlashes), worstFlashes <= FLASH_MAX_PER_SECOND);

// 6. loudness e pico real
if (a) {
  const loud = ffmpeg(['-i', video, '-vn', '-af', 'ebur128=peak=true', ...nullOut]);
  const summary = loud.slice(loud.lastIndexOf('Summary:'));
  const integrated = Number(summary.match(/I:\s*(-?[\d.]+) LUFS/)?.[1]);
  const peak = Number([...summary.matchAll(/Peak:\s*(-?[\d.inf]+) dBFS/g)].pop()?.[1]);
  check('loudness integrado', `${LUFS_TARGET} +-${LUFS_TOLERANCE} LUFS`, `${integrated} LUFS`, Math.abs(integrated - LUFS_TARGET) <= LUFS_TOLERANCE);
  check('pico real', `<= ${TRUE_PEAK_MAX} dBTP`, `${peak} dBTP`, peak <= TRUE_PEAK_MAX);
}

// 7. texto que aparece na tela, para a revisao de portugues (R16)
const texts = (ON_SCREEN_TEXT ?? SCENES.map((s) => s.text)).filter(Boolean);
note('textos na tela (revisar a grafia)', texts.map((t) => `"${t}"`).join(' | '));

const fails = rows.filter((r) => r.status === 'FAIL').length;
const table = [
  '| Item | Meta | Medido | Status |',
  '|---|---|---|---|',
  ...rows.map((r) => `| ${r.item} | ${r.target} | ${r.measured} | ${r.status} |`),
].join('\n');
const images = [...readdirSync(join(dir, 'sheets')).map((f) => `sheets/${f}`), ...readdirSync(join(dir, 'strips')).map((f) => `strips/${f}`)];
writeFileSync(join(dir, 'RESUMO.md'),
  `# Revisao ${iteration} -- ${video}\n\n${table}\n\n## Imagens para o passe do olho\n\n${images.map((i) => `- ${i}`).join('\n')}\n`);
console.log(`\nRevisao ${iteration} de ${video}\n\n${table}\n`);
console.log(`imagens para ler: out/review/${iteration}/sheets e strips (${images.length})`);
console.log(fails ? `\n${fails} item(ns) reprovado(s)\n` : '\ntodos os itens medidos passaram -- falta o passe do olho\n');
process.exit(fails ? 1 : 0);
