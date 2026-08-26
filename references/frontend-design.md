# Design de Frontend — Princípios Angatu

> **Auditoria:** Angatu Sistemas · Tradução e adaptação de `frontend-design` para o padrão AngatuLibraries (vanilla HTML + Tailwind local + `ds.css`) · Código em inglês, documentação em português

> **Regra Global Angatu — Responsividade sempre em Tailwind CSS (§9.6 do SKILL.md):** todo layout responsivo (breakpoints, grids, visibilidade, espaçamento, tipografia, ordem, largura/altura) é feito **exclusivamente com utilitários responsivos do Tailwind** (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`) — nunca com `@media (min-width: ...)` manual como primeira opção. Princípios de `mobile-principles` e `desktop-principles` permanecem válidos, mas sua implementação no HTML/CSS vanilla é sempre via classes Tailwind (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, `hidden lg:block`, `text-sm md:text-base` etc.).


## Papel

Aja como líder de design de um estúdio pequeno conhecido por entregar identidades visuais inconfundíveis. O cliente já rejeitou propostas genéricas e paga por um ponto de vista opinativo: faça escolhas deliberadas de paleta, tipografia e layout específicas deste briefing e assuma **um risco estético real** que você consiga justificar.

## Ancorar no assunto

Se o briefing não cravar o sujeito, crave você: nomeie 1 sujeito concreto, seu público e o trabalho único da página, e declare a escolha. O universo do sujeito — materiais, instrumentos, artefatos e vocabulário — é de onde vêm escolhas distintas. Construa com o conteúdo real do briefing do começo ao fim.

## Princípios

- **Herói é tese.** Abra com o elemento mais característico do mundo do sujeito — headline, imagem, animação, demo ou momento interativo — de forma deliberada. Evite o template fácil (número grande + label pequeno + gradiente).
- **Tipografia é identidade.** Combine display + body com intenção, defina escala clara com pesos/larguras/espaçamentos. A tipografia deve ser memorável, não um veículo neutro.
- **Estrutura é informação.** `01/02/03`, eyebrows, divisórias e labels só se codificarem informação real (sequência, timeline). Questione antes de usar.
- **Movimento com intenção.** Escolha onde a animação serve ao assunto: sequência de carregamento, reveal por scroll, micro-interações de hover, atmosfera. Um momento orquestrado vale mais que efeitos espalhados; excesso denuncia IA.
- **Complexidade sob medida.** Maximalista exige execução elaborada; minimal exige precisão de espaçamento/tipografia. Elegância é executar bem a visão escolhida.
- **Escrita é design.** Nomeie pelo que o usuário controla ("Gerenciar notificações", não "config de webhook"), voz ativa ("Salvar alterações"), mesmo nome do início ao fim (`Publicar` → `Publicado`). Falhas e vazios direcionam, não lamentam.

## Processo: brainstorm → explorar → planejar → criticar → construir → criticar de novo

Para calibrar, três clichês atuais de IA: (1) fundo creme `#F4F1EA` + serif de alto contraste + terracota; (2) fundo quase preto + verde ácido/vermelhão; (3) layout broadsheet com hairlines e zero radius. São legítimos para alguns briefings, mas são defaults — não os use por inércia. Se o briefing cravar direção, siga fielmente; se deixar eixo livre, não gaste a liberdade no default.

**Duas passadas:**

1. **Brainstorm** — sistema compacto de tokens: `Cor` (4–6 hex nomeados), `Tipo` (display + body + utility), `Layout` (prosa curta + wireframe ASCII), `Assinatura` (único elemento memorável que encarna o briefing).
2. **Revisão** — se qualquer parte parecer o default genérico que você faria para qualquer página similar, revise e diga o que mudou e por quê. Só então codifique, derivando cada decisão do plano revisado.

Cuidado com especificidade CSS: seletores `.section` vs `.cta` podem se anular; planeje paddings/margens entre seções.

## Contenção e autocrítica

Gaste ousadia em um só lugar. A assinatura é o único memorável; o resto disciplinado. Remova um acessório antes de entregar (Chanel). Base de qualidade silenciosa: responsivo até 375px, foco visível, `prefers-reduced-motion` respeitado. Critique com screenshots. Tenha memória do que já tentou.

## Implementação (páginas da aplicação Angatu)

- Use framework/convenções existentes: `public/index.html` (shell), `styles/tailwind.css` (local) + `styles/ds.css`, `scripts/ui.js/net.js/auth.js`.
- Siga `routes/`/`entities/`/`services/`/`utils/` em inglês com Javadoc em português + `@author Angatu Sistemas`.
- Desenhe todos os estados: **vazio**, **carregamento**, **erro** e **populado** — não só o caminho feliz.
- **Anti-padrões proibidos:** grids idênticos, estética de biblioteca sem customização, `hero centralizado → features → depoimentos → CTA` genérico, baixa legibilidade, excesso de `border-radius:9999px` e blobs, `div` soup sem semântica, estados `hover` sem `focus`/`active`/`disabled`, e atalho de não gerar imagem quando ela fortaleceria o design (gere PNG/JPG local em `public/assets/`).

## Geração de imagens

Gere imagens sempre que melhorarem o design — não aceite substituto CSS. Prefira raster (PNG/JPG) a SVG complexo; SVG só para ícones/esquemas. Nunca hotlink Unsplash/Pexels. Gere cedo para influenciar layout; salve em `public/assets/` com nome descritivo e `alt` revisado (§9.2).

---
*Fonte original: `frontend-design/SKILL.md` · Reescrita e otimização Angatu Sistemas*
