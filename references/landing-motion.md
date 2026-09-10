# Landing Pages — background temático, hero em motion graphics e material real

> **Auditoria:** Angatu Sistemas · Referência completa do **§9.14** do `SKILL.md` · Stack Angatu (vanilla HTML + Tailwind local + `ds.css`) · Código em inglês, documentação em português

> **A promessa:** a landing tem de parecer uma **apresentação profissional daquela empresa** — não um template limpo com logo trocada. Identidade visual + conteúdo + narrativa + autenticidade + performance + responsividade, nessa ordem de esforço.

> **A lei do §9.9 continua valendo aqui:** SVG, CSS, JS e o código das compositions ficam **legíveis durante o desenvolvimento**. Otimização de SVG, de imagem, de vídeo, minificação e ofuscação acontecem **só no build** (§9.10).

---

## 1. O que é o Remotion aqui — e o que ele não é

**O Remotion é ferramenta de autoria, descartável.** Ele é usado para criar o vídeo do zero e, depois que o arquivo final está validado, **a biblioteca é apagada**. O que fica no projeto é **só o vídeo**. Nada de `node_modules` de 500 MB, nada de dependência de React no repositório da aplicação, nada de lixo acumulado.

| | |
|---|---|
| **É** | um estúdio temporário para produzir `hero-desktop.mp4`, `hero-mobile.mp4` e o pôster |
| **Não é** | dependência da aplicação, framework de página, animação de runtime, parte do build |

Isso **não** contraria a regra de não trocar a tecnologia do projeto (§9.12): a página continua HTML + CSS + JS vanilla e recebe uma tag `<video>`. O React vive fora do repositório, por algumas horas, e some.

### 1.1 Ciclo obrigatório

```
criar workspace fora do repositório  →  compor as cenas  →  renderizar desktop + mobile + pôster
        →  copiar os arquivos para src/main/resources/public/assets/
        →  validar na página, com o JAR rodando (§14.1)
        →  APAGAR o workspace inteiro (projeto + node_modules)
        →  registrar no CLAUDE.md o que o vídeo comunica, proporções, duração e material usado
```

O registro no `CLAUDE.md` é o que permite **recriar** o vídeo depois — e recriar do zero é exatamente o modo de trabalho combinado. Sem o registro, ninguém sabe meses depois o que aquele arquivo mostrava nem de onde vieram as fotos.

```bash
# fora do repositório da aplicação — nunca dentro de src/
cd "$TEMP" && npx create-video@latest hero-<cliente>
# ... compor, renderizar ...
cp out/hero-*.mp4 out/hero-poster.jpg <projeto>/src/main/resources/public/assets/
rm -rf "$TEMP/hero-<cliente>"        # o estúdio some; o vídeo fica
```

Se por qualquer motivo o workspace for criado dentro do projeto (`motion/`), ele entra no `.gitignore` **antes** do primeiro commit e é apagado ao fim. Nunca vai para o repositório, nunca entra na imagem Docker, nunca aparece no `package.json` do build de frontend.

---

## 2. O vídeo se comporta como GIF — sem áudio

Todo vídeo de landing produzido aqui é **mudo, curto e em laço**, apresentado como um GIF de alta qualidade:

- **Sem faixa de áudio.** Renderize com `--muted`; não use `<Audio>` na composition. Áudio inesperado numa landing é o defeito mais rápido de fazer o visitante fechar a aba.
- **Sem controles.** `autoplay muted loop playsinline`, sem `controls`.
- **Curto e com laço natural:** **8 a 15 segundos**. O último quadro conversa com o primeiro para o laço não "cortar".
- **`muted` não é decoração:** é o que permite o `autoplay` funcionar no iOS e no Android. `playsinline` impede o iPhone de abrir o vídeo em tela cheia.

**Consequência de acessibilidade (prioridade 3, acima de estética):** vídeo mudo e sem controles não pode ser o **único** portador de uma informação. Tudo que o vídeo comunica precisa existir também em texto na página. O vídeo reforça; o texto informa.

```html
<!-- Hero: vídeo tipo GIF, mudo, com pôster e alternativa textual -->
<div class="relative overflow-hidden rounded-2xl">
  <video
    class="h-full w-full object-cover"
    poster="/assets/hero-poster.jpg"
    autoplay muted loop playsinline preload="metadata"
    aria-label="Demonstração do processo de montagem realizado pela empresa">
    <source src="/assets/hero-mobile.webm"  type="video/webm" media="(max-width: 767px)">
    <source src="/assets/hero-mobile.mp4"   type="video/mp4"  media="(max-width: 767px)">
    <source src="/assets/hero-desktop.webm" type="video/webm">
    <source src="/assets/hero-desktop.mp4"  type="video/mp4">
    <img src="/assets/hero-poster.jpg" alt="Equipe montando a estrutura metálica no galpão da empresa">
  </video>
</div>
```

```css
/* Movimento reduzido: o pôster assume e o vídeo não roda. */
@media (prefers-reduced-motion: reduce) {
  .hero-video { display: none; }
  .hero-poster { display: block; }
}
```

O JavaScript da página também respeita a preferência — se o visitante pediu menos movimento, `video.pause()` e mostre o pôster.

---

## 3. Compositions — desktop e mobile pensados desde o começo

**Não redimensione a composição de desktop para o celular** quando isso piorar a apresentação. Texto que cabia em 1920 px vira ilegível em 390 px; enquadramento horizontal corta o rosto da equipe; três informações simultâneas viram ruído.

| Formato | Dimensão | Quando |
|---|---|---|
| Desktop | 1920×1080 (16:9) @30fps | hero em largura total, demonstração com espaço lateral |
| Mobile | 1080×1920 (9:16) @30fps | hero de celular, quando o corte 16:9 destruiria o enquadramento |
| Quadrado | 1080×1080 (1:1) | seção interna, card de produto, quando 9:16 é alto demais |

Use compositions diferentes **quando o resultado for significativamente melhor** — não por simetria. Um vídeo de gráfico animado costuma sobreviver bem ao corte; um vídeo com pessoas, máquinas ou texto na tela quase nunca sobrevive.

```tsx
// src/Root.tsx — cada proporção é uma composition própria, parametrizada
export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="HeroDesktop" component={HeroScene}
      width={1920} height={1080} fps={30} durationInFrames={360}
      defaultProps={{ safeArea: 96, logoScale: 1, headline: 'Estruturas metálicas sob medida' }}
    />
    <Composition
      id="HeroMobile" component={HeroScene}
      width={1080} height={1920} fps={30} durationInFrames={360}
      defaultProps={{ safeArea: 72, logoScale: 0.8, headline: 'Estruturas sob medida' }}
    />
  </>
);
```

**O que muda entre as duas** (decida cena a cena, não no fim): área segura, tamanho do texto, posição da logo, distância das bordas, proporção dos elementos, velocidade das animações, enquadramento das fotos reais e **quantidade de informação simultânea** — no celular, uma ideia por cena.

As animações são controladas pelo sistema do próprio Remotion (`useCurrentFrame`, `interpolate`, `spring`, `Sequence`, `useVideoConfig`), não por `setTimeout` nem por CSS improvisado dentro da composition. Cenas parametrizadas por props; textos, cores e caminhos de asset vêm de um arquivo de dados, nunca escritos no meio da cena.

---

## 4. Roteiro — apresentação audiovisual, não sequência de efeitos

Estrutura de referência, a adaptar ao segmento:

1. Logo da empresa.
2. Imagem ou vídeo real relacionado ao negócio.
3. Movimento de câmera ou reenquadramento.
4. Elementos gráficos da identidade visual.
5. Texto curto destacando **uma** informação.
6. Transição.
7. Demonstração do produto ou serviço.
8. Dado ou benefício apresentado graficamente.
9. Nova imagem ou vídeo real.
10. Encerramento com logo e chamada para ação.

O vídeo tem **função de comunicação**: funcionamento do produto, fluxo de utilização, principais funcionalidades, transformação proporcionada pelo serviço, processo realizado pela empresa, ambiente de trabalho, resultados, diferenciais, antes e depois, demonstração visual, elementos da identidade ou informação importante da empresa. Se o vídeo não comunica nada, ele não deveria existir.

---

## 5. Material real — foto, filmagem, documentário

**Quando existir material real relevante, ele tem prioridade sobre a ilustração genérica.** Foto da empresa, da equipe, do estabelecimento, de máquinas e equipamentos, de produtos, de processos, de obras realizadas, de veículos, de clientes e projetos divulgados pela própria empresa, registro histórico, vídeo institucional, documentário ou imagem real do local.

**Regras de uso:**

- **Autorização antes de incorporar.** Confirme com o cliente o direito de uso de cada material — foto de pessoa, obra de terceiro, trecho de documentário e imagem de cliente têm dono. Sem autorização confirmada, o material não entra. Registre no `CLAUDE.md` de onde veio cada peça.
- **Relação clara com o conteúdo.** Nada de imagem real aleatória para preencher espaço. Se a foto não explica, não demonstra, não contextualiza e não reforça a identidade, ela sai.
- **Combine com o gráfico**, não empilhe: `foto real → animação gráfica → destaque de informação → transição → outra imagem real → explicação visual → produto/serviço`.
- **Trate antes de usar:** enquadramento pensado para cada proporção, correção de exposição quando necessário, mesma temperatura de cor entre as peças para o vídeo não parecer colagem.
- No Remotion, use `<Img src={staticFile('...')}/>` e `<OffthreadVideo/>` para material de vídeo — `OffthreadVideo` é o que rende quadro correto na renderização.

---

## 6. Marca d'água da empresa

A marca da empresa **permanece identificável durante o vídeo inteiro**, como assinatura visual.

- Usa a **logo oficial** do cliente (arquivo fornecido, nunca redesenhada à mão).
- Fica em **área segura**, com margem constante da borda.
- **Discreta:** ocupa tipicamente 6–10% da largura no desktop e 10–14% no mobile.
- **Opacidade suficiente para identificar, insuficiente para dominar** — em geral 0,55 a 0,8, ajustada ao fundo.
- **Contraste garantido:** sobre fundo claro, use a variante escura; sobre fundo escuro, a clara. Se o fundo muda ao longo do vídeo, troque a variante na cena ou coloque uma sombra suave atrás.
- **Nunca por cima de texto ou de elemento importante.** Quando houver risco de sobreposição, reposicione para a área segura alternativa (canto oposto) naquela cena.
- **Proporção e qualidade preservadas** — nada de esticar; exporte em resolução suficiente para 1920 px.

> **Não confunda com o crédito da Angatu (§9.8).** A marca d'água do vídeo é a **do cliente**. O crédito "Desenvolvido por Angatu Sistemas" continua no rodapé da página, como em todo projeto.

```tsx
// Marca d'água em área segura, com reposicionamento por cena
const Watermark: React.FC<{corner: 'br' | 'bl'; safeArea: number; scale: number}> = ({corner, safeArea, scale}) => (
  <AbsoluteFill style={{padding: safeArea, alignItems: corner === 'br' ? 'flex-end' : 'flex-start', justifyContent: 'flex-end'}}>
    <Img src={staticFile('brand/logo-light.png')} style={{width: 220 * scale, opacity: 0.7}} />
  </AbsoluteFill>
);
```

---

## 7. Renderização e otimização do vídeo

```bash
# desktop — H.264 para compatibilidade universal, sem faixa de áudio
npx remotion render src/index.ts HeroDesktop out/hero-desktop.mp4 --codec=h264 --crf=23 --muted
# mobile — composition própria, não recorte do desktop
npx remotion render src/index.ts HeroMobile  out/hero-mobile.mp4  --codec=h264 --crf=24 --muted
# variante moderna, menor: WebM/VP9 (a página oferece as duas fontes)
npx remotion render src/index.ts HeroDesktop out/hero-desktop.webm --codec=vp9 --crf=32 --muted
# pôster: quadro representativo, é ele que aparece antes do vídeo e com movimento reduzido
npx remotion still  src/index.ts HeroDesktop out/hero-poster.jpg --frame=45
```

**Orçamento (não é sugestão — é limite):**

| Peça | Alvo | Teto |
|---|---|---|
| Vídeo desktop | ≤ 1,5 MB | 2,5 MB |
| Vídeo mobile | ≤ 800 KB | 1,2 MB |
| Pôster | ≤ 120 KB | 200 KB |
| Duração | 8–15 s | 20 s |

Estourou o teto? Reduza duração, baixe a resolução (1600×900 resolve na maioria dos heros), suba o `crf`, corte cena ou simplifique o movimento — nunca entregue um hero de 8 MB. Lembre que, no padrão sem cache (§15 do `SKILL.md`), esse arquivo é baixado **a cada visita**: é o caso em que vale levantar com o cliente a exceção de cache para assets com hash (§9.10).

Na página: `preload="metadata"` no hero (ele aparece de cara) e `preload="none"` + `loading="lazy"` para vídeo de seção abaixo da dobra.

---

## 8. Background SVG do `<body>` — temático, exclusivo, legível

**O fundo da landing não fica visualmente vazio.** Ele recebe um SVG desenhado para **aquele** segmento — e nunca o mesmo SVG reaproveitado de outro projeto.

**O SVG precisa:** ser detalhado e visualmente interessante · falar diretamente do segmento · complementar o conteúdo · criar profundidade e identidade · usar formas, padrões, ilustrações ou abstrações do universo do cliente · funcionar em desktop e mobile · ser leve · **não prejudicar a legibilidade do texto** · não competir com os elementos principais.

**Vocabulário por segmento — ponto de partida, não receita fechada:**

| Segmento | Vocabulário visual |
|---|---|
| Construção | plantas, cotas, treliças, gruas, malha de vergalhão, perfis metálicos |
| Clínica / saúde | curvas orgânicas, batimento, células, instrumentos, gradiente calmo |
| Restaurante | ingredientes, vapor, texturas de mesa, utensílios, padrão de azulejo |
| Transportadora | rotas, malha viária, contêineres, timeline de entrega, mapa estilizado |
| Escritório jurídico | colunas, selos, texturas de papel, guilhoché, tipografia como ornamento |
| Tecnologia | topologia de rede, isométricos, grade de dados, circuitos |

**Legibilidade vem antes de beleza (prioridade 3 e 4 do §9.9).** Sobre o SVG, mantenha a camada de conteúdo com fundo próprio, véu de cor da marca (70–85%) ou gradiente de escurecimento, e **meça**: 4,5:1 para texto normal. Se o texto ficou no limite, o fundo cede — não o texto.

```css
/* Fundo temático + véu que garante contraste, sem custo de repaint no scroll */
body {
  background-color: var(--surface);
  background-image: url('/assets/bg-<segmento>.svg');
  background-size: cover;
  background-attachment: fixed;         /* trocado por scroll no mobile, ver abaixo */
  background-position: center top;
}
@media (max-width: 767px) {
  body { background-attachment: scroll; background-image: url('/assets/bg-<segmento>-mobile.svg'); }
}
@media (prefers-reduced-motion: reduce) { body { background-attachment: scroll; } }
.section-content { background: color-mix(in oklch, var(--surface) 82%, transparent); }
```

**Mobile não é o desktop encolhido.** Um SVG cheio de detalhe fino vira sujeira em 390 px: entregue uma variante simplificada, com menos elementos e traço mais grosso. `background-attachment: fixed` é caro em celular — use `scroll`.

**Peso:** ≤ 60 KB depois da otimização (SVGO no build, §9.10) para o SVG de fundo. Se passou disso, o desenho está detalhado demais para um fundo — simplifique, reduza o número de nós, troque detalhe repetido por `<pattern>`/`<use>`, e deixe o detalhe fino para as ilustrações de seção.

**Decoração é decoração:** SVG de fundo leva `aria-hidden="true"` quando inline, e nunca carrega informação que só exista ali.

> **Um fundo só.** O §9.5 do `SKILL.md` exige arte generativa intencional em todo frontend; numa landing, **o SVG temático deste item cumpre esse requisito**. Escolha um: o SVG temático **ou** a arte generativa em canvas. Os dois juntos brigam entre si, pesam o dobro e denunciam falta de direção.

---

## 9. Seções visualmente pobres

Passe por **cada** seção e pergunte: *"essa informação poderia ser comunicada visualmente de uma maneira melhor?"*

Se a seção estiver excessivamente textual, estática ou pobre, avalie: motion graphics · SVG ilustrativo · microanimação · diagrama · animação de processo · screenshot animado · foto real · vídeo real · composição de foto + gráfico · demonstração do produto · elemento visual interativo.

**Cada elemento visual precisa de uma função declarável:** explicar, demonstrar, destacar, contextualizar ou reforçar a identidade. Se você não consegue dizer em uma frase o que aquele elemento faz pelo visitante, ele é enfeite — e enfeite entra na conta de peso, de DOM e de bateria sem devolver nada. **Não adicione animação por adicionar.**

Para seção interna, a ordem de preferência é: **CSS nativo** (§9.4) → SVG animado → vídeo curto. Vídeo em seção interna só quando ele demonstra algo que imagem parada não demonstra.

---

## 10. Performance

- **SVG:** otimizado no build (SVGO), `<pattern>`/`<use>` no lugar de nós repetidos, sem metadado de editor.
- **Imagem:** dimensão real igual à exibida, `width`/`height` no HTML (evita CLS), `loading="lazy"` abaixo da dobra, formato moderno com alternativa.
- **Vídeo:** orçamento do §7, `preload` correto, pôster sempre, nunca dois vídeos tocando ao mesmo tempo na mesma tela.
- **DOM:** ilustração complexa vira um `<img src="*.svg">`, não 4 000 nós inline. Inline só o SVG que precisa ser animado ou tematizado por CSS.
- **Animações simultâneas:** poucas e por vez; só `transform`/`opacity`/`clip-path`/`filter` (§9.4).
- **Celular manda no teto:** teste em aparelho modesto. Se o hero engasga no scroll, corte movimento — não compense com mais.

---

## 11. Organização do desenvolvimento

No workspace de autoria (temporário):

```
hero-<cliente>/
  src/
    Root.tsx            # compositions (uma por proporção)
    scenes/             # uma cena por arquivo, parametrizada por props
    components/         # marca d'água, títulos, cartelas, transições
    data/copy.ts        # textos, cores e caminhos — nunca no meio da cena
  public/
    brand/              # logos oficiais do cliente
    footage/            # fotos e vídeos reais, já tratados
  out/                  # renderizações
```

Na aplicação, o que sobra é só isto:

```
src/main/resources/public/assets/
  hero-desktop.mp4  hero-desktop.webm
  hero-mobile.mp4   hero-mobile.webm
  hero-poster.jpg
  bg-<segmento>.svg  bg-<segmento>-mobile.svg
```

Compositions parametrizadas e editáveis; código de cena legível durante o desenvolvimento (§9.9). Separe componentes, compositions, cenas, assets, SVGs, imagens, vídeos, dados, configurações e estilos — mesmo sabendo que o workspace será apagado: o roteiro precisa ser compreensível enquanto está sendo feito, e o `CLAUDE.md` precisa registrar o suficiente para recriar.

---

## 12. Identidade visual — o teste final

Toda landing deve parecer **criada especificamente para aquela empresa**. É proibido pegar uma estrutura visual genérica e trocar só logo, textos, cores e imagens.

Layout, background SVG, motion graphics, composição do hero, ilustrações, animações e tratamento das imagens consideram o segmento e a identidade: uma construtora, uma clínica, um restaurante, uma transportadora, um escritório jurídico e uma empresa de tecnologia têm de sair **visivelmente diferentes** — não a mesma página com paleta trocada.

**O teste:** cubra a logo e os textos. Ainda dá para dizer de que ramo é a empresa? Se não der, a identidade ainda não está lá.

---

## 13. Checklist da landing page

- [ ] Background do `<body>` com SVG temático **exclusivo** deste projeto, com variante mobile
- [ ] Contraste do texto sobre o fundo medido (≥ 4,5:1)
- [ ] Hero com vídeo de motion graphics que **comunica** algo, não decora
- [ ] Vídeo mudo, em laço, `autoplay muted loop playsinline`, com pôster
- [ ] Compositions desktop **e** mobile pensadas separadamente
- [ ] Marca d'água da empresa presente, discreta, em área segura, legível nos dois formatos
- [ ] Material real usado quando existe, com relação clara e **autorização confirmada**
- [ ] Informação do vídeo também disponível em texto (a11y)
- [ ] `prefers-reduced-motion` mostra o pôster e não roda o vídeo
- [ ] Orçamento de peso respeitado (vídeo, pôster, SVG)
- [ ] Nenhuma seção vazia, genérica, excessivamente textual ou desconectada do tema
- [ ] Todo elemento visual com função declarável em uma frase
- [ ] Workspace do Remotion **apagado**; só o vídeo ficou no projeto
- [ ] `CLAUDE.md` com o que o vídeo comunica, proporções, duração, material e autorizações
- [ ] Otimização de SVG/imagem/vídeo acontecendo **no build**, não no source (§9.10)

---
*Auditoria e otimização: Angatu Sistemas · Referência do §9.14 do `SKILL.md`*
