# SEO e Open Graph — capa editorial por página

> **Auditoria:** Angatu Sistemas · Referência completa do **§9.16** do `SKILL.md` · Stack Angatu (Javalin + `HtmlRouteAPI` + vanilla)

> **O resultado esperado:** quem recebe a URL compartilhada entende na hora *"essa é a página desta empresa sobre este assunto"*, e não *"esse é o site de alguma empresa"*.
>
> Priorize: logo real, conteúdo específico, imagem real quando existir, identidade visual, composição profissional e informação objetiva.
> Evite: logo isolada, fundo genérico, texto genérico e a mesma imagem para o site inteiro.

---

## 1. O conjunto completo (não é só `title` e `description`)

Toda página entrega, no próprio `<head>`:

```html
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">

  <title>Instalação de ar-condicionado em Porangatu | Clima Norte</title>
  <meta name="description" content="Instalação de split residencial e comercial em Porangatu, com equipe própria e garantia de 1 ano no serviço. Orçamento no mesmo dia.">
  <link rel="canonical" href="https://climanorte.com.br/servicos/instalacao-de-ar-condicionado">

  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Clima Norte">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:url" content="https://climanorte.com.br/servicos/instalacao-de-ar-condicionado">
  <meta property="og:title" content="Instalação de ar-condicionado em Porangatu">
  <meta property="og:description" content="Split residencial e comercial instalado por equipe própria, com garantia de 1 ano no serviço.">
  <meta property="og:image" content="https://climanorte.com.br/assets/og/instalacao-ar-condicionado.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Técnico da Clima Norte instalando um split, com a logo da empresa no canto">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Instalação de ar-condicionado em Porangatu">
  <meta name="twitter:description" content="Split residencial e comercial instalado por equipe própria, com garantia de 1 ano.">
  <meta name="twitter:image" content="https://climanorte.com.br/assets/og/instalacao-ar-condicionado.jpg">

  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <link rel="manifest" href="/manifest.webmanifest">
  <script type="application/ld+json">{ "@context": "https://schema.org", "@type": "Service", "...": "só dado real" }</script>
</head>
```

Também entram, quando fizerem sentido: ícones de PWA, `robots`, `hreflang` e dados estruturados do tipo certo (`LocalBusiness`, `Organization`, `Service`, `Product`, `FAQPage`).

### 1.1 Como servir `<head>` próprio neste stack

O `HtmlRouteAPI` monta a página trocando `{page}`, `{content}` e `{%nome_active}` dentro de um HTML base. Como o `<head>` mora nesse base, uma landing precisa de uma destas duas saídas:

**Opção A (recomendada para landing):** a landing é uma **página completa**, com `<head>` próprio, servida por rota dedicada.

```java
/**
 * Serve a landing de um serviço com o <head> específico da página.
 *
 * @author Angatu Sistemas
 */
public class ServiceLandingRoute extends Route {
    public ServiceLandingRoute() { super("/servicos/{slug}", RouteType.GET, ServiceLandingRoute::handle); }

    /** Aceita apenas slug em minúsculas com hífen: qualquer outra coisa vira 404 (§16.6). */
    private static final java.util.regex.Pattern SLUG = java.util.regex.Pattern.compile("[a-z0-9-]{1,60}");

    private static void handle(Context ctx) {
        String slug = ctx.pathParam("slug");
        if (!SLUG.matcher(slug).matches()) { ctx.status(404); return; }

        String asset = "others/landing-" + slug + ".html";
        if (!AssetsAPI.assetExists(asset)) { ctx.status(404); return; }

        ctx.html(AssetsAPI.readAssetAsString(asset));
    }
}
```

**Opção B:** o HTML base ganha marcadores próprios de `<head>` (`{title}`, `{description}`, `{canonical}`, `{og_image}`) e a rota os substitui antes de responder. Simples substituição de texto sobre o que o `AssetsAPI` leu.

O que não vale: várias URLs entregando o mesmo `<head>`. Uma landing sem `title`, `description`, `canonical` e Open Graph próprios está incompleta.

### 1.2 O robô não faz login

`og:image` e a própria página precisam ser **públicas**. URL absoluta com `https`, servida pelo domínio de produção. Caminho local (`/home/...`, `file://`, `http://localhost:8080`) não é imagem de compartilhamento. Página atrás de sessão não gera prévia.

---

## 2. A imagem é uma capa, não um enfeite

**Nunca use uma imagem genérica para todas as páginas.** O `og:image` é a **capa editorial** daquela URL. Componha com: logo da empresa, nome da empresa, nome do produto ou serviço, título principal da página, imagem real do negócio, elementos gráficos da identidade, cores da marca, elementos SVG, padrões do segmento e uma informação curta que ajude a identificar o conteúdo.

**A logo entra na composição, não sozinha no meio de um fundo vazio:**

```
LOGO + imagem/ilustração do negócio + título da página + elemento gráfico da identidade
```

A arte tem de parecer produzida para aquela empresa. A marca fica identificável **antes** de a pessoa terminar de ler o título.

### 2.1 Uma capa por URL

Projeto com várias landings, várias capas — mesma identidade, conteúdo diferente:

| URL | Capa |
|---|---|
| `/servicos/instalacao-de-ar-condicionado` | logo + foto real de instalação + título de instalação + grafismo da marca |
| `/servicos/manutencao` | mesma identidade + conteúdo visual de manutenção + título específico |
| `/sobre` | mesma identidade + equipe ou sede reais + nome da empresa |

Só repita a mesma arte quando **não** for possível gerar capas específicas, e registre o motivo no `CLAUDE.md`.

### 2.2 Foto real na frente da ilustração

Havendo foto ou vídeo real da empresa, do produto, do serviço ou do local, ele tem prioridade na composição quando for relevante. Para empresa local isso é decisivo: uma foto do serviço realizado transmite mais contexto do que qualquer ilustração. Banco de imagens aleatório para preencher composição, não. Vale a mesma regra de autorização do §9.14.

### 2.3 Contexto geográfico

Landing de cidade, bairro ou região pode incorporar o local discretamente na composição quando isso **for parte real do conteúdo**: "Instalação de ar-condicionado em Porangatu". Nunca insira localidade sem relação real com a página.

### 2.4 O que a capa não pode parecer

Quadrado com a logo centralizada. Gradiente genérico. Imagem de banco com texto por cima. A mesma arte em todas as páginas. Banner genérico de SaaS. Composição automática sem identidade.

---

## 3. Geração automatizada das capas

Monte um processo **reutilizável**, alimentado pelos dados da página:

```
dados da página (slug, título, subtítulo, foto)
        ↓
logo + identidade visual + cores da marca
        ↓
composição 1200×630
        ↓
/assets/og/<slug>.jpg   (otimizado)
```

Três caminhos, em ordem de preferência neste stack:

1. **Remotion `still`** (melhor resultado, e o estúdio já existe se a landing tem hero em vídeo — §9.14). Uma composition `OgCover` parametrizada por props, uma renderização por página, e o estúdio é apagado no fim:

```bash
npx remotion still src/index.ts OgCover out/og/instalacao.jpg \
  --props='{"titulo":"Instalação de ar-condicionado em Porangatu","foto":"footage/instalacao-01.jpg"}'
```

2. **Canvas 2D** com o mesmo motor do §9.5: uma página geradora local desenha a composição a partir de um JSON de páginas e exporta com `canvas.toBlob()`. Zero ferramenta nova.

3. **HTML/CSS renderizado** por navegador headless, quando o projeto já tiver isso na esteira.

Guarde os dados das páginas em um único arquivo (`docs/design/pages.json`: slug, título, subtítulo, foto, tipo de schema) e gere todas as capas em um laço. Assim, página nova ganha capa nova sem trabalho manual.

**A geração acontece em desenvolvimento ou no build; o arquivo final é otimizado** (§9.10). O que vai para produção é o `.jpg` pronto em `public/assets/og/`.

---

## 4. Tamanho, compatibilidade e peso

| Item | Regra |
|---|---|
| Dimensão | 1200×630 (proporção 1,91:1), horizontal |
| Formato | **JPEG ou PNG.** Evite WebP e AVIF: vários previsualizadores não renderizam |
| Peso | ≤ 300 KB (alvo 150 KB) |
| Cor | sRGB |
| Área segura | conteúdo crítico dentro dos 1000×500 centrais, ≥ 60 px de margem |
| Texto | poucas palavras, corpo grande, contraste alto (o preview aparece pequeno) |
| Logo | inteira, sem corte, com respiro |

Teste o recorte: alguns aplicativos mostram a prévia quase quadrada. Se o título encosta na borda ou a logo fica no canto extremo, ela some no recorte. Nada essencial nas laterais externas.

---

## 5. Texto de SEO também não pode ser genérico

`title`, `description`, `og:title`, `og:description`, Schema.org e textos de compartilhamento seguem o §9.15: específicos, verdadeiros e escritos para aquela página.

```
Ruim:  Conheça nossas soluções e descubra como podemos ajudar você.
Bom:   Instalação de split residencial e comercial em Porangatu, com equipe própria
       e garantia de 1 ano no serviço.
```

A descrição explica o que o visitante encontra naquela URL. E **nada inventado**: sem nota, sem número de clientes, sem prêmio, sem certificação que não tenha origem em dado fornecido (§9.15).

**Coerência entre texto e imagem.** Página de serviço, capa do serviço. Página de produto, capa do produto. Página institucional, capa da empresa. Arte bonita sem relação com o conteúdo da URL é erro, não estilo.

---

## 6. Landing nova só está pronta com a capa pronta

Criar landing inclui, no mesmo processo: **conteúdo da página + SEO + Open Graph + imagem de compartilhamento + favicon e identidade quando necessário**. Não existe "o SEO fica para depois": a página e a identidade dela para compartilhamento nascem juntas.

---

## 7. Validação

Confira, página por página:

1. `title` próprio.
2. `description` própria.
3. `canonical` correto e absoluto.
4. `og:title` corresponde à página.
5. `og:description` corresponde à página.
6. `og:url` é a URL correta.
7. `og:image` existe e é acessível publicamente.
8. A imagem não aponta para caminho local.
9. Dimensões adequadas (1200×630) declaradas em `og:image:width`/`height`.
10. Logo presente quando existe logo.
11. A imagem representa visualmente a página.
12. Twitter/X configurado (`summary_large_image` + título, descrição e imagem).
13. Schema.org do tipo real do conteúdo.
14. Nenhuma informação inventada.
15. Nenhuma imagem genérica reutilizada sem necessidade.

```bash
LP=src/main/resources/public

# páginas sem canonical, sem og:image ou sem description
grep -L "rel=\"canonical\"" $LP/*.html
grep -L "og:image"          $LP/*.html
grep -L "name=\"description\"" $LP/*.html

# og:image apontando para caminho local ou relativo
grep -rn "og:image\" content=\"\(\.\|/\)" $LP --include="*.html"
grep -rn "og:image.*localhost" $LP --include="*.html"

# a mesma capa repetida em todas as páginas
grep -rhoE "og:image\" content=\"[^\"]+" $LP --include="*.html" | sort | uniq -c | sort -rn

# capas geradas e seus pesos
ls -lh $LP/assets/og/
```

Depois do build, valide o dist: as mesmas verificações rodam sobre `dist/public` (o §9.10 já reprova o build que perde `meta` em relação ao source). E teste a prévia real colando a URL de produção num aplicativo de mensagem antes de considerar entregue.

---
*Auditoria e otimização: Angatu Sistemas · Referência do §9.16 do `SKILL.md`*
