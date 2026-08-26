# Princípios Desktop — UX para Ponteiro e Teclado

> **Auditoria:** Angatu Sistemas · Tradução e adaptação de `desktop-principles` para AngatuLibraries (vanilla + Tailwind local) · Código em inglês, documentação em português · Original cobre macOS, Windows, Linux e web desktop

> **Regra Global Angatu — Responsividade sempre em Tailwind CSS (§9.6 do SKILL.md):** todo layout responsivo (breakpoints, grids, visibilidade, espaçamento, tipografia, ordem, largura/altura) é feito **exclusivamente com utilitários responsivos do Tailwind** (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`) — nunca com `@media (min-width: ...)` manual como primeira opção. Princípios de `mobile-principles` e `desktop-principles` permanecem válidos, mas sua implementação no HTML/CSS vanilla é sempre via classes Tailwind (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, `hidden lg:block`, `text-sm md:text-base` etc.).


## Hover é obrigatório

Hover é o sinal primário de affordance em desktop — o inverso do mobile. Ponteiro sobre alvo sem feedback imediato parece quebrado: o usuário depende de `:hover` para confirmar que o elemento é interativo antes de clicar. Toda superfície clicável deve ter hover distinto, idealmente com `transition` de 100–200ms perceptível sem parecer lento.

**Web (padrão AngatuLibraries):**

```css
.btn { background: var(--surface); transition: background 120ms ease-out, transform 120ms ease-out; }
.btn:hover { background: var(--surface-hover); transform: translateY(-1px); }
.btn:active { transform: translateY(0); }
```

**Regra Angatu:** todo `<button>`, `.card[role="button"]`, `.nav-item` em `public/` deve ter `:hover` + `:active` + `:focus-visible`. Sem exceção.

## Precisão do ponteiro

Mouse/trackpad é muito mais preciso que polegar — alvos desktop podem ser 24–32px (ícone) e 28–36px (toolbar). WCAG 2.5.8 (AA) fixa o piso absoluto em **24×24 CSS pixels** para ponteiro não-mobile. Abaixo disso, agrupe com espaçamento.

**Lei de Fitts na prática:** tempo de aquisição diminui com tamanho e aumenta com distância. Bordas e cantos são alvos de profundidade infinita — o cursor para ali independente de overshoot. Coloque controles globais de alta frequência (fechar janela, menu do sistema, dock) em cantos/bordas. Menubar do macOS e taskbar do Windows são aplicações literais: ancorados na borda, zero overshoot.

## Atalhos de teclado (first-class, não opcional)

Usuário desktop espera paridade com convenções nativas. Faltar `⌘+F` em app com lista é bug, não minimalismo.

| Ação | macOS | Windows / Linux |
|---|---|---|
| Novo | `⌘+N` | `Ctrl+N` |
| Fechar janela | `⌘+W` | `Ctrl+W` |
| Sair do app | `⌘+Q` | `Alt+F4` |
| Preferências | `⌘+,` | `Ctrl+,` |
| Buscar | `⌘+F` | `Ctrl+F` |
| Alternar (comentário, sidebar…) | `⌘+/` | `Ctrl+/` |
| Salvar | `⌘+S` | `Ctrl+S` |
| Paleta de comandos | `⌘+K` ou `⇧+⌘+P` | `Ctrl+K` ou `Ctrl+Shift+P` |

**Web — detecte Ctrl vs Cmd corretamente:**

```js
const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
window.addEventListener('keydown', (e) => {
  const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
  if (cmdOrCtrl && e.key.toLowerCase() === 'k') { e.preventDefault(); openCommandPalette(); }
});
```

Mostre o atalho no `title`/`aria-label` do botão e no menu: `title="Novo documento (⌘N)"`.

## Padrões multi-janela

Usuário desktop mantém janelas lado a lado. **Nova janela é correta quando:**

- Tarefa longa o suficiente para o usuário querer continuar na janela principal (render, export, log de sync).
- Comparação de dois contextos paralelos (dois documentos, dois chats, duas issues).
- App baseado em documentos, cada documento é um par (Pages, Figma, projetos Xcode).

**Nova janela é errada para:** confirmações transitórias, painéis breves de configuração ou qualquer coisa que caiba em sheet/popover.

**Web (padrão Angatu):** em vez de `window.open` indiscriminado, prefira `<dialog>` / sheet lateral para secundário; só abra nova aba/janela para comparação ou tarefa longa, e compartilhe estado via `localStorage`/`BroadcastChannel` ou singleton — nunca duplique fonte de verdade.

## Gerenciamento de foco

Navegação por teclado é input de primeira classe em desktop. Ordem de `Tab` deve ser sã, anéis de foco visíveis, e removê-los sem alternativa é regressão de acessibilidade.

**Web — `tabindex` + `:focus-visible` (obrigatório Angatu):**

```css
.btn:focus { outline: none; }
.btn:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; border-radius: 6px; }
```
```html
<div role="button" tabindex="0" class="btn">Botão customizado</div>
<script>
  document.querySelector('.btn').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); }
  });
</script>
```

**Regra Angatu:** nunca `outline: none` sem `:focus-visible` substituto. Todo `role="button"` precisa `tabIndex="0"` + `onKeyDown` (Enter/Espaço).

## Densidade de informação

Desktop: tela de 13–32" com ponteiro preciso e teclado completo. O usuário consegue — e quer — processar mais informação por viewport que no mobile. Use grid base 8px (vs 4–8px mobile), sidebars persistentes em vez de bottom tabs, paleta de comandos (`⌘K`) para power users e tabelas densas quando os dados pedem. Referências: Linear, Things 3, Notion — ricos em informação sem parecer apertados, cada pixel se justifica.

## Doutrina de animações sutis

App desktop é observado por horas. Animações que encantam na primeira vez tornam-se insuportáveis na centésima repetição. Prefira movimento curto e puramente funcional: opacidade e translações pequenas <200ms, sem bounce em interações rotineiras, sem overshoot lúdico em hover. Reserve movimento expressivo para momentos únicos (onboarding, estados de sucesso), nunca para UI diária.

```css
/* ERRADO — todo hover quica 600ms, exaustivo no terceiro uso */
.card { transition: transform 600ms cubic-bezier(0.34,1.56,0.64,1); }
.card:hover { transform: scale(1.05); }
```
```css
/* CERTO — 100ms de opacidade, quase subliminar, nunca cansa */
.card { opacity: 0.92; transition: opacity 100ms ease-out; }
.card:hover { opacity: 1; }
```

## Anti-padrões (ERRADO / CERTO)

### 1. Esconder navegação atrás de hamburger em desktop

```html
<!-- ERRADO — viewport 1440px, espaço infinito, mas nav colapsado -->
<header><button class="hamburger" aria-label="Menu">☰</button></header>
<nav class="drawer hidden">...</nav>
```
```html
<!-- CERTO — sidebar persistente, colapsável se o usuário quiser -->
<aside class="sidebar">
  <nav><a href="/inbox">Inbox</a><a href="/projects">Projetos</a><a href="/archive">Arquivo</a></nav>
  <button class="collapse-toggle" aria-label="Recolher barra lateral">⇤</button>
</aside>
```

### 2. Sem atalhos para ações primárias

```html
<!-- ERRADO — "Novo" enterrado em menu, 3 cliques -->
<div class="toolbar"><div class="menu"><button onclick="newDoc()">Novo documento</button></div></div>
```
```html
<!-- CERTO — ⌘N no toolbar + atalho global -->
<button onclick="newDoc()" title="Novo documento (⌘N)"><svg aria-hidden="true">＋</svg> Novo</button>
<script>window.addEventListener('keydown', (e) => { if ((isMac?e.metaKey:e.ctrlKey) && e.key==='n') { e.preventDefault(); newDoc(); } });</script>
```

### 3. Remover anel de foco sem alternativa

```css
/* ERRADO — usuário de teclado não sabe onde está o foco */
button:focus { outline: none; }
```
```css
/* CERTO — :focus-visible mantém clique sem anel, teclado com anel */
button:focus { outline: none; }
button:focus-visible { outline: 2px solid var(--brand-500); outline-offset: 2px; border-radius: 6px; }
```

## Checklist Angatu (desktop)

- [ ] Todo interativo com `:hover` distinto + `transition` 100–200ms
- [ ] Alvos ≥24×24 (ideal 24–32px) e Fitts aplicado em controles globais
- [ ] Atalhos `⌘/Ctrl+K`, `⌘/Ctrl+F`, `⌘/Ctrl+N`, `⌘/Ctrl+S` ligados e visíveis em tooltip/menu
- [ ] Foco visível (`:focus-visible`) sem `outline:none` órfão
- [ ] Densidade adequada (sidebar persistente em ≥1024px, não hamburger)
- [ ] Animações <200ms, sem bounce rotineiro
- [ ] `prefers-reduced-motion` respeitado

---
*Fonte original: `desktop-principles/SKILL.md` + `references/{keyboard-patterns,multi-window}.md` · Tradução, compressão e auditoria Angatu Sistemas — @author Angatu Sistemas*

*Otimização Angatu: `mobile-principles` e `desktop-principles` foram unificados no pipeline §9.6 — use este arquivo quando o briefing exigir desktop. Para web vanilla, hover obrigatório, atalhos e foco visível são inegociáveis em todo `public/`.*
