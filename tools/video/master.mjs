#!/usr/bin/env node
/**
 * Masterizacao do audio do video renderizado: -14 LUFS integrado e pico real
 * de no maximo -1 dBTP, sem mexer na imagem (-c:v copy) e com +faststart.
 *
 * -14 LUFS / -1 dBTP e convencao de mercado para redes sociais, nao
 * especificacao publicada por Instagram, TikTok ou YouTube.
 *
 * Cadeia: mede -> limitador so nos picos -> ganho estatico -> mede de novo.
 * Nada de compressao "automatica": o equilibrio entre voz, musica e efeitos foi
 * decidido na composicao e aqui so se sobe o todo sem estourar.
 *
 * Armadilha: o alimiter do FFmpeg olha adiante (attack) e ATRASA o audio desse
 * tanto se latency=1 nao estiver ligado -- um video sincronizado quadro a
 * quadro sairia fora de sincronia no master. level=0 desliga o ganho automatico.
 *
 * Uso: node tools/master.mjs [out/final.mp4] [out/final-master.mp4]
 *
 * @author Angatu Sistemas
 */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TARGET_LUFS = -14;
const TARGET_TP = -1.0;
const MARGIN_DB = 0.8; // o AAC sobe o pico real alguns decimos de dB
const input = process.argv[2] ?? 'out/final.mp4';
const output = process.argv[3] ?? input.replace(/\.mp4$/, '-master.mp4');

function ffmpeg(args) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`ffmpeg falhou:\n${r.stderr}`);
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
// Ate 5 tentativas: o pico real manda (se passou, mais margem no limitador);
// depois o loudness (se desviou, corrige o ganho). O limitador so toca picos.
for (let attempt = 0; attempt < 5; attempt++) {
  chain = apply(gain, TARGET_TP - margin - gain);
  after = measure(join(ROOT, output));
  const peakOk = after.tp <= TARGET_TP;
  const loudOk = Math.abs(after.lufs - TARGET_LUFS) <= 0.4;
  if (peakOk && loudOk) break;
  if (!peakOk) margin += after.tp - TARGET_TP + 0.2;
  if (!loudOk) gain += TARGET_LUFS - after.lufs;
}

console.log(`antes : ${before.lufs} LUFS, pico real ${before.tp} dBTP`);
console.log(`cadeia: ${chain}`);
console.log(`depois: ${after.lufs} LUFS, pico real ${after.tp} dBTP -> ${output}`);
const depth = before.tp + gain - (TARGET_TP - margin);
if (depth > 6) {
  console.log(`aviso: o limitador corta ~${depth.toFixed(1)} dB de pico -- a mix esta esmagada; baixe os picos na composicao (gainDb dos efeitos, volume da musica) e renderize de novo`);
}
const ok = Math.abs(after.lufs - TARGET_LUFS) <= 1 && after.tp <= TARGET_TP;
console.log(ok ? 'master ok' : 'master FORA do alvo: revise a mix na composicao (ganhos dos efeitos e da musica)');
process.exit(ok ? 0 : 1);
