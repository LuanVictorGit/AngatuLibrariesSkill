# Landing Page Orientada à Marca — Entrevista e Geração

> **Auditoria:** Angatu Sistemas · Tradução e adaptação de `brand-landingpage` para AngatuLibraries (vanilla + Tailwind local) · Código em inglês, documentação em português · Original usa Stitch; aqui o fluxo é adaptado para geração local vanilla sem dependência de SDK proprietário

> **Regra Global Angatu — Responsividade sempre em Tailwind CSS (§9.6 do SKILL.md):** todo layout responsivo (breakpoints, grids, visibilidade, espaçamento, tipografia, ordem, largura/altura) é feito **exclusivamente com utilitários responsivos do Tailwind** (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`) — nunca com `@media (min-width: ...)` manual como primeira opção. Princípios de `mobile-principles` e `desktop-principles` permanecem válidos, mas sua implementação no HTML/CSS vanilla é sempre via classes Tailwind (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, `hidden lg:block`, `text-sm md:text-base` etc.).


## Quando usar

Use quando o usuário precisa de **landing page / homepage / página de marketing** sem direção visual definida. Não use para dashboards, app UI, nível de componente, multi-página ou restyle com tokens já definidos — nesses casos use `frontend-design.md`.

Tom: direto e técnico — o usuário entende APIs, `.env` e HTML. Traduza conceitos de marca/design, não esconda a cadeia de ferramentas.

## Visão geral do fluxo

```
FASE 0         FASE 1        FASE 2          FASE 3                    FASE 4
PREPARAÇÃO → ENTREVISTA → SISTEMA DE    → GERAR E REVISAR EM LOOP → ENTREGAR
de marca     (3 partes)    DESIGN          (gerar → mostrar →          (bundle
             A: Produto    (traduzir →     feedback → editar/           para
             B: Sensação   criar tokens)   variante → repetir)          deploy)
             C: Visual
```

Estado persiste em `.brand/metadata.json` (espelhando `.stitch/metadata.json` original). Se existir com status além de `interview`, retome da fase salva.

## Fase 1 — Entrevista de marca (obrigatória)

Resista a pular direto para geração — sem entrevista você gera template genérico.

> "Antes de gerar, quero fazer algumas perguntas rápidas sobre o projeto e como você quer que ele seja percebido. São ~5 minutos e fazem a diferença entre um template genérico e uma página que combina com a sua marca. Cerca de 10 perguntas."

### Fase A: Produto e propósito

Pergunte: nome do produto/projeto, o que faz, público-alvo, ação desejada do visitante (cadastrar, testar demo, entrar em lista de espera, etc.).

**Transição:** só avance quando tiver: nome + o que faz + público-alvo + CTA desejado (4 obrigatórios).

### Fase B: Sensação de marca

Pergunte: 3 adjetivos de marca (ofereça menu: `Confiável`, `Ousado`, `Minimalista`, `Luxuoso`, `Divertido`, `Técnico`, `Orgânico`, `Futurista`, etc.), site de referência que admira (opcional), preferência claro vs escuro.

**Transição:** 3 adjetivos + direção claro/escuro.

### Fase C: Preferências visuais

Pergunte: cores existentes ou sensação de cor, fonte moderna vs tradicional, formas pontiagudas vs arredondadas.

**Transição:** direção de cor + direção tipográfica + direção de forma. Confirme resumo completo antes de gerar.

### Imagens

Não peça imagens/logos. Se o usuário anexar espontaneamente (logo, screenshot, inspiração):

1. Peça que descreva com palavras (cores dominantes, humor, linguagem de formas, tipografia).
2. Salve o original em `.brand/user-assets/` com nome descritivo.
3. Incorpore os atributos descritos no sistema e nos prompts.
4. Avise: "Anotei o estilo que você descreveu e vou refletir no design. O arquivo original está no bundle para você trocar no HTML com um simples `<img>` ou `ImageAPI`."

## Fase 2 — Criação do sistema de design

**Tabela de tradução (respostas → tokens):**

| Resposta | Parâmetro | Referência |
|---|---|---|
| 3 adjetivos | `colorVariant` (enum) | Árvore de decisão de variantes |
| Claro / escuro | `colorMode` (`LIGHT`/`DARK`) | Direto |
| Cor primária (hex) | `customColor` | Direto |
| Moderna / tradicional | `headlineFont` + `bodyFont` | Guia de personalidade tipográfica |
| Pontiagudo / arredondado | `roundness` (`ROUND_FOUR` → `ROUND_FULL`) | Direto |

**Passos:**

1. **Crie `DESIGN.md`** em `.brand/DESIGN.md`:
   ```
   # {Nome do Projeto} — Sistema de Design
   ## Sensação de marca
   {adj1}, {adj2}, {adj3}
   ## Direção de cor
   Primária: {nome} ({hex}) — {por que combina}
   Modo: {Claro/Escuro} Variante: {colorVariant}
   ## Tipografia
   Títulos: {fonte} — Corpo: {fonte}
   ## Forma
   {descrição de roundness}
   ```
2. **Gere tokens** em `docs/design/MASTER.md` (ver `frontend-design.md` §9.3): paleta 4–6 hex, tipografia, espaçamentos, raios, sombras, componentes base e motion tokens. Todo token em inglês, Javadoc em português + `@author Angatu Sistemas`.
3. **Salve estado** em `.brand/metadata.json`.

## Fase 3 — Gerar e revisar em loop

### Primeira geração

1. Selecione seções por tipo de produto (hero, benefícios, prova social, FAQ, CTA, footer — taxonomia do `stitch-architecture.md` original, adaptada para HTML vanilla).
2. Monte o prompt de geração a partir do `DESIGN.md` + tokens do MASTER.
3. Gere `desktop-v1.html` em `.brand/designs/` (e `mobile-v1.html` se necessário) — HTML vanilla + `styles/tailwind.css` (local, §9.1) + `styles/ds.css`.
4. Abra no navegador (`start` / `open` / `xdg-open`) e valide responsivo.
5. Salve estado em `.brand/metadata.json`.

### Apresentação

1. Salve e abra o HTML local.
2. Oriente: "Abri a versão mais recente no navegador. Hero no topo com headline e CTA, depois {seções}, footer no final."
3. Faça as 3 perguntas:
   - "Qual sua reação nos primeiros 5 segundos?"
   - "Isso parece o SEU produto?"
   - "O que está estranho, faltando ou não soa certo?"

### Tradução de feedback

| Padrão | Ação |
|---|---|
| Mudança pontual ("mova X", "troque headline para Y") | Edição direta no HTML/CSS |
| Insatisfação geral ("não gostei", "sem graça") | Gerar 2–3 variantes com direção alternativa |
| Aprovação parcial ("amo layout, odeio cores") | Variante focada no aspecto criticado |
| Quer comparar | 3 variantes lado a lado (`desktop-vN-option-a/b/c.html`) |
| "Algo totalmente diferente" | Repensar completo |
| "Preferia a anterior" | Rollback via histórico em `.brand/designs/` |
| Feedback em CSS/pixels | Traduza para intenção de design |
| Aprovação ("ficou bom", "pode enviar") | Saia do loop → variante mobile → Fase 4 |

**Guardrails:** sempre abra o HTML atualizado; atualize metadata a cada mudança; após 3 rodadas positivas sugira ship; após 5 foque no item mais importante.

### Variante mobile

Após aprovação desktop: "Quer que eu gere o layout mobile também?" Se sim, gere `MOBILE` e revise em 1–2 rodadas.

## Fase 4 — Bundle de entrega

```
{project-name}-landing-page/
  index.html              # HTML final desktop
  mobile.html             # mobile (se gerado)
  design/
    DESIGN.md             # documentação de marca
    color-tokens.json     # tokens estruturados
  assets/
    {imagens do usuário}
  public/assets/
    og-{tema}.png         # arte generativa por tema (§9.5)
  DEPLOY.md               # checklist de deploy
```

1. Copie a última versão aprovada para `index.html`/`mobile.html`.
2. Gere `color-tokens.json` (cor primária, modo, variante, fontes, roundness).
3. Copie `DESIGN.md` e assets do usuário.
4. Gere `og:image` via canvas generativo (§9.5) + `favicon`.
5. Gere `DEPLOY.md` (checklist: `new AngatuLib("loja.angatusistemas.com.br", 1716, true)`, `HtmlRouteAPI`, env vars).
6. Zip: `Compress-Archive` / `zip -r "{project-name}-landing-page.zip" "{project-name}-landing-page/"`.

## Recuperação

- **Sessão interrompida:** carregue `.brand/metadata.json`, abra o último HTML e pergunte onde continuar.
- **Geração falhou:** não tente de novo imediatamente; verifique estado; tente uma vez com prompt simplificado.
- **Projeto expirado:** "Projeto anterior expirou, mas os dados de marca estão salvos. Recriando."

---
*Fonte original: `brand-landingpage/SKILL.md` + `references/{interview-framework,stitch-architecture,state-and-pitfalls}.md` · Tradução, adaptação vanilla e auditoria Angatu Sistemas — @author Angatu Sistemas*

**Otimização Angatu nesta versão:** fluxo sem dependência de Stitch SDK; entrevista condensada em português com validação via `AskUserQuestion`; geração direta em vanilla + Tailwind local; arte generativa obrigatória por tema (canvas 2D §9.5) + `og:image`/`favicon` automáticos; entrega já no padrão `public/` da AngatuLibraries.
