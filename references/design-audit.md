# Auditoria de Design — Checklist Final

> **Auditoria:** Angatu Sistemas · Tradução e adaptação de `design-audit` para AngatuLibraries (vanilla + Tailwind local + `ds.css`) · Código em inglês, documentação em português · Adaptado para `src/main/resources/public` e `target/classes/public`

> **Regra Global Angatu — Responsividade sempre em Tailwind CSS (§9.6 do SKILL.md):** todo layout responsivo (breakpoints, grids, visibilidade, espaçamento, tipografia, ordem, largura/altura) é feito **exclusivamente com utilitários responsivos do Tailwind** (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`) — nunca com `@media (min-width: ...)` manual como primeira opção. Princípios de `mobile-principles` e `desktop-principles` permanecem válidos, mas sua implementação no HTML/CSS vanilla é sempre via classes Tailwind (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, `hidden lg:block`, `text-sm md:text-base` etc.).


> **Quando rodar:** checkpoint final obrigatório (§9.7 do `SKILL.md`). Carregue ao fim de todo frontend, antes do push. Classifique por severidade: Crítico (bloqueia entrega) → Importante (sprint atual) → Bom ter (backlog).

---

## 1. Gaps de Movimento

Detecte animações faltantes. Em vanilla Angatu, troque `AnimatePresence` por `@starting-style` + `allow-discrete` e `view-transition-name`.

### Renders condicionais sem animação de saída

```bash
grep -rn '{.*&&\s*<\|{.*?\s*:\s*<' --include='*.html' --include='*.js' src/main/resources/public | grep -vE 'starting-style|view-transition|allow-discrete|popover|dialog'
```
Procure: `{show && <Component />}` ou ternários sem `@starting-style`/`View Transitions`. Toda montagem/desmontagem condicional precisa de animação de saída.

### Estados hover sem transition

```bash
grep -rn ':hover' --include='*.css' src/main/resources/public | grep -vE 'transition|animation'
```
Toda regra `:hover` deve ter `transition` no seletor base. Troca instantânea parece quebrada.

### Listas dinâmicas sem stagger

```bash
grep -rn '\.map(' --include='*.js' src/main/resources/public | grep -vE 'stagger|delay.*index|animationDelay|animation-delay'
```
Listas via `.map()` devem escalonar entrada (`animation-delay: calc(var(--i)*80ms)`). Entrada simultânea parece barata.

### Mudanças de estilo sem transition

```bash
grep -rn 'style\.\|style="' --include='*.js' --include='*.html' src/main/resources/public | grep -vE 'transition|transform|opacity'
```
Mudanças de `style` dinâmicas (fundo, cor) precisam de `transition` ou wrapper com animação.

### Entradas sem saídas correspondentes

```bash
grep -rn '@starting-style\|view-transition-name' --include='*.css' --include='*.html' src/main/resources/public | head -n 20
# e cruze com elementos que têm entrada animada mas não definem estado de saída/hidden
```

---

## 2. Auditoria de Acessibilidade

### Reduced motion — OBRIGATÓRIO

Projeto com animação **deve** ter pelo menos um handler:

```bash
grep -rn 'prefers-reduced-motion' --include='*.css' --include='*.js' src/main/resources/public 2>/dev/null
```

**Zero resultados em projeto animado = violação crítica.** No mínimo:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

### Contraste 4.5:1

- DevTools → Inspect → color swatch → contrast ratio
- `npx pa11y <url>` ou Lighthouse
- Verifique texto animado no meio da transição — com `opacity > 0.4` ainda precisa ser legível

### Foco visível em todo interativo

```bash
grep -rn 'outline:\s*none\|outline:\s*0' --include='*.css' src/main/resources/public
```
Todo `outline: none` deve vir com `:focus-visible` customizado. Remover anel de foco sem substituto é falha WCAG.

### HTML semântico — sem div clicável

```bash
grep -rn 'onClick\|onclick' --include='*.html' --include='*.js' src/main/resources/public | grep -E '<div|<span' | grep -v 'role='
```
Todo `<div onclick>` deve ser `<button>`/`<a>` ou ter `role="button" + tabindex="0" + onKeyDown`.

### ARIA em animações decorativas

```bash
grep -rn '<canvas\|class=".*particles\|class=".*ambient' --include='*.html' src/main/resources/public | grep -v 'aria-hidden'
```
Animações puramente decorativas (partículas de fundo, `canvas` generativo) devem ter `aria-hidden="true"`.

---

## 3. Auditoria de Performance

### Layout thrashing — animar propriedades de layout

```bash
grep -rn 'transition.*\(width\|height\|top\|left\|right\|bottom\|margin\|padding\)' --include='*.css' src/main/resources/public
```
Substitua por `transform: translate/scale` e `opacity` (GPU, sem reflow).

### Gatilhos excessivos de paint

```bash
grep -rn 'will-change' --include='*.css' src/main/resources/public
```
Deve ser raro e escopado. >5 elementos com `will-change` permanente = custo de GPU > benefício. Aplique dinamicamente (hover/focus).

### Custo de bundle de animação

```bash
npx source-map-explorer dist/**/*.js 2>/dev/null | head -n 20
```

| Biblioteca | Custo gz | Quando justificar |
|---|---|---|
| CSS puro | 0 KB | <3 animações, scroll, `@starting-style` |
| GSAP | ~25 KB | Timeline 5+ tweens, stagger dinâmico, morph |
| Motion (Framer) | ~30 KB | Só em React |

Se o projeto só usa fade+slide, 30 KB é exagero — fique no CSS nativo (§9.4).

### requestAnimationFrame vs setTimeout

```bash
grep -rn 'setTimeout\|setInterval' --include='*.js' src/main/resources/public | grep -iE 'anim|motion|scroll|position|style|transform'
```
Loops de animação devem usar `requestAnimationFrame`. `setTimeout` causa frame drops e não pausa em aba inativa.

---

## 4. Auditoria de Consistência

### Durações

```bash
grep -rnoE 'duration[:"'\''= ]+[0-9.]+' --include='*.css' --include='*.js' src/main/resources/public | sort | uniq -c | sort -rn
```
Projeto bem desenhado usa 3–5 durações distintas (ex: 120ms, 220ms, 360ms, 500ms). >8 = extraia para tokens em `ds.css`/`tailwind.config.js`.

### Easings

```bash
grep -rnoE 'ease[A-Za-z]*|cubic-bezier\([^)]+\)' --include='*.css' --include='*.js' src/main/resources/public | sort | uniq -c | sort -rn
```
Mesma regra: 3–5 easings nomeados. Valores espalhados = inconsistência visual. Centralize em `--ease-*`.

### Entrada/saída simétricas

- Duração de entrada >= duração de saída (nunca o inverso)
- Entrada usa `ease-out`, saída usa `ease-in`
- Entrada com coreografia completa (`translate + opacity + scale`), saída mais simples (`opacity` ou `opacity + scale` leve)

```bash
grep -rn 'exit\|@starting-style\|view-transition' --include='*.css' --include='*.js' src/main/resources/public | head -n 40
```

---

## 5. Checklist específico de stack

### Web (padrão AngatuLibraries)
- [ ] Lighthouse + DevTools Performance (alvo <16.67ms por frame)
- [ ] `grep -r "cdn.tailwindcss"` vazio (§9.1)
- [ ] `og:image` + `json-ld` + `meta description` revisada (§9.2 + §9.5)
- [ ] Canvas generativo com `setupCanvas` DPR-aware (§9.5)
- [ ] `prefers-reduced-motion` implementado e testado

---

## 6. Formato de Saída

Classifique por severidade:

### Crítico (corrigir antes de entregar)
- Sem `prefers-reduced-motion`
- `div` clicável sem teclado
- `outline: none` sem `:focus-visible`
- Animação de `width`/`height`/`top`/`left`
- `cdn.tailwindcss` presente

### Importante (sprint atual)
- Condicionais sem animação de saída
- Hover sem `transition`
- `aria-hidden` faltando em decoração (`canvas`/partículas)
- `setTimeout` em loop de animação
- Durações inconsistentes (>8 valores)

### Bom ter (backlog)
- Listas sem stagger
- Estilos inline sem `transition`
- `will-change` excessivo
- Entrada/saída assimétricas (direção errada)
- Biblioteca de animação superdimensionada

---
*Fonte original: `design-audit/SKILL.md` · Tradução, adaptação vanilla/public e auditoria Angatu Sistemas — @author Angatu Sistemas*
