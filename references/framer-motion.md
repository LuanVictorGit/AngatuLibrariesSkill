# Animações de Interface — Princípios Motion (adaptado Angatu)

> **Auditoria:** Angatu Sistemas · Tradução e adaptação de `framer-motion` + `motion-principles` para frontend vanilla da AngatuLibraries (HTML + Tailwind local + CSS nativo). Código em inglês, documentação em português. Original: `motion` v11 (`import { motion, AnimatePresence } from "motion/react"`).

> **Regra Global Angatu — Responsividade sempre em Tailwind CSS (§9.6 do SKILL.md):** todo layout responsivo (breakpoints, grids, visibilidade, espaçamento, tipografia, ordem, largura/altura) é feito **exclusivamente com utilitários responsivos do Tailwind** (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`) — nunca com `@media (min-width: ...)` manual como primeira opção. Princípios de `mobile-principles` e `desktop-principles` permanecem válidos, mas sua implementação no HTML/CSS vanilla é sempre via classes Tailwind (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, `hidden lg:block`, `text-sm md:text-base` etc.).


## Quando usar cada técnica (regra Angatu)

| Critério | CSS nativo (§9.4) | GSAP | Motion (React) |
|---|---|---|---|
| Layout animado (`layoutId`) | View Transitions (`view-transition-name`) | Manual | Excelente |
| Saída animada | `@starting-style` + `allow-discrete` | Timeline reverse | `AnimatePresence` |
| Gestos (drag, hover) | `:hover` + `transition` | Draggable plugin | Nativo declarativo |
| Scroll-driven | `animation-timeline: scroll()/view()` | ScrollTrigger (mais poderoso) | `useScroll` |
| Orquestração complexa (5+ tweens) | `@keyframes` simples | Timeline (mais flexível) | Variants |
| Custo de bundle | 0 KB | ~25 KB gz | ~30 KB gz |

**Regra Angatu (vanilla):** frontend Angatu é vanilla HTML — prefira **CSS nativo** (§9.4) para <3 animações, scroll, `@starting-style` e View Transitions. Use **GSAP standalone local** (`public/scripts/gsap.min.js` baixado, nunca CDN) apenas para timelines complexas, stagger dinâmico ou morph SVG. `Motion` só se o projeto migrar para React (não é o padrão).

## Equivalentes vanilla dos conceitos Motion

### AnimatePresence → @starting-style + popover/dialog

Framer (React):
```tsx
<AnimatePresence mode="wait">
  {isVisible && <motion.div key="modal" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} />}
</AnimatePresence>
```

Vanilla Angatu (CSS puro):
```css
.modal { opacity:1; transform: translateY(0); transition: opacity 300ms ease, transform 300ms ease, display 300ms allow-discrete, overlay 300ms allow-discrete;
  @starting-style { opacity:0; transform: translateY(-8px); } }
.modal:not([open]) { opacity:0; transform: translateY(-8px); }
```
```html
<dialog class="modal" id="modal"><form method="dialog"><button>Fechar</button></form></dialog>
<script>document.getElementById('modal').showModal()</script>
```

- `mode="wait"` → sequencie com `view-transition-name` ou encerre a saída antes de montar o próximo estado
- `onExitComplete` → `transitionend` / `animationend`

### Layout animado (shared layout) → View Transitions

Framer: `<motion.div layoutId="highlight" />`

Vanilla:
```css
.card { view-transition-name: card-detail; }
.detail-hero { view-transition-name: card-detail; }
::view-transition-group(card-detail) { animation-duration: 350ms; animation-timing-function: var(--ease-spring); }
```
```js
document.startViewTransition(() => { card.hidden = true; detail.hidden = false; });
```

### Variants + stagger → CSS custom properties

Framer:
```ts
const container = { hidden:{opacity:0}, show:{opacity:1, transition:{staggerChildren:0.08}}};
```

Vanilla:
```html
<ul class="stagger">
  <li style="--i:0">...</li><li style="--i:1">...</li><li style="--i:2">...</li>
</ul>
```
```css
.stagger li { animation: fade-up 400ms var(--ease-out-expo) both; animation-delay: calc(var(--i)*80ms); }
@keyframes fade-up { from { opacity:0; transform: translateY(12px);} to { opacity:1; transform: translateY(0);} }
```

Ou via JS: `items.forEach((el,i)=> el.style.animationDelay = i*80+'ms')`

### Gestos → :hover/:active + sensores nativos

Framer: `whileHover={{scale:1.05}} whileTap={{scale:0.95}} drag`

Vanilla:
```css
.btn { transition: transform 120ms ease-out; }
.btn:hover { transform: scale(1.03); }
.btn:active { transform: scale(0.97); }
@media (hover: hover) and (pointer: fine) { .card:hover { transform: translateY(-2px); } }
```
Drag em vanilla: `pointerdown`/`pointermove`/`pointerup` com `setPointerCapture` + `requestAnimationFrame`; só use GSAP Draggable se a física for complexa.

### Motion values sem re-render → atualização direta no DOM

Framer: `useMotionValue` + `useTransform` (não dispara re-render)

Vanilla:
```js
let x = 0;
function onPointerMove(e){ x = e.clientX; el.style.setProperty('--x', x+'px'); } // direto no DOM, sem state
// spring: use rAF + lerp, nunca setState no loop
function spring(current, target, velocity){ /* stiffness/damping */ }
```

Scroll tracking vanilla: `animation-timeline: scroll()` / `view()` (§9.4) — zero JS.

## Boas práticas (erros que quebram)

- **Não** faça `setState` dentro de `onUpdate` sem guard — loop infinito. Em vanilla, não atualize `innerHTML`/`class` no `rAF` sem `requestAnimationFrame` e throttle.
- **Não** use `key` instável (`Math.random()`) — quebra `view-transition-name` / `layoutId`. Use `id` estável do dado.
- **Não** esqueça `key`/`view-transition-name` único por elemento condicional — sem ele não há animação de saída.
- **Não** envolva componente já animado com outro `transform` no mesmo eixo — conflito de `transform`. Separe eixos (`x` no pai, `opacity` no filho) ou use `variants`.
- **Não** anime `width`/`height`/`top`/`left` — use `transform`/`opacity`/`clip-path` (GPU, sem reflow). Ver auditoria §9.7.

## Tokens de motion (centralizar — §9.7)

Máximo 3–5 durações (ex: 120ms, 220ms, 360ms, 500ms) e 3–5 easings nomeados (`--ease-out-expo: cubic-bezier(0.16,1,0.3,1)`, `--ease-spring: cubic-bezier(0.34,1.56,0.64,1)`). Nunca espalhe valores aleatórios — centralize em `tailwind.config.js` e `ds.css` `:root`.

---
*Fonte original: `framer-motion/SKILL.md` · Tradução, adaptação vanilla e auditoria Angatu Sistemas — @author Angatu Sistemas*
