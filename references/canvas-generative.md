# Arte Generativa — Canvas 2D

> **Auditoria:** Angatu Sistemas · Tradução e otimização de `canvas-generative` para frontend vanilla AngatuLibraries (Canvas 2D + Tailwind local) · Código em inglês, documentação em português

> **Regra Global Angatu — Responsividade sempre em Tailwind CSS (§9.6 do SKILL.md):** todo layout responsivo (breakpoints, grids, visibilidade, espaçamento, tipografia, ordem, largura/altura) é feito **exclusivamente com utilitários responsivos do Tailwind** (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`) — nunca com `@media (min-width: ...)` manual como primeira opção. Princípios de `mobile-principles` e `desktop-principles` permanecem válidos, mas sua implementação no HTML/CSS vanilla é sempre via classes Tailwind (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, `hidden lg:block`, `text-sm md:text-base` etc.).


## Setup obrigatório (DPR-aware, sem blur em Retina)

Todo canvas deve ser nítido em Retina/HiDPI. Buffer no tamanho físico, CSS no tamanho lógico.

```js
function setupCanvas(canvas, width, height) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr; canvas.height = height * dpr;
  canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr); return ctx;
}
```

**Resize com ResizeObserver:**

```js
function handleResize(canvas, ctx, draw) {
  const observer = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr; canvas.height = height * dpr;
    ctx.scale(dpr, dpr); draw();
  });
  observer.observe(canvas.parentElement);
  return () => observer.disconnect();
}
```

**Loop com requestAnimationFrame:**

```js
let rafId, prevTime = 0;
function loop(time) {
  const dt = Math.min((time - prevTime) / 1000, 0.1);
  prevTime = time;
  update(dt); render(ctx);
  rafId = requestAnimationFrame(loop);
}
rafId = requestAnimationFrame(loop);
// parar: cancelAnimationFrame(rafId);
```

---

## Ruído

| Tipo | Características | Ideal para |
|---|---|---|
| Perlin | Suave, viés de grade, barato | Terreno, nuvens, texturas suaves |
| Simplex | Sem artefatos de grade, gradientes melhores | Flow fields, movimento orgânico, tiling |
| Worley (celular) | Distância ao ponto mais próximo | Voronoi, cáusticas, rachaduras |

**Regras:** sempre escale coordenadas (`x / noiseScale`); use oitavas (fBm) para detalhe; aplique seed para reprodutibilidade.

```js
function fbm(x, y, octaves = 4, lacunarity = 2, gain = 0.5) {
  let value = 0, amplitude = 1, frequency = 1, maxAmp = 0;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2D(x * frequency, y * frequency);
    maxAmp += amplitude; amplitude *= gain; frequency *= lacunarity;
  }
  return value / maxAmp;
}
```

---

## Sistemas de partículas (pool sem GC)

Pré-aloque array fixo. Nunca `new`/`splice` em runtime.

```js
const POOL_SIZE = 10000;
const particles = new Array(POOL_SIZE);
let aliveCount = 0;
for (let i = 0; i < POOL_SIZE; i++) particles[i] = { x:0, y:0, vx:0, vy:0, life:0, maxLife:0, active:false };

function spawn(x, y) {
  if (aliveCount >= POOL_SIZE) return;
  const p = particles[aliveCount++]; p.x = x; p.y = y;
  p.vx = (Math.random()-0.5)*2; p.vy = (Math.random()-0.5)*2;
  p.life = 0; p.maxLife = 60 + Math.random()*60; p.active = true;
}
function update() {
  for (let i = aliveCount - 1; i >= 0; i--) {
    const p = particles[i]; p.x += p.vx; p.y += p.vy; p.life++;
    if (p.life >= p.maxLife) { particles[i] = particles[--aliveCount]; particles[aliveCount] = p; p.active = false; }
  }
}
```

---

## Flow Fields

Grade de vetores que guiam partículas — receita clássica generativa.

```js
const cols = Math.ceil(width / cellSize), rows = Math.ceil(height / cellSize);
const field = new Float32Array(cols * rows);
for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++)
  field[y*cols + x] = noise2D(x*0.05, y*0.05) * Math.PI * 2;

function followField(p) {
  const col = Math.floor(p.x / cellSize), row = Math.floor(p.y / cellSize);
  if (col>=0 && col<cols && row>=0 && row<rows) {
    const angle = field[row*cols + col];
    p.vx += Math.cos(angle) * force; p.vy += Math.sin(angle) * force;
  }
  p.vx *= 0.98; p.vy *= 0.98;
}
```

---

## Fractais e L-systems

| Componente | Papel |
|---|---|
| Axioma | String inicial (`"F"`) |
| Regras | Produções (`"F" -> "F[+F]F[-F]F"`) |
| Ângulo | Giro por `+`/`-` |
| Iterações | Vezes que aplica regras |

```js
function lsystem(axiom, rules, iterations) {
  let current = axiom;
  for (let i = 0; i < iterations; i++) current = current.split('').map(c => rules[c] || c).join('');
  return current;
}
function drawLSystem(ctx, commands, len, angle) {
  const stack = [];
  for (const c of commands) {
    switch(c){ case 'F': ctx.lineTo(ctx._x += Math.cos(ctx._a)*len, ctx._y += Math.sin(ctx._a)*len); break;
      case '+': ctx._a += angle; break; case '-': ctx._a -= angle; break;
      case '[': stack.push({x:ctx._x,y:ctx._y,a:ctx._a}); break;
      case ']': { const s=stack.pop(); ctx._x=s.x; ctx._y=s.y; ctx._a=s.a; ctx.moveTo(s.x,s.y);} break; }
  }
}
```

---

## Double buffer (trilha e flicker-free)

Renderize em offscreen, depois copie para o visível. Permite trilhas.

```js
const offscreen = document.createElement('canvas');
offscreen.width = canvas.width; offscreen.height = canvas.height;
const offCtx = offscreen.getContext('2d');
function render(){
  offCtx.fillStyle = 'rgba(0,0,0,0.05)'; offCtx.fillRect(0,0,offscreen.width,offscreen.height);
  drawParticles(offCtx);
  ctx.drawImage(offscreen, 0, 0);
}
```

---

## Proibições

1. **Nunca `clearRect` todo frame para trilha** — use `fillStyle='rgba(0,0,0,0.02)'` + `fillRect` para fade.
2. **Nunca `getImageData` no loop** — leitura de GPU extremamente lenta. Cache `colorMap` uma vez; `getColor(x,y)` via índice.
3. **Sempre DPR** — sem `ctx.scale(dpr,dpr)` o canvas fica borrado em Retina.
4. **Nunca aloque no hot loop** — sem `new`/spread/array no `update()`/`render()`. Reuse escalares `fx/fy`.

## Uso no pipeline Angatu (§9.5)

Canvas generativo é o motor de **arte automática por tema**: financeiro→flow field, orgânico→partículas+trilha, tecnológico→mesh, criativo→L-system, corporativo→ruído+grain. Exporte `og:image` via `canvas.toDataURL('image/png')` → `public/assets/og-{tema}.png`; `favicon` da mesma paleta; `alt` em imagens e `aria-hidden="true"` só em decoração.

---
*Fonte: `canvas-generative/SKILL.md` + `references/algorithms.md` · Tradução e auditoria Angatu Sistemas — @author Angatu Sistemas*
