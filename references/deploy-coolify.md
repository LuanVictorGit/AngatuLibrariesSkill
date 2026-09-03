# Deploy no Coolify — Dockerfile, volume e variáveis

Referência completa da §17 da SKILL.md. Use ao criar projeto novo, ao migrar um projeto antigo
(VPS + Let's Encrypt) ou quando o deploy quebrar.

---

## 1. Dockerfile padrão

Copie na raiz do projeto (junto do `pom.xml`). Ajuste apenas a porta, se o projeto usar outra.

```dockerfile
# syntax=docker/dockerfile:1

# ---------------------------------------------------------------- build ------
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

# Dependências primeiro: enquanto o pom.xml não mudar, esta camada é reaproveitada
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -q clean package -DskipTests \
 && mkdir -p /out \
 && cp "$(ls -S target/*.jar | head -n1)" /out/app.jar

# -------------------------------------------------------------- runtime ------
FROM eclipse-temurin:21-jre

ENV TZ=America/Sao_Paulo \
    ANGATU_ENV=production \
    ANGATU_DB_PATH=/data/database.db \
    PORT=8080 \
    JAVA_OPTS="-XX:MaxRAMPercentage=75 -Djava.awt.headless=true"

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl tzdata \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --system --uid 10001 --create-home app \
 && mkdir -p /data \
 && chown -R app:app /data

COPY --from=build --chown=app:app /out/app.jar /opt/app/app.jar

USER app
WORKDIR /data
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/health" || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /opt/app/app.jar"]
```

**Por que cada decisão:**

| Decisão | Motivo |
|---|---|
| `cp "$(ls -S target/*.jar \| head -n1)"` | o shade deixa dois JARs em `target/`; o executável é o maior |
| `WORKDIR /data` com o JAR em `/opt/app` | tudo que a aplicação escreve com caminho relativo (banco, `.env`, uploads) cai no volume; o código fica fora dele |
| `useradd --uid 10001` | a imagem base já tem um usuário no uid 1000; o volume nomeado herda o dono de `/data` |
| `curl` instalado | o `HEALTHCHECK` precisa dele; a imagem JRE não traz |
| `exec java` no ENTRYPOINT | o Java vira PID 1 e recebe o `SIGTERM` do Coolify — sem isso o shutdown hook não roda e o WAL fica sem checkpoint |
| `MaxRAMPercentage=75` | a JVM respeita o limite de memória do contêiner |

## 2. `.dockerignore`

```
target/
out/
bin/
.git/
.gitignore
.github/
*.db
*.db-shm
*.db-wal
data/
uploads/
.env
.env.*
tools/
node_modules/
package.json
package-lock.json
.idea/
.vscode/
.settings/
.classpath
.project
.factorypath
docs/
*.md
*.log
*.tmp
*.bak
```

## 3. Inicialização da aplicação

```java
public class Main {
    public static void main(String[] args) {
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));

        JavalinAPI.setTrustedProxyHops(1);   // antes do construtor
        new AngatuLib("meusite.com.br", port, true);

        JavalinAPI.addIgnoredPath("/health");
        JavalinAPI.configureApiRateLimit("/api/*");
        JavalinAPI.configureLoginRateLimit("/api/login");

        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            Saveable.shutdown();
            Task.shutdown();
        }));
    }
}
```

Rota de saúde (obrigatória, é o que o `HEALTHCHECK` consulta):

```java
/**
 * Rota de verificação de saúde usada pelo contêiner.
 *
 * @author Angatu Sistemas
 */
public class HealthRoute extends Route {
    public HealthRoute() { super("/health", RouteType.GET, ctx -> ctx.json("{\"status\":\"ok\"}")); }
}
```

## 4. Configuração no painel do Coolify

1. **Application → Build Pack: Dockerfile**, apontando para o repositório e a branch.
2. **Port**: `8080` (a mesma do `EXPOSE`/`PORT`).
3. **Domain**: o domínio do projeto — o Coolify emite e renova o certificado. Nada de SSL na aplicação.
4. **Persistent Storage**: volume nomeado montado em `/data` — um por projeto. Cada
   aplicação tem o seu `database.db`; nada é compartilhado entre projetos.
5. **Environment Variables**: as chaves que estavam no `.env`
   (`EMAIL_KEY`, `EMAIL_PASSWORD`, `MP_ACCESS_TOKEN`, `DEEPSEEK_API_KEY`, …).
   `Env.get().get("CHAVE")` lê variável de ambiente do mesmo jeito que lia o arquivo.
6. **Health Check**: o do `Dockerfile` já basta.

> Volume **nomeado** em vez de caminho do host: o volume nomeado herda o dono de `/data` da imagem
> (uid 10001). Com caminho do host, rode `chown -R 10001:10001 <caminho>` antes do primeiro deploy,
> ou a aplicação não consegue criar o banco.

## 5. Teste local antes de subir

```bash
docker build -t meuprojeto .
docker run --rm -p 8080:8080 -v meuprojeto-data:/data meuprojeto
# valide http://localhost:8080/ e http://localhost:8080/health
```

Se a imagem sobe e responde localmente, o Coolify vai subir igual. É esse teste que pega CSS não
versionado, JAR errado e rota de saúde faltando.

## 6. Projetos com Playwright (BrowserAPI)

A imagem `eclipse-temurin:21-jre` não tem as bibliotecas do Chromium. Troque só a etapa de execução:

```dockerfile
FROM mcr.microsoft.com/playwright/java:v1.58.0-jammy
# ... mesmas ENV, mesmo usuário, mesmo WORKDIR /data, mesmo ENTRYPOINT
```

## 7. Migrar projeto antigo (VPS + Let's Encrypt)

1. `Main`: remova porta fixa e certificados — `new AngatuLib(dominio, port, true)` com `port` de `PORT`.
2. Adicione `JavalinAPI.setTrustedProxyHops(1)` e a rota `/health`.
3. Copie `Dockerfile` e `.dockerignore`.
4. Copie `database.db` (com `-shm`/`-wal`, se existirem) para o volume `/data` antes do primeiro deploy.
5. Suba os uploads/arquivos que ficavam ao lado do JAR para `/data/...` e ajuste os caminhos.
6. Confira quem usa `isLocalhost()`: agora ele vem de `ANGATU_ENV` (o `Dockerfile` define `production`)
   ou do host local — não mais da pasta de certificados.
7. Versione `public/styles/tailwind.css` se ele estava só na máquina.
8. Só mantenha `manageSsl = true` se o projeto continuar fora do Coolify, com certificados próprios.
