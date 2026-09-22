#!/usr/bin/env node
/**
 * Mixa todos os efeitos sonoros da linha do tempo num unico arquivo:
 * public/audio/sfx-bus.wav, que a composicao toca com UM <Audio>.
 *
 * Por que um barramento e nao um <Audio> por efeito: no Windows, cada camada
 * de audio alonga a linha de comando que o Remotion passa ao FFmpeg, e uma
 * edicao com dezenas de acertos estoura o limite (ENAMETOOLONG). Aqui o grafo
 * de filtros vai num arquivo, e cada arquivo de efeito entra uma vez so,
 * dividido com asplit quando e usado varias vezes.
 *
 * Sincronia por construcao: o instante de cada efeito vem do MESMO evento que
 * move a imagem (CUES em timeline.ts), menos a ancora medida do arquivo
 * (sfx.ts, de tools/analyze-sfx.py) -- o pico do whoosh cai no corte, nao o
 * comeco do arquivo. Mudou a linha do tempo, rode de novo; a revisao compara
 * o carimbo gravado ao lado do WAV com os eventos atuais.
 *
 * Cada efeito e aparado em MAX_MS (padrao 2,5 s; o evento pode pedir outro em
 * maxMs) com fade de 80 ms: impacto de biblioteca costuma trazer segundos de
 * cauda, que embolam a mix e escondem o proximo acerto.
 *
 * Uso: node tools/sfx-bus.mjs
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
// Video sem efeitos nao tem sfx.ts: o barramento sai em silencio, do tamanho do video.
const SFX_FILE = join(ROOT, 'src', 'data', 'sfx.ts');
const { SFX } = existsSync(SFX_FILE) ? await import(pathToFileURL(SFX_FILE).href) : { SFX: {} };
const OUT_DIR = join(ROOT, 'public', 'audio');
const OUT = join(OUT_DIR, 'sfx-bus.wav');
const totalSec = DURATION_IN_FRAMES / FPS;
const MAX_MS = 2500;
const FADE_S = 0.08;

const uses = CUES.filter((c) => c.sfx).map((c) => {
  const s = SFX[c.sfx];
  if (!s) throw new Error(`evento ${c.id}: efeito "${c.sfx}" sem ancora em sfx.ts`);
  const delayMs = Math.round((c.frame / FPS) * 1000 - s.anchorMs);
  if (delayMs < 0) throw new Error(`evento ${c.id}: comecaria ${-delayMs} ms antes do video`);
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
// -t fecha a duracao exata do video: o apad acima preenche silencio ate la.
args.push('-/filter_complex', graphFile, '-map', '[out]', '-t', String(totalSec), '-c:a', 'pcm_s16le', OUT);
const r = spawnSync('ffmpeg', args, { stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status ?? 1);

const stamp = createHash('sha1').update(JSON.stringify(uses.map((u) => [u.name, u.delayMs, u.gainDb, u.maxSec]))).digest('hex');
writeFileSync(join(OUT_DIR, 'sfx-bus.json'), JSON.stringify({ stamp, fps: FPS, uses }, null, 2));
console.log(`${uses.length} efeitos, ${new Set(uses.map((u) => u.file)).size} arquivos -> public/audio/sfx-bus.wav (${totalSec.toFixed(2)} s)`);
for (const u of uses) console.log(`  ${u.id.padEnd(14)} ${u.name.padEnd(28)} entra em ${String(u.delayMs).padStart(6)} ms  ${u.gainDb} dB`);
