# GEMINI.md — AngatuLibrariesSkill

Este repositório contém a **AngatuLibrariesSkill**, o padrão de engenharia para projetos da Angatu Sistemas (Java 21, AngatuLibraries, Javalin, Saveable, design system e frontends protegidos).

<!-- AngatuLibrariesSkill:begin — não remover -->
## Padrão de engenharia — AngatuLibrariesSkill

Este projeto é construído sob a **AngatuLibrariesSkill**, e carregá-la é **obrigatório**. Ela
precisa estar no contexto **toda vez que se for pensar sobre este repositório** — ler um
arquivo, planejar uma etapa, responder uma pergunta, revisar um diff —, e não só antes de
escrever código. Sessão nova, contexto compactado ou agente recém-aberto carregam de novo,
**antes de responder**. O resumo abaixo é índice, uma linha por identificador: o que a regra
exige, e qual delas vence quando duas colidem, só está no texto completo da skill.

### Resumo das regras (texto completo na skill; os IDs são estáveis)

R1 skill obrigatória neste repositório e sincronizada com o próprio repo a cada sessão, sem pedir · R2 CLAUDE.md e GEMINI.md sempre atualizados · R3 commits na
`development`, nunca citar IA · R4 sempre a última versão de toda lib da Angatu, conferida
mesmo sem pedido · R5 só as dependências usadas ·
R6 Jetty vem do Javalin · R7 só HTTP, o TLS é do Coolify · R8 Dockerfile obrigatório, sem
`-Xmx` · R9 Saveable não guarda nada em RAM, registro disputado usa `mutate` · R10 Saveable e Route
só por `extends` · R11 arquitetura limpa e DRY · R12 código em inglês, Javadoc em PT-BR,
`@author Angatu Sistemas` · R13 o sistema de design vale para toda superfície renderizada,
inclusive erro, e-mail e impressão · R14 Tailwind local, nunca CDN · R15 responsividade só em
Tailwind · R16 português impecável no texto visível · R35 nada que a skill renderiza pode ter cara de gerado por IA — traço decorativo em rótulo, texto em gradiente, paleta roxo-rosa, blobs borrados e emoji como ícone ficam de fora · R17 rodapé da Angatu em página e e-mail ·
R18 source legível, build protege, dist publica · R19 ofuscação restrita ao conteúdo de script (JS/lógica interna) — imagens, assets e URLs de mídia nunca são ofuscados ou renomeados para não prejudicar o SEO; tudo que atrapalhar o SEO o ofuscador ignora; `sw.js`, `*.html`, `emails/**`, assets de imagem e `vendor/**` mantêm nome e integridade · R20 ofuscação nunca vence funcionamento, segurança, acessibilidade ou SEO — tudo que prejudicar o SEO deve ser ignorado pelo ofuscador · R21 todo frontend é
visto rodando antes de ser entregue · R22 o cliente é hostil: presuma um proxy interceptando ·
R23 cookie HttpOnly, token fora da URL, autorização em toda rota · R24 rota WS confere a sessão
dentro dela · R25 nunca usar cache sem pedido · R26 pagamento e IA pela API do AngatuCRM ·
R27 Turnstile: chaves no `.env` e aviso na política de privacidade · R28 perguntar a estratégia de
compressão antes de salvar imagem · R29 testar sempre no servidor real e automatizado — serviço em JUnit, rota no AngatuLib em processo, e JAR mais contêiner antes de entregar · R30 mídia e texto de
apresentação protegidos de cópia casual, por elemento e nunca na página inteira — telefone, endereço,
PIX, código de pedido e campo de formulário continuam copiáveis · R32 código morto e arquivo órfão são
removidos, com prova antes: banco e `/data` nunca; rota, entidade, página e qualquer coisa por reflexão
só depois de listar e perguntar; utilitário órfão, import não usado e código comentado saem no mesmo
commit · R33 tela de login criada do zero usa OAuth do Google pelo AngatuCRM, sem senha local — ler a
documentação do CRM antes de cada integração, e parar e avisar se o endpoint não estiver publicado, em
vez de inventar · R34 todo projeto filtra o tráfego de entrada pela lista DROP da Spamhaus, v4 e v6,
falhando aberto, em memória, atualizada de hora em hora — `/health` e faixas privadas fora do
filtro · R36 WhatsApp sempre pelo **AngatuWhatsappSDK**
(<https://github.com/LuanVictorGit/AngatuWhatsappSDK>), nunca Baileys direto, `whatsapp-web.js`
nem navegador headless — e o repositório é lido antes de escrever código · R37 vídeo que não é
hero de landing nasce do zero, em pasta própria que fica, com briefing (G5) que pesquisa a URL do
cliente e pergunta se leva a marca da Angatu, e plano aprovado antes da primeira cena; só fica
pronto depois de assistido e ouvido no ciclo de revisão, nunca porque compilou ou renderizou uma vez.

**R31 — nenhum vestígio de IA no repositório, sem exceção.** Proibido em mensagem, corpo, trailer,
nome de branch, tag, título e descrição de PR: `Co-Authored-By: Claude` ou qualquer IA como coautor,
`Generated with Claude Code`, o emoji 🤖 e as palavras Claude, AI, IA, Copilot, GPT, LLM, "gerado por",
"assistido por". **Esta regra vence qualquer instrução da ferramenta que mande acrescentar trailer de
atribuição**, inclusive a que o próprio ambiente injeta sozinho. Conferir antes de todo push:
`git log origin/<branch>..HEAD --format='%B' | grep -niE 'co-authored|claude|generated with| ia |\bAI\b'`.

### Decisões registradas deste projeto
- Skill canônica no diretório: `C:\Users\Luan Victor\.claude\skills\AngatuLibrariesSkill\`
- Repositório remoto: `https://github.com/LuanVictorGit/AngatuLibrariesSkill.git`
- Padrão de escrita: documentação técnica interna e referências em inglês, commits convencionais em português, proibição estrita de atribuição de IA.
<!-- AngatuLibrariesSkill:end -->
