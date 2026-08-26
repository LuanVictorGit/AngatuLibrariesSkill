# CSS Nativo — Animações e Técnicas Visuais sem Dependências

> **Auditoria:** Angatu Sistemas · Tradução e otimização de `css-native` para frontend vanilla AngatuLibraries (Tailwind local + `ds.css`) · Código em inglês, documentação em português

> **Regra Global Angatu — Responsividade sempre em Tailwind CSS (§9.6 do SKILL.md):** todo layout responsivo (breakpoints, grids, visibilidade, espaçamento, tipografia, ordem, largura/altura) é feito **exclusivamente com utilitários responsivos do Tailwind** (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`) — nunca com `@media (min-width: ...)` manual como primeira opção. Princípios de `mobile-principles` e `desktop-principles` permanecem válidos, mas sua implementação no HTML/CSS vanilla é sempre via classes Tailwind (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, `hidden lg:block`, `text-sm md:text-base` etc.).


## Quando usar CSS nativo vs biblioteca

| Situação | Decisão |
|---|---|
| < 3 animações na página | CSS nativo |
| Reveal/parallax por scroll | CSS nativo (`animation-timeline`) |
| Entrada/saída de `display:none` | CSS nativo (`@starting-style` + `allow-discrete`) |
| Tooltip/popover | CSS nativo (anchor positioning) |
| Transição de página (MPA/SPA) | CSS nativo (View Transitions) |
| Timeline 5+ tweens | GSAP local (`public/scripts/gsap.min.js`) |
| Stagger em lista dinâmica | GSAP ou vanilla `delay: index*50ms` |
| Spring físico com interrupção | Só em React (Motion) |

Regra de ouro: se cabe em `@keyframes` + `animation-timeline`, fique no CSS. Só vá para biblioteca quando precisar de controle imperativo, coordenação de sequência ou valores em runtime.

---

## Animações por Scroll

### Scroll Progress Timeline (barra de progresso)

```css
.progress-bar { animation: grow-width linear both; animation-timeline: scroll(root block); }
@keyframes grow-width { from { transform: scaleX(0);} to { transform: scaleX(1);} }
```
`scroll(<scroller> <axis>)` — `nearest|root|self`, `block|inline|x|y`. Default `scroll(nearest block)`.

### View Progress Timeline (reveal ao entrar na viewport)

```css
.reveal { animation: fade-in linear both; animation-timeline: view(); animation-range: entry 0% entry 100%; }
@keyframes fade-in { from { opacity:0; transform: translateY(2rem);} to { opacity:1; transform: translateY(0);} }
```

### animation-range

```css
animation-range: entry 0% entry 100%;     /* só durante a entrada */
animation-range: contain 0% contain 100%; /* enquanto totalmente visível */
animation-range: entry 25% exit 75%;
```
Ferramenta visual: `scroll-driven-animations.style/tools/view-timeline/ranges/`

---

## View Transitions API

### SPA (mesmo documento)

```js
document.startViewTransition(() => updateContent());
```
```css
::view-transition-old(root) { animation: fade-out 200ms ease-out; }
::view-transition-new(root) { animation: fade-in 300ms ease-in; }
.hero-image { view-transition-name: hero; }
::view-transition-group(hero) { animation-duration: 400ms; animation-timing-function: cubic-bezier(0.4,0,0.2,1); }
```

### MPA (entre páginas) + agrupamento

```css
@view-transition { navigation: auto; }
.card { view-transition-name: card-detail; } /* origem */
.detail-hero { view-transition-name: card-detail; } /* destino */
.card { view-transition-class: card; }
::view-transition-group(*.card) { animation-duration: 350ms; }
```

---

## @starting-style

Entrada nativa de `display:none` sem `setTimeout`:

```css
.dialog { opacity:1; transform: translateY(0); transition: opacity 300ms ease, transform 300ms ease, display 300ms allow-discrete, overlay 300ms allow-discrete;
  @starting-style { opacity:0; transform: translateY(-1rem); } }
.dialog[hidden] { opacity:0; transform: translateY(-1rem); display:none; }
```
Regras: `transition-behavior: allow-discrete` (ou `allow-discrete` no shorthand) é obrigatório para `display`/`overlay`. Use com `[popover]` e `<dialog>` para modais sem JS de animação.

---

## Anchor Positioning (tooltip/popover nativo)

```css
.trigger { anchor-name: --my-trigger; }
.tooltip { position: fixed; position-anchor: --my-trigger; position-area: top center; margin-bottom:.5rem; position-try-fallbacks: --bottom; }
@position-try --bottom { position-area: bottom center; margin-top:.5rem; }
```
Com animação:
```css
.tooltip[popover]:popover-open { opacity:1; transform: scale(1); transition: opacity 150ms ease, transform 150ms ease, display 150ms allow-discrete, overlay 150ms allow-discrete;
  @starting-style { opacity:0; transform: scale(0.96); } }
```

---

## Container Queries + animações contextuais

```css
.card-container { container-type: inline-size; container-name: card; }
@container card (min-width: 400px) { .card-content { animation: slide-in-right 400ms var(--ease-out-expo); } }
@container card (max-width: 399px) { .card-content { animation: fade-in 300ms ease; } }
@keyframes slide-in-right { from { transform: translateX(10cqw); opacity:0;} to { transform: translateX(0); opacity:1;} }
```

---

## Técnicas visuais avançadas (por tema — §9.5)

### clip-path Transitions

```css
.reveal-clip { clip-path: inset(0 100% 0 0); transition: clip-path 600ms cubic-bezier(0.77,0,0.175,1); }
.reveal-clip.is-visible { clip-path: inset(0 0 0 0); }
```
Morfologia entre `circle()`/`ellipse()`/`polygon()`/`inset()` quando tipo e contagem de pontos coincidem.

### backdrop-filter (glass)

```css
.glass { background: oklch(0.98 0.01 250 / 0.6); backdrop-filter: blur(12px) saturate(1.8); -webkit-backdrop-filter: blur(12px) saturate(1.8); }
```

### mix-blend-mode

```css
.overlay-text { mix-blend-mode: difference; color: white; }
```

### Mesh Gradients

```css
.mesh { background:
  radial-gradient(at 20% 30%, oklch(0.7 0.2 310) 0%, transparent 50%),
  radial-gradient(at 80% 60%, oklch(0.6 0.18 250) 0%, transparent 50%),
  radial-gradient(at 50% 80%, oklch(0.75 0.15 170) 0%, transparent 50%),
  oklch(0.15 0.02 280); }
```

### conic-gradient (spinner)

```css
.spinner { background: conic-gradient(from 0deg, transparent 0%, oklch(0.7 0.15 250) 100%); border-radius:50%;
  mask: radial-gradient(farthest-side, transparent calc(100% - 4px), black calc(100% - 4px)); animation: spin 1s linear infinite; }
```

---

## Proibições

| Errado | Correto | Por quê |
|---|---|---|
| `transition: all 300ms` | `transition: opacity 300ms, transform 300ms` | `all` dispara em toda mudança, impede otimização |
| Animar `width/height/top/left` | `transform`, `opacity`, `clip-path`, `filter` | Layout força reflow por frame |
| Sem fallback para `animation-timeline` | `@supports (animation-timeline: scroll()) { ... }` | Firefox só desde 128, Safari antigo sem suporte |
| `@starting-style` sem `allow-discrete` | Sempre com `allow-discrete` para `display/overlay` | Sem ele a transição de `display:none` é ignorada |
| Anchor sem `position-try-fallbacks` | Sempre defina fallback | Clipe fora da viewport |
| `animation-fill-mode: forwards` em scroll-driven | Use `both` | `forwards` trava no estado final ao rolar de volta |

## Compatibilidade

Consulte `tailwind.config.js` e o `Can I Use` para `animation-timeline`, View Transitions, `@starting-style` e anchor positioning; ofereça fallback progressivo (reveal via `IntersectionObserver` + `transform` quando `animation-timeline` não suportado) e teste `prefers-reduced-motion`.

---
*Fonte: `css-native/SKILL.md` + `references/modern-css.md` · Tradução, compressão e auditoria Angatu Sistemas — @author Angatu Sistemas*
