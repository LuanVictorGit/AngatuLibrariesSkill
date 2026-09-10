---
name: AngatuLibrariesSkill
description: Biblioteca Java 21 da Angatu Sistemas — servidor Javalin, Saveable e frontend vanilla com sistema de design obrigatório (Tailwind local, ds.css, arte generativa por tema). Link oficial https://github.com/LuanVictorGit/AngatuLibraries. Projetos hospedados no Coolify, com Dockerfile obrigatório, inicialização HTTP por padrão e HTTPS apenas por parâmetro explícito. Saveable sem cache em RAM — leitura e gravação direto no SQLite, com mutate/transaction para concorrência. Ao salvar imagens, pergunte sempre ao programador qual estratégia de compressão usar. Frontend segue a lei SOURCE → BUILD → DIST — source sempre legível, e minificação, ofuscação, renomeação de classes e hash de assets só no build, em níveis development/production/protected, com validação que reprova referência quebrada. Landing page exige apresentação rica — background SVG temático do segmento, hero em motion graphics feito no Remotion (ferramenta descartável, renderiza o vídeo e é apagada), vídeo mudo em laço, marca d’água do cliente, fotos e vídeos reais autorizados, redação com revisão anti-IA (sem travessão como muleta, sem palavra de marketing vazia, sem título ou CTA genérico, sem dado inventado) e SEO próprio por URL com capa editorial de Open Graph por página. Inclui 13 referências de frontend auditadas como Angatu Sistemas. Cobre ainda cache (nunca usar sem pedido), rodapé com a marca da Angatu Sistemas, segurança de sessão e API (cookie HttpOnly, token fora da URL, isolamento multi-tenant) e teste sempre pelo JAR do projeto. Dispara em AngatuLibraries, Saveable, Route, JavalinAPI, Coolify, Docker, deploy, HTTPS, criar projeto do zero, nova rota/entidade/tela, imagem, compressão, cache, cookie, sessão, segurança, build de produção, dist, minificar, ofuscar, proteger frontend, renomear classes, hash de assets, anti-bot, hardening, PWA, service worker, source map, landing page, hero, motion graphics, Remotion, background SVG, marca d’água, identidade visual, texto de IA, copywriting, título, CTA, SEO, Open Graph, og:image, Schema.org, canonical, favicon.
---

# AngatuLibraries — https://github.com/LuanVictorGit/AngatuLibraries

> **Repositório oficial:** https://github.com/LuanVictorGit/AngatuLibraries · Versões via JitPack https://jitpack.io/#LuanVictorGit/AngatuLibraries  
> **Requisitos:** Java 21+, Maven ou Gradle · JAR ~185 KB sem dependências empacotadas (cada módulo declara `optional`/`provided`)

> **Regra de ouro:** leia 1–2 arquivos existentes do mesmo tipo (`objects/`, `routes/`, `public/*.html`) e copie o estilo. Nunca reimplemente o que a lib já faz. Use sempre a **versão mais recente** da AngatuLibraries (ver §1.1).

## 0. Princípios do agente neste repo

1. **Lib sempre atualizada (§1.1).** 2. **CLAUDE.md sempre atualizado (§10).** 3. **Commits sempre na branch `development`, nunca na `main`; `main` só com confirmacao explicita do dono do projeto; nunca mencionar Claude/IA (§10.2).** 4. Só adicione deps dos módulos usados. 5. `Saveable` e `Route` só via `extends` (`protected`). 6. **Arquitetura limpa sempre (§13):** extraia utilitários, zero repetição (DRY), Javadocs em toda API pública, código otimizado. 7. **Jetty alinhado ao Javalin (§1.4).** 8. **Sempre testar rodando o servidor (§14).** 9. **Código em inglês, documentação em português (§13.4):** pacotes, classes, métodos e variáveis sempre em inglês; apenas Javadocs/comentários em português; toda classe com auditoria `@author Angatu Sistemas`. 10. **Tailwind sempre local, nunca CDN (§9.1).** Baixe o binário/CLI e gere `public/styles/tailwind.css` local. 11. **Português impecável no frontend (§9.2):** todo texto visível ao usuário com semântica, acentuação, vírgulas e concordância revisadas. 12. **Responsividade sempre em Tailwind CSS (§9.6):** qualquer layout, breakpoint, grid, visibilidade, espaçamento ou tipografia responsiva obrigatoriamente via utilitários responsivos do Tailwind (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`) — nunca `@media` manual como primeira opção. 13. **Nunca usar cache, a menos que seja pedido (§15):** todo conteúdo vem do servidor a cada requisição — sem service worker que guarda telas, sem `Cache-Control` longo, sem cache de assets. 14. **Rodapé sempre com a marca d'água da Angatu Sistemas (§9.8):** toda página e todo e-mail com rodapé exibem o crédito com o logotipo oficial. 15. **Segurança de sessão e API (§16):** cookie `HttpOnly` + `SameSite`, token nunca em URL, autorização validada no backend em toda rota. 16. **Testar sempre pelo JAR do próprio projeto (§14):** nunca subir servidor externo, nem `python -m http.server`, nem abrir o HTML por `file://`. 17. **Todo projeto tem `Dockerfile` (§17):** a hospedagem é o **Coolify**; sem `Dockerfile` e `.dockerignore` na raiz o projeto não sobe. **Nunca fixe teto de heap com `-Xmx`:** use `-XX:MaxRAMPercentage` junto de `ExitOnOutOfMemoryError` e deixe o limite de memória no painel da hospedagem. 18. **HTTP por padrão, HTTPS só se pedido (§2.1):** `new AngatuLib(host, port, rateLimit)` sobe em HTTP na porta informada e o TLS é do Coolify; o quarto parâmetro (`manageSsl`) só existe para quem roda fora dele com Let's Encrypt próprio. 19. **`Saveable` não guarda dados em RAM (§4):** toda leitura vai ao banco, toda alteração exige `save()`, registro disputado usa `Saveable.mutate(...)` e consulta frequente por campo exige índice. O formato do banco continua o mesmo (`id`, `data`, um `database.db` por projeto) — nunca altere o esquema de bancos existentes. 20. **Salvou imagem? Pergunte a estratégia de compressão antes (§18)** — nunca escolha sozinho. 21. **SOURCE legível, BUILD protege, DIST publica (§9.9):** o código-fonte do frontend permanece semântico e depurável do começo ao fim; minificação, ofuscação, renomeação de classes e hash de assets existem **só** no build, gravando em `dist/` — o build nunca reescreve `src/`. 22. **Ofuscação não é segurança (§9.11):** o que chega ao navegador é acessível ao cliente; autorização, regra crítica e anti-abuso ficam no backend (§16), e nenhuma proteção de frontend pode custar funcionamento, acessibilidade ou SEO (ordem de prioridade em §9.9).

---

## 1. Instalação e dependências

### 1.1 Sempre na versão mais recente

Antes de criar/atualizar `pom.xml`/`build.gradle`:

1. Abra https://jitpack.io/#LuanVictorGit/AngatuLibraries e pegue a **última tag** (ou `git ls-remote https://github.com/LuanVictorGit/AngatuLibraries.git`).
2. Use `com.github.LuanVictorGit:AngatuLibraries:VERSION` com `VERSION` = última release.
3. Sincronize todas as coordenadas de terceiros com o `pom.xml` daquela tag (§1.3).

```xml
<!-- pom.xml -->
<repositories>
  <repository><id>jitpack.io</id><url>https://jitpack.io</url></repository>
</repositories>
<dependencies>
  <dependency>
    <groupId>com.github.LuanVictorGit</groupId>
    <artifactId>AngatuLibraries</artifactId>
    <version>VERSION</version>
  </dependency>
</dependencies>
```

```groovy
// build.gradle
repositories { maven { url 'https://jitpack.io' } }
dependencies { implementation 'com.github.LuanVictorGit:AngatuLibraries:VERSION' }
```

### 1.2 .env e debug

`.env` na raiz (nunca versionar) — `ignoreIfMissing/Malformed`:

```env
EMAIL_KEY=seu@gmail.com
EMAIL_PASSWORD=senha_de_app
DISCORD_BOT_TOKEN=xxx
DEEPSEEK_API_KEY=xxx
MP_ACCESS_TOKEN=xxx
```

Debug: `java -Dangatu.debug=true -jar app.jar` ou `Console.setDebugEnabled(true)`.

### 1.3 Dependências por módulo (pom atual, Java 21)

| Módulo | Coordenadas | Classe que exige no classload |
|---|---|---|
| Web/HTML/Assets/Rotas | `io.javalin:javalin:7.2.2`, `org.reflections:reflections:0.10.2` + binding SLF4J (`org.slf4j:slf4j-simple:2.0.17`); `io.javalin.community.ssl:javalin-ssl:7.2.2` **só** se `manageSsl=true` (§2.1) | `JavalinAPI` |
| Persistência | `org.xerial:sqlite-jdbc:3.51.3.0`, `com.zaxxer:HikariCP:7.0.2`, `com.google.code.gson:gson:2.13.2` | — |
| JSON | `com.google.code.gson:gson:2.13.2` | `GsonAPI`, TypeAdapters |
| .env | `io.github.cdimascio:dotenv-java:3.2.0` | — |
| Senhas | `org.mindrot:jbcrypt:0.4` | — |
| Web Push | `nl.martijndwars:web-push:5.1.2`, `org.bouncycastle:bcprov-jdk18on:1.83`, `org.bitbucket.b_c:jose4j:0.9.6`, `org.apache.httpcomponents:httpclient:4.5.14` | — |
| E-mail | `com.sun.mail:jakarta.mail:2.0.1` + dotenv | — |
| Discord | `net.dv8tion:JDA:6.4.1` | — |
| Pagamentos | `com.mercadopago:sdk-java:2.9.2` | — |
| Navegador | `com.microsoft.playwright:playwright:1.58.0` (+ `mvn exec:java -e -Dexec.mainClass=com.microsoft.playwright.CLI -Dexec.args="install chromium"` uma vez) | — |
| Imagens | `net.coobird:thumbnailator:0.4.21`, `com.twelvemonkeys.imageio:imageio-webp:3.12.0` / `imageio-tiff:3.12.0` | — |
| QR Code | `com.google.zxing:core:3.5.3`, `com.google.zxing:javase:3.5.3` | `QRCodeAPI` (`ErrorCorrectionLevel`) |
| Lombok | `org.projectlombok:lombok:1.18.44` (`provided`) | — |

Guard: `Dependencies.require("io.javalin.Javalin","io.javalin:javalin:7.2.2","Web Server (Javalin)")` → imprime instruções Maven/Gradle e lança `MissingDependencyException`. 39/43 classes linkam sem deps.

### 1.4 Jetty — versão alinhada ao Javalin (obrigatório)

Javalin 7.2.2 traz o Jetty **transitivamente** — nas builds recentes da lib isso é **Jetty 12.x**
(`ee10`), e não Jetty 11. **Não fixe Jetty manualmente**: confirme a versão real com
`mvn dependency:tree -Dincludes=org.eclipse.jetty` e deixe o transitivo do Javalin mandar.

- Não declare `org.eclipse.jetty:*` no `pom.xml` a menos que precise sobrescrever — deixe o Javalin trazer o transitivo.
- Se precisar declarar (ex: `jetty-alpn`, `jetty-http`), use **exatamente 11.0.24** (ou a versão que `mvn dependency:tree` mostra vinda do `javalin:7.2.2`).
- Em conflito (`NoSuchMethodError`/`ClassNotFoundException` de Jetty), rode `mvn dependency:tree -Dincludes=org.eclipse.jetty` e alinhe tudo para a mesma versão do Javalin.
- Para `javalin-ssl:7.2.2` vale o mesmo — não misture Jetty 10/12 com Javalin 7.2.x.

---

## 2. Inicialização correta — AngatuLib

### 2.1 Construtor — HTTP por padrão, HTTPS só quando pedido

```java
import br.com.angatusistemas.lib.AngatuLib;
import br.com.angatusistemas.lib.javalin.JavalinAPI;

public class Main {
    public static void main(String[] args) {
        // A porta vem do ambiente: o Coolify publica o contêiner nela
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));

        JavalinAPI.setTrustedProxyHops(1); // proxy do Coolify na frente
        new AngatuLib("loja.angatusistemas.com.br", port, true);

        JavalinAPI.addIgnoredPath("/health");            // usada pelo HEALTHCHECK
        JavalinAPI.configureApiRateLimit("/api/*");
        JavalinAPI.configureLoginRateLimit("/api/login");
    }
}
```

**Assinaturas:**

```java
new AngatuLib(String host, int port, boolean bloqByMaxRequisitions)                    // HTTP  (padrão)
new AngatuLib(String host, int port, boolean bloqByMaxRequisitions, boolean manageSsl) // HTTPS opcional
```

- `host` — domínio público do projeto (`loja.angatusistemas.com.br`) ou `localhost` em desenvolvimento.
- `port` — porta em que o Javalin escuta. **É respeitada sempre** (não existe mais o desvio para a porta 80 em localhost). Leia de `PORT`, com `8080` como padrão.
- `bloqByMaxRequisitions` — liga rate limiting/bloqueios.
- `manageSsl` — **omita**. Só passe `true` fora do Coolify, quando o próprio servidor tiver `/etc/letsencrypt/live/<host>/{fullchain,privkey}.pem`; aí o Javalin sobe HTTPS na porta informada e mantém `port+1` só para redirecionar. Sem os certificados, a inicialização falha com `IllegalStateException` — de propósito.

> **Nunca configure HTTPS por iniciativa própria.** No Coolify o certificado é emitido e renovado pela hospedagem; a aplicação fala HTTP dentro da rede do contêiner. Pedir SSL ao Javalin lá dentro quebra o deploy.

**Ambiente (`isLocalhost()`)** não olha mais pasta de certificados — dentro do contêiner ela não existe. A ordem é:

1. `-Dangatu.env=` / `ANGATU_ENV` / `ENVIRONMENT` (`production`/`prod` ou `development`/`dev`/`local`);
2. `manageSsl = true` → produção;
3. host local (`localhost`, `127.0.0.1`, `::1`, `0.0.0.0`, `*.local`) → desenvolvimento;
4. qualquer outro host → **produção** (conservador: cookie `Secure`, nada de atalho de desenvolvimento).

O `Dockerfile` modelo já define `ANGATU_ENV=production`. Em desenvolvimento, use `localhost` como host — ou `-Dangatu.env=development` quando precisar rodar local com o domínio real.

**URL pública** — `AngatuLib.getInstance().getOriginHost()` devolve `http://localhost:<porta>` em desenvolvimento e `https://<host>` em produção (mesmo em HTTP interno, porque quem termina o TLS é o Coolify). Publicando sem TLS, declare a origem real com `setOriginHost(...)`.

### 2.2 Fluxo interno

1. `Dependencies.require` do Javalin. 2. `System.setOut(new PrintStream(new InterceptorOutputStream()))` → `Console` (preserva original em `getOriginalOut()`). 3. Resolve o ambiente (produção x desenvolvimento). 4. `JavalinAPI.setup(port, rateLimit, manageSsl, folderCerts)` (headers, SQLi/XSS, rate limit, estáticos e — só se pedido — SSL). 5. `HtmlRouteAPI.registerAllRoutes(javalin)` (templates em `/public`). 6. Banner com host, modo e ambiente.

Não instancie `AngatuLib` duas vezes no mesmo processo. Recursos sem servidor web (`Saveable`, `Task`, `StringAPI`…) funcionam sem ela.

### 2.3 Estrutura recomendada (pacotes e classes sempre em inglês — §13.4)

```
project-root/
├── src/main/java/com/company/store/
│   ├── Main.java                 // new AngatuLib(...)
│   ├── routes/                   // extends Route (descoberta automática) — ex: CreateUserRoute.java
│   ├── entities/                 // extends Saveable — ex: User.java, Order.java
│   ├── services/                 // regras de negócio — ex: CreateOrderService.java
│   └── utils/                    // utilitários — ex: Validators.java, MoneyUtils.java
├── src/main/resources/
│   ├── public/                   // HTML servidos automaticamente
│   │   ├── index.html            // shell base {content} {page} {%nome_active}
│   │   └── css/ js/ img/
│   └── emails/                   // templates (EmailAPI.loadHtmlTemplate)
├── Dockerfile                    // deploy no Coolify (§17) — obrigatório
├── .dockerignore                 // contexto de build enxuto, sem .env nem banco
├── CLAUDE.md
├── .env                          // local; em produção são variáveis do Coolify
└── pom.xml
```

---

## 3. JavalinAPI — servidor e segurança

`JavalinAPI.setup(int port, boolean enableRateLimit, boolean manageSsl, File folderCerts)` (e o atalho `setup(int port, boolean enableRateLimit)`) — `Javalin.create { cors anyHost; staticFiles classpath /public; contextPath "/"; ignoreTrailingSlashes; maxRequestSize 1GB; SslPlugin só quando manageSsl }` e `start(port)` em HTTP. `JavalinAPI.get()` expõe a instância. A ordem dos parâmetros mudou de propósito: chamada antiga quebra no compilador em vez de inverter o sentido do booleano.

Before-handler: `SECURITY_HEADERS` → SQLi/XSS (`select..from`, `union select`, `<script`, `javascript:`, `eval(`…) → 403 sem contar violação → rate limiting.

**Rate limiting (SlidingWindowCounter — ArrayDeque O(1)):**

```java
JavalinAPI.configureRateLimit("/api/*", new RateLimitConfig(3, 20, 120));
JavalinAPI.configureApiRateLimit("/api/*");      // 3/s, 20/min, 120s
JavalinAPI.configureLoginRateLimit("/api/login"); // 1/s, 5/min, 900s
JavalinAPI.setGlobalRateLimit(5, 30, 300);
JavalinAPI.setRateLimitingEnabled(false);
JavalinAPI.addUnlimitedPath("/downloads/*");
JavalinAPI.addIgnoredPath("/health");
JavalinAPI.setTrustedProxyHops(1); // 0=socket, 1=nginx, 2=nginx+CDN
JavalinAPI.setSecurityHeader("Content-Security-Policy", "default-src 'self' ..."); // null remove
JavalinAPI.getActivePermanentBlocks();
JavalinAPI.unblockPermanently(ipHash);
JavalinAPI.unblockAll();
```

- `RateLimitConfig(reqSec, reqMin, blockSec[, perIp=true])` campos `public final`.
- Chave = `ipHash|path` quando `perIp=true`, senão `path`. Estáticos (`.css/.js/.png/.woff2/.pdf`…) nunca limitam.
- Burst >10 req/s → 3600s; 3 violações → `PermanentBlock` + `SuspectIp` persistidos. Loopback/privado (`127.*`, `10.*`, `192.168.*`, `172.16-31.*`, `::1`, `fc/fd`) nunca vira permanente.
- `setTrustedProxyHops` extrai IP da direita de `X-Forwarded-For` e checa `CF-Connecting-IP`, `True-Client-IP`, `X-Real-IP`. CSP default é permissiva — aperte antes do `new AngatuLib(...)` em produção.
- Páginas de bloqueio inline com `skipRemainingHandlers()` (429/403).

---

## 4. Persistência — Saveable (sem dados em RAM)

SQLite `database.db` + Gson — **um banco por projeto**, no diretório de trabalho da aplicação, como sempre foi. **Não existe mais cache total nem identity map:** toda busca vai ao banco e devolve instância nova; toda alteração só existe depois do `save()`.

**O formato do banco não mudou:** tabela `(id TEXT PRIMARY KEY, data TEXT NOT NULL)` e gravação por `INSERT OR REPLACE`. Nenhuma coluna nova, nenhum `ALTER TABLE` — bancos de sistemas já em produção continuam funcionando, inclusive com versões anteriores da biblioteca. O que mudou é só o comportamento em memória e a concorrência: um pool HikariCP por aplicação (antes um por classe de entidade), WAL, `busy_timeout` e transações `IMMEDIATE`.

```java
import br.com.angatusistemas.lib.database.Saveable;
import lombok.Getter; import lombok.Setter;

/**
 * Entidade de usuário persistida via Saveable.
 *
 * @author Angatu Sistemas
 */
@Getter @Setter
public class User extends Saveable {
    private String id;
    private String name;
    private String email;
    public User() {}
    @Override public String getId() { return id; }
}

// criar / gravar (atômico; a última escrita vence)
User user = new User(); user.setName("João"); user.save(); // UUID se id==null

// ler — sempre do banco, sempre instância nova
User found = Saveable.findById(User.class, user.getId());
boolean exists = Saveable.exists(User.class, id);
long total = Saveable.count(User.class);

// consultar por campo: crie o índice uma vez, na inicialização
Saveable.createIndex(User.class, "email");
Saveable.createIndex(User.class, "role");   // enum: indexe também, e consulte pelo nome
User byEmail = Saveable.findFirstByField(User.class, "email", "joao@exemplo.com");
List<User> byField = Saveable.findByField(User.class, "name", "João");
List<User> result = Saveable.query(User.class,
        "SELECT data FROM users WHERE json_extract(data,'$.name')=?", "João");

// ATENÇÃO — enum e objeto não descem para o SQL:
Saveable.findByField(User.class, "role", Role.ADMIN);         // varre a tabela em memória
Saveable.findByField(User.class, "role", Role.ADMIN.name());  // usa o índice
List<User> page = Saveable.query(User.class,
        "SELECT data FROM users ORDER BY id LIMIT 100 OFFSET ?", 0);

// varredura da tabela inteira — use com consciência do tamanho
List<User> all = Saveable.findAll(User.class);
List<User> filtered = Saveable.findByPredicate(User.class, x -> "João".equals(x.getName()));

// excluir
user.delete(); Saveable.deleteById(User.class, id); Saveable.deleteAll(User.class);
user.reload(); // descarta alterações locais e pega o estado atual
Saveable.shutdown(); // no shutdown hook
```

**Concorrência — a parte que não pode ser improvisada.** Rotas, tarefas agendadas e workers mexem nos mesmos registros ao mesmo tempo. Escolha pela intenção:

| Situação | Use | Comportamento |
|---|---|---|
| Gravar objeto que só você mexe | `obj.save()` | Atômico; última escrita vence |
| Alterar registro disputado (saldo, estoque, contador, lista) | `Saveable.mutate(Class, id, obj -> ...)` | Lê, altera e grava **na mesma transação** — sem atualização perdida |
| Reler antes de decidir | `obj.reload()` | Traz o estado atual do banco, descartando alteração local não gravada |
| Duas gravações que valem juntas | `Saveable.transaction(() -> {...})` | Tudo ou nada; `computeInTransaction(...)` devolve valor |
| Lote | `Saveable.saveAll(lista)` | Uma transação só |

```java
// ERRADO em registro disputado: entre o findById e o save, outro componente grava e a alteração dele some
User u = Saveable.findById(User.class, id); u.setCredits(u.getCredits() + 10); u.save();

// CERTO
Saveable.mutate(User.class, id, x -> x.setCredits(x.getCredits() + 10));

// CERTO: duas gravações que precisam valer juntas
Saveable.transaction(() -> { stock.save(); new Order(userId, productId).save(); });
```

Tabela = `SimpleName.toLowerCase()` + `s` (`User→users`, `Key→keys`); colunas `id TEXT PK, data TEXT NOT NULL` — as mesmas de sempre. Campos `transient` não são persistidos. Campos novos são retrocompatíveis; use getters null-safe para coleções. Construtor `protected`, `abstract`.

**Banco em contêiner:** cada projeto tem o seu `database.db`. No Coolify, `ANGATU_DB_PATH=/data/database.db` (já no `Dockerfile` modelo, §17) aponta o SQLite daquele projeto para o volume persistente dele. Sem isso, o banco morre a cada deploy. `Saveable.databasePath()` mostra o caminho em uso.

**Consequências de não haver cache (leia antes de portar projeto antigo):**

- alterar um objeto e não chamar `save()` não muda nada para ninguém — o valor antigo continua no banco;
- `findById` duas vezes devolve **dois objetos diferentes**; não compare com `==` nem espere que alterar um reflita no outro;
- `findAll`/`findByPredicate` percorrem e desserializam a tabela inteira: em rota quente, troque por `findByField`/`query` com índice;
- **escrita disputada perde atualização.** Ler, alterar e gravar em passos separados grava a cópia lida antes por cima do que outro componente escreveu no meio do caminho. Com o cache isso não aparecia, porque os dois lados mexiam no mesmo objeto — ao portar, converta para `Saveable.mutate(...)` **todo** ponto em que um trabalho agendado e uma rota (ou um webhook com reenvio automático) tocam o mesmo registro. É onde estão os defeitos de dinheiro;
- **`mutate` não atualiza o objeto que você tinha em mãos.** Ele grava e devolve o estado novo; quem chamou continua com a cópia anterior. Se o método recebe a entidade por parâmetro e quem chamou lê campos dela depois, copie de volta o que foi gravado;
- **teste que compara identidade quebra.** `assertSame` entre entidades só passava por causa do cache. Compare identificador — que é o que a regra de negócio exige de verdade;
- o banco em si não mudou: consultas customizadas continuam com `SELECT data FROM ...`, e nada precisa ser migrado.

> **Idioma obrigatório (§13.4):** classe `User` (inglês) com Javadoc em português e `@author Angatu Sistemas`. Nunca use `Usuario`/`Produto` — sempre inglês.

### 4.1 Portar projeto de versão anterior da biblioteca — procedimento

> **O projeto vai compilar sem alterar uma linha.** Nada aqui é erro de compilação: são mudanças de
> comportamento. O sistema sobe, as telas abrem, os testes de unidade passam — e o defeito aparece
> em produção, com dois componentes mexendo no mesmo registro. Faça esta passagem **antes** de
> considerar a migração pronta.

**1. Ache toda escrita disputada e converta para `mutate`.** É o item caro; comece por ele.

```bash
# Onde um registro é lido e gravado em passos separados
grep -rnE "findById\(|findFirstByField\(" --include="*.java" src/main/java | cut -d: -f1 | sort -u
# Cruze com quem grava: o mesmo arquivo aparecendo nos dois é candidato
grep -rn "\.save()" --include="*.java" src/main/java | cut -d: -f1 | sort | uniq -c | sort -rn
```

Para cada candidato, pergunte: **quem mais escreve neste registro?** Converta quando a resposta
incluir um trabalho agendado, um webhook (o provedor reenvia até receber confirmação), um
WebSocket ou outra rota. Registro que só um fluxo toca pode continuar com `save()`.

```java
// ERRADO — grava a cópia lida antes por cima do que outro componente escreveu no intervalo
Invoice f = Saveable.findById(Invoice.class, id); f.setStatus(PAID); f.save();
// CERTO
Saveable.mutate(Invoice.class, id, f -> f.setStatus(PAID));
```

**2. Não regrave a entidade inteira para mudar um campo.** `save()` persiste o objeto completo: um
`setLastAccessAt` gravado a partir de uma cópia apaga a edição que outra tela fez no intervalo. Em
`mutate`, altere **só** o campo que aquele fluxo é dono.

**3. Método que recebe entidade por parâmetro precisa devolver o estado gravado.** `mutate` não
atualiza o objeto de quem chamou. Copie de volta o que foi persistido, ou o chamador lê o estado
anterior logo em seguida (e o teste dele falha por um motivo que parece não ter relação).

**4. Decida dentro da transação, não antes.** Guarda de idempotência (`if (já está pago) return;`)
lida fora do `mutate` não vale: entre a leitura e a gravação o estado muda. Leve a comparação para
dentro do bloco e sinalize o resultado.

**5. Confira o retorno de `mutate`.** Devolve `null` quando o registro não existe — e a alteração
simplesmente não aconteceu, sem exceção.

**6. Índice para todo campo consultado.** Sem cache, cada busca vai ao SQLite.

```bash
grep -rhoE "findByField\([A-Za-z]+\.class, \"[a-zA-Z]+\"" --include="*.java" src/main/java | sort -u
```

Crie um `createIndex` no arranque para cada par que sair daí. É idempotente.

**7. Enum vai como texto.** `findByField(X.class, "role", Role.ADMIN)` cai no filtro em memória e lê
a tabela inteira; `Role.ADMIN.name()` desce para o SQL e usa o índice.

**8. Testes que comparam identidade quebram.**

```bash
grep -rn "assertSame" --include="*.java" src/test
```

`assertSame` entre entidades só passava por causa do cache. Compare identificador — que é o que a
regra de negócio exige de verdade.

**9. Inicialização e hospedagem.** A porta informada é a usada (não há mais desvio para a 80 em
localhost) e o TLS deixou de ser da aplicação: leia a porta de `PORT`, remova qualquer pedido de
HTTPS ao Javalin e crie `Dockerfile`, `.dockerignore` e `GET /health` (§17). Ajuste também o que
apontava para a porta antiga: scripts de teste, `CLAUDE.md`, URLs de desenvolvimento.

**Caso real que originou este procedimento.** Sistema de transporte em produção: a rotina de
cobrança rodava de hora em hora e o Mercado Pago reenviava o aviso de pagamento até receber
confirmação. As duas tocavam a mesma fatura. Com o cache, as duas mexiam no mesmo objeto e nada
acontecia. Sem ele, havia um intervalo em que a rotina gravava o estado anterior por cima da
confirmação: **a fatura voltava a pendente e a conta que tinha acabado de pagar era bloqueada.**
Nenhum teste de unidade pegava — os dois fluxos passavam isolados.

---

## 5. Rotas — Route / RouteType

```java
import br.com.angatusistemas.lib.javalin.routes.Route;
import br.com.angatusistemas.lib.javalin.routes.RouteType;

/**
 * Rota de health check.
 *
 * @author Angatu Sistemas
 */
public class HealthRoute extends Route {
    public HealthRoute() { super("/health", RouteType.GET, ctx -> ctx.json("{\"status\":\"ok\"}")); }
}
/**
 * Rota de criação de usuário.
 *
 * @author Angatu Sistemas
 */
public class CreateUserRoute extends Route {
    public CreateUserRoute() { super("/api/users", RouteType.POST, CreateUserRoute::handle); }
    private static void handle(io.javalin.http.Context ctx) {
        try {
            var company = findByToken(ctx.queryParam("token"));
            if (company == null) { ctx.result("Unauthorized").status(StatusCode.UNAUTHORIZED.code()); return; }
            var body = GsonAPI.get().fromJson(ctx.body(), com.google.gson.JsonObject.class);
            var user = new User(); user.setName(body.get("name").getAsString()); user.save();
            ctx.result(GsonAPI.get().toJson(java.util.Map.of("id", user.getId())))
               .contentType("application/json").status(StatusCode.CREATED.code());
        } catch (Exception e) { Console.error("CreateUserRoute", e); ctx.result("Error").status(StatusCode.INTERNAL_SERVER_ERROR.code()); }
    }
    private static Company findByToken(String token) {
        if (token==null||token.isBlank()) return null;
        return Saveable.findByPredicate(Company.class, x -> x.getSessionTokens().containsKey(token))
                       .stream().findFirst().orElse(null);
    }
}
/**
 * Rota de chat WebSocket.
 *
 * @author Angatu Sistemas
 */
public class ChatRoute extends Route {
    public ChatRoute() { super("/ws/chat", ws -> ws.onMessage(ctx -> ctx.send("echo: "+ctx.message()))); }
}
```

`RouteType`: `GET, POST, PUT, DELETE, PATCH, WS`. Construtores `protected`. Descoberta via Reflections: toda subclasse concreta com construtor vazio é `newInstance().register()` no `setup` (`app.unsafe.routes.*`). Path params: `"/api/users/{id}"` → `ctx.pathParam("id")`. Não instancie `Route` direto nem chame `register()` antes do setup. Todos os nomes de pacotes/classes/métodos/variáveis sempre em inglês; Javadocs em português com `@author Angatu Sistemas` (§13.4).

---

## 6. HTML / Assets — HtmlRouteAPI, AssetsAPI, IP

Cada `.html` em `src/main/resources/public/` vira rota pelo **nome do arquivo** (`public/orcamentos/novo.html → /novo`, `public/index.html → /`). Nomes únicos. `.html` redireciona para sem extensão.

```java
HtmlRouteAPI.registerAllRoutes(javalin); // usa /index.html como base
HtmlRouteAPI.registerAllRoutes(javalin, "/index.html", () -> java.util.List.of("/sobre.html"));
HtmlRouteAPI.addIgnoredPath("admin");
HtmlRouteAPI.extractPageName("/a/Meu.html"); // "meu"
HtmlRouteAPI.getAllHtmlPages(); // /public/*.html exceto /emails /others
```

Render: `baseHtml` + `pageContent` substitui `{page}`, `{content}`, `{%nome_active}`. `AssetsAPI` (`classpath public/`): `readAssetAsString/Bytes`, `assetExists`, `getContentType`, `serveAsset(ctx,path)`, `listAssets`, `listAssetsByExtension`, `listClasspathResources`, `listAllAssetsRecursive`, `getAssetSize/LastModified`, `setCacheEnabled`, `setDefaultCacheTtl`, `putInCache`. `IP.get(ctx)` ordem `X-Forwarded-For` → `X-Real-IP` → `CF-Connecting-IP` → `True-Client-IP` → `ctx.ip()` (prefira `JavalinAPI` com `trustedProxyHops`).

---

## 7. Utilitários centrais

### Console / AnsiColor
`System.out → InterceptorOutputStream → Console` (preserva `getOriginalOut()`). Códigos `&0..&f`, `&l` bold, `&n` underline, `&o` italic, `&r` reset.

```java
Console.log("Servidor iniciado");
Console.info("Usuário %s", nome);
Console.warn("Quase cheio %d%%", p);
Console.error("Falha", ex); // ex sempre último arg
Console.debug("detalhe %s", v); // só com -Dangatu.debug=true
Console.isDebugEnabled(); DataTime.getData(); // "dd/MM/yyyy - HH:mm"
```

### GsonAPI
`GsonAPI.get()` singleton com `OffsetDateTimeTypeAdapter`/`LocalDateTypeAdapter` (ISO), lazy holder.

### Env
```java
Env.get().get("DEEPSEEK_API_KEY");
Env.get().get("CHAVE","default");
Env.reload();
```

### Password
```java
String hash = Password.criptography("senha");
boolean ok = Password.checkCriptography("senha", hash);
```

### StringAPI
`removeLastChar`, `capitalize`, `randomCode(n)`, `isNullOrEmpty/Blank`, `repeat`, `truncate`, `reverse`, `toCamelCase/toSnakeCase`, `containsOnlyDigits/Letters`, `extractNumbers`, `maskString`, `countOccurrences`, `equalsIgnoreCaseNullSafe`.

### DataTime (America/Sao_Paulo, thread-safe)
`getData()`, `getCurrentDate/DateTime/ZonedDateTime/Timestamp`, `formatDate/DateTime/Iso/Custom`, `parseDate/DateTime/Custom`, `addDays/Months/Years/Hours/Minutes/Seconds`, `diffDays/Months/Years/Hours/Minutes/Seconds`, `getDay/Month/Year/Hour/Minute/Second/DayOfWeek`, `isLeapYear`, `startOfDay/endOfDay`, `first/lastDayOfMonth/Year`, `isBefore/After/Between`, `calculateAge`, `toLocalDateTime/toDate/fromTimestamp/toTimestamp`, `isValidDate/DateTime`.

### Task
```java
int id = Task.runAsync(() -> {});
Task.runSync(() -> {});
Task.runLater(() -> {}, 5000);
Task.runTimer(() -> {}, 0, 3600_000);
Task.runTimerWithFixedDelay(() -> {}, 0, 3600_000);
Task.cancelTask(id); Task.cancelAll(); Task.shutdown();
```

### Request / Response / StatusCode
```java
Response r = Request.query("GET", "https://api.exemplo.com/users");
Response r2 = Request.query("POST", "https://api.exemplo.com/users", "{\"nome\":\"João\"}", "token");
r.isSuccess(); r.ok(); r.getBody(); r.getStatusCode(); r.getCode();
StatusCode.fromCode(404); // → NOT_FOUND
```

### Dependencies
`Dependencies.isPresent`, `require(g:a:v, feature)`, `check`.

---

## 8. Integrações opcionais (todos com guard)

### EmailAPI — smtp.gmail.com:587/TLS, async #XXX anti-spam
```java
EmailAPI.isConfigured();
EmailAPI.sendSimple("a@x.com","Bem-vindo","Olá").join();
EmailAPI.sendHtml("a@x.com","Bem-vindo", html).join();
EmailAPI.sendSimpleToMultiple(List.of("a@x.com","b@x.com"),"Assunto","corpo");
EmailAPI.sendHtmlToMultiple(...);
EmailAPI.sendSimple(List.of(to), cc, bcc, assunto, corpo);
EmailAPI.sendWithAttachments("a@x.com","Assunto","corpo", List.of(new File("rel.pdf")), true);
String html = EmailAPI.loadHtmlTemplate("/emails/welcome.html", Map.of("nome","João")); // {{nome}}
```

### WebPushAPI / PushBootstrap / Key
```java
PushBootstrap.setup(); // Key id="key" no Saveable; gera VapidKeys se ausente
WebPushAPI.initialize(pubBase64Url, privBase64Url, "mailto:contato@empresa.com");
WebPushAPI.generateVapidKeys(); // 87/43 chars Base64URL, AES128GCM
WebPushAPI.getVapidPublicKey();
WebPushAPI.createSubscription(endpoint, p256dh, auth);
WebPushAPI.sendNotification(sub, "Título","Corpo", iconUrl);
WebPushAPI.sendNotificationAsync(sub, title, body, iconUrl);
WebPushAPI.sendBatchNotifications(list, title, body, iconUrl);
WebPushAPI.isInitialized(); WebPushAPI.testConfiguration();
// SendResult: isSuccess(), isExpired() (410/404), getStatusCode(), getError()
```

### Bot (JDA — .complete() bloqueante)
```java
Bot.setup(); // DISCORD_BOT_TOKEN
Bot.sendMessage("channelId","texto");
Bot.sendMessageWithButton("ch","texto","btn_ok","Sim");
Bot.sendImageFromUrl("ch","https://...", caption);
Bot.onButtonClick("btn_ok", e -> e.reply("Ok!").setEphemeral(true).queue());
```

### DeepSeek — https://api.deepseek.com/v1/chat/completions
```java
DeepSeek.initialize(); // DEEPSEEK_API_KEY
String r = DeepSeek.ask("Responda em português", "Capital do Brasil?");
DeepSeek.askStream("Seja criativo","Conte uma história", chunk -> System.out.print(chunk));
DeepSeek.initialize("apiKey","deepseek-chat"); DeepSeek.setModel("deepseek-chat");
```

### BrowserAPI — Playwright pool 2 Chromium 1920x1080
```java
BrowserAPI.captureFullPageScreenshot("https://site.com");
BrowserAPI.captureFullPageScreenshotFromHtml("<h1>oi</h1>");
BrowserAPI.captureFullPageScreenshotToFile("https://site.com","site.png");
String html = BrowserAPI.getPageHtml("https://site.com");
String t = BrowserAPI.extractText("https://site.com","h1");
BrowserAPI.extractLinks(html); BrowserAPI.extractImageUrls(html);
BrowserAPI.extractMetaTags(html); BrowserAPI.stripHtml(html);
BrowserAPI.minifyHtml(html); BrowserAPI.absolutizeUrls(html,"https://site.com");
BrowserAPI.shutdown();
```

### ImageAPI — Image extends Saveable (id, mimeType, bytes)
```java
ImageAPI.imageToBase64(img,"png"); ImageAPI.base64ToImage(b64);
ImageAPI.createThumbnail("foto.png","mini.png",200,200);
ImageAPI.resize(img,200,200); ImageAPI.cropCenter(img,200,200);
ImageAPI.extractToImageObject("id", bufferedImage);
ImageAPI.createAnimatedGif(frames,"anim.gif", delayMs, loop);
```

### QRCodeAPI — ZXing
```java
BufferedImage qr = QRCodeAPI.generateQRCode("https://site.com");
QRCodeAPI.generateQRCode("texto",300,300, ErrorCorrectionLevel.H, 2);
QRCodeAPI.saveQRCodeToFile(qr,"qrcode.png");
String b64 = QRCodeAPI.generateQRCodeAsBase64("texto",300,300);
QRCodeAPI.readQRCodeFromFile("qrcode.png");
QRCodeAPI.generateQRCodeWithLogo("texto",300,300, logo, 60);
```

### MercadoPagoAPI — sdk-java 2.9.2
```java
MercadoPagoAPI.init("ACCESS_TOKEN"); // ou initFromEnv() MP_ACCESS_TOKEN
PaymentDTO pix = MercadoPagoAPI.createPixPayment(99.90, "a@x.com", "Compra #123", "pedido-123");
PaymentDTO boleto = MercadoPagoAPI.createBoletoPayment(99.90,"a@x.com","João","Silva","12345678901","desc","ref");
Optional<PaymentDTO> p = MercadoPagoAPI.findById(123L);
MercadoPagoAPI.isApproved(123L); MercadoPagoAPI.checkPaymentStatus(123L);
PreferenceDTO pref = MercadoPagoAPI.createPreference("Produto",1,99.90,"a@x.com","ref","https://ok","https://fail","https://pend");
boolean sigOk = MercadoPagoAPI.validateWebhookSignature(xSig, xReqId, dataId, secret);
```

### EmailFormatter
`isValidNormal` (rejeita temporários), `isValidStrict`, `getDomain`, `format("Nome","email")`.

---

## 9. Frontend — shell, Design System e build (uso obrigatório — §9.0 a §9.16)

> **Obrigatoriedade absoluta:** todo frontend criado ou alterado por esta skill **deve** passar por §9.0 → §9.13, e **toda landing page passa também por §9.14, §9.15 e §9.16**. Não existe entrega "só backend" com frontend improvisado, nem "só estilizar depois", nem "protege depois". Sem pipeline de design, sem arte por tema, sem auditoria, sem build separado — sem entrega. As 13 referências abaixo são parte oficial e auditada da AngatuLibraries.

> **A lei que governa o §9 inteiro:**
>
> **SOURCE** = legível e fácil de desenvolver · **BUILD** = minificar, otimizar, ofuscar, renomear e proteger · **DIST** = versão final para produção.
>
> Código fácil de desenvolver; código mais difícil de analisar **somente depois do build**. A proteção nunca contamina o código-fonte (§9.9 a §9.13).

### 9.0 Referências internas — sistema de design Angatu (13 referências)

> **Origem:** `frontend-design`, `framer-motion`, `design-audit`, `css-native`, `canvas-generative`, `brand-landingpage`, `mobile-principles`, `desktop-principles`, `paint` — todas **retraduzidas para português, reescritas e auditadas como `Angatu Sistemas (@author Angatu Sistemas)`**, otimizadas e **juntadas** nesta skill para uso offline/local sem depender de registros externos. A décima, `frontend-build`, é **material próprio da Angatu**: o pipeline source → build → dist que protege o que é publicado sem tornar o desenvolvimento pior. Quando o §9 cita uma técnica, a referência completa está nestes arquivos.

| # | Arquivo | O que entrega | Quando consultar (obrigatório) |
|---|---|---|---|
| 1 | `references/frontend-design.md` | Princípios de identidade visual inconfundível, herói-tese, tipografia como identidade, estrutura como informação, contenção e escrita como design | Sempre — base de todo §9.3 |
| 2 | `references/paint.md` | **Pipeline mestre de 5 fases** (Brainstorm → Teses → Sistema MASTER → Implementação → Auditoria) que orquestra as outras 8 | Sempre — orquestrador de §9.3 a §9.7; nunca entregue sem passar por ele |
| 3 | `references/brand-landingpage.md` | Entrevista de marca em 3 partes + geração de landing com `DESIGN.md` + bundle de entrega (adaptado sem Stitch, 100% vanilla) | Quando for landing/homepage/marketing sem direção visual definida |
| 4 | `references/css-native.md` | Animações e técnicas visuais **zero-dependência**: `animation-timeline`, View Transitions, `@starting-style`, anchor positioning, container queries, clip-path, glass | Sempre — regra de decisão de §9.4 (CSS nativo primeiro) |
| 5 | `references/framer-motion.md` | Equivalentes **vanilla** aos conceitos Motion (AnimatePresence, layoutId, variants/stagger, gestos, motion values) — sem React | Sempre — traduzir ideias de Motion para CSS/JS vanilla |
| 6 | `references/canvas-generative.md` | Arte generativa Canvas 2D: DPR-aware, noise/fBm, partículas com pool sem GC, flow fields, L-systems, double buffer | Sempre — motor de §9.5 (arte automática por tema) |
| 7 | `references/mobile-principles.md` | UX touch-first: alvos 44px, sem-hover, zonas de polegar, safe areas, gestos canônicos, orçamentos de performance | Sempre — metade de §9.6 |
| 8 | `references/desktop-principles.md` | UX desktop: hover obrigatório, precisão, atalhos `⌘/Ctrl`, multi-janela, foco `Tab`, densidade 8px | Sempre — outra metade de §9.6 |
| 9 | `references/design-audit.md` | Checklist final com `grep`s para gaps de movimento, a11y, performance e consistência (Crítico/Importante/Bom ter) | Sempre — §9.7 antes do `git push` |
| 10 | `references/frontend-build.md` | **Pipeline source → build → dist:** níveis (`development`/`production`/`protected`), configuração, minificação, ofuscação, renomeação provável de classes, hash de assets, PWA, source maps, validação que reprova o build, perfil Maven, Dockerfile de 3 etapas e migração de projeto existente | Sempre — motor de §9.9 a §9.13; obrigatório antes de publicar |
| 11 | `references/landing-motion.md` | **Landing rica:** background SVG temático por segmento, hero em motion graphics com Remotion descartável, vídeo mudo tipo GIF, compositions desktop/mobile, marca d'água do cliente, material real com autorização, orçamentos de peso e checklist | Toda landing page, homepage institucional ou página de campanha — motor de §9.14 |
| 12 | `references/landing-copy.md` | **Redação sem cara de IA:** anti-padrões de linguagem, vícios de pontuação, escrita específica por empresa, proibição de inventar dados, títulos e CTAs concretos, arquitetura de página vinda do negócio e revisão anti-IA com varreduras | Toda landing page — motor de §9.15; leia antes de escrever a primeira linha de texto |
| 13 | `references/landing-seo-og.md` | **SEO e capa de compartilhamento:** bloco completo de `<head>`, `<head>` próprio por URL neste stack, capa editorial por página, geração automatizada das artes, tamanhos e compatibilidade, e a validação de 15 pontos | Toda landing page e toda URL pública — motor de §9.16 |

**Como usar:** ao iniciar qualquer frontend, abra `references/paint.md` (pipeline) e siga as fases; durante a Fase 3 consulte `frontend-design.md` + `brand-landingpage.md`; na Fase 4 use `css-native.md`/`framer-motion.md`/`canvas-generative.md` conforme a tese; valide responsividade com `mobile/desktop-principles.md`; feche com `design-audit.md` (design) e `frontend-build.md` (build e publicação). Todos os arquivos estão em português e com auditoria Angatu Sistemas. Código gerado continua em inglês + Javadocs em português + `@author Angatu Sistemas` (§13.4).

**Otimizações Angatu nesta unificação (além da tradução):**

- **Arte automática por tema (§9.5):** 5 receitas prontas (financeiro→flow field, orgânico→partículas, tecnológico→mesh, criativo→L-system, corporativo→ruído) + exportação automática de `og:image` (1200×630), `favicon`/`apple-touch-icon` e `json-ld` a partir da mesma paleta/canvas — não existia nas skills originais isoladas.
- **Tailwind sempre local (§9.1)** e **português impecável (§9.2)** integrados como portões obrigatórios da Fase 5 — originais permitiam CDN e não validavam norma culta.
- **Pipeline único auditado:** `paint` como orquestrador + `frontend-design` como princípios, eliminando sobreposição entre as 9; `mobile`+`desktop` unificados em §9.6; `framer-motion` convertido para equivalentes vanilla sem React.
- **SEO automático por tema:** `og:image`/`twitter:image` do canvas + `json-ld` + `meta description` revisada — geração em uma passada, sem hotlink Unsplash/Pexels. Em landing page isso sobe de nível no §9.16: capa editorial por URL, com logo, título da página e imagem real.
- **Separação source/build/dist (§9.9–§9.13):** as skills originais não tratavam publicação; aqui o source é blindado contra ofuscação e todo hardening vive no build, com validação que reprova referência quebrada antes de subir.

```
src/main/resources/public/   # SOURCE — legível, semântico, nunca ofuscado (§9.9)
  index.html               # shell {content} {page} {%nome_active}
  styles/
    tailwind.css           # Tailwind LOCAL gerado (nunca CDN) — §9.1
    ds.css                 # tokens :root — única fonte visual (complementa o Tailwind)
  scripts/ui.js net.js auth.js app-state.js messages.js
  <pagina>.html            # fragmento sem <head> → /<nome>
  assets/og-{tema}.png     # arte generativa exportada — §9.5
  emails/*.html            # nunca transformados pelo build
tools/frontend-build.mjs   # BUILD — único lugar autorizado a minificar/ofuscar (§9.10)
frontend.build.json        # níveis development / production / protected
dist/public/               # DIST — o que é empacotado e publicado (§9.10)
target/classes/public/     # espelho sem recompilar (copie tailwind.css também)
tailwind.input.css         # fonte do Tailwind (na raiz ou src/main/resources/)
tailwind.config.js         # content: public/**/*.html
docs/design/MASTER.md      # sistema canônico da Fase 3 (paint)
```

Shell: `<head>` único, `#nav-menu`, `<main id="app">{content}</main>`, scripts globais. `ds.css`: `.card/.card-pad`, `.btn-primary/secondary/ghost/danger/icon`, `.input/.ds-label`, `.badge`, `.ds-table`, `.modal-overlay/.modal-card`, `.skeleton`, `.nav-grid/.nav-tile`. Helpers: `UI.icon/skeleton/empty/btnLoading/scan`, `net.js` barra em `/api/`, `auth.js` navbar, `showToast`, `AppBus`.

### 9.1 Tailwind CSS sempre local — nunca CDN (obrigatório)

**Proibido usar CDN** (`https://cdn.tailwindcss.com`, `https://unpkg.com/tailwindcss`, `tailwind CDN` via `<script>`). Motivos: peso desnecessário, dependência externa, bloqueio por CSP/offline, flash de estilo e impossibilidade de purge/minify. Todo projeto novo ou existente deve migrar para Tailwind local.

**Como configurar (standalone CLI, sem Node obrigatório):**

1. Crie `tailwind.config.js` na raiz:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/main/resources/public/**/*.{html,js}"],
  theme: { extend: {} },
  plugins: []
}
```

2. Crie `tailwind.input.css` (raiz ou `src/main/resources/`):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

3. Baixe o binário standalone (escolha conforme SO) — **não use CDN em runtime**:

```bash
# Windows (PowerShell)
Invoke-WebRequest -Uri https://github.com/tailwindlabs/tailwindcss/releases/latest/download/tailwindcss-windows-x64.exe -OutFile tools/tailwindcss.exe

# Linux / macOS
curl -sLO https://github.com/tailwindlabs/tailwindcss/releases/latest/download/tailwindcss-linux-x64
chmod +x tailwindcss-linux-x64
mv tailwindcss-linux-x64 tools/tailwindcss
```

4. Gere o CSS local minificado:

```bash
# Windows
tools/tailwindcss.exe -i tailwind.input.css -o src/main/resources/public/styles/tailwind.css --minify

# Linux/macOS
./tools/tailwindcss -i tailwind.input.css -o src/main/resources/public/styles/tailwind.css --minify
```

5. No `src/main/resources/public/index.html` (shell), referencie **apenas o arquivo local** (antes do `ds.css` para que tokens do Design System prevaleçam):

```html
<link rel="stylesheet" href="/styles/tailwind.css">
<link rel="stylesheet" href="/styles/ds.css">
```

6. Integre ao build: adicione ao `compilar.bat` / `build.sh` a geração do Tailwind antes do `mvn package`, e copie para `target/classes/public/styles/tailwind.css` junto com os demais estáticos. Em watch durante desenvolvimento, use `--watch`:

```bash
tools/tailwindcss.exe -i tailwind.input.css -o src/main/resources/public/styles/tailwind.css --watch
```

Alternativa com Node (se o projeto já usa `package.json`): `npm i -D tailwindcss && npx tailwindcss -i tailwind.input.css -o src/main/resources/public/styles/tailwind.css --minify` — o resultado continua sendo um arquivo local versionado, nunca CDN.

Valide que nenhum HTML/JS contém `cdn.tailwindcss` antes de commitar (`grep -r "cdn.tailwindcss"` deve retornar vazio).

> **Versione o `tailwind.css` gerado.** O Coolify constrói a imagem a partir do repositório, não da sua
> máquina: CSS gerado localmente e deixado no `.gitignore` produz site sem estilo em produção (§17.3).
> O binário `tools/tailwindcss*` pode ficar de fora; o CSS gerado, não.

### 9.2 Português impecável no frontend (obrigatório)

Todo texto visível ao usuário (títulos, parágrafos, labels, placeholders, botões, toasts, mensagens de erro/sucesso, e-mails) deve passar por **revisão obrigatória de semântica e norma culta** antes de commitar. Não entregue texto com erro de acentuação, vírgula ou concordância.

**Checklist de revisão (aplique em cada string):**

- **Acentuação e ortografia:** `Endereço` (não `Endereco`), `Código` (não `Codigo`), `usuário`, `após`, `já`, `não`, `até`, `próximo`. Atenção a `crase` (`às 14h`, `à vista`), `hífen` (`bem-vindo`, `pré-requisito`) e `maiúsculas` (início de frase e nomes próprios).
- **Vírgulas e pontuação:** use vírgula em aposto, vocativo e orações intercaladas; não separe sujeito e verbo. Ex: `Erro: informe um e-mail válido.` (correto) vs `Erro informe um email valido` (errado). Nunca deixe `...` sem espaço anterior quando for reticências intencionais.
- **Concordância e regência:** `Os dados foram salvos` (não `foi salvo`), `Bem-vindo, João!` / `Bem-vinda, Maria!`, `Selecione o endereço` (não `Selecione a endereço`), `Faltam 3 itens` (não `Falta 3 itens`).
- **Clareza e semântica:** prefira frases curtas, voz ativa e tom profissional. Evite jargão técnico para o usuário final. Ex: `Não foi possível salvar. Verifique os campos destacados.` em vez de `Erro 422: entidade não processável`.
- **Consistência:** mantenha o mesmo vocabulário no sistema inteiro (`Salvar` vs `Gravar` — escolha um; `Excluir` vs `Remover` — escolha um; `E-mail` sempre com hífen).
- **Exemplos corrigidos:**
  - ❌ `Cadastro realizado com sucesso!` → ✅ `Cadastro realizado com sucesso!` (ok, mas prefira `Cadastro realizado com sucesso.` sem exclamação excessiva, a menos que seja celebração)
  - ❌ `Digite seu CPF sem pontos` → ✅ `Digite seu CPF apenas com números.`
  - ❌ `Nenhum pedido encontrado` → ✅ `Nenhum pedido encontrado. Que tal criar o primeiro?`
  - ❌ `Erro ao processar pagamento, tente novamente mais tarde` → ✅ `Não foi possível processar o pagamento. Tente novamente em alguns instantes.`

Antes de cada commit que toque frontend, releia **todas** as strings alteradas em voz alta e corrija acentuação/vírgulas. Se houver dúvida, consulte o Volp e a norma culta — nunca "deixe passar".

### 9.3 Sistema de design obrigatório — todo frontend passa por aqui

> **Obrigatoriedade:** todo frontend (página, dashboard, landing, app) deve passar por §9.3 → §9.8. Não existe "só estilizar depois". Sem sistema, sem entrega.

**Pipeline Angatu (inspirado em `paint` + `frontend-design`, auditado):**

1. **Brainstorm (nunca pular)** — defina em 1 frase cada: produto (o que é), público (quem usa), humor (3–5 adjetivos visuais), referências (sites/moodboard) e stack (vanilla + Tailwind local). Se a resposta for vaga ("moderno", "clean"), concretize: "clean como Stripe, Linear ou Apple?". Não interprete "tanto faz" como confirmação.
2. **Teses (2 frases, validadas)** — Visual: cor (claro/escuro, família, acento) + tipografia (serif/sans, pesos) + espaçamento (denso/arejado) + estilo de componentes (arredondado/agudo, borda/preenchimento). Interação: duração (100–200 rápido / 200–400 médio) + hover + scroll + padrões proibidos. Apresente e valide antes de codar.
3. **Sistema (MASTER local)** — gere `docs/design/MASTER.md` + tokens: paleta (4–6 hex nomeados), tipografia (display + body + utility), escala de espaçamento (4/8/12/16/24/32/48/64), raios, sombras, componentes base (button/input/card/badge/link com 5 estados) e motion tokens (durações/easings/stagger). Todo `hex`/`duration` vem do MASTER — nada hardcoded fora dele.
4. **Implementação** — página a página, validando cada uma. Ver §9.4–9.6.
5. **Auditoria** — §9.7 sempre roda, mesmo se o usuário disser que gostou.

**Princípios de design (aplicação obrigatória):**

- **Herói é tese:** abra com o elemento mais característico do universo do produto (headline, imagem, animação ou demo), não com template genérico (número grande + label + gradiente).
- **Tipografia é identidade:** combine display + body deliberadamente, com escala intencional. Tipografia memorável, não neutra.
- **Estrutura é informação:** numeração (`01/02/03`), eyebrows e divisórias só se codificarem informação real (sequência/timeline). Questione antes de usar.
- **Movimento com intenção:** um momento orquestrado vale mais que efeitos espalhados. Menos pode ser mais — excesso denuncia IA.
- **Complexidade sob medida:** maximalista exige execução elaborada; minimal exige precisão de espaçamento/tipografia. Elegância é executar a visão escolhida com excelência.
- **Escrita é design:** nomeie pelo que o usuário controla ("Gerenciar notificações", não "config de webhook"), voz ativa ("Salvar alterações"), mesmo nome do início ao fim (`Publicar` → `Publicado`), falhas direcionam ("Informe um e-mail válido" em vez de "Erro").
- **Contenção:** ousadia concentrada em um elemento assinatura; o resto disciplinado. Responsivo até 375px, foco de teclado visível, `prefers-reduced-motion` respeitado. Antes de entregar, remova um acessório (Chanel).

### 9.4 Animações — CSS nativo primeiro, bibliotecas só quando necessário

> **Regra de decisão (auditado Angatu Sistemas):**

| Situação | Decisão |
|---|---|
| < 3 animações na página | CSS nativo |
| Reveal/parallax por scroll | CSS nativo (`animation-timeline`) |
| Entrada/saída de `display:none` | CSS nativo (`@starting-style` + `allow-discrete`) |
| Tooltip/popover | CSS nativo (anchor positioning) |
| Transição de página (MPA/SPA) | CSS nativo (View Transitions API) |
| Timeline multi-etapas (5+ tweens) | GSAP |
| Stagger em lista dinâmica | GSAP ou lógica vanilla com `delay: index*50ms` |
| Spring físico com interrupção | Motion (Framer) apenas em projeto que **já é** React; nunca adote React por causa disso (§9.12). Em vanilla, aproxime com `linear()` easing ou uma mola em `requestAnimationFrame` |

**Scroll-driven (CSS puro, sem JS):**

```css
.progress-bar { animation: grow-width linear both; animation-timeline: scroll(root block); }
@keyframes grow-width { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.reveal { animation: fade-in linear both; animation-timeline: view(); animation-range: entry 0% entry 100%; }
@keyframes fade-in { from { opacity:0; transform: translateY(2rem);} to { opacity:1; transform: translateY(0);} }
```

**View Transitions (SPA/MPA):**

```css
@view-transition { navigation: auto; }
.hero-image { view-transition-name: hero; }
::view-transition-group(hero) { animation-duration: 400ms; animation-timing-function: cubic-bezier(0.4,0,0.2,1); }
```
```js
document.startViewTransition(() => updateContent());
```

**@starting-style (entrada de `display:none` sem gambiarra de `setTimeout`):**

```css
.dialog { opacity:1; transform: translateY(0); transition: opacity 300ms ease, transform 300ms ease, display 300ms allow-discrete;
  @starting-style { opacity:0; transform: translateY(-1rem); } }
.dialog[hidden] { opacity:0; transform: translateY(-1rem); display:none; }
```

**Anchor positioning (tooltip/popover nativo):**

```css
.trigger { anchor-name: --t; }
.tooltip { position: fixed; position-anchor: --t; position-area: top center; position-try-fallbacks: --bottom; }
@position-try --bottom { position-area: bottom center; }
```

**Container queries (animação por tamanho do componente, não viewport):**

```css
.card-container { container-type: inline-size; }
@container (min-width: 400px) { .card-content { animation: slide-in-right 400ms var(--ease-out-expo); } }
```

**Técnicas visuais avançadas (quando o tema pedir):** `clip-path` (reveal), `backdrop-filter: blur(12px) saturate(1.8)` (glass), `mix-blend-mode: difference`, mesh gradients (3× `radial-gradient` em `oklch`), `conic-gradient` (spinners). Sempre anime só `transform`/`opacity`/`clip-path`/`filter` — nunca `width`/`height`/`top`/`left`.

**Equivalentes vanilla aos conceitos Framer Motion (sem React):**

- `AnimatePresence` → `@starting-style` + `allow-discrete` + `popover`/`dialog` nativo
- `layoutId` (shared layout) → `view-transition-name` com mesmo nome nas duas páginas/estados
- `variants` + `staggerChildren` → CSS `animation-delay: calc(var(--i)*80ms)` ou JS `element.style.animationDelay = i*80+'ms'`
- `whileHover`/`whileTap` → `:hover`/`:active` com `transition: transform 120ms ease-out`
- `useScroll`/`useTransform` → `animation-timeline: scroll()` / `view()`
- `useMotionValue` sem re-render → atualize `element.style.transform` direto no `requestAnimationFrame` (sem `setState`)

**Proibições:** `transition: all`, animar propriedades de layout, `will-change` permanente em >5 elementos, `setTimeout` para loop de animação (use `requestAnimationFrame`), durações/easings espalhados (centralize em 3–5 tokens).

### 9.5 Arte generativa e criação automática por tema — backgrounds, texturas e SEO

> **Geração automática obrigatória:** todo frontend deve ter pelo menos um elemento de arte generativa coerente com o tema (background, textura ou ilustração). Não entregue fundo liso não intencional.
>
> **Em landing page, quem cumpre este requisito é o SVG temático do §9.14** — escolha **um** dos dois, SVG temático ou canvas generativo. Os dois no mesmo fundo competem entre si e pesam o dobro.

**Quando gerar arte (obrigatório):** hero com foto/ilustração, avatares, texturas, backgrounds, `og:image`/`twitter:image` para SEO. Prefira imagem raster gerada (PNG/JPG) a SVG complexo; SVG só para ícones/esquemas. Nunca hotlink Unsplash/Pexels — gere localmente e salve em `public/assets/`.

**Canvas 2D — setup obrigatório (DPR-aware, sem blur em Retina):**

```js
function setupCanvas(canvas, width, height) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr; canvas.height = height * dpr;
  canvas.style.width = width+'px'; canvas.style.height = height+'px';
  const ctx = canvas.getContext('2d'); ctx.scale(dpr,dpr); return ctx;
}
let rafId, prevTime=0;
function loop(time){ const dt=Math.min((time-prevTime)/1000,0.1); prevTime=time; update(dt); render(ctx); rafId=requestAnimationFrame(loop); }
```

**Receitas por tema (escolha 1 e execute com intenção):**

| Tema do produto | Background generativo recomendado | Técnica |
|---|---|---|
| Financeiro / dados | Grid + flow field sutil em `oklch` frio | Simplex noise → `Float32Array` de ângulos → partículas com damping 0.98 |
| Orgânico / natureza | Partículas com trilha + Perlin fBm 4 oitavas | `fillStyle='rgba(0,0,0,0.02)'; fillRect` (não `clearRect`) + pool sem `new` no loop |
| Tecnológico / SaaS | Mesh gradient animado + `backdrop-filter` | 3× `radial-gradient` em `oklch` + `animation-timeline: scroll()` |
| Criativo / arte | Fractal L-system ou atrator | Axioma `"F"`, regras `"F->F[+F]F[-F]F"` + turtle graphics |
| Corporativo / confiança | Ruído sutil + grain overlay | `double buffer` (offscreen canvas) + `drawImage` |

**PPR (pool sem GC):** pré-aloque `Array(POOL_SIZE)`, reuse `fx/fy` escalares, nunca `getImageData` no loop (cache `colorMap` uma vez). Cap `dt` em 0.1 para evitar espiral.

**SEO automático por tema (gerar junto):**

- `og:image` (1200×630) + `twitter:image` a partir do mesmo tema/canvas (exporte com `canvas.toDataURL('image/png')` e salve em `public/assets/og-{tema}.png`). **Isto é o piso, válido para telas de aplicação: em landing page e em qualquer URL pública, a capa é por página e segue o §9.16** (uma arte por URL, com logo, título e imagem real, em `public/assets/og/<slug>.jpg`).
- `favicon`/`apple-touch-icon` derivados da paleta do MASTER.
- `json-ld` (`Organization`/`Product`/`Article` conforme página) + `meta description` com copy revisada (§9.2).
- `alt` descritivo em toda imagem gerada; `aria-hidden="true"` apenas em decoração pura (partículas de fundo).

### 9.6 Responsividade — mobile e desktop (regras inegociáveis) — **SEMPRE EM TAILWIND CSS**

> **Regra global Angatu (obrigatório, inegociável):** **toda responsividade deste projeto é feita em Tailwind CSS.** Qualquer ajuste de breakpoint, grid/colunas, visibilidade, espaçamento, tipografia, ordem, largura/altura responsiva ou layout mobile↔desktop **obrigatoriamente** via utilitários responsivos do Tailwind (`sm:`, `md:`, `lg:`, `xl:`, `2xl:` e `screens` em `tailwind.config.js`). **Priorize sempre Tailwind** — é proibido criar `@media (min-width: ...)` manual em CSS como primeira opção. Use `@media` apenas em `ds.css` para queries que o Tailwind não cobre (`prefers-reduced-motion`, `prefers-color-scheme`, `hover: hover and pointer: fine`, `print`). Todo HTML em `public/` deve nascer responsivo via classes Tailwind por padrão — nunca entregue layout fixo de um breakpoint só.

**Como aplicar — padrões obrigatórios Angatu (use exatamente assim):**

```html
<!-- Grid responsivo: 1 col mobile → 2 tablet → 3 desktop -->
<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">...</div>
<!-- Tipografia fluida -->
<h1 class="text-2xl md:text-3xl lg:text-4xl">Título</h1>
<!-- Visibilidade/orientação -->
<aside class="hidden lg:block">Sidebar só em desktop (mobile: drawer/hidden)</aside>
<nav class="flex flex-col gap-2 md:flex-row md:gap-6">...</nav>
<!-- Espaçamento e padding responsivo -->
<section class="px-4 py-6 md:px-8 md:py-10 lg:px-12">...</section>
<!-- Shell: sidebar persistente desktop vs drawer mobile -->
<div class="flex flex-col lg:flex-row">
  <aside class="hidden lg:block lg:w-64">Sidebar</aside>
  <main class="flex-1">Conteúdo</main>
</div>
<!-- Ordem e largura responsiva -->
<div class="flex flex-col gap-4 lg:flex-row lg:gap-8">
  <div class="order-2 lg:order-1 lg:w-2/3">Conteúdo principal</div>
  <div class="order-1 lg:order-2 lg:w-1/3">Lateral/CTA</div>
</div>
```

Configure `tailwind.config.js` com `screens` do projeto (padrão `sm:640px md:768px lg:1024px xl:1280px 2xl:1536px` — ajuste se a marca exigir) e valide `grep -rn "@media.*min-width" --include="*.css" src/main/resources/public` — todo `@media (min-width` fora de `ds.css` é violação; mova para classes `md:/lg:`.

**Mobile (touch-first) — implemente tudo abaixo via Tailwind onde couber:**

- Alvos mínimos: iOS 44pt, Android 48dp, web mobile 44px + 8px de espaçamento. Em Tailwind: `min-h-11 min-w-11` (44px) + `gap-2` entre alvos; hit area pode exceder o glifo (`p-2`/`px-3`). Dois botões de 44pt colados ainda são erro — use `gap-2 md:gap-3`.
- **Sem hover como única revelação.** Tudo visível por padrão; hover é melhoria de desktop, nunca interação estrutural. Em Tailwind/CSS: `@media (hover: hover) and (pointer: fine) { .card:hover { ... } }` — nunca `group-hover` sem fallback visível em mobile.
- **Zonas de polegar (Hoober):** terço inferior = CTA primário/FAB/tab bar; meio = conteúdo/secundárias; topo = voltar/fechar/busca. Em Tailwind: `fixed bottom-0 inset-x-0 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] md:static` para CTA. Nunca `Pagar` no canto superior direito do celular.
- **Safe areas:** `viewport-fit=cover` + `env(safe-area-inset-*)` (web) — combine com Tailwind via `pb-[env(safe-area-inset-bottom)]` ou classe arbitrária; `.safeAreaInset` (SwiftUI) ou `WindowInsets.safeDrawing` (Compose) quando aplicável.
- **Gestos canônicos:** swipe-back (borda esquerda), pull-to-refresh, drag-to-dismiss (100–150pt), pinch-to-zoom, swipe em linha para ações. Não reinvente.
- **Performance mobile:** cold start <2s (Pixel 4a / iPhone SE2), frame 16.67ms@60fps / 8.33ms@120fps, <30MB APK / <50MB IPA, sem CPU contínua em background, respeitar `Save-Data`/`allowsCellularAccess`.

**Desktop (precisão + teclado) — também via Tailwind para layout responsivo:**

- Hover é sinal primário — toda superfície clicável com `:hover` distinto + `transition` 100–200ms; `:active` com leve `translateY`. Em Tailwind: `transition-colors duration-150 hover:bg-surface-hover active:translate-y-0`.
- Alvos podem ser 24–32px (mínimo absoluto WCAG 24×24 para ponteiro). Em Tailwind: `h-6 w-6 md:h-8 md:w-8`. Aplique Fitts: cantos/bordas são alvos infinitos (close, menu, dock) — `fixed top-0 right-0`.
- **Atalhos obrigatórios:** `⌘/Ctrl+N` novo, `⌘/Ctrl+W` fechar, `⌘/Ctrl+S` salvar, `⌘/Ctrl+F` buscar, `⌘/Ctrl+K` paleta de comandos, `⌘+,` preferências. Detecte `metaKey` vs `ctrlKey` corretamente; mostre atalho no tooltip/menu.
- **Multi-janela:** use janela nova para tarefas longas/comparação/documentos pares; não para confirmações breves (use sheet/popover). Compartilhe estado singleton, não duplique.
- **Foco:** `tab` com ordem sã, `:focus-visible` sempre visível (nunca `outline:none` sem substituto) — em Tailwind: `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500`.
- **Densidade:** grid base 8px, sidebars persistentes (`hidden lg:block`, não hamburger em 1440px), paleta `⌘K` para power users, tabelas densas (`overflow-x-auto` + `min-w-[640px] md:min-w-0`) quando necessário. Animações sutis (<200ms, sem bounce) — desktop é observado por horas.

**Acessibilidade comum (mobile + desktop):** `prefers-reduced-motion: reduce` desativa/reduz toda animação; contraste 4.5:1 mínimo; `outline`/`:focus-visible` em todo interativo; sem `div onClick` sem `role="button"` + `tabIndex` + `onKeyDown`; animações decorativas com `aria-hidden="true"`. Layout responsivo destes itens também via Tailwind (`text-sm md:text-base`, `gap-3 md:gap-6`, etc.).

### 9.7 Auditoria de design — checkpoint obrigatório antes de entregar

> **Toda entrega passa por esta auditoria.** Classifique em Crítico (bloqueia ship), Importante (sprint atual) e Bom ter (backlog).

**Gaps de movimento (rodar greps):**

```bash
grep -rn '{.*&&\s*<\|{.*?\s*:\s*<' --include='*.html' --include='*.js' src/main/resources/public | grep -v 'starting-style\|view-transition\|allow-discrete' # condicionais sem animação de saída
grep -rn ':hover' --include='*.css' src/main/resources/public | grep -vE 'transition|animation' # hover sem transition
grep -rn '\.map(' --include='*.js' src/main/resources/public | grep -vE 'stagger|delay.*index|animationDelay' # listas sem stagger
grep -rn 'initial=' --include='*.js' src/main/resources/public | grep -v 'exit=' # entrada sem saída
```

**Acessibilidade:**

```bash
grep -rn 'prefers-reduced-motion' --include='*.css' --include='*.js' src/main/resources/public # deve ter ≥1
grep -rn 'outline:\s*none' --include='*.css' src/main/resources/public # deve ter :focus-visible junto
grep -rn 'onClick' --include='*.html' --include='*.js' src/main/resources/public | grep -E '<div|<span' | grep -v 'role=' # div clicável sem role
grep -rn '<canvas' --include='*.html' src/main/resources/public | grep -v 'aria-hidden' # canvas decorativo sem aria-hidden
```

**Performance:**

```bash
grep -rn 'transition.*\(width\|height\|top\|left\|right\|bottom\|margin\|padding\)' --include='*.css' src/main/resources/public # layout thrashing
grep -rn 'will-change' --include='*.css' src/main/resources/public # >5 é suspeito
grep -rn 'setTimeout\|setInterval' --include='*.js' src/main/resources/public | grep -iE 'anim|scroll|transform' # deve ser rAF
npx source-map-explorer dist/**/*.js 2>/dev/null | head -n 20 # bundle: CSS puro=0KB, Motion~30KB, GSAP~25KB
```

**Consistência:**

```bash
grep -rnoE 'duration[:"'\''= ]+[0-9.]+' --include='*.css' --include='*.js' src/main/resources/public | sort | uniq -c | sort -rn # >5 durações distintas = tokenizar
grep -rnoE 'ease[A-Za-z]*|cubic-bezier|spring' --include='*.css' --include='*.js' src/main/resources/public | sort | uniq -c # >5 easings = tokenizar
grep -A5 'exit=' --include='*.js' -rn src/main/resources/public # entrada >= saída, ease-out na entrada / ease-in na saída
```

**Checklist final (marcar antes do push):**

- [ ] `prefers-reduced-motion` implementado e testado
- [ ] Foco visível em todo interativo (`:focus-visible`)
- [ ] Sem `div onClick` sem `role`/`tabIndex`/`onKeyDown`
- [ ] Nenhuma animação de `width`/`height`/`top`/`left` (só `transform`/`opacity`/`clip-path`/`filter`)
- [ ] `grep -r "cdn.tailwindcss"` vazio (§9.1)
- [ ] `grep -rn "caches.put\|caches.match"` vazio, salvo cache pedido pelo cliente (§15)
- [ ] `grep -rn "<script>" public/*.html` vazio — script de página em arquivo externo, para a política de segurança não bloquear
- [ ] Rodapé com o logotipo da Angatu presente em todas as páginas (§9.8)
- [ ] **Toda responsividade via Tailwind `sm:/md:/lg:/xl:/2xl:` — nenhum `@media (min-width` manual fora de `ds.css` (§9.6)**
- [ ] `og:image` gerada + `json-ld` + `meta description` revisada (§9.2 + §9.5; landing e URL pública seguem a capa por página do §9.16)
- [ ] Durações/easings centralizados (≤5 cada) + `view-transition-name`/`@starting-style` onde há entrada/saída

### 9.8 Rodapé — marca da Angatu Sistemas sempre presente (obrigatório)

> **Regra:** **toda** página com rodapé, e **todo** e-mail com rodapé, exibe o crédito de
> desenvolvimento com o logotipo da Angatu Sistemas. Sem exceção: login, painéis, telas públicas,
> páginas legais, e-mails transacionais e relatórios.

**Marcador padrão:**

```html
<footer class="ds-footer">
  <a class="ds-credito" href="https://angatusistemas.com.br" target="_blank" rel="noopener">
    <span class="ds-credito-texto">Desenvolvido por</span>
    <img class="ds-credito-marca" src="/images/angatu-sistemas-escuro.png"
         alt="Angatu Sistemas" width="76" height="26">
  </a>
  <p class="ds-footer-links">
    <a href="/privacidade">Política de Privacidade</a> ·
    <a href="/termos">Termos de Uso</a>
  </p>
</footer>
```

```css
.ds-footer { border-top: 1px solid var(--line); padding: 20px 16px;
             text-align: center; font-size: 13px; color: var(--ink-600); }
.ds-credito { display: inline-flex; align-items: center; gap: 10px;
              text-decoration: none; color: var(--ink-600);
              transition: opacity var(--dur-2) var(--ease-out); }
.ds-credito-marca { height: 26px; width: auto; display: block; }
@media (hover: hover) and (pointer: fine) { .ds-credito:hover { opacity: .75; } }
```

**O logotipo é um arquivo oficial — nunca redesenhe.** O escudo da Angatu tem traços de circuito
próprios da identidade; qualquer versão recriada à mão está errada, por mais parecida que pareça.
Baixe o arquivo de um produto existente da Angatu, por exemplo:

```bash
curl -sL -o src/main/resources/public/images/angatu-sistemas.png \
  https://fastcurriculo.angatusistemas.com.br/images/angatu-sistemas.png
```

Ele é **branco sobre fundo transparente**, feito para fundo escuro. Para o fundo claro padrão dos
sistemas, gere uma variante tingida preservando o canal alfa byte a byte — só a cor muda, as formas
continuam idênticas às do original:

```java
int alfa = (origem.getRGB(x, y) >>> 24) & 0xFF;
destino.setRGB(x, y, (alfa << 24) | (r << 16) | (g << 8) | b);  // azul da marca: #101073
```

Versione os dois arquivos: `angatu-sistemas.png` (branco, fundo escuro) e
`angatu-sistemas-escuro.png` (azul, fundo claro).

**Montagem.** Monte o rodapé no corpo do documento, e não dentro do contêiner centralizado da
página — do contrário ele fica recortado na largura da coluna. Isso também evita `100vw`, que
abriria rolagem horizontal por causa da barra de rolagem:

```js
var host = document.createElement('div');
host.id = 'rodape-global';
host.innerHTML = Auth.rodape();
document.body.appendChild(host);
```

**Não invente fundo colorido.** O rodapé segue o fundo das demais telas. Uma faixa escura só entra
se o cliente pedir — e o modo único claro do sistema de design continua valendo (§16.8 da
especificação de produto).

**Nos e-mails**, aponte para o arquivo servido pelo domínio de produção, com URL absoluta: cliente
de e-mail não renderiza SVG nem resolve caminho relativo.

```html
<a href="https://angatusistemas.com.br" target="_blank" rel="noopener"
   style="display:inline-block;text-decoration:none;color:#5A5A66;">
  <span style="font-size:13px;vertical-align:middle;">Desenvolvido por</span>
  <img src="https://SEU-DOMINIO/images/angatu-sistemas-escuro.png"
       alt="Angatu Sistemas" width="76" height="26"
       style="vertical-align:middle;margin-left:8px;border:0;">
</a>
```

### 9.9 A lei: source legível, build protege, dist publica (obrigatório)

> **Código fácil de desenvolver; código mais difícil de analisar somente depois do build.**
> A proteção nunca contamina o código-fonte.

```
SOURCE  →  BUILD  →  DIST
legível    protege   publica
```

**Regra absoluta — o source é sempre legível.** Durante o desenvolvimento o código permanece completamente legível. É **proibido escrever no source**: JavaScript ofuscado, nomes aleatórios de variáveis, classes aleatórias, IDs aleatórios, código propositalmente ilegível, strings codificadas só para dificultar leitura e estruturas artificiais criadas exclusivamente para atrapalhar engenharia reversa.

```js
// SOURCE — é assim que se escreve, sempre
function calculateOrderTotal(items) {
    const subtotal = calculateSubtotal(items);
    const shipping = calculateShipping(items);
    return subtotal + shipping;
}

// PROIBIDO no source (isto é saída de build, e só o build pode produzir)
function _0x81ab(a,b){return _0x19c(a)+_0x71f(b)}
```

O source tem de continuar fácil de **entender, depurar, modificar, testar, revisar e manter**. Nomes semânticos em tudo: classes (`product-card`, `checkout-button`, `user-menu`, `modal-container`, `navigation-header`), IDs internos e funções (`loadProducts()`, `calculateTotal()`, `openModal()`, `submitOrder()`, `updateUserProfile()`).

**O build nunca altera o source.** O processo lê `src/main/resources/public/` e grava em `dist/public/`. Nunca `src/ → ofuscação → src modificado`. O diretório de source jamais é sobrescrito pelo processo de proteção — é isso que permite recompilar o projeto a qualquer momento e obter o mesmo resultado.

> **Única exceção, e ela é declarada:** `styles/tailwind.css` é **gerado** pelo Tailwind CLI dentro do source e versionado, porque o Coolify constrói a partir do repositório (§9.1 e §17.3). Ninguém o escreve nem o depura à mão, então ele não é "código-fonte" no sentido desta lei. Mesmo assim, ele nunca é ofuscado nem tem classes renomeadas: ao contrário, é dele que sai a lista de classes intocáveis do §9.10.

**Desenvolvimento normal continua normal.** No dia a dia o programador faz `editar → salvar → recarregar → depurar` sem lidar com classe aleatória, código ofuscado, nome ilegível, asset com hash difícil de rastrear ou pilha de erro inutilizável. Em `development`: código legível, depuração fácil, source maps ligados, sem ofuscação, sem renomeação, sem minificação agressiva. As transformações pertencem à produção.

**Ordem de prioridade — em qualquer conflito, o número menor vence:**

1. Funcionamento correto
2. Segurança real
3. Acessibilidade
4. SEO
5. Compatibilidade
6. Performance
7. Manutenibilidade
8. Ofuscação/hardening

Nunca sacrifique uma regra de prioridade superior para aumentar a dificuldade de análise do frontend. Uma transformação que quebra funcionalidade, leitor de tela, indexação ou desempenho **não entra**, por mais difícil de analisar que deixe o código.

**Princípio de segurança (vale para o projeto inteiro):**

> «Ofuscação não é criptografia.»
> «Código enviado ao navegador deve ser considerado acessível ao cliente.»
> «Classes e IDs dinâmicos não constituem autenticação nem segurança.»
> «A proteção real de dados, autorização e regras críticas deve estar no backend.» (§16)

### 9.10 Build de produção — níveis, pipeline e validação

> Referência completa, com scripts prontos: [`references/frontend-build.md`](references/frontend-build.md).

**Três níveis, configuráveis:**

| Nível | Uso | Minifica | Ofusca | Renomeia classes | Hash | Source maps |
|---|---|---|---|---|---|---|
| `development` | dia a dia, depuração | não | não | não | não | sim |
| `production` | publicação normal | sim | não | não | opcional | não |
| `protected` | publicação com hardening pedido | sim | sim | só o que for provado seguro | opcional | nunca |

Chaves de configuração (adapte ao padrão que o projeto já tiver, não invente outro): `minify`, `obfuscate`, `renameClasses`, `renameIds`, `hashAssets`, `removeDeadCode`, `transformStrings`, `controlFlowProtection`.

**Pipeline canônico (a ordem importa):**

```
HTML · CSS · JavaScript · Assets
  → Análise → Validação de entrada → Cópia integral para o dist
  → Renomeação segura → Minificação → Otimização → Ofuscação JavaScript
  → Hash dos assets → Atualização das referências → Validação pós-build → dist/
```

**Renomear antes de minificar** (arquivo legível dá substituição provável) e **hashear depois de minificar** (o hash tem de ser do conteúdo final). Trocar essa ordem dessincroniza HTML, CSS e JS.

**JavaScript.** Minificação, remoção de código morto quando seguro, redução de nomes, transformação de strings, ofuscação e transformação de controle de fluxo quando apropriado — tudo com agressividade regulável. Nos scripts clássicos do shell Angatu (`UI`, `net`, `Auth`, `AppBus`, `showToast` são globais compartilhadas) use `minifyIdentifiers: false` e `renameGlobals: false`, senão a tela morre em produção com a API respondendo 100%. Nunca ofusque `sw.js` nem `vendor/**`. **Proibido** `debugProtection` e `disableConsoleOutput`: travar ferramenta de desenvolvimento pune quem não é o alvo. A proteção jamais pode quebrar funcionalidade existente só para dificultar a análise.

**HTML.** Minificar, remover comentário desnecessário, reduzir espaço, otimizar atributo quando seguro, processar script inline (que não deveria existir — §9.7), atualizar referência de asset. **Preservar sempre:** semântica, SEO (`title`, `description`, `robots`, `canonical`, Open Graph, Twitter Card, Schema.org, `hreflang`, `lang`), acessibilidade (`alt`, `aria-*`, `role`, `label for`, par `for`/`id`, `tabindex`), navegação e formulários. Os placeholders do `HtmlRouteAPI` (`{content}`, `{page}`, `{%nome_active}`) atravessam o build intactos.

**CSS.** Minificar, otimizar e remover código morto **só quando seguro** — o Tailwind já faz a própria remoção via `content`, e regra de `ds.css` aplicada por `classList.add()` ou pelo servidor não aparece em HTML nenhum: apagar por "não uso aparente" quebra a tela.

**Renomeação de classes — controlada, no build, com prova.** O objetivo é dificultar automação trivial que dependa de seletor previsível, e só isso. A transformação acontece **no build/deploy, nunca a cada recarregamento do navegador** — randomizar classe em tempo de execução para atrapalhar bot é proibido: quebra acessibilidade, teste e depuração, e não engana quem executa JavaScript. Um build novo pode gerar identificadores novos; o source continua igual:

```
source :  product-card              checkout-button
build 1:  product-card → a81Kx      checkout-button → Q72Lm
build 2:  product-card → z91Pw      checkout-button → m42Rt
```

**Sincronia é obrigação, não detalhe.** Se `product-card` virou `a81Kx`, HTML, CSS e JS mudam juntos. Sair com HTML `a81Kx`, CSS `a81Kx` e JS `product-card` é **erro de build** — a validação procura o nome antigo no dist e reprova.

**Nunca renomeie automaticamente** (lista de exclusão obrigatória): atributo ARIA, `label`, ID de âncora, ID de formulário, seletor público, integração externa, biblioteca de terceiros, teste automatizado, Web Component, API do navegador, gancho declarado público, utilitário do Tailwind e classe usada no código Java do servidor (inclusive a de `{%nome_active}`). **Quando não for possível provar que a transformação é segura, não a aplique.** `renameIds` fica **desligado por padrão**, inclusive em `protected` — ID carrega contrato (`href="#..."`, `for`, `aria-labelledby`, `url(#...)`) que o build não enxerga.

**Hash de assets (cache busting).** `app.js` → `app.8f91c2.js`, `style.css` → `style.71a82e.css`, com todas as referências atualizadas automaticamente — atenção a `preload`, `modulepreload`, `import()` dinâmico, manifest, service worker e PWA. **Como o padrão Angatu é não usar cache (§15), `hashAssets` fica desligado:** com `no-store` o hash não compra nada. Quando o cliente **pedir** cache, o hash passa a ser obrigatório — `max-age` longo só é seguro em arquivo cujo nome muda com o conteúdo, e o HTML continua `no-store`. Para o hash ser reescrevível, toda referência no source é absoluta a partir da raiz (`/styles/ds.css`).

**PWA e service worker.** `sw.js` e `manifest.webmanifest` nunca são hasheados nem ofuscados, e são atualizados por último. Service worker apontando para arquivo que não existe mais é falha de build. Verifique manifest, estratégia de cache, versionamento, instalação e funcionamento offline quando aplicável (§15).

**Performance manda no nível de agressividade.** Avalie tamanho final, número de requisições, carregamento inicial, JS executado, CSS, imagens, cache e Core Web Vitals. Se uma técnica inchar o arquivo, o tempo de parsing, a execução ou a memória, **reduza a agressividade** — não se aplica ofuscação pesada só porque ela existe. O alvo é o equilíbrio entre performance, manutenibilidade, proteção e compatibilidade.

**Source maps.** Em `development`, ligados. Em `production`, só se explicitamente configurado — e gravados **fora** de `dist/public/`. Em `protected`, nunca: mapa publicado reconstrói o source original e anula a ofuscação.

**Comandos:**

```bash
# desenvolvimento — source legível dentro do JAR
mvn package -DskipTests && java -jar target/<app>.jar

# produção protegida — dist dentro do JAR (perfil Maven em references/frontend-build.md §15.1)
node tools/frontend-build.mjs --level=protected
mvn -Pfrontend-dist package -DskipTests && java -jar target/<app>.jar
```

**O build falha quando quebra alguma coisa.** A validação pós-build reprova (`exit 1`) em: referência quebrada, classe fora de sincronia, JS inválido, segredo no dist, CDN do Tailwind, perda de tag de SEO ou de atributo de acessibilidade em relação ao source, source map indevido, script embutido e cache não autorizado.

**Testes (§14 vale igual aqui).** Depois de mexer no build, rode os testes existentes; sem testes, faça a validação equivalente — subindo o JAR. Teste **os dois modos**, `development` e o nível de produção usado, cobrindo: JavaScript, HTML, CSS, links, imports, eventos, formulários, APIs, WebSocket, PWA, service worker, classes, IDs, assets, responsividade, SEO e acessibilidade.

### 9.11 Hardening de frontend e anti-abuso de backend

**São duas camadas diferentes e não se substituem.** Ofuscação não é sistema de segurança; nome dinâmico não é proteção real contra bot. Um bot executa JavaScript, inspeciona o DOM e descobre os identificadores atuais.

**Frontend hardening (o que dá para fazer, sabendo o tamanho do ganho):** reduzir seletor previsível, usar identificador interno gerado no build, não expor detalhe desnecessário da implementação, não deixar API exposta sem necessidade, e erguer pequenas barreiras contra automação trivial.

**Nunca crie mecanismo que prejudique usuário legítimo.** É proibido bloquear ou degradar: leitor de tela, navegação por teclado, usuário com extensão legítima, ferramentas de desenvolvimento e qualquer recurso de acessibilidade. Isso inclui laço de detecção de devtools, `debugProtection`, `disableConsoleOutput` e clique-direito bloqueado.

**Backend anti-abuse — é aqui que mora a proteção real.** Sempre que houver backend, verifique e implemente: rate limiting (§16.8), limites por endpoint, autenticação, autorização em toda rota (§16.5), expiração e revogação de sessão (§16.3), validação de dados, proteção contra abuso, controle de concorrência (`Saveable.mutate`, §4), detecção de padrão anormal, logs e monitoramento. **O frontend nunca é barreira de segurança** — checagem só na tela não vale nada: qualquer pessoa edita o JavaScript da própria página.

**Segredos.** Durante a análise do projeto, procure API key, token privado, credencial, senha, secret, credencial administrativa, chave privada e informação sensível. **Nunca coloque segredo no frontend.** Encontrou segredo exposto no source? Sinalize o problema imediatamente e, quando estiver no escopo e for seguro, mova a operação para o backend (§16.7) — chave de integração fica cifrada no banco, nunca em arquivo versionado, nunca em `public/`. O build valida o dist e reprova quando encontra padrão de segredo, mas isso é a última rede, não a primeira.

### 9.12 Projeto existente — auditoria, desvios e migração

**Nunca presuma que o projeto já segue a skill.** Ao receber um projeto existente, primeiro **analise**, depois compare, só então mexa.

Levante os 20 pontos (o que verificar em cada um está em [`references/frontend-build.md`](references/frontend-build.md) §17): estrutura · tecnologia · sistema de build · dependências · HTML · CSS · JavaScript · assets · SEO · acessibilidade · performance · PWA · service worker · cache · segurança · minificação · ofuscação · classes e IDs · exposição de APIs · possíveis segredos.

**Depois da auditoria:** identifique os desvios, corrija a arquitetura quando ela for incompatível, evite reescrita desnecessária, preserve as funcionalidades e implemente o padrão atualizado. Não empilhe código novo sobre arquitetura incompatível.

**Não troque a tecnologia sem necessidade.** Não introduza React, Vue, Angular, Svelte ou qualquer framework porque um sistema de build ou de proteção trabalha melhor com eles. Se o projeto usa HTML + CSS + JavaScript e isso é suficiente, mantenha — use a solução mais simples e adequada à arquitetura existente. Node, quando entra, entra como **ferramenta de build**, nunca como dependência da aplicação.

**Source já ofuscado?** Não tente desofuscar por adivinhação. Congele o legado em `vendor/` (fora das transformações), escreva toda alteração nova em arquivo novo e legível, e reescreva o legado por módulo só quando houver motivo real — com o plano registrado no `CLAUDE.md`.

**Comportamento esperado do agente em toda alteração de frontend:**

1. analisar o projeto; 2. identificar o padrão atual; 3. comparar com esta skill; 4. identificar desvios; 5. corrigir os desvios relevantes; 6. implementar a alteração pedida; 7. manter o source legível; 8. atualizar o processo de build quando necessário; 9. gerar o código protegido **somente no build**; 10. executar as validações; 11. conferir o resultado final no dist, com o JAR rodando.

**Nunca implemente no source uma transformação que pertence ao build. Nunca torne o código deliberadamente difícil de entender durante o desenvolvimento.**

### 9.13 Checklist obrigatória do frontend (antes de finalizar)

**Source**

- [ ] Código permanece legível e com nomes semânticos (funções, classes, IDs)
- [ ] Nenhuma ofuscação aplicada ao source
- [ ] Nenhuma randomização de classes no source nem em tempo de execução
- [ ] Nenhum segredo exposto (§9.11)
- [ ] Português impecável em todo texto visível (§9.2)

**Build**

- [ ] Build de produção configurado e reprodutível (`frontend.build.json` ou o padrão do projeto)
- [ ] Minificação configurada
- [ ] Ofuscação configurada quando apropriado (`protected`)
- [ ] Renomeação de classes configurada **apenas onde foi provada segura**; `renameIds` desligado salvo decisão registrada
- [ ] Hash de assets conforme a política de cache do projeto (§15)
- [ ] Referências atualizadas automaticamente e sincronizadas entre HTML, CSS e JS
- [ ] `src/` **não** foi sobrescrito pelo build
- [ ] Validação pós-build passou (sem referência quebrada, sem source map indevido)

**Segurança**

- [ ] Varredura de segredo no `dist/` limpa (a do source está acima)
- [ ] Autorização validada no backend em toda rota (§16.5)
- [ ] API com proteção adequada e rate limiting considerado (§16.8)
- [ ] Anti-abuso não depende do frontend (§9.11)

**Qualidade**

- [ ] HTML, CSS, JavaScript e assets funcionando no dist, testados pelo JAR (§14.1)
- [ ] PWA e service worker funcionando quando aplicável
- [ ] SEO preservado (title, description, canonical, OG, `ld+json`)
- [ ] Acessibilidade preservada (foco, ARIA, `alt`, teclado, `prefers-reduced-motion`)
- [ ] Performance verificada (peso, requisições, Core Web Vitals)
- [ ] Auditoria de design do §9.7 rodada, sem item Crítico em aberto
- [ ] Rodapé com a marca da Angatu Sistemas presente (§9.8)
- [ ] Sendo landing page: §9.14 (visual), §9.15 (linguagem) e §9.16 (SEO/Open Graph) aplicados, com as checklists das referências fechadas

### 9.14 Landing pages — apresentação visual rica, temática e autoral (obrigatório)

> **Vale para toda landing page, homepage institucional e página de campanha.** Referência completa, com roteiro, comandos de renderização e orçamentos: [`references/landing-motion.md`](references/landing-motion.md).

> **A promessa:** a landing tem de parecer uma **apresentação profissional daquela empresa**. É proibido entregar página excessivamente limpa, vazia, genérica ou feita só de blocos de texto, cards e imagens estáticas.

**1. Background do `<body>` nunca fica visualmente vazio.** Toda landing recebe um **SVG desenhado para o segmento daquela empresa** — detalhado, ligado ao ramo, criando profundidade e identidade, leve, funcionando em desktop e mobile. **Nunca reaproveite o mesmo fundo entre projetos.** O texto vem antes do fundo: garanta 4,5:1 com véu ou fundo próprio na camada de conteúdo, e entregue variante simplificada para o celular (detalhe fino vira sujeira em 390 px). Teto de 60 KB depois da otimização, que acontece **no build** (§9.10).

> **Um fundo só.** O §9.5 exige arte intencional em todo frontend; na landing, **este SVG temático já cumpre esse papel**. Escolha entre o SVG temático **ou** a arte generativa em canvas — os dois juntos brigam, pesam o dobro e denunciam falta de direção.

**2. Hero com motion graphics feito no Remotion.** Sempre que houver o que mostrar — funcionamento do produto, fluxo de uso, funcionalidades, transformação entregue, processo da empresa, ambiente de trabalho, resultados, diferenciais, antes e depois, demonstração ou informação institucional — o hero recebe um **vídeo exclusivo com função de comunicação, não de decoração**. As animações são controladas pelas APIs do próprio Remotion (`useCurrentFrame`, `interpolate`, `spring`, `Sequence`), com cenas separadas e parametrizadas.

**3. O Remotion é descartável — fica só o vídeo.** Ele é estúdio temporário, criado **fora do repositório**, usado para produzir o vídeo do zero e **apagado em seguida**, com `node_modules` e tudo. Nada de lixo acumulado: o Remotion **nunca** entra no `package.json` da aplicação, no repositório, na imagem Docker ou no build. Registre no `CLAUDE.md` o que o vídeo comunica, proporções, duração, material usado e autorizações — é isso que permite recriá-lo depois. Isso não fere §9.12 (não trocar a tecnologia): a página continua vanilla e recebe uma tag `<video>`.

**4. O vídeo se comporta como GIF: mudo, curto e em laço.** Renderize com `--muted`, sem faixa de áudio, e publique com `autoplay muted loop playsinline preload="metadata"`, sem controles, com pôster. Duração de **8 a 15 s**, com o último quadro conversando com o primeiro. `muted` é o que permite o autoplay no iOS/Android; `playsinline` impede a abertura em tela cheia. **Como não há áudio nem controle, tudo que o vídeo comunica também existe em texto na página** — e com `prefers-reduced-motion: reduce` o pôster assume e o vídeo não roda.

**5. Desktop e mobile são planejados desde o início.** Não redimensione a composição de desktop para o celular quando isso piorar a apresentação: use compositions próprias (16:9 em 1920×1080; 9:16 em 1080×1920) quando o ganho for real. Ajuste por formato: área segura, tamanho do texto, posição da logo, distância das bordas, proporção, velocidade das animações, enquadramento do material real e **quantidade de informação simultânea** — no celular, uma ideia por cena.

**6. Material real tem prioridade sobre ilustração genérica.** Foto da empresa, da equipe, do estabelecimento, de máquinas, produtos, processos, obras, veículos, clientes divulgados pela própria empresa, registro histórico, vídeo institucional ou documentário: quando existir e for relevante, entra — combinado com os gráficos (`foto real → animação → destaque → transição → outra imagem real → demonstração`). **Nada de imagem real aleatória para preencher espaço**, e **nada entra sem autorização de uso confirmada** com o cliente e registrada no `CLAUDE.md`.

**7. A marca do cliente é assinatura constante do vídeo.** Marca d'água com a **logo oficial** (nunca redesenhada), em área segura, discreta (6–10% da largura no desktop, 10–14% no mobile), com contraste suficiente para continuar identificável, opacidade que não domina a composição, proporção e qualidade preservadas, adaptada aos dois formatos. Havendo risco de sobrepor texto ou elemento importante, reposicione para a área segura alternativa. **Não confunda com o crédito da Angatu (§9.8):** a marca d'água é a do cliente; o crédito Angatu continua no rodapé.

**8. Nenhuma seção pobre passa.** Percorra cada seção e pergunte: *"essa informação poderia ser comunicada visualmente de uma maneira melhor?"* Seção excessivamente textual, estática ou vazia pede motion graphics, SVG ilustrativo, microanimação, diagrama, animação de processo, screenshot animado, foto ou vídeo real, composição de foto + gráfico, demonstração ou elemento interativo. **Não adicione animação por adicionar:** todo elemento visual precisa de função declarável em uma frase — explicar, demonstrar, destacar, contextualizar ou reforçar a identidade. Em seção interna a ordem é CSS nativo (§9.4) → SVG animado → vídeo curto.

**9. Performance é limite, não intenção.** Vídeo desktop ≤ 1,5 MB (teto 2,5 MB), mobile ≤ 800 KB (teto 1,2 MB), pôster ≤ 120 KB, SVG de fundo ≤ 60 KB. Otimize SVG, imagem e vídeo, cuide de resolução, codec, carregamento, `lazy` abaixo da dobra, quantidade de animações simultâneas, número de nós no DOM e reprodução no celular. Ilustração complexa vira `<img src="*.svg">`, não 4 000 nós inline. No padrão sem cache (§15) esse vídeo é baixado a cada visita — é o caso em que vale levantar a exceção de cache com hash (§9.10) junto ao cliente.

**10. Organização e legibilidade valem aqui igual (§9.9).** Separe componentes, compositions, cenas, assets, SVGs, imagens, vídeos, dados, configurações e estilos; textos, cores e caminhos vêm de um arquivo de dados, nunca escritos no meio da cena. HTML, CSS, JS, SVG e código de composition permanecem legíveis durante o desenvolvimento — **minificação, compressão, otimização de SVG/imagem/vídeo e ofuscação acontecem só no build** (§9.10).

**11. Identidade antes de template.** É proibido pegar uma estrutura visual genérica e trocar só logo, textos, cores e imagens. Construtora, clínica, restaurante, transportadora, escritório jurídico e empresa de tecnologia têm de sair **visivelmente diferentes**. **O teste:** cubra a logo e os textos — ainda dá para dizer de que ramo é a empresa? Se não der, a identidade ainda não está lá.

**12. Revisão final.** Antes de entregar, releia a página inteira procurando área vazia, genérica, excessivamente textual, sem identidade, estática demais, desconectada do tema ou pobre em comparação com o resto — e resolva com SVG, foto real, vídeo real, motion graphics, ilustração ou outra solução apropriada. A prioridade **não** é acumular efeito: é equilíbrio entre identidade visual, conteúdo, narrativa, autenticidade, performance e responsividade.

### 9.15 Linguagem natural — a landing não pode ter cara de texto gerado (obrigatório)

> **Vale para toda landing page.** Referência completa, com tabelas de substituição e varreduras: [`references/landing-copy.md`](references/landing-copy.md).

> **O resultado final tem de parecer escrito por um profissional de marketing, designer ou redator humano que conhece aquela empresa.** Não por um gerador automático de texto.

Aplica-se a **todo** texto visível: hero, títulos, subtítulos, textos institucionais, cards, benefícios, descrições, FAQ, CTAs, rodapé, textos de SEO, metadados, textos de botão, mensagens auxiliares e os textos que aparecem dentro do vídeo do Remotion (§9.14). Vem **depois** do §9.2, não no lugar dele: primeiro o português está correto, depois ele deixa de soar automático.

**Anti-padrões proibidos.** Uso recorrente de travessão como recurso de ritmo. Frases sempre com a mesma estrutura. Listas repetidas no mesmo formato. Título genérico. Subtítulo que só repete o título. Frase excessivamente polida ou corporativa. Palavra de marketing sem necessidade, principalmente "inovador", "revolucionário", "potencialize", "transforme", "eleve", "solução completa", "experiência única", "jornada", "ecossistema", "estratégico", "inteligente" e "personalizado". Afirmação grandiosa sem comprovação. Frase que só preenche espaço. Introdução longa antes do ponto. Excesso de palavra abstrata. A mesma ideia repetida em seções diferentes. Excesso de emoji e de dois-pontos. As fôrmas "Não é apenas X. É Y.", "Mais do que X, Y." e "De X a Y, fazemos...". Simetria excessiva e ritmo artificialmente perfeito. Palavra em inglês quando existe alternativa natural em português. CTA genérico repetido. Depoimento ou informação sem origem em dado real do projeto.

**Pontuação.** O caractere `—` não é recurso de redação em texto de landing. Use vírgula, ponto, ponto e vírgula quando for mesmo necessário, dois-pontos quando houver relação clara, parênteses quando ajudarem, e quebra de frase. O ritmo do texto não pode depender de travessão, e pontuação sofisticada perde para a frase simples que comunica melhor.

**Escreva para aquela empresa.** Antes de redigir, levante nome, segmento, produto, serviço, público, localização, diferenciais reais, forma de trabalho, materiais fornecidos, fotos e vídeos disponíveis, informações institucionais, dados reais e a linguagem que o próprio negócio usa. Use o vocabulário do cliente: se ele fala "obra", não escreva "projeto arquitetônico". Uma landing de empresa local tem de parecer escrita para aquela empresa.

**Nunca invente informação.** Número, cliente, avaliação, depoimento, certificação, prêmio, tempo de mercado, quantidade de atendimentos, resultado, característica de produto, funcionalidade, parceiro, estatística ou dado institucional: só entra o que foi fornecido pelo projeto ou verificado. **Não existe número de exemplo em página publicada.** Faltou dado, peça ao cliente ou reescreva a seção com o que é verdadeiro. Sem depoimento real, autorizado e atribuível, **não existe seção de depoimentos**.

**Texto curto e humano.** Frase simples e objetiva, sem tom de artigo acadêmico nem de apresentação corporativa. O visitante precisa entender rápido: o que a empresa faz, para quem trabalha, que problema resolve, por que escolher aquela empresa e como contratar. Não aumente o texto para preencher seção: seção sem o que dizer ganha conteúdo real, vira demonstração visual (§9.14) ou some.

**Títulos e CTAs concretos.** Troque "Soluções para o seu negócio" por "Galpões e mezaninos em estrutura metálica em Sorriso". Troque "Saiba mais", "Comece agora", "Descubra mais" e "Fale com um especialista" por "Pedir orçamento", "Chamar no WhatsApp", "Ver nossos serviços", "Agendar atendimento", "Ver produtos", "Conhecer a empresa". O botão explica a ação real; não faz propaganda abstrata.

**A arquitetura nasce do negócio.** Não monte por padrão `hero → 3 cards → números → benefícios → depoimentos → planos → FAQ → CTA`; essa sequência só entra quando fizer sentido. Uma empresa pode precisar de `hero → serviços → processo → trabalhos realizados → localização → contato`; outra de `hero → produto → demonstração → funcionalidades → comparação → preço → FAQ`; outra de `hero → história → estrutura → serviços → fotos reais → localização → contato`.

**Conteúdo real primeiro.** Informação, foto, vídeo e documento institucional da empresa formam a narrativa. Trabalho realizado, produto, instalação, equipe, veículo, equipamento e projeto têm prioridade sobre banco de imagens quando couberem no contexto. E texto não faz o trabalho da imagem: processo, produto ou funcionamento que se demonstram melhor visualmente viram animação, motion graphics, vídeo real, fotografia, SVG, diagrama ou screenshot (§9.14).

**Revisão anti-IA antes de entregar (obrigatória).** A pergunta que decide: *"se eu removesse a marca e o nome da empresa, esse texto poderia pertencer a qualquer outra empresa?"* Se sim, reescreva. Depois confira: excesso de travessão, frase artificial, palavra de marketing desnecessária, título genérico, repetição, afirmação sem comprovação, estrutura repetitiva, texto que não parece escrito para essa empresa, dificuldade de entendimento, leitura em voz alta que soa estranha, conteúdo que não ajuda a decidir. Qualquer trecho com aparência artificial é reescrito antes da entrega.

> **A regra principal:** o objetivo não é o texto parecer sofisticado. É parecer **natural, específico, convincente e verdadeiro** — como se uma pessoa tivesse pesquisado a empresa, entendido o negócio e escrito a página para ela. Estética final: profissional, específica, natural, humana, visualmente rica e objetiva. Nunca genérica, excessivamente corporativa, previsível, artificial e cheia de frase de marketing.

### 9.16 SEO e Open Graph — capa editorial por página (obrigatório)

> **Vale para toda landing page e para toda URL pública.** Referência completa, com bloco de `<head>`, geração das capas e validação: [`references/landing-seo-og.md`](references/landing-seo-og.md).

> **O resultado esperado:** quem recebe a URL compartilhada entende na hora *"essa é a página desta empresa sobre este assunto"*, e não *"esse é o site de alguma empresa"*.

**1. SEO não para em `title`, `description` e `sitemap`.** Toda página entrega, no próprio `<head>`: `title`, `meta description`, `canonical`, Open Graph completo (`og:type`, `og:site_name`, `og:url`, `og:title`, `og:description`, `og:image`, `og:image:width`, `og:image:height`, `og:image:alt`), Twitter/X Cards (`summary_large_image`), idioma correto (`lang="pt-BR"`, `og:locale`), favicon, ícones de PWA quando aplicável e dados estruturados Schema.org do tipo real do conteúdo.

**2. `<head>` próprio por URL.** Neste stack o `HtmlRouteAPI` troca `{page}`/`{content}`/`{%nome_active}` dentro de um HTML base, e o `<head>` mora nesse base. Então a landing ou é **página completa com `<head>` próprio** servida por rota dedicada, ou o base ganha marcadores (`{title}`, `{description}`, `{canonical}`, `{og_image}`) que a rota substitui antes de responder. Várias URLs com o mesmo `<head>` é entrega incompleta.

**3. O robô não faz login.** `og:image` e a página precisam ser públicas, em URL absoluta `https` do domínio de produção. Caminho local, `file://` ou `localhost` não geram prévia; página atrás de sessão também não.

**4. A imagem de compartilhamento é uma capa, não um enfeite.** **Nunca use uma imagem genérica para todas as páginas.** Componha a capa daquela URL com logo da empresa, nome da empresa, nome do produto ou serviço, título principal da página, imagem real do negócio, elementos gráficos e cores da identidade, SVG ou padrões do segmento e uma informação curta que identifique o conteúdo. A logo **entra na composição**, nunca isolada sobre fundo vazio: `LOGO + imagem/ilustração do negócio + título da página + elemento gráfico da identidade`. A marca fica reconhecível antes de a pessoa terminar de ler o título.

**5. Uma capa por página.** Projeto com várias landings tem várias capas, com a mesma identidade e conteúdo diferente: `/servicos/instalacao-de-ar-condicionado` mostra instalação; `/servicos/manutencao` mostra manutenção. Repetir a mesma arte só quando não for possível gerar capas específicas, com o motivo registrado no `CLAUDE.md`.

**6. Foto real na frente da ilustração.** Existindo foto ou vídeo real da empresa, do produto, do serviço ou do local, ele tem prioridade na composição quando for relevante — decisivo para empresa local. Banco de imagens aleatório só para preencher, não. Vale a mesma regra de autorização do §9.14. Contexto geográfico entra quando **for parte real do conteúdo**; nunca insira cidade sem relação com a página.

**7. Geração automatizada e reutilizável.** Guarde os dados das páginas em um arquivo único (`docs/design/pages.json`: slug, título, subtítulo, foto, tipo de schema) e gere todas as capas em laço: `dados da página → logo + identidade → título → imagem relacionada → composição → /assets/og/<slug>.jpg`. Caminhos, em ordem de preferência: **Remotion `still`** com uma composition `OgCover` parametrizada (o estúdio já existe se a landing tem hero em vídeo, e é apagado no fim — §9.14), **canvas 2D** com o motor do §9.5, ou HTML/CSS renderizado por navegador headless se o projeto já tiver isso. Geração acontece em desenvolvimento ou no build; para produção vai o arquivo pronto e otimizado (§9.10).

**8. Tamanho e compatibilidade.** 1200×630 horizontal, **JPEG ou PNG** (evite WebP e AVIF: vários previsualizadores não renderizam), ≤ 300 KB, sRGB, conteúdo crítico dentro dos 1000×500 centrais com 60 px de margem, texto curto e de corpo grande, logo inteira e sem corte. Alguns aplicativos recortam a prévia quase quadrada: nada essencial nas laterais externas.

**9. Texto de SEO segue o §9.15.** `title`, `description`, `og:title`, `og:description` e Schema.org são específicos e verdadeiros. Nada de "Conheça nossas soluções e descubra como podemos ajudar você"; escreva o que o visitante encontra naquela URL. **Nenhuma informação inventada** (nota, número de clientes, prêmio, certificação). E a capa tem de representar a mesma página: serviço mostra o serviço, produto mostra o produto, institucional mostra a empresa. Arte bonita sem relação com o conteúdo é erro, não estilo.

**10. A capa não pode parecer template.** Quadrado com logo centralizada, gradiente genérico, imagem de banco com texto por cima, a mesma arte em todas as páginas, banner genérico de SaaS ou composição automática sem identidade: nenhum deles passa.

**11. Landing nova só fica pronta com a capa pronta.** Criar landing inclui, no mesmo processo, **conteúdo + SEO + Open Graph + imagem de compartilhamento + favicon/identidade quando necessário**. Não existe "o SEO fica para depois".

**12. Validação por página, antes de entregar.** `title` próprio · `description` própria · `canonical` correto · `og:title`, `og:description` e `og:url` correspondentes · `og:image` público e acessível · sem caminho local · dimensões declaradas · logo presente quando existe · imagem representando a página · Twitter/X configurado · Schema.org do tipo real · nada inventado · nenhuma capa genérica reutilizada sem necessidade. Depois do build, repita sobre o `dist/` e teste a prévia real colando a URL de produção em um aplicativo de mensagem.

---

## 10. Rituais obrigatórios do agente em todo projeto

### 10.1 CLAUDE.md — manter atualizado a cada feature

```markdown
# <Nome> — one-liner

## Stack
Java 21, AngatuLibraries <versão> (https://github.com/LuanVictorGit/AngatuLibraries), Javalin 7.2.2, SQLite/HikariCP/Gson

## Estrutura
src/main/java/com/company/store/{Main, entities/, routes/, services/, utils/}
src/main/resources/public/{index.html, styles/ds.css, scripts/, *.html}

## Como rodar
mvn package -DskipTests && java -jar target/<app>.jar   # http://localhost:8080
# HTML/JS: copiar para target/classes/public/ só reflete rodando por mvn exec:java

## Inicialização
new AngatuLib("loja.angatusistemas.com.br", port, true)  // port = env PORT, padrão 8080; HTTPS é do Coolify

## Deploy (Coolify)
Dockerfile na raiz · porta 8080 · volume /data (ANGATU_DB_PATH=/data/database.db) · GET /health

## Rotas / Entidades
- GET /health — HealthRoute
- POST /api/users — CreateUserRoute
- Saveable: User, Company, Key ...

## Env
EMAIL_KEY, DISCORD_BOT_TOKEN, DEEPSEEK_API_KEY, MP_ACCESS_TOKEN

## Convenções
Route/Saveable só via extends; handlers enxutos; json_extract com índices; ds.css única fonte visual.
```

### 10.2 Commits detalhados na `development` (nunca citar Claude/IA)

> **A `main` é produção. Trabalho em andamento nunca vai para ela.**
>
> Todo commit do trabalho corrente vai para a branch **`development`**. A `main` só recebe o
> que o dono do projeto **confirmar explicitamente** que pode ir para produção — e essa
> confirmação é sempre uma frase dele, nunca uma dedução de que "o trabalho ficou pronto".
> Terminar a tarefa, os testes passarem e o servidor subir **não** autorizam a promoção.

- Mensagens em PT-BR, detalhadas (o que + por que + impacto). Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `perf:`.
- Corpo sempre com bullets explicando cada mudança relevante.
- **Nunca mencionar Claude, IA, gerado por IA ou `Co-Authored-By` no commit.** Commit deve parecer 100% humano/autoral do projeto.
- **Sempre `git push`** para a `development` após o commit. Nunca `--no-verify`/`--no-gpg-sign` sem pedido.

```bash
# Trabalho do dia — sempre na development
git checkout development 2>/dev/null || git checkout -b development
git add -A
git commit -m "$(cat <<'EOF'
feat: integra Web Push com VAPID persistido

- Adiciona PushBootstrap.setup() no Main (loja.angatusistemas.com.br, porta de PORT)
- Cria rota SalvarAssinatura que persiste Subscription via Saveable
- Trata SendResult.isExpired() removendo assinatura inválida
- Atualiza CLAUDE.md com fluxo de push e env vars

EOF
)"
git push -u origin development
```

**Promoção para produção — só depois da confirmação.** Quando (e apenas quando) o dono do
projeto disser que pode subir:

```bash
git checkout main
git merge --no-ff development -m "release: <o que está subindo>"
git push origin main
git checkout development
```

Se o repositório ainda não tem `development`, crie-a a partir da `main` na primeira alteração —
não continue commitando na `main` "só desta vez". É justamente o commit avulso na `main` que
sobe para produção uma tela pela metade, e ninguém percebe até um usuário abrir.

Antes de editar arquivo grande valide `{}`/`()` balanceados e `node -e "new Function(fs.readFileSync(...,'utf8'))"` para JS. Atualize `CLAUDE.md` no mesmo commit quando a mudança afeta stack/estrutura/rotas.

### 10.3 Anotar CLAUDE.md em todo projeto

Manter `CLAUDE.md` na raiz sempre atualizado (ver §10.1). Toda feature/correção que muda stack, estrutura, inicialização (`AngatuLib`), rotas, entidades ou env vars deve refletir no `CLAUDE.md` no mesmo commit. Nunca deixe `CLAUDE.md` desatualizado.

---

## 11. Checklist de projeto novo

- [ ] `Main` com `new AngatuLib(dominio, porta de PORT, true)` (HTTP — sem `manageSsl`) + `setTrustedProxyHops(1)` + rate limits
- [ ] `Dockerfile` + `.dockerignore` na raiz (§17), `EXPOSE`/`PORT` coerentes e `docker build` testado
- [ ] Rota `GET /health` (200) fora do rate limit, usada pelo `HEALTHCHECK`
- [ ] `ANGATU_DB_PATH=/data/database.db` + volume `/data` configurado no Coolify
- [ ] `public/styles/tailwind.css` **versionado** (o Coolify constrói do repositório, não da sua máquina)
- [ ] Índices do `Saveable` criados na inicialização para os campos consultados (§4)
- [ ] Se o projeto salva imagens: estratégia de compressão **perguntada e registrada** no CLAUDE.md (§18)
- [ ] `Company`/entidades Saveable + CRUD via Route + telas lista/form/print
- [ ] `index.html` shell + `styles/tailwind.css` (local, §9.1) + `styles/ds.css` + helpers
- [ ] `tailwind.config.js` + `tailwind.input.css` + `tools/tailwindcss[.exe]` e `grep -r "cdn.tailwindcss"` vazio
- [ ] Todo texto do frontend revisado: acentuação, vírgulas e concordância (§9.2)
- [ ] Source do frontend legível: sem ofuscação, sem classe/ID aleatório, sem segredo (§9.9)
- [ ] Build separado configurado (`frontend.build.json` + `tools/frontend-build.mjs` + perfil `frontend-dist`) e `dist/`/`build/` no `.gitignore` (§9.10)
- [ ] Validação pós-build passando e dist testado pelo JAR antes de publicar (§9.10, §14.1)
- [ ] `.env` + `.gitignore` (`database.db`, `.env`, `tools/tailwindcss*` se binário não versionado)
- [ ] `CLAUDE.md` criado/atualizado
- [ ] Rodapé com a marca da Angatu Sistemas em todas as páginas e e-mails (§9.8)
- [ ] Sem cache: `AssetsAPI.setCacheEnabled(false)`, `no-store` em toda resposta, service worker que não guarda nada (§15)
- [ ] Cookie de sessão `HttpOnly` + `SameSite` + `Secure` condicional; token nunca em URL (§16)
- [ ] Páginas fora do rate limit; API e login com o deles (§16.8)
- [ ] Sendo landing page: background SVG temático, hero em motion graphics, revisão anti-IA do texto e capa de Open Graph por página (§9.14 a §9.16)
- [ ] Testado subindo o JAR do projeto, nunca por servidor externo ou `file://` (§14.1)
- [ ] Commit detalhado sem menção a IA + push

## 12. Gotchas

- `.java` exige recompilar; HTML/JS copie para `target/classes/public/` (só vale por `mvn exec:java`).
- `Saveable.query` sempre com `?`, nunca concatenação. `Saveable.shutdown()` + `Task.shutdown()` (+ `BrowserAPI.shutdown()`) no shutdown hook.
- **Sem cache no `Saveable`:** objeto alterado sem `save()` não muda nada; `findById` devolve instância nova a cada chamada; registro disputado exige `Saveable.mutate(...)` (§4).
- **`findByField` com enum varre a tabela:** só texto, número e booleano viram `json_extract` no SQL; passe `Role.ADMIN.name()`, não `Role.ADMIN` (§4).
- **`mutate` devolve `null` quando o registro não existe** — e a alteração simplesmente não acontece. Verifique o retorno em fluxo que precisa saber se gravou.
- **Porta:** a informada é a usada — não há mais desvio para a 80 em localhost. Leia de `PORT`.
- **Nunca ligue HTTPS no Javalin quando estiver no Coolify** (§2.1): o TLS é da hospedagem.
- **Banco sem volume some no deploy:** `/data` montado + `ANGATU_DB_PATH` (§17) — um volume por projeto, um `database.db` por projeto.
- **`isLocalhost()` agora vem do ambiente** (`ANGATU_ENV`) ou do host local, não da pasta de certificados — cheque quem depende disso (cookie `Secure`, atalhos de desenvolvimento).
- CSP default permissiva — aperte com `JavalinAPI.setSecurityHeader(...)` antes do `new AngatuLib(...)` em produção.
- `RateLimitConfig`/`BlockInfo` etc. `final` — não estenda.
- **Tela morta com a API respondendo 100%:** minificador renomeou identificador de topo e `UI`/`net`/`Auth` sumiram. Script clássico exige `minifyIdentifiers: false` + `renameGlobals: false` (§9.10).
- **Estilo some depois de ligar `renameClasses`:** classe injetada pelo Java (`{%nome_active}`) foi renomeada só no CSS. A prova de segurança precisa ler `src/main/java/**` (§9.10).
- **Responsividade quebrada no dist:** utilitário do Tailwind entrou na renomeação. Nada que aparece em `styles/tailwind.css` é renomeável.
- **`mvn package` sem o perfil publica o source legível** — o dist só entra no JAR com `-Pfrontend-dist` (§9.10).
- **Dist velho no ar:** build gerado antes da última alteração de source; confira o `sourceHash` do `dist/.build-info.json`.

---

## 13. Arquitetura, utilitários, documentação e otimização (obrigatório)

Tudo que gerar deve ser **bem arquitetado**. Não é opcional.

### 13.1 Código bem arquitetado e utilitários (DRY)

- **Extraia utilitários** sempre que houver repetição: `utils/Validators.java`, `utils/Money.java`, `utils/AuditLog.java`, `utils/Auth.java`, `utils/EmailTemplates.java` etc. Nunca duplique `byToken`, parsing de body, validação de e-mail/CPF, formatação de moeda/data ou respostas de erro em várias rotas.
- Separe camadas: `entities/` (Saveable) → `services/` (regras de negócio, sem `Context`) → `routes/` (apenas HTTP, enxutas, delegando para services) → `utils/` (puro, testável). Route nunca contém regra de preço, estoque ou permissão — delega.
- Prefira composição a herança; classes `final` quando não forem extensão; construtores privados em utilitários.
- Nomeie com intenção (`CreateOrderService`, `OrderCalculator`, `TokenAuth`) e mantenha métodos curtos (<30 linhas). Se cresceu, quebre.

### 13.2 Documentação e Javadocs

- **Toda classe/método público com Javadoc** no padrão da AngatuLibraries: propósito, quando usar/não usar, integrações, fluxo, pré/pós condições, efeitos colaterais e exemplo quando fizer sentido. Use PT-BR como no código-fonte da lib.
- Mantenha `README.md`/`CLAUDE.md` coerentes com o código; documente decisões não óbvias (ex: por que `perIp=false` em determinada rota, por que índice `json_extract`).
- Código autoexplicativo > comentário redundante. Comente apenas o "porquê", nunca o "o quê" óbvio.

### 13.3 Otimização e boas práticas

- Reuse `GsonAPI.get()` (singleton) — nunca `new Gson()` espalhado.
- Índices `json_extract(data,'$.campo')` para todo campo filtrado/ordenado com frequência; use `LIMIT/OFFSET` para paginação.
- Evite `findAll` + filtro em memória quando `query` com SQL resolve; evite N+1 (busque em lote via `query` ou `findByPredicate` uma vez).
- Valide entrada cedo (fail-fast) e use `StatusCode` correto (400/401/403/404/409/422/429).
- Prefira `StringAPI`, `DataTime`, `Password` da lib a reinventar.
- Logs via `Console` (níveis adequados); nunca logue segredo/token/senha.

### 13.4 Idioma do código e auditoria Angatu Sistemas (obrigatório)

- **Pacotes e classes SEMPRE em inglês.** Nunca use português em `package`, `class`, `interface`, `enum`, métodos ou variáveis. Exemplos corretos: `com.store.core`, `com.store.entities`, `com.store.routes`, `com.store.services`, `com.store.utils`; classes `User`, `Company`, `Order`, `Product`, `CreateUserRoute`, `ListOrdersRoute`, `UpdateProductRoute`, `AuthService`, `MoneyUtils`, `Validators`. Exemplos proibidos: `Usuario`, `CriarUsuario`, `CriarPedidoService`, `utils/Validadores`, `objects/` com nome em PT-BR.
- **Apenas Javadocs e comentários explicativos em português (PT-BR).** Todo comentário de documentação deve estar em português, seguindo o padrão da AngatuLibraries. Código permanece 100% em inglês.
- **Toda classe com auditoria Angatu Sistemas.** Toda classe criada deve conter no topo do Javadoc da classe a tag de auditoria:

```java
/**
 * Serviço responsável por criar pedidos com cálculo de totais e validação de estoque.
 * <p>Valida entrada, calcula valores no backend e persiste via Saveable.</p>
 *
 * @author Angatu Sistemas
 */
public final class CreateOrderService {
}
```

- Para entidades e rotas, o mesmo padrão:

```java
/**
 * Entidade de usuário persistida via Saveable.
 *
 * @author Angatu Sistemas
 */
@Getter @Setter
public class User extends Saveable {
    private String id;
    private String name;
    private String email;
    public User() {}
    @Override public String getId() { return id; }
}
```

```java
/**
 * Rota de criação de usuário.
 *
 * @author Angatu Sistemas
 */
public class CreateUserRoute extends Route {
    public CreateUserRoute() { super("/api/users", RouteType.POST, CreateUserRoute::handle); }
    // handle em inglês: handle(), findByToken(), validate()
}
```

- Nunca crie classe sem `@author Angatu Sistemas` no Javadoc da classe. Em utilitários, inclua também descrição de quando usar/não usar, integrações e exemplo — sempre em português.

## 14. Sempre testar rodando o servidor

Nunca entregue código sem ter compilado e rodado.

1. **Compile:** `mvn package -DskipTests` — corrija erros de compilação/Jetty imediatamente (ver §1.4 para o Jetty alinhado ao Javalin 7.2.2; `mvn dependency:tree -Dincludes=org.eclipse.jetty` se houver `NoSuchMethodError`).
2. **Suba o servidor:** `java -jar target/<app>.jar` (ou `mvn exec:java`). Confirme no banner: host, **modo HTTP**, ambiente e `Javalin configurado`.
3. **Valide na prática:** `curl`/`httpie` nas rotas criadas (`GET /health`, `POST /api/...`), verifique HTML em `http://localhost:8080/<pagina>` e logs do `Console`.
4. **Valide o contêiner** quando mexer em `Dockerfile`, dependências ou inicialização: `docker build -t <app> . && docker run --rm -p 8080:8080 -v <app>-data:/data <app>` — é essa imagem que o Coolify vai subir.

> **Rodando por `java -jar`, copiar para `target/classes/public/` NÃO surte efeito** — o classpath é o próprio JAR. Alterações em HTML/JS/CSS exigem `mvn package` de novo. A cópia para `target/classes` só vale rodando por `mvn exec:java`.

5. **Teste os dois modos quando o projeto tem build de frontend (§9.10).** Primeiro o legível, depois o publicável:

```bash
mvn package -DskipTests && java -jar target/<app>.jar                    # source legível
node tools/frontend-build.mjs --level=protected                          # gera o dist
mvn -Pfrontend-dist package -DskipTests && java -jar target/<app>.jar    # é isto que sobe
```

> Defeito de minificação/ofuscação **não aparece** no modo legível: é exatamente para isso que o segundo teste existe. Abra as telas no navegador, confira o console sem erro, e teste formulário, API, WebSocket, PWA e service worker no dist.

6. **Shutdown limpo:** ao encerrar, garanta `Saveable.shutdown()`, `Task.shutdown()` e `BrowserAPI.shutdown()` (se usou) em shutdown hook.
7. Só considere pronto após o servidor subir sem exceção e as rotas responderem com o status/body esperados.

### 14.1 Nunca suba um servidor externo para testar (obrigatório)

O projeto é testado **pelo próprio JAR**, servido pelo `AngatuLib`. É proibido, para "ver a tela funcionando":

- `python -m http.server`, `npx serve`, `live-server`, extensão Live Server do editor ou qualquer outro servidor estático;
- abrir o HTML por `file://`;
- copiar o frontend para outro diretório/servidor.

**Por quê:** o frontend depende do servidor real para existir. Fora dele não há sessão em cookie, não há API, não há WebSocket, não há substituição de `{content}` pelo `HtmlRouteAPI`, não há cabeçalhos de segurança e a política de conteúdo não se aplica. Um servidor estático mostra uma tela que *parece* certa e esconde exatamente os defeitos que importam — foi assim que um bloqueio de script inline pela política de segurança passou despercebido, com a API respondendo 100% e a interface inteira morta no navegador.

Fluxo correto, sempre:

```bash
mvn package -DskipTests && java -jar target/<app>.jar
# aguarde o banner, depois valide em http://localhost:8080/<pagina>
```

Ao terminar, encerre o processo em vez de deixá-lo segurando a porta e o banco.

---

## 15. Cache — não usar, a menos que seja pedido (obrigatório)

> **Regra:** todo conteúdo vem do servidor a cada requisição. Não implemente cache de conteúdo por
> iniciativa própria. Só existe cache quando o usuário pedir, e aí ele é deliberado, restrito e
> documentado.

**Proibido por padrão:**

- Service worker que guarda telas, scripts ou estilos (`caches.put`, pré-carregamento, estratégia
  "cache primeiro").
- `Cache-Control` com `max-age` longo em página, script, estilo ou imagem.
- Cache de assets da lib — `AssetsAPI` vem com cache ligado; desligue.
- Guardar resposta de API em `localStorage`/`sessionStorage` para exibir depois como se fosse atual.

**O que fazer no bootstrap, antes de servir tráfego:**

```java
// Nada de conteúdo guardado, nem no servidor nem no navegador.
AssetsAPI.setCacheEnabled(false);

JavalinAPI.setSecurityHeader("Cache-Control", "no-store, no-cache, must-revalidate");
JavalinAPI.setSecurityHeader("Pragma", "no-cache");
JavalinAPI.setSecurityHeader("Expires", "0");

// O servidor de estáticos aplica o próprio Cache-Control depois do before-handler, e as folhas
// de estilo e scripts saem com max-age=0 — que manda revalidar, não descartar. Carimbe a
// resposta já pronta. No Javalin 7 os manipuladores ficam em unsafe.routes, não na instância.
JavalinAPI.get().unsafe.routes.after(ctx -> {
    ctx.header("Cache-Control", "no-store, no-cache, must-revalidate");
    ctx.header("Pragma", "no-cache");
    ctx.header("Expires", "0");
});
```

**Service worker sem cache.** Ele continua existindo para tornar o app instalável (PWA) e receber
push, mas não guarda nada. Um manipulador de busca precisa existir para o navegador considerar o
app instalável; deixe-o repassar para a rede:

```js
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (evento) => evento.waitUntil(
  // Apaga o que versões anteriores tenham guardado.
  caches.keys()
    .then((chaves) => Promise.all(chaves.map((c) => caches.delete(c))))
    .then(() => self.clients.claim())
));

// Sem respondWith: o navegador segue o caminho normal até o servidor.
self.addEventListener('fetch', () => {});
```

E, no registro, force a checagem de versão e recarregue uma vez quando um service worker novo
assumir — senão o aparelho fica preso na versão anterior por tempo indeterminado:

```js
const registro = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
registro.update();
navigator.serviceWorker.addEventListener('controllerchange', () => {
  if (!window.__recarregando) { window.__recarregando = true; location.reload(); }
});
```

**Por que a regra é essa.** Cache de conteúdo transforma uma correção publicada em correção
invisível: o aparelho continua abrindo a versão anterior. O prejuízo não é uma tela desatualizada
— é uma tela que **abre e não funciona**, porque o HTML guardado não corresponde mais ao código do
sistema. Já aconteceu em produção com este stack: a versão guardada trazia script embutido na
página, bloqueado pela política de segurança, e a interface inteira ficou sem responder enquanto a
API respondia normalmente. Depurar isso é caro, e o usuário final não tem como se ajudar sozinho.

Se o funcionamento sem internet for **pedido**, implemente-o de forma explícita: rede primeiro para
navegação, cache apenas como reserva de offline, nome de cache versionado, `skipWaiting()` +
`clients.claim()` e limpeza das versões antigas no `activate`. Nunca "cache primeiro" para página.

**Hash de assets segue esta regra, não a contraria (§9.10).** Enquanto o projeto está sem cache,
`hashAssets` fica **desligado**: com `no-store` em toda resposta o hash não compra nada e só
atrapalha rastrear o arquivo. No dia em que o cliente **pedir** cache, o hash passa a ser
**obrigatório** — `max-age` longo só é seguro em arquivo cujo nome muda quando o conteúdo muda, e
o HTML continua `no-store` para sempre apontar para os nomes novos. Vídeo de hero e imagem pesada
(§9.14) são o caso em que vale levantar a pergunta ao cliente: são os arquivos que mais sofrem com
`no-store`.

---

## 16. Segurança de sessão e de API (obrigatório)

Autorização é sempre validada no **backend**, em toda rota. Checagem só no frontend não vale nada:
qualquer pessoa edita o JavaScript da própria página.

### 16.1 Sessão em cookie — o padrão

```java
Cookie cookie = new Cookie(NOME, token);
cookie.setPath("/");
cookie.setHttpOnly(true);                  // JavaScript não lê: contém o XSS
cookie.setSameSite(SameSite.LAX);          // contém o CSRF vindo de outros sites
cookie.setSecure(!ehRequisicaoLocal(ctx)); // só HTTPS em produção; fixo em true quebra o login local
cookie.setMaxAge((int) (VALIDADE_MS / 1000));
ctx.cookie(cookie);
```

- **`HttpOnly` sempre.** Token em `localStorage` é legível por qualquer script injetado. Cookie
  `HttpOnly` não é legível nem pelo script da própria página.
- **`SameSite=Lax`** cobre o caso comum de CSRF. Se a API precisar mesmo de requisição de outra
  origem, avalie `None` + `Secure` + verificação de origem, e documente o motivo.
- **`Secure` condicional.** Fixo em `true` impede o login em `http://localhost` no desenvolvimento;
  decida pelo host da requisição — ou por `AngatuLib.getInstance().isLocalhost()`, que agora vem do
  ambiente (`ANGATU_ENV`) e não da pasta de certificados (§2.1). **No Coolify a aplicação fala HTTP
  dentro do contêiner e HTTPS para o mundo:** decidir `Secure` por `ctx.scheme()` sem
  `setTrustedProxyHops(1)` derruba o cookie em produção.

### 16.2 Token no cabeçalho, nunca na URL

Aceite também `Authorization: Bearer <token>`, para clientes que não enviam cookie:

```java
String cookie = ctx.cookie(NOME);
if (cookie != null && !cookie.isBlank()) return cookie;
String header = ctx.header("Authorization");
if (header != null && header.startsWith("Bearer ")) return header.substring(7).trim();
return null;
```

**Nunca aceite token em parâmetro de consulta numa rota HTTP.** URL vaza em histórico do navegador,
em log de servidor, em log de proxy e no cabeçalho `Referer` ao clicar num link externo.

**Única exceção justificada:** o handshake do WebSocket, porque a API do navegador não permite
cabeçalho personalizado. Aceite o token na consulta **apenas ali**, prefira o cookie quando ele
vier, e valide com a mesma função usada nas rotas HTTP.

### 16.3 Sessão: geração, validade e revogação

- Token de **256 bits** de fonte aleatória segura (`SecureRandom`), em Base64 seguro para URL.
  Nunca sequencial, nunca derivado de dados do usuário.
- Guarde **validade** e recuse a sessão vencida, apagando-a no ato.
- **Revogue todas as sessões** na troca de senha, no bloqueio da conta e na exclusão. Sem isso,
  trocar a senha por suspeita de acesso indevido não expulsa quem já estava dentro.
- Copie papel e tenant na sessão para não consultar a conta a cada requisição — e, quando a
  permissão mudar, **revogue** em vez de editar, para o dado copiado nunca ficar defasado.

### 16.4 Senha

- `Password.criptography` para gravar, `Password.checkCriptography` para conferir. Nunca guarde
  senha reversível, nunca registre senha em log.
- Senha inicial aleatória, com **troca obrigatória** no primeiro acesso.
- Senha que será ditada por telefone ou WhatsApp: alfabeto sem caracteres ambíguos (sem `0`/`O`,
  sem `1`/`I`).
- **Resposta idêntica** para e-mail inexistente e senha errada. Mensagens diferentes revelam quais
  e-mails estão cadastrados.

### 16.5 Autorização e isolamento entre contas

- Centralize a checagem num porteiro (`Guard.requireX(ctx)`), que devolve `null` depois de já ter
  escrito o erro — a rota só precisa retornar.
- Em sistema multi-tenant, **filtre por tenant em toda consulta**. Nunca confie em identificador
  vindo da requisição sem verificar a que conta ele pertence.
- Ao negar acesso a recurso de outra conta, responda **404**, não 403: confirmar que o recurso
  existe mas pertence a outro já é vazamento de informação.

### 16.6 Uploads e arquivos

- Valide **pelo conteúdo real** (assinatura dos primeiros bytes), nunca pela extensão informada
  pelo cliente.
- Limite o tamanho lendo no máximo `limite + 1` bytes e recusando o que passar.
- Guarde fora da pasta pública e sirva por rota autenticada. Arquivo em pasta estática é público
  para quem descobrir o endereço.
- Bloqueie travessia de diretório: normalize o caminho e confirme que ele continua dentro da pasta
  de destino.

### 16.7 Segredos

- Segredo de integração (token de pagamento, chave de API) fica **cifrado no banco**, decifrado em
  memória só na hora de usar. Nunca em texto puro, nunca em arquivo versionado.
- A chave mestra da cifra fica **fora do banco** e fora do controle de versão: uma cópia isolada do
  banco não pode bastar para abrir os segredos.
- Nenhuma rota devolve segredo em texto puro. Para conferência na tela, mostre mascarado
  (`****1234`).
- **O assistente nunca solicita, digita ou embute token de produção.** Ele é inserido pelo próprio
  responsável, na interface, depois do deploy.

### 16.8 Rate limiting

```java
JavalinAPI.configureApiRateLimit("/api/*");        // uso normal da API
JavalinAPI.configureLoginRateLimit("/api/login");  // mais rígido: força bruta
JavalinAPI.setTrustedProxyHops(1);                 // IP real atrás de proxy reverso
```

**Deixe as páginas fora do limite.** Elas são conteúdo, não operação: trocar de tela três vezes em
poucos segundos é navegação normal, e o usuário legítimo acaba bloqueado com a tela de excesso de
requisições. Limite a API e o login, não a leitura de tela.

Deixe de fora também o que é alimentado continuamente (envio de localização) e o que vem de
terceiros com reenvio automático (webhook de pagamento).

> **Ao testar:** o limite de login costuma ser de poucas tentativas por minuto, com bloqueio longo.
> Um laço de espera batendo em `/api/login` queima esse orçamento antes do teste começar — sonde a
> prontidão do servidor por uma rota sem efeito colateral, como `GET /api/me`.

---

## 17. Deploy — Coolify e Dockerfile (obrigatório)

> **Regra:** todo projeto tem `Dockerfile` e `.dockerignore` na raiz, versionados. A hospedagem é o
> **Coolify**: ele constrói a imagem a partir do repositório, publica o contêiner e cuida do
> certificado. Projeto sem `Dockerfile` não sobe.

Modelos prontos: [`templates/Dockerfile`](https://github.com/LuanVictorGit/AngatuLibraries/blob/main/templates/Dockerfile)
e [`templates/.dockerignore`](https://github.com/LuanVictorGit/AngatuLibraries/blob/main/templates/.dockerignore)
no repositório da lib. Detalhes e variações em [`references/deploy-coolify.md`](references/deploy-coolify.md).

### 17.1 O contrato entre aplicação e hospedagem

| Item | Aplicação | Coolify |
|---|---|---|
| Protocolo | HTTP na porta de `PORT` (`8080`) | termina o TLS e encaminha; emite e renova o certificado |
| IP do cliente | `JavalinAPI.setTrustedProxyHops(1)` | injeta `X-Forwarded-For` |
| Dados | `ANGATU_DB_PATH=/data/database.db`, uploads em `/data/...` | volume persistente montado em `/data` |
| Segredos | `Env.get().get("CHAVE")` | *Environment Variables* no painel |
| Saúde | `GET /health` (200, fora do rate limit) | usa o `HEALTHCHECK` da imagem |
| Ambiente | `isLocalhost()` lê `ANGATU_ENV` | `ANGATU_ENV=production` já vem no `Dockerfile` |

### 17.2 Dockerfile padrão (resumo)

Duas etapas: `maven:3.9-eclipse-temurin-21` compila (`mvn package -DskipTests`) e copia o JAR maior de
`target/` como `/opt/app/app.jar`; `eclipse-temurin:21-jre` executa como usuário sem privilégio
(uid 10001), com `WORKDIR /data` — assim banco, `.env` e uploads nascem no volume, e não na camada
descartável do contêiner.

```dockerfile
ENV TZ=America/Sao_Paulo ANGATU_ENV=production ANGATU_DB_PATH=/data/database.db PORT=8080 \
    JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError -Djava.awt.headless=true"
WORKDIR /data
EXPOSE 8080
HEALTHCHECK CMD curl -fsS "http://127.0.0.1:${PORT}/health" || exit 1
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /opt/app/app.jar"]
```

**Memória: sem teto fixo de heap.** `-XX:MaxRAMPercentage=75` faz a JVM se dimensionar pelo
limite do **contêiner**, não pela memória da máquina. Quem decide passa a ser o painel da
hospedagem: mudar a memória lá basta, sem reconstruir a imagem e sem reabrir o `Dockerfile`.

Um `-Xmx` fixo erra dos dois lados e sempre em silêncio: ou sufoca o projeto que cresceu (e o
sintoma chega como lentidão, não como erro claro), ou reserva menos do que a hospedagem já está
cobrando. Fixe um valor apenas quando houver uma medição que o justifique — nunca por precaução.

Três coisas que costumam ser confundidas aqui:

- **A JVM lê o limite do contêiner, não o da máquina.** Desde o Java 10 os `cgroups` são
  respeitados; sem nenhuma opção, o padrão é **25%** desse limite — conservador demais para quem
  gera PDF ou processa imagem. Daí os 75%.
- **O percentual é do HEAP, não do processo.** Fora dele ainda ficam metaspace, cache de código,
  pilhas de thread e memória nativa (SQLite, imagem, Chromium em processo separado). É por isso
  que 75% deixa margem, e não 100%.
- **O `Dockerfile` não define o limite do contêiner.** Isso é `docker run --memory`, o
  `docker-compose` ou o painel do Coolify — e é lá que a memória do projeto se ajusta.
- **`ExitOnOutOfMemoryError` não é opcional.** Sem ele a JVM sem memória não morre: entra em
  coleta de lixo contínua e passa a responder em minutos, o que o `HEALTHCHECK` lê como "vivo".
  Morrer e ser reiniciado é honesto; agonizar de pé não é.

Para ajustar sem reconstruir a imagem, defina `JAVA_OPTS` nas variáveis de ambiente da hospedagem.

**Todo caminho que consome memória proporcional à entrada precisa de teto.** Upload, geração de
imagem, leitura de arquivo: se a operação aceita N pedidos simultâneos de até M bytes, o pior
caso é N×M e ele tem de caber no heap. Recusar com uma mensagem clara é o desfecho bom; aceitar e
ficar sem memória derruba todo mundo que estava conectado.

Projeto com `BrowserAPI`/Playwright: troque a etapa de execução por
`mcr.microsoft.com/playwright/java:v1.58.0-jammy` (a imagem JRE não tem as bibliotecas do
Chromium) — e reserve mais memória ao contêiner no painel, porque o Chromium roda em processo
separado e não entra na conta do heap.

> **Projeto com build de frontend (§9.10):** o `dist/` tem de ser gerado **dentro** da imagem, com
> uma etapa `node:22-alpine` antes da etapa Maven, que roda `tools/frontend-build.mjs` e entrega o
> `dist/` para o `mvn -Pfrontend-dist package`. A etapa de frontend não entra na imagem final — o
> runtime continua só JRE + JAR. O Dockerfile completo das três etapas está em
> [`references/frontend-build.md`](references/frontend-build.md) §15.2. Sem essa etapa, o Coolify
> empacota o source legível: funciona, mas não é o que foi combinado como publicação.

### 17.3 Erros que só aparecem em produção

- **CSS sumido:** `public/styles/tailwind.css` gerado e não commitado. O Coolify constrói do
  repositório — o que não foi versionado não existe lá. Versione o CSS gerado (§9.1).
- **Frontend legível em produção:** faltou a etapa de build na imagem, ou o `mvn package` foi sem
  `-Pfrontend-dist`. O JAR levou `src/main/resources/public` em vez de `dist/public` (§9.10).
- **Dist velho publicado:** o `dist/` foi versionado e ficou para trás do source. O `sourceHash` do
  `dist/.build-info.json` reprova esse caso — mantenha a checagem ligada.
- **Banco zerado a cada deploy:** faltou o volume em `/data` ou o `ANGATU_DB_PATH`.
- **Todo mundo com o mesmo IP no rate limit:** faltou `setTrustedProxyHops(1)`; o IP visto é o do proxy.
- **Login some ao publicar:** cookie `Secure` decidido por `ctx.scheme()`, que dentro do contêiner é
  `http`. Decida por `isLocalhost()` (§16.1).
- **Deploy sobe e reinicia sozinho:** `HEALTHCHECK` batendo em rota inexistente ou bloqueada pelo rate
  limit — crie `GET /health` e `JavalinAPI.addIgnoredPath("/health")`.
- **`COPY target/*.jar` falhou:** o shade gera mais de um JAR; o modelo copia o maior (`ls -S`).

---

## 18. Imagens — perguntar a estratégia de compressão (obrigatório)

> **Regra:** assim que o projeto passar a **salvar imagens** (upload de usuário, foto de produto,
> avatar, anexo, geração de arte), **pare e pergunte ao programador qual estratégia de
> compressão/otimização usar**, antes de escrever o código de gravação. Armazenamento é caro e a
> escolha muda o resultado visual — não é decisão do agente.

### 18.1 A pergunta

Apresente as opções com o efeito de cada uma, e recomende a primeira quando não houver contexto:

| Opção | Estratégia | Efeito típico | Quando faz sentido |
|---|---|---|---|
| **A** (padrão recomendado) | JPEG qualidade 0,8 + lado maior 1600 px | 80–90% menos bytes, diferença imperceptível na tela | fotos de produto, galeria, banner, avatar |
| **B** | Original preservado + derivadas (`thumb` 400 px, `web` 1200 px) | mais espaço, flexibilidade total | quando o original importa — documento, comprovante, arte para impressão |
| **C** | Agressiva: JPEG qualidade 0,6 + lado maior 1024 px | maior economia, perda visível em detalhe fino | catálogos grandes, muitas imagens por registro, orçamento apertado |
| **D** | Sem compressão | nenhum ganho de espaço | exigência legal ou de fidelidade — peça a justificativa e registre |

Pergunte também, quando fizer diferença: **tamanho máximo aceito no upload**, **formatos aceitos** e
se precisa de **miniatura** para listagem.

> **WebP não sai de graça.** O `imageio-webp` do pom só **lê** WebP; para **gravar**, o projeto
> precisa de uma dependência de escrita a mais. Ofereça como opção extra ("~30% menor que JPEG na
> mesma qualidade, exige nova dependência") em vez de assumir que dá para usar.

Registre a escolha no `CLAUDE.md` do projeto (§10.1) — ela vale para todas as telas seguintes, e o
agente não deve reabrir a pergunta a cada nova imagem.

### 18.2 Como implementar (a lib já tem)

```java
// redimensiona mantendo proporção e grava com qualidade controlada
BufferedImage original = ImageAPI.bytesToImage(uploadBytes);
BufferedImage resized  = ImageAPI.resizeMaintainAspect(original, 1600, 1600);
ImageAPI.saveImageWithQuality(resized, "/data/uploads/" + id + ".jpg", 0.8f);

// miniatura para listagem
ImageAPI.createThumbnail(origem, destino, 400, 400);
```

> **Atenção:** `saveImageWithQuality` grava **sempre em JPEG**, qualquer que seja a extensão do
> arquivo — use `.jpg` no nome. Para PNG (transparência), use `ImageAPI.saveImage(...)`, que respeita
> a extensão mas não aceita qualidade.

### 18.3 Onde guardar

- **Arquivo no volume, caminho no banco.** Grave em `/data/uploads/...` (persistente no Coolify, §17)
  e persista apenas o caminho/nome na entidade `Saveable`.
- **Não jogue bytes de imagem dentro do SQLite.** O `Saveable` serializa o objeto inteiro em JSON:
  um `byte[]` vira Base64 dentro da coluna `data`, inchando o banco e cada leitura da entidade. A
  entidade `Image` da lib existe para casos pequenos e pontuais (ícone, QR Code) — não para galeria.
- **Valide antes de gravar:** `ImageAPI.isValidImage(...)`, tamanho máximo e extensão (§16.6).
- **Nomeie por ID gerado**, nunca pelo nome enviado pelo usuário.
