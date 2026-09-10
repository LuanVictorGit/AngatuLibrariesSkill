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
de marca     (4 partes)    DESIGN          (gerar → mostrar →          (bundle
             A: Produto    (traduzir →     feedback → editar/           para
             B: Sensação   criar tokens)   variante → repetir)          deploy)
             C: Visual
             D: Marca e material real
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

### Fase D: marca e material real (obrigatória — §9.14 do SKILL.md)

A landing Angatu não é template com logo trocada: ela usa a **logo oficial** e o **material real** da empresa. Pergunte, sempre:

1. **Logo oficial** — arquivo vetorial ou PNG de alta resolução, em variante clara e escura se houver. É ela que vira a marca d'água do vídeo do hero; **nunca redesenhe à mão**.
2. **Material real disponível** — fotos da empresa, da equipe, do estabelecimento, de máquinas, produtos, processos, obras, veículos, clientes divulgados pela própria empresa, registros históricos, vídeos institucionais, documentários.
3. **Autorização de uso** — confirme, item a item, que a empresa pode usar aquele material (foto de pessoa, obra de terceiro, trecho de documentário e imagem de cliente têm dono). **Sem autorização confirmada, o material não entra.** Registre a origem e a autorização no `CLAUDE.md`.
4. **Segmento e vocabulário visual** — de que ramo é a empresa, o que aparece no dia a dia dela (ferramentas, ambientes, artefatos). É daí que sai o **background SVG temático exclusivo** do §9.14.

Salve os arquivos em `.brand/user-assets/` com nome descritivo, peça a descrição em palavras do que cada peça mostra e incorpore no sistema de design. Material real é prioridade sobre ilustração genérica — mas só quando tiver relação clara com o conteúdo; nada entra para preencher espaço.

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

1. **Monte a arquitetura a partir do negócio, não de uma taxonomia fixa (§9.15 do SKILL.md).** Nada de `hero → 3 cards → números → benefícios → depoimentos → planos → FAQ → CTA` por inércia: serviço local costuma pedir `hero → serviços → processo → trabalhos realizados → localização → contato`; produto pede `hero → produto → demonstração → funcionalidades → comparação → preço → FAQ`; institucional pede `hero → história → estrutura → serviços → fotos reais → localização → contato`. **Prova social só existe com depoimento real, autorizado e atribuível.**
2. Monte o prompt de geração a partir do `DESIGN.md` + tokens do MASTER.
3. Gere `desktop-v1.html` em `.brand/designs/` (e `mobile-v1.html` se necessário) — HTML vanilla + `styles/tailwind.css` (local, §9.1) + `styles/ds.css`. **Já nesta primeira versão entram o background SVG temático e o hero em motion graphics do §9.14, e todo texto nasce sob a revisão anti-IA do §9.15** (ver `landing-motion.md` e `landing-copy.md`).
4. **Valide rodando o JAR do projeto (§14.1 do SKILL.md), nunca por `file://` nem por servidor estático.** Copie a versão em revisão para `src/main/resources/public/`, rode `mvn package -DskipTests && java -jar target/<app>.jar` e abra `http://localhost:8080/<pagina>`. Fora do servidor real não existem sessão, API, substituição de `{content}` nem política de segurança, e o defeito aparece só em produção. `.brand/designs/` guarda o histórico de versões, não é o lugar de visualizar.
5. Salve estado em `.brand/metadata.json`.

### Apresentação

1. Publique a versão em revisão em `public/` e suba o JAR (§14.1).
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
    og/<slug>.jpg         # capa editorial por página (§9.16)
    hero-desktop.mp4      # hero em motion graphics (§9.14), se houver
    bg-<segmento>.svg     # background temático exclusivo (§9.14)
  DEPLOY.md               # checklist de deploy
```

1. Copie a última versão aprovada para `index.html`/`mobile.html`.
2. Gere `color-tokens.json` (cor primária, modo, variante, fontes, roundness).
3. Copie `DESIGN.md` e assets do usuário.
4. Gere a **capa de compartilhamento por página** conforme o §9.16 (logo + imagem real + título da página + grafismo da identidade, 1200×630, em `public/assets/og/<slug>.jpg`) e o `favicon`. Ver `landing-seo-og.md`. Uma arte genérica repetida em todas as URLs não passa.
5. Escreva o `<head>` completo de cada URL (title, description, canonical, Open Graph, Twitter, Schema.org, favicon) conforme o §9.16.
6. **Revisão anti-IA obrigatória (§9.15):** releia todo o texto com a pergunta "se eu tirasse a marca, esse texto serviria para qualquer empresa?" e reescreva o que passar. Rode a validação de 15 pontos do §9.16.
7. Gere `DEPLOY.md` (checklist: `new AngatuLib("loja.angatusistemas.com.br", 1716, true)`, `HtmlRouteAPI`, env vars).
8. Zip: `Compress-Archive` / `zip -r "{project-name}-landing-page.zip" "{project-name}-landing-page/"`.

## Recuperação

- **Sessão interrompida:** carregue `.brand/metadata.json`, suba o JAR com a última versão e pergunte onde continuar.
- **Geração falhou:** não tente de novo imediatamente; verifique estado; tente uma vez com prompt simplificado.
- **Projeto expirado:** "Projeto anterior expirou, mas os dados de marca estão salvos. Recriando."

---
*Fonte original: `brand-landingpage/SKILL.md` + `references/{interview-framework,stitch-architecture,state-and-pitfalls}.md` · Tradução, adaptação vanilla e auditoria Angatu Sistemas — @author Angatu Sistemas*

**Otimização Angatu nesta versão:** fluxo sem dependência de Stitch SDK; entrevista condensada em português com validação via `AskUserQuestion`, agora com a Fase D de marca e material real; geração direta em vanilla + Tailwind local; background SVG temático e hero em motion graphics obrigatórios (§9.14, `landing-motion.md`); redação sob revisão anti-IA (§9.15, `landing-copy.md`); capa editorial de Open Graph por página (§9.16, `landing-seo-og.md`); validação sempre pelo JAR do projeto (§14.1); entrega já no padrão `public/` da AngatuLibraries.
