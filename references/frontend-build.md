# Build de Frontend — source legível, dist protegido

> **Auditoria:** Angatu Sistemas · Referência completa do **§9.9 a §9.13** do `SKILL.md` · Stack Angatu (Java 21 + Javalin + vanilla HTML/CSS/JS + Tailwind local) · Código em inglês, documentação em português

> **Lei que governa este arquivo inteiro:**
>
> **SOURCE** = legível e fácil de desenvolver · **BUILD** = minificar, otimizar, ofuscar, renomear e proteger · **DIST** = versão final para produção.
>
> Nenhuma transformação de proteção existe no source. Nenhuma decisão de proteção sobrevive a um conflito com funcionamento, segurança real, acessibilidade ou SEO (§9.9 do `SKILL.md`).

---

## 1. As três leis

1. **O source é sempre legível.** Nomes semânticos, arquivos separados por responsabilidade, fácil de ler, depurar, alterar, testar e revisar. É proibido escrever no source: JavaScript ofuscado, nomes aleatórios de variáveis, classes ou IDs aleatórios, strings codificadas para dificultar leitura, estruturas artificiais criadas só para atrapalhar engenharia reversa.
2. **O build nunca escreve no source.** O processo lê `src/main/resources/public/` e grava em `dist/public/`. Recompilar do zero, a qualquer momento, tem de dar o mesmo resultado.
3. **Só o dist é publicado.** O que o Coolify sobe é o JAR empacotado a partir do dist, nunca do source.

```
src/main/resources/public/   →   build (tools/frontend-build.mjs)   →   dist/public/
   legível, versionado             lê o source, não altera nada          minificado/ofuscado
```

Exemplo do que o source deve continuar sendo:

```js
/** Calcula o total do pedido somando subtotal e frete. */
function calculateOrderTotal(items) {
    const subtotal = calculateSubtotal(items);
    const shipping = calculateShipping(items);
    return subtotal + shipping;
}
```

Escrever isso à mão no source é violação da skill, mesmo que "funcione":

```js
function _0x81ab(a,b){return _0x19c(a)+_0x71f(b)}   // PROIBIDO no source
```

Essa forma é **saída de build**, e só o build tem o direito de produzi-la.

---

## 2. Mapa de diretórios no stack Angatu

```
src/main/resources/public/       SOURCE — legível, versionado, nunca transformado no lugar
  index.html                       shell ({content} {page} {%nome_active})
  <pagina>.html                    fragmentos servidos por HtmlRouteAPI
  styles/tailwind.css              GERADO pelo Tailwind CLI (exceção documentada — §3.4)
  styles/ds.css                    tokens + componentes do Design System (escrito à mão)
  scripts/*.js                     ui.js net.js auth.js app-state.js messages.js
  assets/ images/ fonts/           arte generativa (§9.5 do SKILL.md), logotipos, tipografia
  emails/*.html                    NUNCA transformados (clientes de e-mail — §7)
  sw.js manifest.webmanifest       PWA (§12)

tools/frontend-build.mjs         O BUILD — único lugar autorizado a ofuscar
frontend.build.json              configuração dos níveis (§3)
build/                           área temporária do build            → .gitignore
dist/public/                     DIST — entra no JAR                 → .gitignore (ver §15.3)
dist/.build-info.json            nível, salt, mapa de classes e de hashes (não é servido)
```

O `dist/public/` vira `target/classes/public/` no empacotamento (§15.1) — é ele que o `AssetsAPI` serve em produção.

---

## 3. Níveis e configuração

### 3.1 Os três níveis

| Nível | Quando | Minifica | Ofusca | Renomeia classes | Hash | Source maps |
|---|---|---|---|---|---|---|
| `development` | dia a dia, `mvn exec:java`, depuração | não | não | não | não | sim |
| `production` | publicação normal | sim | não | não | opcional (§11) | não |
| `protected` | publicação com hardening pedido | sim | sim | sim, se provado seguro | opcional (§11) | nunca |

`development` é o padrão local e **não exige nenhuma ferramenta além do Tailwind CLI** que já é obrigatório (§9.1 do `SKILL.md`): ele apenas copia o source. Um projeto sem Node continua sendo desenvolvido e rodando normalmente.

**A agressividade é configurável e reduzível.** Se uma transformação de `protected` inchar o JS, aumentar o tempo de parsing, engasgar a execução ou estourar memória, baixe o nível daquela técnica — nunca mantenha uma técnica pesada só porque ela existe.

### 3.2 `frontend.build.json` (raiz do projeto)

```json
{
  "level": "production",
  "source": "src/main/resources/public",
  "out": "dist/public",
  "levels": {
    "development": { "minify": false, "obfuscate": false, "renameClasses": false, "renameIds": false, "hashAssets": false, "removeDeadCode": false, "transformStrings": false, "controlFlowProtection": false, "sourceMaps": true },
    "production":  { "minify": true,  "obfuscate": false, "renameClasses": false, "renameIds": false, "hashAssets": false, "removeDeadCode": false, "transformStrings": false, "controlFlowProtection": false, "sourceMaps": false },
    "protected":   { "minify": true,  "obfuscate": true,  "renameClasses": true,  "renameIds": false, "hashAssets": false, "removeDeadCode": true,  "transformStrings": true,  "controlFlowProtection": true,  "sourceMaps": false }
  },
  "keepClasses": [],
  "keepIds": [],
  "neverTransform": ["emails/**", "vendor/**"],
  "neverHash": ["*.html", "sw.js", "manifest.webmanifest", "robots.txt", "sitemap.xml", "favicon.ico", ".well-known/**", "emails/**", "assets/og/**"],
  "reservedGlobals": ["UI", "net", "Auth", "AppBus", "showToast"],
  "cacheAutorizado": false
}
```

> **Não invente formato de configuração se o projeto já tiver um.** Se o projeto usa `package.json`, `vite.config.js`, `webpack.config.js` ou uma esteira própria, **adapte-se a ela** e mantenha só os nomes de chave (`minify`, `obfuscate`, `renameClasses`, `renameIds`, `hashAssets`, `removeDeadCode`, `transformStrings`, `controlFlowProtection`). O arquivo acima é o padrão apenas para projeto que ainda não tem nenhum.

### 3.3 Ferramentas (apenas em tempo de build)

| Ferramenta | Papel | Nível |
|---|---|---|
| Tailwind CLI standalone | gera `styles/tailwind.css` (§9.1 do `SKILL.md`) | todos |
| `esbuild` | minifica JS e CSS | `production`, `protected` |
| `html-minifier-terser` | minifica HTML preservando SEO/a11y | `production`, `protected` |
| `javascript-obfuscator` | ofusca JS | `protected` |

```bash
npm init -y && npm i -D esbuild html-minifier-terser javascript-obfuscator
```

**Node é ferramenta de build, não dependência da aplicação.** O que é publicado continua sendo HTML/CSS/JS vanilla servido pelo Javalin. **Nunca** introduza React, Vue, Angular, Svelte ou qualquer framework porque "o empacotador de proteção funciona melhor com ele". Se o projeto resolve com HTML + CSS + JavaScript, ele continua assim.

Se o projeto não puder ter Node, ele fica em `production` **sem** minificação de JS/HTML (o Tailwind CLI já entrega o CSS minificado) — a perda é de bytes, não de funcionamento. Registre a limitação no `CLAUDE.md`.

### 3.4 A exceção do `tailwind.css`

`styles/tailwind.css` mora dentro do source mas **é gerado**, não escrito à mão: ninguém o edita, ninguém o depura linha a linha, e ele é versionado porque o Coolify constrói a partir do repositório (§17.3 do `SKILL.md`). Ele é o **único** artefato gerado que pode ficar no source, e mesmo ele:

- nunca tem classes renomeadas;
- é a fonte da lista de exclusão de renomeação — toda classe que aparece nele é intocável (§9.1);
- é minificado pelo próprio Tailwind CLI (`--minify`), o que já é a forma final.

Durante o desenvolvimento, rode o CLI em `--watch` sem `--minify` se precisar lê-lo; o build minifica de qualquer jeito.

---

## 4. Ordem canônica do pipeline

O build roda **exatamente** nesta ordem. Trocar a ordem quebra a sincronia entre HTML, CSS e JS.

```
0. Tailwind CLI                     → styles/tailwind.css (no source, §3.4)
1. Análise                          → inventário de arquivos, classes, IDs, referências
2. Validação de entrada             → segredos, CDN proibida, referência já quebrada no source
3. Limpeza + cópia integral         → source → dist (byte a byte, sem tocar no source)
4. Renomeação de classes/IDs        → só o que foi PROVADO seguro (§9, §10)
5. Minificação CSS                  (§5)
6. Minificação + ofuscação JS       (§6) — nunca em emails/**, nunca ofusca sw.js
7. Minificação HTML                 (§7) — preservando SEO, a11y e placeholders
8. Hash de assets                   (§11) — folhas primeiro, depois CSS/JS; nunca HTML/sw/manifest
9. Atualização das referências      → HTML, CSS, JS, manifest, sw
10. Gravação do dist/.build-info.json
11. Validação pós-build             → falha com exit 1 se qualquer referência quebrou (§14)
```

Renomear **antes** de minificar (arquivo legível dá substituição provável). Hashear **depois** de minificar (o hash tem de ser do conteúdo final).

---

## 5. CSS

Aplicar: minificação, otimização e remoção de código morto **quando for seguro**.

- **O Tailwind já faz a própria remoção de código morto** via `content` no `tailwind.config.js`. Não rode nenhum removedor de CSS não utilizado por cima do `tailwind.css`.
- Em `ds.css` e no CSS de página, **não remova regra "não usada" automaticamente**: classe aplicada por `classList.add()`, por atributo do servidor (`{%nome_active}`) ou por biblioteca de terceiros não aparece em nenhum HTML e seria apagada por engano. Remoção de CSS morto só com análise manual e teste.
- Minificação com `esbuild` (`loader: 'css'`): comprime, mantém a cascata e não reordena seletores.
- A ordem dos `<link>` continua `tailwind.css` antes de `ds.css` (§9.1 do `SKILL.md`).

---

## 6. JavaScript

### 6.1 Minificação segura para scripts clássicos

Os scripts do shell Angatu são clássicos e **compartilham globais** (`UI`, `net`, `Auth`, `AppBus`, `showToast`). Um minificador que renomeia identificadores de topo quebra tudo em silêncio.

```js
// seguro para script clássico: encolhe sem renomear o que é global
await transform(code, { loader: 'js', minifyWhitespace: true, minifySyntax: true, minifyIdentifiers: false });
```

Só ligue `minifyIdentifiers: true` para arquivo cujo conteúdo inteiro está dentro de IIFE ou de módulo ES — aí não há símbolo de topo para quebrar.

### 6.2 Ofuscação (`protected`)

```js
JavaScriptObfuscator.obfuscate(code, {
  compact: true, simplify: true, target: 'browser',
  renameGlobals: false,                    // scripts clássicos compartilham globais
  identifierNamesGenerator: 'mangled',
  reservedNames: ['^UI$','^net$','^Auth$','^AppBus$','^showToast$'],

  stringArray: true,                       // transformação de strings
  stringArrayThreshold: 0.75,
  stringArrayEncoding: ['base64'],
  stringArrayRotate: true, stringArrayShuffle: true, stringArrayIndexShift: true,
  stringArrayWrappersCount: 1, stringArrayWrappersType: 'variable',
  splitStrings: false,                     // muito tamanho para pouco ganho

  controlFlowFlattening: true,             // transformação de controle de fluxo
  controlFlowFlatteningThreshold: 0.35,    // 1.0 chega a 1,5x mais lento — não use

  numbersToExpressions: true,
  deadCodeInjection: false,                // +200% de tamanho; só com orçamento medido
  transformObjectKeys: false,              // quebra objeto lido por chave dinâmica
  unicodeEscapeSequence: false,            // dobra o tamanho do arquivo

  selfDefending: false,                    // quebra se qualquer etapa reprocessar o arquivo
  debugProtection: false,                  // PROIBIDO: trava as ferramentas de desenvolvimento
  disableConsoleOutput: false              // PROIBIDO: cega quem está depurando de boa-fé
}).getObfuscatedCode();
```

**Proibições permanentes**, porque atingem quem não é o alvo: `debugProtection`, `disableConsoleOutput`, laço de detecção de devtools, e `selfDefending` combinado com qualquer pós-processamento.

**Nunca ofusque:**

- `sw.js` — service worker quebrado fica preso no aparelho do usuário, e ele não tem como se ajudar sozinho. Minifique, só.
- `vendor/**` e bibliotecas de terceiros já minificadas — ganho nulo, risco alto, arquivo maior.
- `emails/**` — cliente de e-mail não executa JS e o arquivo sai do domínio.

### 6.3 Remoção de código morto

Só o que a ferramenta prova ser inalcançável (`removeDeadCode` do nível). É proibido "limpar" função que parece não usada: ela pode ser chamada por atributo `onclick=`, por outro script ou por markup gerado no servidor. Toda função referenciada a partir do HTML entra em `reservedGlobals`.

---

## 7. HTML

Minificar com `html-minifier-terser`:

```js
await minifyHtml(html, {
  collapseWhitespace: true, conservativeCollapse: false,
  removeComments: true, ignoreCustomComments: [/^!/, /^\s*\{/],
  removeAttributeQuotes: false,        // atributo sem aspas quebra valor com placeholder
  removeRedundantAttributes: false,    // preserva semântica declarada de propósito
  useShortDoctype: false, keepClosingSlash: true,
  sortAttributes: false, sortClassName: false,
  minifyCSS: true, minifyJS: false     // JS de página é arquivo externo (§9.7 do SKILL.md)
});
```

**Nunca remover, em nenhum nível:** `<title>`, `meta description`, `meta robots`, `canonical`, Open Graph, Twitter Card, Schema.org (`application/ld+json`), `hreflang`, `lang`, `alt`, `aria-*`, `role`, `label for`, `name` de campo de formulário, o par `for`/`id`, `tabindex` e `<noscript>` com conteúdo real.

**Placeholders do `HtmlRouteAPI`:** `{content}`, `{page}` e `{%nome_active}` atravessam o build intactos. `{%nome_active}` costuma aparecer **dentro de `class="..."`** — o passo de renomeação ignora qualquer token que contenha `{` ou `}`, e a classe que o servidor injeta é intocável (§9.2).

O `<script>` de página continua sendo arquivo externo (§9.7 do `SKILL.md`) — script embutido é bloqueado pela política de segurança, e o build não conserta isso.

---

## 8. Assets

- Arte generativa (§9.5 do `SKILL.md`) já nasce otimizada; o build só copia e, se ligado, hasheia.
- Imagem enviada por usuário não passa por aqui — vai para `/data/uploads` com a estratégia de compressão perguntada ao programador (§18 do `SKILL.md`).
- `favicon.ico`, `apple-touch-icon` e as capas de Open Graph (`assets/og/**`, §9.16 do `SKILL.md`) **não** são hasheados: são referenciados por convenção, por buscadores e por redes sociais, que guardam a URL por conta própria.

---

## 9. Renomeação de classes — só com prova de segurança

> **Objetivo real e limitado:** dificultar automação trivial que dependa de seletor previsível. **Não é segurança.** Um bot que executa JavaScript lê o DOM e descobre o nome atual em segundos.

**A transformação acontece no build/deploy, nunca a cada recarregamento da página.** É proibido randomizar classe em tempo de execução para atrapalhar bot: quebra acessibilidade, cache, teste e depuração — e não engana ninguém. Um build novo pode gerar identificadores novos; isso é esperado:

```
build 1:  product-card → a81Kx      checkout-button → Q72Lm
build 2:  product-card → z91Pw      checkout-button → m42Rt
source :  product-card              checkout-button          (sempre igual)
```

### 9.1 Quem pode ser candidato

Uma classe só entra na lista de candidatas se **todas** forem verdadeiras:

1. Está declarada em CSS do projeto (`ds.css` ou CSS de página) — nunca em `styles/tailwind.css`, nunca em `vendor/**`.
2. É kebab-case com **pelo menos um hífen** (`product-card`, `nav-tile`, `ds-credito`). Nome de palavra única (`active`, `card`, `open`) fica de fora por construção: é curto demais, colide fácil e costuma ser adicionado dinamicamente. Um nome com hífen também não pode ser identificador JavaScript, o que elimina de saída o risco de renomear uma variável por engano.
3. Não aparece em `styles/tailwind.css` — utilitário do Tailwind é intocável: a responsividade inteira do projeto depende dele (§9.6 do `SKILL.md`).
4. Não aparece em `src/main/java/**` — markup gerado no servidor não passa pelo build.
5. Não aparece em `emails/**` nem em nada listado em `neverTransform`.
6. Não casa com `keepClasses`.

### 9.2 Lista de exclusão obrigatória

Nunca renomeie automaticamente:

- utilitário do Tailwind e classe de biblioteca de terceiros (`swiper-*`, `leaflet-*`, `choices__*`);
- classe usada por atributo ARIA, por `label`, por âncora (`href="#..."`) ou por formulário;
- classe injetada pelo servidor Java, inclusive a de `{%nome_active}`;
- classe usada por teste automatizado (`js-*` e o `data-testid` correspondente), integração externa, Web Component, API do navegador ou gancho declarado público;
- qualquer classe em `/emails/*.html`;
- classe cuja regra CSS tem o comentário `/* build:keep */` na linha anterior.

**Quando não for possível provar que a transformação é segura, não a aplique.** Sem exceção.

### 9.3 A prova

Para cada candidata, o build varre todo o JS e o HTML do source:

- **Ocorrência estática** — token completo dentro de `class="..."`, de seletor CSS ou de literal de string (`'product-card'`, `'.product-card .title'`, `'card product-card'`). Isso é renomeável.
- **Fragmento dinâmico** — qualquer literal colado a concatenação (`'product-' + kind`) ou a interpolação (`` `product-${kind}` ``). Se um fragmento desses for prefixo ou pedaço do nome da candidata, ela é marcada **INSEGURA** e não é renomeada.

O relatório do build lista, por classe: `renomeada`, `mantida (motivo)` ou `insegura (arquivo)`. Classe insegura **não** derruba o build — ela apenas fica com o nome original, e o relatório diz por quê.

### 9.4 Aplicação e sincronia

O mapa é único e vale para os três lugares ao mesmo tempo:

```html
<div class="product-card">        →   <div class="a81Kx">
```
```css
.product-card { ... }             →   .a81Kx { ... }
```
```js
document.querySelector('.product-card')  →  document.querySelector('.a81Kx')
```

**Sair com HTML `a81Kx`, CSS `a81Kx` e JS `product-card` é erro de build**, não detalhe: a validação (§14) procura o nome antigo no dist e reprova se encontrar qualquer resquício de classe mapeada.

Nome novo: letra inicial + base36 do `sha256(classe + salt do build)`, conferido contra todos os nomes de classe já existentes no projeto (inclusive os do `tailwind.css`) para não colidir. O salt fica em `dist/.build-info.json` junto do mapa — é assim que se descobre, meses depois, que `a81Kx` era `product-card`.

---

## 10. Renomeação de IDs — desligada por padrão

`renameIds: false` em todos os níveis, inclusive `protected`. Um ID tem contratos que o build não enxerga:

`href="#secao"` · `<label for="email">` · `aria-labelledby` · `aria-describedby` · `aria-controls` · `form=` · `list=` (datalist) · `headers=` (tabela) · `url(#gradiente)` em SVG · `document.getElementById(variavel)` · link externo apontando para uma âncora da página · leitor de tela que depende do par `for`/`id`.

Ligue apenas quando: o projeto não tem âncora pública, os IDs são todos internos, a prova do §9.3 passa e um teste manual de teclado e de leitor de tela foi feito depois. Registre a decisão no `CLAUDE.md`.

---

## 11. Hash de assets e a regra de cache

Hash é **cache busting**: `app.js` → `app.8f91c2ad.js`, `style.css` → `style.71a82e04.css`, com todas as referências atualizadas automaticamente.

**Interação com o §15 do `SKILL.md` (não usar cache):**

- **Projeto no padrão §15 (sem cache):** `hashAssets: false`. Com `no-store` em toda resposta, o hash não compra nada e ainda dificulta rastrear o arquivo. Não ligue por hábito.
- **Projeto onde o cliente pediu cache:** `hashAssets: true` passa a ser **obrigatório**. `Cache-Control: public, max-age=31536000, immutable` só é seguro em arquivo cujo nome muda quando o conteúdo muda. O HTML continua `no-store` sempre — é ele que aponta para os nomes novos.

Atenção especial ao atualizar referências: `<link rel="preload">`, `<link rel="modulepreload">`, `import()` dinâmico, `manifest.webmanifest`, `sw.js` e qualquer caminho montado em JS.

**Regra que torna o hash provável:** no source, toda referência a asset é **absoluta a partir da raiz do site** (`/styles/ds.css`, `/scripts/ui.js`, `/assets/og-financeiro.png`). Caminho montado em tempo de execução (`'/assets/' + nome + '.png'`) não é reescrevível — nesses casos, deixe o arquivo fora do hash (`neverHash`) ou publique o mapa gerado em `/assets/manifest.json` e leia o nome final de lá.

---

## 12. PWA e service worker

- `sw.js` e `manifest.webmanifest` **nunca** são hasheados e **nunca** são ofuscados. São minificados e têm as referências atualizadas por último, depois que todo o resto já tem nome final.
- Se o service worker lista arquivos, a lista é reescrita a partir do mapa de hashes do build. Service worker apontando para arquivo que não existe mais é falha de build.
- No padrão §15 o service worker não guarda nada: `install` com `skipWaiting()`, `activate` apagando todos os caches, `fetch` sem `respondWith`. O build não pode introduzir estratégia de cache que o projeto não pediu.
- Se o funcionamento offline foi pedido, o cache é versionado com o identificador do build, e o `activate` apaga as versões anteriores.
- Testar instalação, primeira abertura e atualização **depois** do build, com o JAR rodando (§14 do `SKILL.md`).

---

## 13. Source maps

| Nível | Source map |
|---|---|
| `development` | sim, ao lado do arquivo |
| `production` | só se explicitamente configurado — e gravado em `dist/maps/`, **fora** de `dist/public/` |
| `protected` | nunca |

Publicar mapa dentro de `dist/public/` anula a ofuscação: o navegador reconstrói o source original. Se o objetivo do projeto é dificultar a análise do código publicado, o mapa não vai junto — guarde-o com o artefato de release, para depuração interna.

---

## 14. Validação pós-build (o build falha aqui)

Toda checagem abaixo roda sobre o `dist/` e **derruba o build com `exit 1`** quando falha:

| # | Checagem | Falha quando |
|---|---|---|
| 1 | Integridade referencial | `src=`/`href=`/`url()` começando com `/` que não existe no dist |
| 2 | Sincronia de classes | nome antigo de classe mapeada ainda aparece em algum arquivo do dist |
| 3 | Sintaxe JS | `new Function(codigo)` falha em algum `.js` gerado |
| 4 | Segredos | padrão de chave/token/senha encontrado no dist |
| 5 | CDN proibida | `cdn.tailwindcss` ou `unpkg.com/tailwindcss` presente (§9.1 do `SKILL.md`) |
| 6 | SEO preservado | `<title>`, `canonical`, `og:`, `twitter:`, `ld+json` ou `meta` em quantidade menor que no source |
| 7 | Acessibilidade preservada | contagem de `aria-`, `alt=`, `role=`, `for=` menor que no source |
| 8 | Source map indevido | `.map` dentro de `dist/public/` sem `sourceMaps: true` |
| 9 | Script embutido | `<script>` sem `src` em página, exceto `application/ld+json` (bloqueado pela política de segurança) |
| 10 | Cache não pedido | `caches.put`/`caches.match` no dist com `cacheAutorizado: false` (§15 do `SKILL.md`) |

Conferência rápida por linha de comando, depois do build:

```bash
grep -rn "cdn.tailwindcss\|unpkg.com/tailwindcss" dist/public && echo "FALHA: CDN"
grep -rn "caches.put\|caches.match" dist/public && echo "FALHA: cache nao pedido"
grep -rn "<script>" dist/public/*.html && echo "FALHA: script embutido"
grep -rniE "api[_-]?key|secret|password|bearer [a-z0-9]{20,}|AKIA[0-9A-Z]{16}|sk_live_" dist/public && echo "FALHA: possivel segredo"
find dist/public -name "*.map" | grep . && echo "FALHA: source map publicado"
```

E a validação que nenhum script substitui: **subir o JAR e abrir as telas** (§14 do `SKILL.md`).

---

## 15. Empacotamento, Maven, Docker e Coolify

### 15.1 Perfil Maven que troca o source pelo dist

```xml
<profiles>
  <profile>
    <id>frontend-dist</id>
    <build>
      <resources>
        <resource>
          <directory>src/main/resources</directory>
          <excludes><exclude>public/**</exclude></excludes>
        </resource>
        <resource>
          <directory>dist</directory>
          <includes><include>public/**</include></includes>
        </resource>
      </resources>
    </build>
  </profile>
</profiles>
```

Sem o perfil, o Maven copia o source legível — que é exatamente o que se quer em desenvolvimento.

```bash
# desenvolvimento (source legível dentro do JAR)
mvn package -DskipTests && java -jar target/<app>.jar

# produção protegida (dist dentro do JAR)
node tools/frontend-build.mjs --level=protected
mvn -Pfrontend-dist package -DskipTests && java -jar target/<app>.jar
```

### 15.2 Dockerfile em três etapas

O Coolify constrói a imagem a partir do repositório, então o build de frontend roda **dentro** da imagem:

```dockerfile
# 1) frontend: source legível -> dist protegido
FROM node:22-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json* frontend.build.json ./
RUN npm ci --omit=optional || npm install
COPY tools/ tools/
COPY src/main/resources/public/ src/main/resources/public/
COPY src/main/java/ src/main/java/
RUN node tools/frontend-build.mjs --level=protected

# 2) java: empacota usando o dist
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src/ src/
COPY --from=frontend /app/dist/ dist/
RUN mvn -B -Pfrontend-dist package -DskipTests

# 3) runtime: idêntico ao §17.2 do SKILL.md
FROM eclipse-temurin:21-jre
# ... ENV TZ/ANGATU_ENV/ANGATU_DB_PATH/PORT/JAVA_OPTS, WORKDIR /data, EXPOSE, HEALTHCHECK, ENTRYPOINT
```

A etapa 1 não entra na imagem final — o runtime continua só JRE + JAR. `src/main/java/` é copiado para a etapa do frontend porque a prova de segurança da renomeação precisa ler o código do servidor (§9.1, item 4).

### 15.3 Alternativa sem Node na imagem

Se a esteira não puder ter Node, o `dist/` é gerado na máquina e **versionado** (como já acontece com o `tailwind.css`, §17.3 do `SKILL.md`). Nesse caso o `dist/.build-info.json` guarda o hash do source, e o build valida no começo:

> dist desatualizado em relação ao source → **erro**, com a instrução de rodar o build de novo.

Sem essa checagem, publica-se dist velho com source novo, e o defeito só aparece em produção.

---

## 16. Implementação de referência — `tools/frontend-build.mjs`

Esqueleto funcional para adaptar ao projeto. Rode primeiro em `--level=production`, valide, e só então ligue `protected`.

```js
#!/usr/bin/env node
/**
 * Build de frontend Angatu — lê o source legível e grava o dist protegido.
 * Nunca escreve em src/. Sai com código 1 quando a validação falha.
 *
 * Uso: node tools/frontend-build.mjs --level=development|production|protected
 *
 * @author Angatu Sistemas
 */
import { readFile, writeFile, mkdir, rm, readdir, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import path from 'node:path';
import { transform } from 'esbuild';
import { minify as minifyHtml } from 'html-minifier-terser';
import JavaScriptObfuscator from 'javascript-obfuscator';

const cfg = JSON.parse(await readFile('frontend.build.json', 'utf8'));
const level = (process.argv.find(a => a.startsWith('--level=')) ?? '').split('=')[1] || cfg.level;
const opt = cfg.levels[level];
if (!opt) { console.error(`Nível desconhecido: ${level}`); process.exit(1); }

const SRC = cfg.source, OUT = cfg.out, JAVA = 'src/main/java';
const salt = process.env.ANGATU_BUILD_SALT || randomBytes(4).toString('hex');
const falhas = [];

/** Lista recursivamente os arquivos de um diretório, em caminhos relativos com barra normal. */
async function walk(dir, base = dir) {
  const saida = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) saida.push(...await walk(p, base));
    else saida.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return saida;
}
/** Escapa os caracteres especiais de expressão regular de um texto literal. */
const escapa = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Casa caminho relativo contra padrões glob simples (`*` e `**`). */
const casa = (rel, padroes = []) => padroes.some(p => new RegExp('^' + p.split('**')
  .map(parte => parte.split('*').map(escapa).join('[^/]*')).join('.*') + '$').test(rel));
const ehTexto = rel => /\.(html|css|js|mjs|json|webmanifest|svg|txt|xml)$/.test(rel);

// 1-3) análise, validação de entrada e cópia integral --------------------------
const arquivos = await walk(SRC);
const javaSrc = existsSync(JAVA)
  ? (await Promise.all((await walk(JAVA)).filter(f => f.endsWith('.java'))
      .map(f => readFile(path.join(JAVA, f), 'utf8')))).join('\n')
  : '';
// conteúdo dos arquivos que o build não pode tocar (e-mails, vendor): o que aparece
// aqui não pode ser renomeado em lugar nenhum, sob pena de dessincronizar
const intocavelSrc = (await Promise.all(arquivos
  .filter(f => ehTexto(f) && casa(f, cfg.neverTransform))
  .map(f => readFile(path.join(SRC, f), 'utf8')))).join('\n');
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await cp(SRC, OUT, { recursive: true });          // o source nunca é tocado a partir daqui

// 4) renomeação de classes com prova de segurança ------------------------------
const mapaClasses = new Map();
if (opt.renameClasses) {
  const cssProjeto = arquivos.filter(f => f.endsWith('.css')
    && f !== 'styles/tailwind.css' && !casa(f, cfg.neverTransform));
  const tailwind = existsSync(path.join(SRC, 'styles/tailwind.css'))
    ? await readFile(path.join(SRC, 'styles/tailwind.css'), 'utf8') : '';
  const intocaveis = new Set([...tailwind.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map(m => m[1]));

  const candidatas = new Set();
  for (const f of cssProjeto) {
    const css = (await readFile(path.join(SRC, f), 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '');
    for (const bloco of css.split('}')) {
      const seletor = bloco.split('{')[0] ?? '';
      for (const m of seletor.matchAll(/\.([a-z][a-z0-9]*(?:-[a-z0-9]+)+)/g)) candidatas.add(m[1]);
    }
  }

  // fragmentos dinâmicos: literal colado a concatenação ou a interpolação
  const fragmentos = new Set();
  for (const f of arquivos.filter(f => /\.(js|mjs|html)$/.test(f) && !casa(f, cfg.neverTransform))) {
    const txt = await readFile(path.join(SRC, f), 'utf8');
    for (const m of txt.matchAll(/['"]([^'"\n]{2,})['"]\s*\+|\+\s*['"]([^'"\n]{2,})['"]/g))
      fragmentos.add(m[1] ?? m[2]);
    for (const m of txt.matchAll(/`([^`$]{2,})\$\{/g)) fragmentos.add(m[1]);
  }

  const usados = new Set(intocaveis);
  for (const c of [...candidatas].sort()) {
    const motivo =
        intocaveis.has(c)                                         ? 'utilitário do Tailwind'
      : casa(c, cfg.keepClasses)                                  ? 'keepClasses'
      : new RegExp(`(?<![\\w-])${escapa(c)}(?![\\w-])`).test(javaSrc) ? 'usada no Java (servidor)'
      : new RegExp(`(?<![\\w-])${escapa(c)}(?![\\w-])`).test(intocavelSrc) ? 'usada em arquivo intocável'
      : [...fragmentos].some(fr => c.startsWith(fr) || c.includes(fr)) ? 'montada dinamicamente'
      : null;
    if (motivo) { console.log(`  mantida  ${c}  (${motivo})`); continue; }
    let novo, i = 0;
    do {
      novo = 'x' + BigInt('0x' + createHash('sha256').update(c + salt + i++)
        .digest('hex').slice(0, 12)).toString(36).slice(0, 5);
    } while (usados.has(novo));
    usados.add(novo); mapaClasses.set(c, novo);
  }

  for (const f of arquivos.filter(f => ehTexto(f) && !casa(f, cfg.neverTransform))) {
    const p = path.join(OUT, f);
    let txt = await readFile(p, 'utf8');
    for (const [velho, novo] of mapaClasses)
      txt = txt.replace(new RegExp(`(?<![\\w-])${escapa(velho)}(?![\\w-])`, 'g'), novo);
    await writeFile(p, txt);
  }
  console.log(`  ${mapaClasses.size} classes renomeadas`);
}

// 5-7) minificação e ofuscação -------------------------------------------------
if (opt.minify) for (const f of arquivos) {
  if (casa(f, cfg.neverTransform)) continue;
  const p = path.join(OUT, f);
  if (f.endsWith('.css')) {
    const css = await readFile(p, 'utf8');
    await writeFile(p, (await transform(css, { loader: 'css', minify: true })).code);
  } else if (f.endsWith('.js')) {
    let js = (await transform(await readFile(p, 'utf8'), {
      loader: 'js', minifyWhitespace: true, minifySyntax: true, minifyIdentifiers: false
    })).code;
    if (opt.obfuscate && f !== 'sw.js' && !f.startsWith('vendor/')) {
      js = JavaScriptObfuscator.obfuscate(js, {
        compact: true, simplify: true, target: 'browser', renameGlobals: false,
        identifierNamesGenerator: 'mangled',
        reservedNames: (cfg.reservedGlobals ?? []).map(g => `^${g}$`),
        stringArray: !!opt.transformStrings, stringArrayThreshold: 0.75,
        stringArrayEncoding: ['base64'], stringArrayRotate: true,
        stringArrayShuffle: true, stringArrayIndexShift: true,
        controlFlowFlattening: !!opt.controlFlowProtection, controlFlowFlatteningThreshold: 0.35,
        numbersToExpressions: true, deadCodeInjection: false, transformObjectKeys: false,
        unicodeEscapeSequence: false, splitStrings: false,
        selfDefending: false, debugProtection: false, disableConsoleOutput: false
      }).getObfuscatedCode();
    }
    await writeFile(p, js);
  } else if (f.endsWith('.html')) {
    await writeFile(p, await minifyHtml(await readFile(p, 'utf8'), {
      collapseWhitespace: true, removeComments: true, ignoreCustomComments: [/^!/, /^\s*\{/],
      removeAttributeQuotes: false, removeRedundantAttributes: false, useShortDoctype: false,
      keepClosingSlash: true, sortAttributes: false, sortClassName: false,
      minifyCSS: true, minifyJS: false
    }));
  }
}

// 8-9) hash de assets e reescrita de referências -------------------------------
const mapaHash = new Map();
if (opt.hashAssets) {
  const folhas = arquivos.filter(f => /\.(png|jpe?g|webp|avif|gif|svg|woff2?|ttf|otf|ico|mp4|webm)$/.test(f));
  const codigo = arquivos.filter(f => /\.(css|js)$/.test(f));
  for (const grupo of [folhas, codigo]) {          // folhas primeiro; código depois
    for (const f of grupo) {
      if (casa(f, cfg.neverHash) || casa(f, cfg.neverTransform)) continue;
      const buf = await readFile(path.join(OUT, f));
      const h = createHash('sha256').update(buf).digest('hex').slice(0, 8);
      const novo = f.replace(/(\.[^.]+)$/, `.${h}$1`);
      await writeFile(path.join(OUT, novo), buf);
      await rm(path.join(OUT, f));
      mapaHash.set('/' + f, '/' + novo);
    }
    for (const f of await walk(OUT)) {             // reescreve HTML, CSS, JS, manifest e sw
      if (!ehTexto(f) || casa(f, cfg.neverTransform)) continue;
      const p = path.join(OUT, f);
      let txt = await readFile(p, 'utf8'), mudou = false;
      for (const [velho, novo] of mapaHash)
        if (txt.includes(velho)) { txt = txt.split(velho).join(novo); mudou = true; }
      if (mudou) await writeFile(p, txt);
    }
  }
}

// 10) informações do build (fora de public/, não é servido) --------------------
const conteudoSource = (await Promise.all([...arquivos].sort()
  .map(f => readFile(path.join(SRC, f))))).map(b => b.toString('base64')).join('');
await writeFile('dist/.build-info.json', JSON.stringify({
  level, salt, geradoEm: new Date().toISOString(),
  sourceHash: createHash('sha256').update(conteudoSource).digest('hex'),
  classes: Object.fromEntries(mapaClasses), assets: Object.fromEntries(mapaHash)
}, null, 2));

// 11) validação pós-build ------------------------------------------------------
const gerados = await walk(OUT);
const existe = new Set(gerados.map(f => '/' + f));
for (const f of gerados.filter(ehTexto)) {
  const txt = await readFile(path.join(OUT, f), 'utf8');
  for (const m of txt.matchAll(/(?:src|href)=["'](\/[^"'#?]+)|url\((\/[^)"']+)\)/g)) {
    const ref = (m[1] ?? m[2]).split('?')[0];
    if (ref !== '/' && !ref.endsWith('.html') && !existe.has(ref))
      falhas.push(`referência quebrada em ${f}: ${ref}`);
  }
  if (!casa(f, cfg.neverTransform)) for (const velho of mapaClasses.keys())
    if (new RegExp(`(?<![\\w-])${escapa(velho)}(?![\\w-])`).test(txt))
      falhas.push(`classe não sincronizada em ${f}: ${velho}`);
  if (/cdn\.tailwindcss|unpkg\.com\/tailwindcss/.test(txt)) falhas.push(`CDN do Tailwind em ${f}`);
  if (/api[_-]?key\s*[:=]\s*["'][^"']{12,}|sk_live_|AKIA[0-9A-Z]{16}/i.test(txt))
    falhas.push(`possível segredo em ${f}`);
  if (f.endsWith('.js') && !/\b(import|export)\b/.test(txt)) {
    try { new Function(txt); } catch (e) { falhas.push(`JS inválido em ${f}: ${e.message}`); }
  }
  if (f.endsWith('.html')) {                       // script embutido é bloqueado pela CSP
    for (const m of txt.matchAll(/<script\b([^>]*)>/gi))
      if (!/\bsrc=/i.test(m[1]) && !/application\/ld\+json/i.test(m[1]))
        falhas.push(`script embutido em ${f} (use arquivo externo)`);
  }
  if (!cfg.cacheAutorizado && /caches\.(put|match)\s*\(/.test(txt))
    falhas.push(`cache não autorizado em ${f} (§15 do SKILL.md)`);
  if (f.endsWith('.html') && existsSync(path.join(SRC, f))) {
    const src = await readFile(path.join(SRC, f), 'utf8');
    const conta = (s, re) => (s.match(re) ?? []).length;
    for (const [nome, re] of [['meta', /<meta\s/gi], ['aria', /aria-[a-z]+=/gi],
                              ['alt', /\salt=/gi], ['role', /\srole=/gi], ['for', /\sfor=/gi]])
      if (conta(txt, re) < conta(src, re)) falhas.push(`${nome} perdido na minificação de ${f}`);
  }
}
if (!opt.sourceMaps && gerados.some(f => f.endsWith('.map')))
  falhas.push('source map publicado dentro do dist');

if (falhas.length) {
  console.error('\nBUILD REPROVADO:');
  falhas.forEach(f => console.error('  - ' + f));
  process.exit(1);
}
console.log(`\nBuild ${level} concluído: ${gerados.length} arquivos em ${OUT}`);
```

---

## 17. Projeto existente — auditoria antes de mexer

**Nunca presuma que o projeto já segue a skill.** Antes de qualquer alteração, levante os 20 pontos e compare com este documento:

| # | Ponto | O que verificar |
|---|---|---|
| 1 | Estrutura | onde mora o frontend; existe separação source/dist? |
| 2 | Tecnologia | vanilla, framework, empacotador |
| 3 | Sistema de build | existe? roda? é reprodutível? |
| 4 | Dependências | tempo de build vs. tempo de execução |
| 5 | HTML | shell, fragmentos, placeholders, script embutido |
| 6 | CSS | Tailwind local ou CDN, `ds.css`, `@media` manual (§9.6 do `SKILL.md`) |
| 7 | JavaScript | globais compartilhadas, módulos, código morto |
| 8 | Assets | origem, peso, hotlink externo |
| 9 | SEO | title, description, canonical, OG, `ld+json` |
| 10 | Acessibilidade | foco, ARIA, contraste, `prefers-reduced-motion` |
| 11 | Performance | peso inicial, número de requisições, Core Web Vitals |
| 12 | PWA | manifest, instalabilidade |
| 13 | Service worker | o que ele guarda |
| 14 | Cache | `Cache-Control`, `AssetsAPI`, storage (§15 do `SKILL.md`) |
| 15 | Segurança | autorização no backend, CSP, cabeçalhos |
| 16 | Minificação | existe? no source ou no build? |
| 17 | Ofuscação | existe? **está no source?** (violação a corrigir) |
| 18 | Classes e IDs | semânticos ou já aleatórios no source? |
| 19 | Exposição de API | endpoints e dados expostos sem necessidade |
| 20 | Segredos | chave, token ou credencial no frontend |

**Depois da auditoria:** liste os desvios, corrija a arquitetura quando ela for incompatível, **preserve as funcionalidades** e evite reescrita desnecessária. Não empilhe build novo sobre arquitetura incompatível — e não troque a tecnologia do projeto (§3.3).

### 17.1 Quando o source já está ofuscado

Situação real e delicada: o projeto chegou com o source já ofuscado, ou com classes aleatórias escritas à mão.

1. **Não "desofusque" por adivinhação.** Recuperar nome semântico a partir de `_0x81ab` é chute e quebra o que funciona.
2. **Congele o que está funcionando:** trate o arquivo ofuscado como legado, mova para `vendor/` (em `neverTransform`) e siga usando.
3. **Toda alteração nova nasce em arquivo novo, legível**, no padrão da skill.
4. Reescreva o legado por módulo, com teste a cada pedaço, **só quando houver motivo** (defeito, mudança de regra, evolução). Reescrever por estética não paga o risco.
5. Registre o plano e o que já foi migrado no `CLAUDE.md`.

---

## 18. Erros conhecidos

- **Tela morta em produção com a API respondendo 100%:** o minificador renomeou identificador de topo e `UI`/`net`/`Auth` sumiram. `minifyIdentifiers: false` (§6.1) e `renameGlobals: false`.
- **Estilo some depois de ligar `renameClasses`:** classe injetada pelo Java (`{%nome_active}`) foi renomeada só no CSS. A prova do §9.3 tem de ler `src/main/java/**`.
- **Responsividade quebrada:** utilitário do Tailwind entrou na lista de candidatas. Nenhuma classe presente em `styles/tailwind.css` é renomeável (§9.1).
- **Botão para de funcionar depois de ofuscar:** função chamada por `onclick=` no HTML não estava em `reservedGlobals`.
- **Service worker preso em versão antiga:** `sw.js` foi hasheado ou ofuscado. Nunca (§12).
- **`og:image` some do compartilhamento:** arquivo hasheado sem atualizar a meta tag, ou hasheado quando não devia (§8).
- **Dist velho publicado:** build gerado antes da última alteração no source. O `sourceHash` do `.build-info.json` resolve (§15.3).
- **Ofuscação "de graça" que custou caro:** `controlFlowFlattening` em 1.0 e `deadCodeInjection` ligados — página três vezes maior e visivelmente mais lenta. Reduza a agressividade (§3.1).

---
*Auditoria e otimização: Angatu Sistemas · Referência do §9.9–§9.13 do `SKILL.md`*
