#!/usr/bin/env node
/**
 * Porta que impede o mesmo codigo de produzir dois videos diferentes.
 *
 * O Remotion renderiza por CAPTURA: o Chrome pinta o quadro N, fotografa,
 * avanca o relogio, pinta o N+1 -- e com concorrencia, quadros vizinhos saem
 * de abas diferentes. Duas coisas quebram isso sem erro e sem log:
 *   - CSS animado (transition, animation, @keyframes) roda no relogio de
 *     PAREDE: no Studio fica lindo, no MP4 tudo acontece no primeiro quadro.
 *   - Math.random, Date.now, timers e requestAnimationFrame mudam a cada
 *     captura: o resultado e cintilacao que muda de um render para outro.
 *
 * Aleatoriedade permitida: random('semente') do remotion e noise2D/3D/4D do
 * @remotion/noise. Excecao legitima e rara: comentario
 * "// determinismo-ok: <motivo>" na linha ou na linha anterior.
 *
 * Uso: node tools/check-determinism.mjs      (sai com 1 se achar quebra)
 *
 * @author Angatu Sistemas
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ESCAPE = 'determinismo-ok';

const RULES = [
  { name: 'sem-random', pattern: /\bMath\s*\.\s*random\s*\(/,
    why: "use random('semente') do remotion ou noise2D do @remotion/noise" },
  { name: 'sem-relogio', pattern: /\b(Date\s*\.\s*now\s*\(|new\s+Date\s*\(\s*\)|performance\s*\.\s*now\s*\()/,
    why: 'o tempo do video e useCurrentFrame(), nao o relogio da maquina' },
  { name: 'sem-css-animado',
    // So valor em string e CSS animado; `transition: Tipo` e anotacao de tipo.
    pattern: /(^|[^a-zA-Z-])(transition|animation|animationName|animationDuration|transitionDuration)\s*:\s*['"`]/,
    why: 'CSS animado roda no relogio de parede; calcule o valor a partir do quadro' },
  { name: 'sem-keyframes', pattern: /@keyframes\b/, why: 'mesma armadilha do CSS animado' },
  { name: 'sem-classe-animada', pattern: /className=["'`][^"'`]*\b(animate-|transition)/,
    why: 'classe de animacao (Tailwind ou nao) nao renderiza no Remotion' },
  { name: 'sem-temporizador', pattern: /\b(setTimeout|setInterval)\s*\(/,
    why: 'temporizador nao existe no tempo do video' },
  { name: 'sem-raf', pattern: /\brequestAnimationFrame\s*\(/,
    why: 'animar por rAF ignora o relogio do render' },
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
  console.error(`[determinismo] ${violations.length} quebra(s):\n\n${violations.join('\n\n')}\n`);
  process.exit(1);
}
console.log(`[determinismo] ok -- ${files.length} arquivos, nenhuma quebra`);
