# Pipeline Mestre — Criação de Universo Visual

> **Auditoria:** Angatu Sistemas · Tradução, unificação e otimização de `paint` + `frontend-design` + `brand-landingpage` para AngatuLibraries (vanilla HTML + Tailwind local + `ds.css` + Canvas 2D) · Código em inglês, documentação em português · Pipeline completo e auditado, obrigatório para todo frontend (§9.3 do `SKILL.md`)

> **Regra Global Angatu — Responsividade sempre em Tailwind CSS (§9.6 do SKILL.md):** todo layout responsivo (breakpoints, grids, visibilidade, espaçamento, tipografia, ordem, largura/altura) é feito **exclusivamente com utilitários responsivos do Tailwind** (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`) — nunca com `@media (min-width: ...)` manual como primeira opção. Princípios de `mobile-principles` e `desktop-principles` permanecem válidos, mas sua implementação no HTML/CSS vanilla é sempre via classes Tailwind (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, `hidden lg:block`, `text-sm md:text-base` etc.).


> **Este arquivo é o orquestrador.** Ele une `frontend-design.md`, `brand-landingpage.md`, `css-native.md`, `canvas-generative.md`, `framer-motion.md`, `mobile-principles.md`, `desktop-principles.md` e `design-audit.md` em um único fluxo. Não é um "embelezador rápido" — é um pipeline de 5 fases que entrega universo visual completo.

---

## Voz

**Durante execução** — curta, imersiva, com assinatura Angatu.

- "Escolhendo a paleta..."
- "Pintando o herói com o acento da marca..."
- "Definindo os tokens de espaçamento..."

**Em relatórios / sumários / auditorias** — direta, factual, legível para dev. Sem floreio.

- "Concluído. Sistema gerado. Arquivos: `docs/design/MASTER.md`, `public/styles/tailwind.css`, `public/styles/ds.css`. 3 páginas pintadas."
- Sem prosa mística. O que mudou, arquivos tocados, próximo passo.

O floreio vive na introdução e na narração do trabalho. No momento em que um resultado cai ou uma pergunta é feita, ele some.

---

## Regras de Ferro

1. **Nunca pule o brainstorm.** Nem se o usuário disser "só deixe bonito". A única exceção documentada é escopo leve (abaixo), que encurta para 1 pergunta. Nunca remove.
2. **Uma pergunta por vez.** A segunda pergunta depende da primeira resposta.
3. **Nunca prossiga sem as duas teses validadas.** Visual + interação, ambas explicitamente aprovadas.
4. **Todo token vem do MASTER.** Sem números mágicos, sem hex solto. Em escopo leve, onde não há MASTER, eles vêm dos tokens já existentes no projeto — leia antes, não invente.
5. **Toda animação respeita a tese de interação.** Duração, easing, padrões proibidos — sem exceções.
6. **Nunca instale dependência sem perguntar.** Em AngatuLibraries, animações são CSS nativo (§9.4) ou GSAP local (`public/scripts/gsap.min.js` baixado) — nunca CDN.
7. **Trabalhe página a página, valide página a página.** Nunca tente fazer tudo de uma vez.
8. **A auditoria não é opcional.** Fase 5 sempre roda, mesmo se o usuário parecer satisfeito.
9. **Tailwind sempre local (§9.1).** Nunca `cdn.tailwindcss.com`. Valide `grep -r "cdn.tailwindcss"` vazio antes do push.
10. **Português impecável em todo texto visível (§9.2).** Acentuação, vírgulas e concordância revisadas antes do commit.
11. **Arte generativa obrigatória por tema (§9.5).** Todo frontend tem pelo menos um background/textura/ilustração gerada coerente com o tema + `og:image` + `favicon`.

---

## Escopo leve — o único atalho permitido

`paint` é pipeline de 5 fases e é a ferramenta errada para "anime esta palavra" ou "melhore este hover". Esses casos devem usar edição direta com `css-native.md`.

**É escopo leve quando os 3 valem ao mesmo tempo:**

- alvo é 1 componente, 1 efeito ou 1 elemento isolado
- nenhuma identidade visual está sendo estabelecida: o projeto já tem cores/tipo ou ainda não há projeto, só um rascunho
- nada downstream depende de o resultado ser sistematizado

Se 2 ou mais falharem, não é escopo leve. Rode o pipeline completo e diga em 1 linha por quê.

**O que muda:**

| Fase | Completo | Leve |
|---|---|---|
| 1 BRAINSTORM | 5 domínios, 1 pergunta por vez | **1 pergunta**, a menos óbvia, e pare |
| 2 TESE | visual + interação, ambas validadas | só interação, ainda validada |
| 3 SISTEMA | gera `docs/design/MASTER.md` + tokens | **pulado.** Leia os tokens existentes e use-os. Sem MASTER. |
| 4 IMPLEMENTAR | página a página | o componente único |
| 5 AUDITORIA | `design-audit.md` completo | check rápido: `prefers-reduced-motion`, saída animada, 60fps |

**Anuncie uma vez:** "Isto é um único componente, então estou rodando em modo leve: 1 pergunta, sem arquivo de sistema. Diga se quiser o pipeline completo."

**O que escopo leve nunca faz:** pular a pergunta, pular a tese ou pular validação. Só a quantidade diminui — os portões continuam.

---

## Pipeline

### Fase 1 — BRAINSTORM (obrigatório, nunca pular)

Base: rush aqui e tudo downstream sai errado. Objetivo: entender a visão bem o bastante para escrever 2 teses que o usuário aprovaria sem hesitar.

#### Scan de stack (rode antes de perguntar)

```bash
cat package.json 2>/dev/null | grep -E '"(gsap|framer-motion|tailwindcss)"'
ls src/main/resources/public/styles/tailwind.css src/main/resources/public/styles/ds.css 2>/dev/null
grep -rE 'viewport.*width=device-width|@media.*pointer:\s*coarse' --include='*.html' --include='*.css' src/main/resources/public 2>/dev/null | head -3
cat tailwind.config.js 2>/dev/null | head -n 30
cat docs/design/MASTER.md 2>/dev/null | head -n 80
```

Mapeie: **lib de animação** (GSAP local ou nenhuma → CSS nativo), **CSS** (Tailwind local + `ds.css` ou só `ds.css`), **contexto mobile vs desktop** (viewport, media queries), **MASTER existente** (reuso ou criação).

**Se `brand-landingpage` for o caso** (landing sem direção visual definida): use `brand-landingpage.md` Fase 1 (entrevista de marca em 3 partes: Produto → Sensação → Visual) em vez do brainstorm genérico. É a mesma Fase 1, só com roteiro de entrevista estruturado.

**Os 5 domínios a cobrir (vanilla Angatu):**

1. **Produto** — O que é? (app, landing, portfólio, SaaS, e-commerce, blog, dashboard...)
2. **Público** — Quem usa? (devs, designers, público geral, enterprise, crianças, luxo...)
3. **Humor** — 3 a 5 adjetivos que definem o visual
4. **Referências** — Sites, screenshots, moodboards, qualquer coisa visual
5. **Stack** — O que já existe? (vanilla + Tailwind local + `ds.css` é o padrão AngatuLibraries)

**Como perguntar:** 1 pergunta por vez, começando pelo domínio menos óbvio. Se já detectou stack, não pergunte — comece por humor ou público. Cada resposta remodela a próxima pergunta.

**Quando a resposta for vaga ("moderno", "clean", "faz bonito"):**

1. Valide — "É um começo. Vamos precisar."
2. Ofereça opções concretas — "Clean como Stripe (whitespace editorial), Linear (denso mas organizado) ou Apple (minimalismo dramático)?"
3. Reenquadre — "O que seria *errado*? Quais sites te dão arrepio? Isso também ajuda."
4. Nomeie a consequência — "Esta escolha guia toda a paleta e tipografia. Vale gastar 1 minuto."

**Nunca** interprete "é, algo assim" como confirmação. Pergunte qual parte de "isso" ressoa.

**Quando o usuário pressionar para pular:**

> "Já cobrimos [áreas cobertas]. Ainda falta [áreas faltantes], que impacta diretamente [consequência concreta]. Quer que eu faça mais 1 pergunta ou prefere que eu assuma e você corrige depois?"

Se escolher assumir, nomeie cada suposição explicitamente na tese.

**Quando parar:** quando você consegue escrever as 2 teses e apostaria que o usuário diria "perfeito". Se ainda chutaria um aspecto, continue perguntando.

---

### Fase 2 — TESE (defina direção, obtenha validação)

A partir do brainstorm, produza 2 teses:

#### Tese Visual

Uma frase que captura toda a identidade visual. **Deve endereçar explicitamente os 4:**

- **Direção de cor** — claro/escuro, família de paleta, cor de acento
- **Espírito tipográfico** — serif/sans/mono, uso de peso, contraste de tamanho
- **Filosofia de espaçamento** — denso/arejado, sensação de unidade base
- **Estilo de componentes** — arredondado/agudo, com borda/preenchido, elevado/plano

> Exemplo: "Interface escura neo-brutalista com tipografia mono ousada, acentos chartreuse fluorescentes, whitespace generoso e componentes de borda crua com sombras deslocadas."

**Auto-checagem:** releia. Se algum dos 4 estiver faltando ou vago ("tipografia bacana"), reescreva antes de apresentar.

#### Tese de Interação

Uma frase que captura a linguagem de movimento. **Deve endereçar explicitamente os 4:**

- **Faixa de duração** — rápido (100–200ms), médio (200–400ms) ou lento (400ms+)
- **Comportamento de hover** — o que acontece no hover
- **Comportamento de scroll** — reveals, parallax ou nada
- **Padrões proibidos** — o que este projeto NÃO fará

> Exemplo: "Transições rápidas e secas (100–200ms), hover com scale sutil (1.02), reveals por scroll com stagger, sem bounce ou elastic — tudo ease-out nítido."

**Exemplos de tese para AngatuLibraries (vanilla):**

- "Hero com `view-transition-name` e `animation-timeline: view()` para reveal suave (200ms ease-out), hover com `translateY(-2px)` e sem bounce."
- "Dashboard com `animation-timeline: scroll()` no header + stagger de 80ms em listas, duração máxima 300ms, `prefers-reduced-motion` como fallback."

**Auto-checagem:** se você não consegue derivar propriedades CSS/JS diretamente da tese, está vaga. Reescreva.

**Este é o primeiro portão visual.** Apresente as 2 teses (em texto + se possível um preview mínimo: swatches, specimen tipográfico, curva de easing em SVG). Valide **ambas** explicitamente antes de seguir. Se houver pushback, pergunte o que soa errado e ajuste — não recomece do zero.

---

### Fase 3 — SISTEMA DE DESIGN

Gere o `MASTER.md` canônico + tokens em código. Em AngatuLibraries o formato é **Tailwind local + `ds.css`**:

- **Paleta** — primária, secundária, acento, neutros, semânticas (success/warning/error/info). Claro + escuro se necessário.
- **Tipografia** — stack de fontes (1 display característica + 1 body complementar + 1 utility para captions/dados), escala fluida, pesos, line-height.
- **Espaçamento** — unidade base, escala 4/8/12/16/24/32/48/64.
- **Raios** — `none`, `sm`, `md`, `lg`, `full`.
- **Sombras** — níveis 0–4, coerentes com a tese visual.
- **Componentes base** — Button, input, card, badge, link — com 5 estados (default, hover, focus, active, disabled).
- **Tokens de motion** — escala de durações (fast/normal/slow), easings nomeados, stagger.

#### MASTER.md

Crie `docs/design/MASTER.md` na raiz. É a única fonte de verdade. Toda decisão de implementação referencia este arquivo.

#### Arquivos de código (gerados a partir do MASTER)

- `tailwind.config.js` — extensão com `theme.extend` (cores, fontes, espaçamentos, easings) + `content: ["./src/main/resources/public/**/*.{html,js}"]`
- `src/main/resources/public/styles/tailwind.css` — gerado via `tools/tailwindcss -i tailwind.input.css -o ... --minify` (§9.1 do SKILL.md)
- `src/main/resources/public/styles/ds.css` — `:root { --token: ... }` complementando o Tailwind com tokens do MASTER

#### Otimização Angatu nesta fase

- **Arte por tema já definida aqui.** Escolha a receita de `canvas-generative.md` (§9.5) que casa com a tese visual (ex: tese "financeiro frio" → flow field em `oklch` frio) e já registre no MASTER: `Geração: flow field Simplex + partículas damping 0.98 + og:image 1200×630`.
- **SEO por tema já definido aqui.** Paleta do MASTER gera `favicon`/`og:image`; copy da tese gera `meta description` e `json-ld` (Organization/Product/Article).

**Mostre antes da Fase 4.** Apresente o sistema (swatches com hex + ratio, specimen tipográfico, barras de espaçamento, amostras de raio/sombra, estados de componentes) e obtenha validação antes de implementar. É o lugar mais barato para pegar um token errado.

---

### Fase 4 — IMPLEMENTAÇÃO

Carregue os princípios conforme contexto:

- **Sempre:** `mobile-principles.md` ou `desktop-principles.md` (conforme detecção) + `css-native.md` + `framer-motion.md` (equivalentes vanilla)
- **Se arte generativa na tese:** `canvas-generative.md`
- **Se landing sem marca:** `brand-landingpage.md` Fase 3
- **Auditoria só na Fase 5:** `design-audit.md`

Regras de implementação:

- Página por página, valide página por página. Nunca tudo de uma vez.
- Toda cor, fonte, espaçamento, sombra e raio vem do `MASTER.md`. Sem números mágicos.
- Toda animação respeita a tese de interação (duração, easing, padrões proibidos).
- Regra dos 5 estados em todo interativo: **default, hover, focus, active, disabled**.
- Peça validação do usuário após cada página/seção maior antes de avançar.
- **Geração de arte:** implemente o canvas generativo escolhido na Fase 3 (setup DPR-aware obrigatório), exporte `og:image` e `favicon`, adicione `alt` e `aria-hidden` conforme §9.5.

---

### Fase 5 — AUDITORIA (nunca pular)

Carregue `design-audit.md` e rode o checklist completo:

**Todos os stacks (vanilla Angatu):**
- [ ] `prefers-reduced-motion` respeitado
- [ ] Animações de saída presentes (sem sumiço abrupto)
- [ ] Sem animação de propriedades de layout (`width`/`height`/`top`/`left`)
- [ ] Foco visível em interativos
- [ ] 5 estados em interativos
- [ ] Cores/espaçamentos coerentes com MASTER — sem hex solto
- [ ] `grep -r "cdn.tailwindcss"` vazio
- [ ] `og:image` + `json-ld` + `meta description` revisada (§9.2)

**Web vanilla:**
- [ ] `@starting-style` / `view-transition-name` onde há entrada/saída
- [ ] Contraste ≥4.5:1
- [ ] Sem reflow forçado, `will-change` comedido
- [ ] 60fps verificado (DevTools Performance)
- [ ] Sem `div` clicável sem `role="button"`
- [ ] `aria-hidden` em animações decorativas
- [ ] Responsivo em 375 / 768 / 1024 / 1440

Apresente achados por severidade: **Crítico > Importante > Bom ter**. Só então considere entregue.

---

## Protocolo para projeto existente

Quando invocado em projeto que já tem design/estilo:

1. Ainda rode o BRAINSTORM completo (Fase 1)
2. Reconheça o design existente, mas a tese o sobrescreve
3. Na Fase 4, **substitua** tokens/estilos existentes pelo novo sistema
4. Preserve funcionalidade e estrutura de layout — só substitua a camada visual

Isto é intencional: este pipeline reconstrói o universo visual. Para melhorar o que existe sem reconstruir, faça edição direta com `css-native.md` ou `frontend-design.md`.

---

## Sinais de alerta — você está prestes a violar

| Pensamento | Realidade |
|---|---|
| "Usuário já disse 'minimal escuro' — tenho tese" | Duas palavras não são 5 domínios. Continue perguntando. |
| "Vou fazer as 5 perguntas de uma vez" | Uma por vez. Resposta de público muda como você pergunta sobre humor. |
| "Usuário está impaciente, vou pular para código" | Use o protocolo de pressão. Tese ruim custa dias, não minutos. |
| "Escolho cores que parecem certas" | Todo token vem do MASTER. Sem freelancing. |
| "Faço o site inteiro de uma vez" | Página por página. Valide página por página. |
| "Esta animação ficaria legal mesmo que a tese diga sem bounce" | Tese é lei. Quer mudar? Revalide. |
| "Auditoria pode esperar, usuário parece feliz" | Auditoria não é opcional. Fase 5 sempre roda. |
| "Interpreto 'é, algo assim' como sim" | Não é confirmação. Pergunte qual parte ressoa. |
| "Listo a paleta como hex, é preciso" | Preciso e irrevisável. Mostre visualmente. |
| "Pergunto de novo como quer ver o sistema" | Perguntou uma vez, vale para a sessão. Anuncie o modo e siga. |
| "Preview ficou bom, vou construir o app a partir dele" | Preview é descartável. Construa a partir do MASTER. |
| "Vou usar CDN do Tailwind para prototipar rápido" | Nunca. Tailwind sempre local (§9.1). |

---
*Fonte original: `paint/SKILL.md` (genjutsu) · Tradução, compressão, adaptação vanilla AngatuLibraries e auditoria Angatu Sistemas — @author Angatu Sistemas*

*Otimização Angatu nesta versão: unificação de 9 skills em pipeline único auditado; `paint` como orquestrador + 8 referências especializadas; geração automática de arte por tema (5 receitas §9.5) integrada nas Fases 3–4; SEO automático por tema (og:image/favicon/json-ld) integrado na Fase 3; validação obrigatória de Tailwind local e português (§9.1/§9.2) na Fase 5; código em inglês + Javadocs em português + `@author Angatu Sistemas` em todas as classes.*
