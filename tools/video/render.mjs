#!/usr/bin/env node
/**
 * Render sem shell, com as conferencias antes.
 *
 * Chama o CLI do Remotion com o proprio Node (process.execPath) e argumentos
 * em lista. Pelo shell, o caminho com espaco ("Luan Victor") parte em dois e
 * o npx.cmd do Windows falha com EINVAL ao ser chamado sem shell.
 *
 * Antes de renderizar video: tools/check-determinism.mjs, tools/check-plan.mjs
 * e tools/sfx-bus.mjs (o barramento de efeitos e refeito a partir dos eventos
 * atuais, entao nunca fica velho). As opcoes de imagem e cor vem do
 * remotion.config.ts; aqui so entram as que mudam por modo.
 *
 * Nunca --log=error: esconde exatamente a mensagem que explica a falha.
 *
 * Uso:
 *   node tools/render.mjs rascunho [--frames=0-59]  -> out/rascunho.mp4 (meia escala, JPEG)
 *   node tools/render.mjs final                     -> out/final.mp4 (H.264, CRF 18, AAC 320k)
 *   node tools/render.mjs webm                      -> out/final.webm (VP9, so para web)
 *   node tools/render.mjs poster                    -> out/poster.png (POSTER_FRAME da linha do tempo)
 *   node tools/render.mjs still <quadro>            -> out/still-<quadro>.png
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
    console.error(`\n${what} falhou (saida ${r.status}). Leia a mensagem acima antes de tentar de novo.`);
    process.exit(r.status ?? 1);
  }
}

const tool = (name) => node([join(ROOT, 'tools', name)], name);
const remotion = (args) => node([CLI, ...args], `remotion ${args[0]}`);

const [mode = 'rascunho', ...rest] = process.argv.slice(2);
mkdirSync(join(ROOT, 'out'), { recursive: true });

if (['rascunho', 'final', 'webm'].includes(mode)) {
  tool('check-determinism.mjs');
  tool('check-plan.mjs');
  tool('sfx-bus.mjs');
}

switch (mode) {
  case 'rascunho':
    remotion(['render', ENTRY, COMPOSITION_ID, 'out/rascunho.mp4', '--scale=0.5', '--image-format=jpeg', ...rest]);
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
    if (!Number.isInteger(frame)) throw new Error('uso: node tools/render.mjs still <quadro>');
    remotion(['still', ENTRY, COMPOSITION_ID, `out/still-${frame}.png`, `--frame=${frame}`, ...rest]);
    break;
  }
  default:
    console.error('modo: rascunho | final | webm | poster | still <quadro>');
    process.exit(1);
}
