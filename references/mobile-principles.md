# Princípios Mobile — UX Touch-First

> **Auditoria:** Angatu Sistemas · Tradução e adaptação de `mobile-principles` para AngatuLibraries (vanilla + Tailwind local) · Código em inglês, documentação em português · Original cross-platform (web mobile, iOS, Android)

> **Regra Global Angatu — Responsividade sempre em Tailwind CSS (§9.6 do SKILL.md):** todo layout responsivo (breakpoints, grids, visibilidade, espaçamento, tipografia, ordem, largura/altura) é feito **exclusivamente com utilitários responsivos do Tailwind** (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`) — nunca com `@media (min-width: ...)` manual como primeira opção. Princípios de `mobile-principles` e `desktop-principles` permanecem válidos, mas sua implementação no HTML/CSS vanilla é sempre via classes Tailwind (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, `hidden lg:block`, `text-sm md:text-base` etc.).


## Alvos de toque (touch targets)

| Plataforma | Mínimo | Recomendado | Especificação |
|---|---|---|---|
| iOS | 44pt | 44pt + 8pt espaçamento | Apple HIG |
| Android | 48dp | 48dp + 8dp espaçamento | Material Design |
| Web mobile | 44px | 44px + 8px espaçamento | WCAG 2.5.5 |

**Regra de ouro:** qualquer alvo tocável abaixo do mínimo é bug de usabilidade. O hit area pode exceder o glifo visível (`padding`, `hitSlop` ou espaçador transparente), mas a superfície interativa deve atingir o mínimo. Espaçamento importa tanto quanto tamanho: dois botões de 44pt colados ainda são erráveis.

## Doutrina sem-hover

`:hover` não existe em touch. Tornar algo visível só no hover significa escondê-lo em todo celular. Visível-por-padrão é a regra; hover é melhoria de desktop, nunca interação estrutural.

**Web — proteja hovers com media query:**

```css
.card { opacity: 1; transform: translateY(0); }
@media (hover: hover) and (pointer: fine) {
  .card { opacity: 0.85; }
  .card:hover { opacity: 1; transform: translateY(-2px); }
}
```

**Padrão Angatu:** todo `.card`/`.btn` em `public/` deve ser usável sem hover; adicione hover apenas dentro do `@media` acima.

## Zonas de polegar (Hoober)

Uso em retrato é majoritariamente com uma mão, polegar pivotando do canto inferior. A tela se divide em zonas:

```
+------+----+------+
| HARD | OK | HARD |  ← topo: estica, só com duas mãos
+------+----+------+
|  OK  | OK |  OK  |  ← meio: confortável
+------+----+------+
| EASY |EASY| EASY |  ← base: arco natural do polegar
+------+----+------+
```

- **Terço inferior (EASY):** CTA primário, enviar, confirmar, FAB, tab bar.
- **Meio (OK):** conteúdo, ações secundárias.
- **Topo (HARD):** voltar, fechar, busca, perfil — o usuário espera alcançar, não acertar por reflexo.

**Regra Angatu:** CTA primário sempre na metade inferior em mobile. Nunca `Pagar` no canto superior direito.

## Safe areas (notch / home indicator)

| Plataforma | API | Insets respeitados |
|---|---|---|
| Web | `env(safe-area-inset-*)` + `viewport-fit=cover` | notch, home indicator |
| SwiftUI | `.safeAreaInset(edge:)` | nav/tab bar, notch |
| Compose | `WindowInsets.safeDrawing` | system bars, IME |

**Web (padrão AngatuLibraries):**

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```
```css
.fab { position: fixed; bottom: calc(env(safe-area-inset-bottom) + 16px); right: calc(env(safe-area-inset-right) + 16px); }
```

Sempre teste em iPhone com notch + home indicator; FAB/tab bar sob o indicador é falha crítica.

## Reduced motion (unificado cross-platform)

| Plataforma | API |
|---|---|
| Web CSS | `@media (prefers-reduced-motion: reduce)` |
| Web JS | `matchMedia('(prefers-reduced-motion: reduce)')` |
| SwiftUI | `@Environment(\.accessibilityReduceMotion)` |
| Compose | `Settings.Global.ANIMATOR_DURATION_SCALE == 0f` |

**CSS mínimo obrigatório (todo projeto Angatu):**

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

**Web JS (quando precisar desativar lógica):**

```js
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const duration = reduceMotion ? 0 : 300;
```

## Gestos mobile (padrões canônicos)

Os 5 gestos que o usuário já conhece — reusar é UX grátis; reinventar é fricção:

- **Swipe-back:** iOS — deslize da borda esquerda para voltar. Nunca sobrescreva; no Android espelhe com predictive back (Android 14+).
- **Pull-to-refresh:** arraste para baixo no topo para recarregar (feeds, listas).
- **Drag-to-dismiss:** modais e viewers fecham ao arrastar para baixo além de 100–150pt.
- **Pinch-to-zoom:** pinça em imagens/mapas/canvas com escala mín/máx respeitada.
- **Swipe em linha:** deslize horizontal na linha para revelar ações (excluir, arquivar). Leading vs trailing = conjuntos diferentes.

## Orçamentos de performance mobile

- **Cold start:** <2s em dispositivo médio (Pixel 4a, iPhone SE 2ª gen). Se leva 4s no Pixel 4a, leva 8s em aparelho de entrada.
- **Frame:** 16.67ms@60fps, 8.33ms@120fps (ProMotion). Síncrono na main thread acima disso = jank.
- **Bundle web:** Tailwind local minificado (§9.1) já é purged; evite libs de animação >25KB se só usa fade/slide.
- **Bateria:** sem CPU contínua em background. Use schedulers da plataforma; respeite `Save-Data` / `allowsCellularAccess`.

## Anti-padrões (ERRADO / CERTO)

### 1. Hover como única revelação

```css
/* ERRADO — no mobile o botão nunca aparece */
.card .actions { opacity: 0; }
.card:hover .actions { opacity: 1; }
```
```css
/* CERTO — visível por padrão, hover só em desktop */
.card .actions { opacity: 1; }
@media (hover: hover) and (pointer: fine) {
  .card .actions { opacity: 0; transition: opacity 150ms ease-out; }
  .card:hover .actions { opacity: 1; }
}
```

### 2. Alvo abaixo do mínimo

```css
/* ERRADO — 32px, errável */
.icon-btn { width: 32px; height: 32px; }
```
```css
/* CERTO — hit area 44px mesmo com ícone 24px */
.icon-btn { width: 44px; height: 44px; display: inline-flex; align-items: center; justify-content: center; }
.icon-btn svg { width: 24px; height: 24px; }
```

### 3. Ignorar safe area

```css
/* ERRADO — CTA sob o home indicator */
.cta { position: fixed; bottom: 0; }
```
```css
/* CERTO */
.cta { position: fixed; bottom: calc(env(safe-area-inset-bottom) + 16px); }
```

## Checklist Angatu (mobile)

- [ ] Todo alvo tocável ≥44px + 8px espaçamento
- [ ] Nenhuma ação depende só de hover
- [ ] CTA primário no terço inferior
- [ ] `viewport-fit=cover` + `env(safe-area-inset-*)` onde há FAB/tab fixa
- [ ] `prefers-reduced-motion` implementado
- [ ] Gestos canônicos preservados (não quebre swipe-back)

---
*Fonte original: `mobile-principles/SKILL.md` + `references/{accessibility-mobile,gestures-deep}.md` · Tradução, adaptação vanilla/public e auditoria Angatu Sistemas — @author Angatu Sistemas*

*Otimização Angatu: `mobile-principles` e `desktop-principles` foram unificados no pipeline §9.6 — use este arquivo como referência detalhada quando o briefing exigir mobile. Para web vanilla, as regras de hit area, sem-hover e safe areas são obrigatórias em todo `public/`.*
