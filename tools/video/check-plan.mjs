#!/usr/bin/env node
/**
 * Confere o plano ANTES de renderizar: a tabela de quadros que o render so
 * mostraria minutos depois, quando o erro ja custou um render inteiro.
 *
 * Le src/data/timeline.ts (e music.ts, narration.ts e sfx.ts quando existem)
 * direto no Node e acusa:
 *   - buraco ou sobreposicao entre cenas; cena que nao fecha a duracao;
 *   - corte fora da grade da musica (mais de 1 quadro do lugar certo);
 *   - drop sem corte nem evento de impacto;
 *   - texto na tela por menos tempo do que se leva para le-lo;
 *   - efeito sonoro sem ancora medida (rode tools/analyze-sfx.py);
 *   - mais de 3 flashes em qualquer janela de 1 segundo;
 *   - evento ou poster fora do video.
 *
 * Uso: node tools/check-plan.mjs      (sai com 1 se houver erro)
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
  console.error('timeline.ts precisa exportar FPS, SCENES e DURATION_IN_FRAMES');
  process.exit(1);
}

const errors = [];
const warnings = [];
const sec = (fr) => (fr / FPS).toFixed(2);
const WORDS_PER_SEC = 2.5;
const MIN_HOLD_SEC = 0.8;

console.log(`\n${SCENES.length} cenas, ${DURATION_IN_FRAMES} quadros (${sec(DURATION_IN_FRAMES)} s) a ${FPS} fps\n`);
console.log('cena                 inicio   fim   quadros   segundos   ancora');
let cursor = 0;
for (const s of SCENES) {
  const end = s.from + s.durationInFrames;
  console.log(`${s.id.padEnd(20)} ${String(s.from).padStart(6)} ${String(end).padStart(5)} ${String(s.durationInFrames).padStart(9)} ${sec(s.durationInFrames).padStart(10)}   ${s.anchor ?? ''}`);
  if (s.from > cursor) errors.push(`${s.id}: buraco de ${s.from - cursor} quadros antes da cena`);
  if (s.from < cursor) errors.push(`${s.id}: sobrepoe a cena anterior em ${cursor - s.from} quadros`);
  if (s.durationInFrames <= 0) errors.push(`${s.id}: duracao ${s.durationInFrames}`);
  if (s.text) {
    const words = s.text.trim().split(/\s+/).length;
    const need = Math.max(MIN_HOLD_SEC, words / WORDS_PER_SEC);
    if (s.durationInFrames / FPS < need) {
      (s.flash ? warnings : errors).push(`${s.id}: "${s.text}" fica ${sec(s.durationInFrames)} s; leitura pede ${need.toFixed(1)} s`);
    }
  }
  cursor = end;
}
if (cursor !== DURATION_IN_FRAMES) errors.push(`as cenas terminam em ${cursor}, o video em ${DURATION_IN_FRAMES}`);

if (MUSIC?.beatFrames?.length) {
  const grid = MUSIC.beatFrames.map((b) => b - VISUAL_LEAD);
  const nearest = (fr) => grid.reduce((best, g) => (Math.abs(g - fr) < Math.abs(best - fr) ? g : best), grid[0]);
  console.log('\ncorte (quadro)   batida mais proxima   diferenca');
  for (const s of SCENES.slice(1)) {
    const d = s.from - nearest(s.from);
    console.log(`${String(s.from).padStart(14)} ${String(nearest(s.from)).padStart(21)} ${String(d).padStart(11)}`);
    if (Math.abs(d) > 1) errors.push(`${s.id}: corte a ${d} quadros da grade (VISUAL_LEAD=${VISUAL_LEAD})`);
  }
  if (MUSIC.dropFrame != null) {
    const target = MUSIC.dropFrame - VISUAL_LEAD;
    const cut = SCENES.some((s) => Math.abs(s.from - target) <= 1);
    const cue = CUES.some((c) => c.kind === 'drop' && Math.abs(c.frame - MUSIC.dropFrame) <= 1);
    if (!cut && !cue) errors.push(`drop em ${MUSIC.dropFrame} sem corte nem evento 'drop': a maior mudanca tem de estar la`);
  }
}

for (const c of CUES) {
  if (c.frame < 0 || c.frame >= DURATION_IN_FRAMES) errors.push(`evento ${c.id} fora do video (quadro ${c.frame})`);
  if (c.sfx && !SFX?.[c.sfx]) errors.push(`evento ${c.id}: efeito "${c.sfx}" sem ancora em sfx.ts (rode tools/analyze-sfx.py)`);
  if (c.sfx && SFX?.[c.sfx]) {
    const startMs = (c.frame / FPS) * 1000 - SFX[c.sfx].anchorMs;
    if (startMs < 0) errors.push(`evento ${c.id}: o efeito teria de comecar ${Math.round(-startMs)} ms antes do video`);
  }
}

const flashes = CUES.filter((c) => c.kind === 'flash' || c.kind === 'drop').map((c) => c.frame).sort((a, b) => a - b);
for (let i = 0; i < flashes.length; i++) {
  const inWindow = flashes.filter((fr) => fr >= flashes[i] && fr < flashes[i] + FPS).length;
  if (inWindow > 3) {
    errors.push(`${inWindow} flashes no segundo que comeca em ${sec(flashes[i])} s (limite: 3)`);
    break;
  }
}

if (POSTER_FRAME != null && (POSTER_FRAME < 0 || POSTER_FRAME >= DURATION_IN_FRAMES)) {
  errors.push(`POSTER_FRAME ${POSTER_FRAME} fora do video`);
}

console.log('');
for (const w of warnings) console.log(`aviso  ${w}`);
for (const e of errors) console.log(`ERRO   ${e}`);
console.log(errors.length ? `\n${errors.length} erro(s): corrigir o plano antes de renderizar\n` : '\nplano ok\n');
process.exit(errors.length ? 1 : 0);
