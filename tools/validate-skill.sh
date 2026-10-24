#!/usr/bin/env bash
#
# Verificacao estrutural da AngatuLibrariesSkill.
#
# Existe para impedir as regressoes que motivaram a refatoracao: a description
# crescer alem do corte do carregador, o SKILL.md voltar a ser conteudo em vez
# de despachante, e as regras endurecidas (R19, R22, R30) serem escritas como
# contradicao do que ja estava no arquivo.
#
# Uso: bash tools/validate-skill.sh
# Saida: 0 quando tudo passa, 1 quando alguma verificacao reprova.

set -uo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 2

FALHAS=0

ok()    { printf '  ok    %s\n' "$1"; }
falha() { printf '  FALHA %s\n' "$1"; FALHAS=$((FALHAS + 1)); }
aviso() { printf '  aviso %s\n' "$1"; }
secao() { printf '\n%s\n' "$1"; }

# Le um arquivo e reprova quando o padrao nao aparece.
# exige <arquivo> <padrao grep -E> <mensagem de ok> <mensagem de falha>
exige() {
  if grep -qE "$2" "$1" 2>/dev/null; then ok "$3"; else falha "$4"; fi
}

# ---------------------------------------------------------------------------
# 1. description dentro do orcamento do carregador
#
# O corte observado foi em ~1535 caracteres. Acima disso a lista de gatilhos —
# que fica no fim — simplesmente nao chega ao modelo, e a skill deixa de ser
# carregada sozinha. Foi exatamente esse o sintoma "o agente nao ativa a skill".
# ---------------------------------------------------------------------------
secao 'description'

DESCRICAO=$(awk '
  /^---$/ { delimitador++; next }
  delimitador == 1 && /^description:[[:space:]]/ {
    emDescricao = 1; sub(/^description:[[:space:]]*/, ""); print; next
  }
  delimitador == 1 && emDescricao && /^[a-zA-Z_-]+:[[:space:]]/ { emDescricao = 0 }
  delimitador == 1 && emDescricao { print }
' SKILL.md)

TAMANHO=$(printf '%s' "$DESCRICAO" | tr -d '\n' | wc -c | tr -d ' ')

if [ "$TAMANHO" -eq 0 ]; then
  falha 'description ausente ou nao reconhecida no frontmatter'
elif [ "$TAMANHO" -gt 1500 ]; then
  falha "description com $TAMANHO caracteres (teto 1500) — a lista de gatilhos sera cortada"
else
  ok "description com $TAMANHO caracteres (teto 1500)"
fi

case "$DESCRICAO" in
  *Triggers*) ok 'description termina com a lista de gatilhos' ;;
  *)          falha 'description sem lista de gatilhos ("Triggers")' ;;
esac

# O modulo de video so e alcancado se a description disparar no pedido. Sem os
# gatilhos, "faz um video edit PHONK" nao carrega a skill -- e o video sai sem G5.
for GATILHO in video PHONK; do
  case "$DESCRICAO" in
    *"$GATILHO"*) ok "description dispara em $GATILHO" ;;
    *)            falha "description sem o gatilho $GATILHO -- pedido de video nao carrega a skill" ;;
  esac
done

# ---------------------------------------------------------------------------
# 2. SKILL.md continua despachante, nao conteudo
#
# O corpo do SKILL.md e carregado de uma vez e e o primeiro a ser resumido pela
# compactacao. Quanto maior, mais cedo some da sessao — foi o sintoma "depois de
# um tempo o agente parece nao lembrar mais dela".
# ---------------------------------------------------------------------------
secao 'SKILL.md'

# O TETO SUBIU DE 400 PARA 430 QUANDO R36 ENTROU, DE 430 PARA 450 QUANDO O
# MODULO DE VIDEO ENTROU (R37 E G5), E DE 450 PARA 460 QUANDO O PADRAO JAVA
# ENTROU (R38, R39 E R40: tres regras curtas aqui, java-standard.md inteiro
# em references/) -- E O MOTIVO IMPORTA.
# Ele nao mede tamanho por si: mede se o SKILL.md continua despachante. Uma
# regra nova custa poucas linhas aqui e o detalhe dela desce para references/ --
# foi o que R36 fez, com whatsapp.md levando coordenadas, API e armadilhas, e o
# que R37 fez: regra, portao, duas linhas de rota e o resumo do CLAUDE.md aqui,
# contra sete references e onze ferramentas com o ciclo inteiro. O que o teto
# tem de barrar e conteudo que deveria estar num reference voltando para ca; se
# subir de novo, a pergunta antes de mexer no numero e essa.
# From 460 to 475 when the proposal module came in (R41 and G6): the rule, the
# gate, one routing row, the block summary and one checklist line here, against
# the whole of references/proposal.md and tools/proposal/.
# From 475 to 490 when the companion skills became mandatory (R42 and R43): two
# rules, one routing row, one paragraph and two summary lines in the CLAUDE.md
# block, against the whole of references/companion-skills.md.
# From 490 to 500 when the command-execution module joined every CLAUDE.md
# (R44): the rule, one routing row, one summary line and a three-line pointer
# here, while the module itself lives in references/command-execution.md.
LINHAS=$(wc -l < SKILL.md | tr -d ' ')
if [ "$LINHAS" -gt 500 ]; then
  falha "SKILL.md com $LINHAS linhas (teto 500) — conteudo deve descer para references/"
else
  ok "SKILL.md com $LINHAS linhas (teto 500)"
fi

if grep -q 'AngatuLibrariesSkill:begin' SKILL.md && grep -q 'AngatuLibrariesSkill:end' SKILL.md; then
  ok 'bloco de persistencia do CLAUDE.md presente e delimitado'
else
  falha 'bloco AngatuLibrariesSkill:begin/end ausente do SKILL.md — R1 perde a ancora'
fi

for GATE in G1 G2 G3 G4 G5 G6; do
  if grep -q "$GATE" SKILL.md; then
    ok "gate $GATE declarado"
  else
    falha "gate $GATE ausente do SKILL.md"
  fi
done

# ---------------------------------------------------------------------------
# 3. nenhuma referencia sobrando ao sistema antigo de secoes
#
# Os IDs R<n> sao estaveis; "9.4" com o sinal de secao deixou de apontar para
# qualquer lugar no momento em que o conteudo desceu para references/.
# ---------------------------------------------------------------------------
secao 'referencias cruzadas'

SECAO_ANTIGA=$(grep -rln 'ยง' --include='*.md' . 2>/dev/null | grep -v 'SKILL.old.md' || true)
SECAO_ANTIGA=$(grep -rln "$(printf '\xc2\xa7')" --include='*.md' . 2>/dev/null | grep -v 'SKILL.old.md' || true)

if [ -n "$SECAO_ANTIGA" ]; then
  falha 'referencia ao sistema antigo de secoes sobrando nos arquivos abaixo'
  printf '%s\n' "$SECAO_ANTIGA" | sed 's/^/        /'
else
  ok 'nenhuma referencia ao sistema antigo de secoes'
fi

# ---------------------------------------------------------------------------
# 4. todo references/*.md citado existe no disco
# ---------------------------------------------------------------------------
# As linhas de credito no rodape citam arquivos das skills de origem, que nao
# vivem aqui — sao excluidas antes da extracao para nao virar falso positivo.
CITADOS=$(grep -rhE '[a-z0-9-]+\.md' --include='*.md' SKILL.md references/ 2>/dev/null \
          | grep -v '^\*Original source:' \
          | grep -oE '[a-z0-9-]+\.md' \
          | sort -u | grep -vE '^(SKILL|SKILL.old|MASTER|README|CLAUDE|GEMINI|gemini)\.md$' || true)

AUSENTES=0
TOTAL_CITADOS=0
for NOME in $CITADOS; do
  TOTAL_CITADOS=$((TOTAL_CITADOS + 1))
  if [ ! -f "references/$NOME" ]; then
    falha "citado e inexistente: references/$NOME"
    AUSENTES=$((AUSENTES + 1))
  fi
done
if [ "$AUSENTES" -eq 0 ]; then
  ok "todos os $TOTAL_CITADOS references citados existem"
fi

# ---------------------------------------------------------------------------
# 5. nenhum reference orfao
#
# Um arquivo que ninguem cita nunca sera lido: divulgacao progressiva so
# funciona se a tabela de roteamento do SKILL.md alcanca tudo.
# ---------------------------------------------------------------------------
ORFAOS=0
for ARQUIVO in references/*.md; do
  NOME=$(basename "$ARQUIVO")
  if grep -q "$NOME" SKILL.md; then
    continue
  fi
  if grep -rq "$NOME" references/ --include='*.md' 2>/dev/null; then
    aviso "$NOME nao aparece no roteamento do SKILL.md (so citado por outro reference)"
  else
    falha "reference orfao, ninguem cita: $ARQUIVO"
    ORFAOS=$((ORFAOS + 1))
  fi
done
if [ "$ORFAOS" -eq 0 ]; then
  ok 'nenhum reference orfao'
fi

# ---------------------------------------------------------------------------
# 6. todo R<n> citado existe no SKILL.md
#
# Citar "R31" num reference e pior que nao citar nada: manda o agente procurar
# uma regra que nao existe.
# ---------------------------------------------------------------------------
DEFINIDAS=$(grep -oE '^- \*\*R[0-9]+' SKILL.md | grep -oE 'R[0-9]+' | sort -u)
QUANTAS=$(printf '%s\n' "$DEFINIDAS" | grep -c . || true)
MAIOR=$(printf '%s\n' "$DEFINIDAS" | tr -d 'R' | sort -n | tail -n 1)

if [ "$QUANTAS" -lt 1 ]; then
  falha 'nenhuma regra R<n> reconhecida no SKILL.md — o formato da lista mudou?'
else
  ok "$QUANTAS regras definidas no SKILL.md, ate R$MAIOR"
fi

QUEBRADAS=0
CITADAS=$(grep -rhoE '\bR[0-9]+\b' --include='*.md' SKILL.md references/ 2>/dev/null | sort -u)
for REGRA in $CITADAS; do
  if ! printf '%s\n' "$DEFINIDAS" | grep -qx "$REGRA"; then
    falha "citada e nao definida no SKILL.md: $REGRA"
    QUEBRADAS=$((QUEBRADAS + 1))
  fi
done
if [ "$QUEBRADAS" -eq 0 ]; then
  ok 'toda regra citada esta definida no SKILL.md'
fi

# ---------------------------------------------------------------------------
# 7. as regras endurecidas nao viraram contradicao
#
# R19 (ofuscacao obrigatoria) so e aplicavel com seus limites escritos junto.
# Sem eles, "obrigatorio" autoriza quebrar acessibilidade, SEO e e-mail — e o
# agente recebe duas instrucoes opostas.
# ---------------------------------------------------------------------------
secao 'regras endurecidas'

FB=references/frontend-build.md
exige "$FB" 'R19' 'frontend-build.md cita R19' 'frontend-build.md nao cita R19'
exige "$FB" 'R20' 'frontend-build.md preserva a ordem de prioridade de R20' \
                  'frontend-build.md sem a ordem de prioridade de R20'
exige "$FB" 'R18' 'frontend-build.md preserva o source legivel de R18' \
                  'frontend-build.md sem o limite de R18, o source legivel'
exige "$FB" 'emails/' 'exclusao de emails/ presente' \
                      'exclusao de emails/ ausente — cliente de e-mail quebra'
exige "$FB" 'sw\.js' 'exclusao de sw.js presente' 'exclusao de sw.js ausente'
exige "$FB" 'vendor/' 'exclusao de vendor/ presente' 'exclusao de vendor/ ausente'
exige "$FB" 'does not mean always maximum' \
            'frontend-build.md distingue sempre ligada de sempre maxima' \
            'frontend-build.md nao distingue sempre ligada de sempre maxima — R19 vira licenca'
exige "$FB" 'proven|prova' 'frontend-build.md exige prova antes de renomear' \
                           'frontend-build.md sem a exigencia de prova de seguranca'
exige "$FB" 'renameFiles' 'frontend-build.md renomeia arquivo e pasta' \
                          'frontend-build.md sem a renomeacao de arquivo — o dist entrega o indice'
exige "$FB" 'neverRename' 'frontend-build.md tem a lista unica de nomes fixos' \
                          'frontend-build.md sem neverRename — nada protege sw.js nem as URLs'
exige "$FB" 'renameGlobals' 'frontend-build.md trata os globais compartilhados' \
                            'frontend-build.md sem a regra dos globais compartilhados'
exige "$FB" "legalComments" 'frontend-build.md tira o comentario de licenca do dist' \
                              'frontend-build.md sem legalComments — o dist sai comentado'
exige "$FB" 'mso' 'frontend-build.md preserva o comentario condicional do Outlook' \
                  'frontend-build.md sem a excecao do mso — o e-mail quebra no Outlook'

SEC=references/security.md
exige "$SEC" 'R22' 'security.md cita R22' 'security.md nao cita R22'
exige "$SEC" 'R9'  'security.md liga estoque a R9 e mutate' \
                   'security.md nao cita R9 no ponto do estoque'
exige "$SEC" 'Burp|burp' 'security.md nomeia o modelo de ameaca' \
                         'security.md sem o modelo de ameaca, o proxy de interceptacao'
exige "$SEC" '404' 'security.md manda responder 404 a recurso de outra conta' \
                   'security.md sem a regra do 404 em vez de 403'

CP=references/content-protection.md
exige "$CP" 'R20' 'content-protection.md preserva a ordem de R20' \
                  'content-protection.md sem o limite de R20'
exige "$CP" 'never page-wide|never on .document|nunca na pagina' \
            'content-protection.md proibe bloqueio global de contextmenu' \
            'content-protection.md sem a proibicao de bloqueio global'
exige "$CP" 'PIX|pix' 'content-protection.md preserva o que o visitante precisa copiar' \
                      'content-protection.md sem a lista do que nunca se bloqueia'

TS=references/turnstile.md
exige "$TS" 'TURNSTILE_SECRET_KEY' 'turnstile.md le a chave privada do .env' \
                                   'turnstile.md sem TURNSTILE_SECRET_KEY'
exige "$TS" 'TURNSTILE_SITE_KEY' 'turnstile.md le a chave publica do .env' \
                                 'turnstile.md sem TURNSTILE_SITE_KEY'
exige "$TS" 'siteverify' 'turnstile.md confere o token no backend' \
                         'turnstile.md sem a verificacao em siteverify'
exige "$TS" 'turnstile-privacy-policy' \
            'turnstile.md exige o aviso na politica de privacidade' \
            'turnstile.md sem o link da politica de privacidade da Cloudflare'
exige "$TS" 'challenges\.cloudflare\.com' 'turnstile.md lembra da CSP' \
                                          'turnstile.md sem a armadilha da CSP'

EP=references/email-design.md
exige "$EP" 'R13|design system' 'email-design.md herda o sistema de design' \
                                'email-design.md sem o vinculo com o sistema de design'
exige "$EP" '600' 'email-design.md fixa a largura de 600px' 'email-design.md sem a largura de 600px'

PV=references/frontend-preview.md
exige "$PV" 'R29' 'frontend-preview.md reconcilia com R29' \
                  'frontend-preview.md sem a reconciliacao com R29'
exige "$PV" '375' 'frontend-preview.md captura tambem em 375px' \
                  'frontend-preview.md sem a captura mobile'

ST=references/static-site.md
exige "$ST" 'nginx:alpine' 'static-site.md usa nginx:alpine' 'static-site.md sem nginx:alpine'
exige "$ST" 'no-store' 'static-site.md mantem R25 no nginx' 'static-site.md sem no-store'

# preview.py so vale enquanto espelha o nginx.conf. A divergencia entre os dois
# e silenciosa: a tela passa no preview e morre em producao, que e exatamente o
# incidente que R29 documenta. Entao a paridade e cobrada item a item.
PV_PY=references/frontend-preview.md
NGINX=references/static-site.md

exige "$PV_PY" 'preview\.py' 'frontend-preview.md traz o servidor de preview' \
                             'frontend-preview.md sem tools/preview.py'
exige "$NGINX" 'preview\.py' 'static-site.md aponta para o preview' \
                             'static-site.md nao cita tools/preview.py'

DIVERGENCIA=0
for ITEM in 'no-store' 'X-Content-Type-Options' 'X-Frame-Options' 'Referrer-Policy' \
            "default-src 'self'" 'challenges\.cloudflare\.com' "img-src 'self' data:" \
            'try_files' '404\.html'; do
  EM_NGINX=$(grep -cE "$ITEM" "$NGINX" 2>/dev/null || echo 0)
  EM_PREVIEW=$(grep -cE "$ITEM" "$PV_PY" 2>/dev/null || echo 0)
  if [ "$EM_NGINX" -gt 0 ] && [ "$EM_PREVIEW" -eq 0 ]; then
    falha "preview.py nao espelha o nginx.conf em: $ITEM"
    DIVERGENCIA=$((DIVERGENCIA + 1))
  fi
done
if [ "$DIVERGENCIA" -eq 0 ]; then
  ok 'preview.py espelha os cabecalhos, o try_files e o 404 do nginx.conf'
fi

exige "$PV_PY" 'same commit|mesmo commit' \
               'frontend-preview.md exige os dois mudando juntos' \
               'frontend-preview.md nao exige nginx.conf e preview.py no mesmo commit'
exige "$PV_PY" 'exec:java' 'frontend-preview.md traz o laco rapido do backend' \
                           'frontend-preview.md sem a alternativa rapida — vao usar servidor externo'

# R29 so e seguida se o laco rapido existir. Sem ele o custo de testar empurra
# para o servidor falso, que e exatamente o que a regra proibe.
RT=references/route-testing.md
exige "$RT" 'R22' 'route-testing.md prova as decisoes de R22 na camada barata' \
                  'route-testing.md nao liga a camada de servico a R22'
exige "$RT" '404' 'route-testing.md testa 404 em recurso de outra conta' \
                  'route-testing.md sem o teste de 404 contra 403'
exige "$RT" 'ANGATU_DB_PATH' 'route-testing.md isola o banco de teste' \
                             'route-testing.md sem isolamento do banco — vai corromper o de desenvolvimento'
exige "$RT" 'nunca instanciad|never instantiated|uma unica vez|garantirNoAr' \
            'route-testing.md respeita o AngatuLib unico por processo' \
            'route-testing.md nao trata o limite de uma instancia de AngatuLib por processo'
exige "$RT" 'docker build' 'route-testing.md mantem o JAR e o conteiner antes de entregar' \
                           'route-testing.md largou a camada 3 — R29 perde o portao'
exige "$RT" 'skipTests' 'route-testing.md avisa que -DskipTests pula a suite' \
                        'route-testing.md nao avisa sobre -DskipTests'

# R32 e a regra mais facil de escrever errado: "apague o que nao e usado" derruba
# rota viva, porque neste stack rota viva tem zero referencia estatica. Entao a
# prova, as faixas e a excecao do banco sao cobradas uma a uma.
DC=references/dead-code.md
exige "$DC" 'org\.reflections' 'dead-code.md fundamenta a prova na descoberta por reflexao'                                'dead-code.md nao cita org.reflections — a prova de rota fica sem base'
exige "$DC" 'database|banco' 'dead-code.md protege o banco' 'dead-code.md sem a protecao do banco'
exige "$DC" 'DROP TABLE' 'dead-code.md proibe DROP a titulo de limpeza'                          'dead-code.md nao proibe DROP TABLE'
exige "$DC" '/data' 'dead-code.md protege uploads e /data' 'dead-code.md sem a protecao de /data'
exige "$DC" 'Band 0|Faixa 0' 'dead-code.md separa a faixa intocavel' 'dead-code.md sem a faixa 0'
exige "$DC" 'Band 1|Faixa 1' 'dead-code.md separa a faixa que exige aprovacao' 'dead-code.md sem a faixa 1'
exige "$DC" 'Band 2|Faixa 2' 'dead-code.md separa a faixa automatica' 'dead-code.md sem a faixa 2'
exige "$DC" '301' 'dead-code.md aposenta pagina publica com 301'                   'dead-code.md nao manda usar 301 ao aposentar pagina'
exige "$DC" 'string literal|literal de string' 'dead-code.md varre literais de string'                                                'dead-code.md nao varre literais de string — reflexao por nome escapa'
exige "$DC" 'git status' 'dead-code.md confere arquivo nao rastreado antes de apagar'                          'dead-code.md nao avisa que arquivo nao rastreado nao volta'
exige "$DC" 'first use|primeiro uso' 'dead-code.md define a varredura de primeiro uso'                                      'dead-code.md sem a varredura de primeiro uso'

# E o mais importante: R32 nao pode ter sido escrita por cima de 6.3.
exige "$FB" 'forbidden to "clean up" a function that looks unused'             'frontend-build.md mantem a proibicao de limpar funcao que parece nao usada'             'frontend-build.md perdeu a protecao de 6.3 — R32 foi escrita por cima dela'
exige "$FB" 'R32' 'frontend-build.md diz que R32 nao o afrouxa'                   'frontend-build.md nao reconcilia com R32'

# R33 e a regra com maior risco de virar integracao inventada: o endpoint de
# login nao estava publicado no contrato do CRM quando a regra foi escrita.
# Entao o que se cobra e a parada dura e os invariantes que valem sempre.
AO=references/auth-oauth.md
exige "$AO" 'crm\.angatusistemas\.com\.br' 'auth-oauth.md aponta para a documentacao do CRM'                                             'auth-oauth.md sem a fonte de verdade do CRM'
exige "$AO" 'openapi\.json' 'auth-oauth.md manda conferir o contrato'                             'auth-oauth.md nao manda conferir o openapi.json'
exige "$AO" 'Stop and tell the project owner|stop and tell the owner|Stop'             'auth-oauth.md para quando o endpoint nao existe'             'auth-oauth.md sem a parada dura — vai inventar integracao'
exige "$AO" 'never invent|Do not invent|nao inventar' 'auth-oauth.md proibe inventar endpoint'                                                       'auth-oauth.md nao proibe inventar endpoint'
exige "$AO" 'google:login' 'auth-oauth.md nomeia a permissao do token'                           'auth-oauth.md sem a permissao google:login'
exige "$AO" 'redirect_uri' 'auth-oauth.md traz o pre-requisito do redirect_uri'                            'auth-oauth.md sem o cadastro do redirect_uri'
exige "$AO" 'auth/google/sessions' 'auth-oauth.md traz o inicio da sessao'                                    'auth-oauth.md sem o endpoint de inicio'
exige "$AO" 'auth/google/token' 'auth-oauth.md traz a troca do codigo'                                 'auth-oauth.md sem o endpoint de troca'
exige "$AO" 'echoes it|returns intact|devolve intacto'             'auth-oauth.md deixa claro que o CRM so ecoa o state'             'auth-oauth.md deixa o agente supor que o CRM confere o state'
exige "$AO" 'two minutes|dois minutos' 'auth-oauth.md registra o prazo do codigo'                                        'auth-oauth.md sem o prazo de dois minutos do codigo'
exige "$AO" 'offline' 'auth-oauth.md trata a armadilha do offline'                       'auth-oauth.md sem a armadilha do offline'
exige "$AO" 'state' 'auth-oauth.md exige o parametro state' 'auth-oauth.md sem o parametro state'
exige "$AO" 'sub' 'auth-oauth.md usa o sub como identificador'                   'auth-oauth.md nao define o identificador estavel'
exige "$AO" 'email_verified|unverified e-mail' 'auth-oauth.md recusa e-mail nao verificado'                                                'auth-oauth.md aceita e-mail nao verificado'
exige "$AO" 'R23' 'auth-oauth.md emite sessao propria conforme R23'                   'auth-oauth.md nao liga a sessao a R23'
exige "$AO" 'R22' 'auth-oauth.md tira a identidade do servidor, nao do cliente'                   'auth-oauth.md nao cita R22 no ponto da identidade'
exige "$AO" 'privacy policy|politica de privacidade' 'auth-oauth.md atualiza a politica de privacidade'                                                      'auth-oauth.md esquece a politica de privacidade'
exige "$AO" 'R18|already has a working' 'auth-oauth.md preserva login existente'                                         'auth-oauth.md nao protege o login que ja funciona'

# R34 tem dois modos de falhar em silencio: ler o IP errado atras do proxy
# (nao bloqueia ninguem, ou bloqueia todo mundo) e falhar fechado quando a
# Spamhaus cai, virando indisponibilidade autoinfligida.
IB=references/ip-blocklist.md
exige "$IB" 'drop_v4\.json' 'ip-blocklist.md traz a lista IPv4' 'ip-blocklist.md sem a lista IPv4'
exige "$IB" 'drop_v6\.json' 'ip-blocklist.md cobre IPv6'                             'ip-blocklist.md so cobre IPv4 — cliente movel passa direto'
exige "$IB" 'fails open|falha aberta' 'ip-blocklist.md falha aberto'                                       'ip-blocklist.md nao declara falha aberta — vira indisponibilidade'
exige "$IB" 'JSON Lines' 'ip-blocklist.md avisa que o formato e JSON Lines'                          'ip-blocklist.md nao avisa do formato — fromJson no arquivo inteiro quebra'
exige "$IB" 'records' 'ip-blocklist.md confere o total contra os metadados'                       'ip-blocklist.md nao detecta download truncado'
exige "$IB" 'X-Forwarded-For' 'ip-blocklist.md proibe ler o cabecalho direto'                               'ip-blocklist.md nao trata a armadilha do proxy'
exige "$IB" 'setTrustedProxyHops|proxy hops' 'ip-blocklist.md liga o IP ao proxy configurado'                                              'ip-blocklist.md nao diz de onde vem o IP do cliente'
exige "$IB" '/health' 'ip-blocklist.md preserva o healthcheck'                       'ip-blocklist.md pode bloquear /health — o conteiner entra em loop de restart'
exige "$IB" 'R25' 'ip-blocklist.md reconcilia com R25'                   'ip-blocklist.md nao reconcilia com R25 — duas instrucoes opostas sobre cache'
exige "$IB" 'Task' 'ip-blocklist.md atualiza a lista pelo Task da lib'                    'ip-blocklist.md nao usa Task na atualizacao'
exige "$IB" 'edrop|eDROP' 'ip-blocklist.md avisa que o eDROP foi fundido'                           'ip-blocklist.md nao avisa da fusao do eDROP'
exige references/cache.md 'R34' 'cache.md diz que a blocklist nao e conteudo'                                 'cache.md nao reconcilia R25 com R34'

# A pagina de bloqueio e a superficie que todo mundo esquece por nao pensar
# nela como pagina. R17 so pega se estiver escrito que 429 e 403 entram.
BS=references/backend-server.md
exige "$BS" 'watermark|marca' 'backend-server.md poe a marca na pagina de bloqueio'                               'backend-server.md sem a marca na pagina de bloqueio'
exige "$BS" 'R17' 'backend-server.md liga a pagina de bloqueio a R17'                   'backend-server.md nao cita R17 na pagina de bloqueio'
exige "$BS" 'noindex' 'backend-server.md marca a pagina de bloqueio como noindex'                       'backend-server.md sem noindex na pagina de bloqueio'
exige "$BS" 'BlockInfo|remaining time|tempo restante'             'backend-server.md exige o tempo restante real'             'backend-server.md nao exige o tempo restante na pagina de bloqueio'
exige "$BS" 'self-contained|inline .style' 'backend-server.md faz a pagina de bloqueio autocontida'                                            'backend-server.md nao trata a pagina de bloqueio como autocontida'
exige "$IB" 'not licence to strip|429' 'ip-blocklist.md separa o 403 do DROP da pagina de 429'                                        'ip-blocklist.md pode fazer o agente apagar a pagina de 429'

# Docker so entra na producao. Sem isso escrito, o reflexo e oferecer
# docker-compose para desenvolver e trocar um laco de segundos por um rebuild.
TS_=references/testing.md
exige "$TS_" 'production, not the workbench|Docker is only for going to production'              'testing.md separa o conteiner do laco de desenvolvimento'              'testing.md ainda trata docker como passo do laco'
exige "$TS_" 'mvn exec:java' 'testing.md aponta o ambiente real de desenvolvimento'                              'testing.md nao diz onde se desenvolve, se nao e no conteiner'
exige references/deploy-coolify.md 'about production|producao'      'deploy-coolify.md se declara de producao' 'deploy-coolify.md nao se enquadra como producao'
if grep -qE '^4\. \*\*Validate the container' "$TS_"; then
  falha 'testing.md voltou a por docker build dentro do laco'
else
  ok 'docker build fora do laco de desenvolvimento'
fi

# R35 e regra de olho, nao de grep — o risco e ela virar lista de proibicoes
# sem limite, e ai o agente ignora na primeira vez que a pagina precisa de um
# divisor. O limite tem de estar escrito junto.
AA=references/anti-ai-design.md
exige "$AA" 'eyebrow' 'anti-ai-design.md separa o rotulo do enfeite'                       'anti-ai-design.md proibe o rotulo junto com o traco'
exige "$AA" 'screenshot of any other product' 'anti-ai-design.md traz o teste de olho'                                               'anti-ai-design.md sem o teste de generico'
exige "$AA" 'did anyone decide this|decidiu' 'anti-ai-design.md poe o limite na decisao'                                              'anti-ai-design.md vira lista de proibicao sem limite'
exige "$AA" 'R20' 'anti-ai-design.md preserva a ordem de R20'                   'anti-ai-design.md nao protege acessibilidade e clareza'
exige "$AA" 'R13' 'anti-ai-design.md cobre e-mail, erro e impressao'                   'anti-ai-design.md so cobre a landing'
exige references/landing-copy.md 'anti-ai-design' 'landing-copy.md aponta para a metade visual'                                  'landing-copy.md nao liga texto e layout'
exige references/frontend-preview.md 'anti-ai-design|screenshot of any other product'      'frontend-preview.md roda a pergunta de R35 no preview'      'frontend-preview.md nao roda a checagem visual onde ela e possivel'

# R1 so vale se o bloco que vai para o CLAUDE.md do projeto exigir a skill
# CARREGADA PARA PENSAR. "carregue no inicio da sessao" e conselho; o que a
# regra precisa e da exigencia escrita no arquivo que sobrevive a compactacao.
exige SKILL.md 'toda vez que se for pensar'       'bloco do CLAUDE.md exige a skill carregada para pensar'       'bloco do CLAUDE.md voltou a pedir so o carregamento no inicio da sessao'
exige SKILL.md 'antes de responder'       'bloco do CLAUDE.md manda carregar antes de responder'       'bloco do CLAUDE.md sem a ordem de carregar antes de responder'

# R4 deixou de ser so sobre AngatuLibraries. Sem os dois fatos escritos --
# toda lib da Angatu, e a conferencia mesmo sem pedido -- ela volta a ser lida
# como "confira quando for criar o pom".
exige SKILL.md 'every Angatu library' 'R4 cobre toda biblioteca da Angatu'                                       'R4 voltou a cobrir so AngatuLibraries'
exige SKILL.md 'even when nobody asked|checked unasked'       'R4 exige conferir mesmo sem pedido' 'R4 sem a conferencia nao pedida'

# R36 tem dois modos de falhar. O primeiro e virar preferencia: sem o link
# escrito, o agente resolve WhatsApp com a primeira biblioteca que lembrar. O
# segundo e pior -- mandar automatizar sem dizer que o numero pode ser banido.
WA=references/whatsapp.md
exige SKILL.md 'AngatuWhatsappSDK' 'R36 nomeia o SDK no SKILL.md' 'R36 sem o nome do SDK'
exige SKILL.md 'github\.com/LuanVictorGit/AngatuWhatsappSDK'       'R36 traz o link do repositorio' 'R36 sem o link — o agente nao tem onde ler'
exige "$WA" 'github\.com/LuanVictorGit/AngatuWhatsappSDK'       'whatsapp.md traz o link do repositorio' 'whatsapp.md sem o link do repositorio'
exige "$WA" 'banned|banimento' 'whatsapp.md avisa do risco de banimento'                                'whatsapp.md manda automatizar sem avisar do risco'
exige "$WA" 'Baileys' 'whatsapp.md nomeia a base nao oficial' 'whatsapp.md esconde a base'
exige "$WA" 'Never Baileys directly|nunca Baileys'       'whatsapp.md proibe usar Baileys direto' 'whatsapp.md sem a proibicao de Baileys direto'
exige "$WA" 'no tags and no releases|publishes no tags'       'whatsapp.md registra que nao ha tag — a versao e o commit'       'whatsapp.md sem o fato de nao haver tag; vao procurar uma versao que nao existe'
exige "$WA" 'R25' 'whatsapp.md reconcilia a sessao com R25'                   'whatsapp.md nao reconcilia com R25 — duas instrucoes opostas sobre guardar estado'
exige "$WA" '/data' 'whatsapp.md poe a sessao no volume'                     'whatsapp.md sem o volume — todo deploy vai pedir QR Code de novo'
exige "$WA" 'R22' 'whatsapp.md nao deixa o navegador escolher o destinatario'                   'whatsapp.md sem R22 — a rota vira relay de WhatsApp para qualquer numero'
exige "$WA" 'shutdown hook|addShutdownHook' 'whatsapp.md lembra de fechar o bridge'                                             'whatsapp.md sem o encerramento — processo Node orfao'
exige "$WA" 'R26' 'whatsapp.md preserva R26' 'whatsapp.md nao reconcilia com R26'

# R19 alcanca o nome, e o renome de `data-*` tem uma metade que nao aparece em
# lugar nenhum quando falta: o DOM le `data-action-change` como
# dataset.actionChange, e `dataset` de chave ausente devolve undefined -- sem
# erro e sem console sujo. Num projeto que despacha por `data-action`, isso e o
# produto inteiro ficando mudo com a aba de rede toda verde.
exige "$FB" 'dataset' 'frontend-build.md trata a contraparte dataset do renome de data-*'                       'frontend-build.md renomeia data-* sem o dataset -- o clique para de responder em silencio'
exige "$FB" 'renameFiles' 'frontend-build.md traz o renome de arquivo'                           'frontend-build.md sem renameFiles'
exige "$FB" 'Never `ui.8f91c2ad.js`|hash keeps the original stem|nunca e hash'       'frontend-build.md proibe nome novo derivado do conteudo'       'frontend-build.md deixa o nome novo virar hash, que preserva o radical'

CV=references/conventions.md
exige "$CV" 'R31' 'conventions.md cita R31' 'conventions.md nao cita R31'
exige "$CV" 'Co-Authored-By' 'conventions.md nomeia o trailer proibido' \
                             'conventions.md nao nomeia Co-Authored-By'
exige "$CV" 'overrides the tool|vence qualquer instrucao' \
            'conventions.md diz que R31 vence a instrucao da ferramenta' \
            'conventions.md nao diz que R31 vence o padrao da ferramenta — e por isso que escapa'
exige "$CV" 'ff-only' 'conventions.md sincroniza a skill sem poder descartar trabalho' \
            'conventions.md sem o --ff-only — a sincronizacao automatica viraria perda de trabalho'
exige "$CV" 'reset --hard' 'conventions.md nomeia o atalho proibido na sincronizacao' \
               'conventions.md nao proibe o reset --hard para forcar a sincronizacao'
exige "$CV" 'sem pedir|without asking' 'conventions.md sincroniza sem pedir permissao (R1)' \
               'conventions.md nao diz que a sincronizacao roda sem pedir'

# ---------------------------------------------------------------------------
# 7b. o modulo de video (R37, G5)
#
# Tres modos de regredir sem erro nenhum. O video voltar a nascer de projeto
# antigo ou sem plano -- sai rapido e sai igual ao anterior. "Pronto" voltar a
# significar "renderizou": o agente nao assiste nem ouve, e sem o ciclo escrito
# o primeiro render vira entrega. E as armadilhas que ja custaram render em
# silencio: Audio renomeado, quadro relativo da Sequence, cor sem marcacao,
# priming do AAC, caminho longo no Windows.
# ---------------------------------------------------------------------------
secao 'video (R37, G5)'
VP=references/video-production.md; VB=references/video-briefing.md
VL=references/video-plan.md;       VM=references/video-motion.md
VA=references/video-audio.md;      VK=references/video-phonk.md
VR=references/video-review.md

exige SKILL.md '^- \*\*R37' 'R37 definida no SKILL.md' 'R37 ausente -- o modulo de video fica sem regra'
exige SKILL.md 'video-production\.md' 'SKILL.md roteia o pedido de video' \
               'SKILL.md sem rota para video-production.md -- o video cai no landing-motion'
exige SKILL.md 'assistido e ouvido' 'bloco do CLAUDE.md resume R37' \
               'bloco do CLAUDE.md sem R37 -- a regra some na compactacao'

exige "$VP" 'R37' 'video-production.md cita R37' 'video-production.md nao cita R37'
exige "$VP" 'From scratch' 'video-production.md exige projeto do zero' \
            'video-production.md sem o zero -- vai adaptar o projeto do video anterior'
exige "$VP" 'create-video.*--blank' 'video-production.md cria o projeto em branco' \
            'video-production.md sem o create-video --blank'
exige "$VP" 'Videos/Angatu' 'video-production.md fixa a pasta que fica' \
            'video-production.md sem a pasta fixa -- cada video nasce num lugar'
exige "$VP" 'node_modules' 'video-production.md apaga so o node_modules na entrega' \
            'video-production.md sem a regra de retencao'
exige "$VP" 'MAX_PATH' 'video-production.md avisa do caminho longo no Windows' \
            'video-production.md sem o MAX_PATH -- o primeiro render falha com ENOENT'
exige "$VP" 'EALLOWSCRIPTS' 'video-production.md contorna o remotion add no npm 12' \
            'video-production.md manda usar npx remotion add, que quebra no npm 12'
exige "$VP" 'R17' 'video-production.md separa a marca da Angatu no video de R17' \
            'video-production.md nao reconcilia com R17 -- marca imposta ou esquecida'
exige "$VP" 'R26' 'video-production.md mantem IA pelo AngatuCRM' 'video-production.md sem R26'
exige "$VP" 'remotion\.pro' 'video-production.md registra a licenca do Remotion' \
            'video-production.md sem a licenca do Remotion -- uso comercial sem conferir'
exige "$VP" 'rendered once' 'video-production.md recusa pronto por ter renderizado' \
            'video-production.md aceita pronto porque compilou ou renderizou uma vez'
exige "$VP" '/goal' 'video-production.md diz que o ciclo e da skill, nao do /goal' \
            'video-production.md nao separa o ciclo da skill do comando /goal'

exige "$VB" 'G5' 'video-briefing.md cobre a G5' 'video-briefing.md sem a G5'
exige "$VB" 'URL first' 'video-briefing.md pesquisa a URL antes de perguntar' \
            'video-briefing.md pergunta o que a URL ja responde'
exige "$VB" 'site-research' 'video-briefing.md usa a ferramenta de pesquisa do site' \
            'video-briefing.md sem tools/site-research.mjs'
exige "$VB" 'PHONK normal' 'video-briefing.md faz a pergunta do PHONK' \
            'video-briefing.md sem a bifurcacao -- cliente novo da Angatu sai como edit comum'
exige "$VB" 'marca da Angatu' 'video-briefing.md pergunta pela marca da Angatu' \
            'video-briefing.md sem a pergunta da marca'
exige "$VB" 'never invented' 'video-briefing.md proibe inventar asset' \
            'video-briefing.md deixa inventar logo, tela ou numero'
exige "$VB" 'LICENCAS\.md' 'video-briefing.md registra a licenca de cada arquivo' \
            'video-briefing.md sem o registro de licenca'
exige "$VB" 'api\.openverse\.org' 'video-briefing.md confere licenca pela API do Openverse' \
            'video-briefing.md sem a conferencia de licenca por id'
exige "$VB" 'LGPD' 'video-briefing.md exige dado ficticio em tela de sistema real' \
            'video-briefing.md deixa dado real de cliente aparecer no video'

exige "$VL" 'timeline\.ts' 'video-plan.md poe o plano em dado' \
            'video-plan.md sem timeline.ts -- quadro digitado dentro da cena'
exige "$VL" '[Dd]erived' 'video-plan.md deriva o tempo das ancoras' \
            'video-plan.md deixa tempo escrito a mao -- envelhece calado'
exige "$VL" 'check-plan' 'video-plan.md confere a tabela de quadros antes de renderizar' \
            'video-plan.md sem a conferencia -- o erro so aparece no render'
exige "$VL" 'VISUAL_LEAD' 'video-plan.md fixa onde o corte cai em relacao a batida' \
            'video-plan.md sem VISUAL_LEAD'
exige "$VL" 'Never after the beat' 'video-plan.md proibe o corte depois do som' \
            'video-plan.md deixa a imagem chegar depois do som'

exige "$VM" 'Math\.random' 'video-motion.md proibe aleatoriedade sem semente' \
            'video-motion.md sem determinismo -- cintilacao que muda a cada render'
exige "$VM" 'check-determinism' 'video-motion.md roda a checagem de determinismo' \
            'video-motion.md sem tools/check-determinism.mjs'
exige "$VM" 'TransitionSeries' 'video-motion.md explica por que a transicao nao move o corte' \
            'video-motion.md sem a armadilha do TransitionSeries -- a sincronia anda a cada transicao'
exige "$VM" 'already relative' 'video-motion.md avisa que o quadro da Sequence ja e relativo' \
            'video-motion.md sem a armadilha da Sequence -- cena vazia sem erro'
exige "$VM" 'd\.ts' 'video-motion.md manda ler os tipos instalados' \
            'video-motion.md confia na memoria da API'
exige "$VM" 'Html5Audio' 'video-motion.md registra as renomeacoes da API' \
            'video-motion.md sem a tabela de renomeacoes'
exige "$VM" '55 px' 'video-motion.md fixa o piso de texto' \
            'video-motion.md sem o piso de 55 px -- texto ilegivel no celular'
exige "$VM" 'bt709' 'video-motion.md marca a cor do render' \
            'video-motion.md sem bt709 -- JPEG sai yuvj420p sem marcacao'
exige "$VM" 'R35' 'video-motion.md aplica R35 ao video' 'video-motion.md sem R35'

exige "$VA" 'cannot hear' 'video-audio.md poe o ouvido do usuario no laco' \
            'video-audio.md finge que o agente ouve o video'
exige "$VA" 'recorded file' 'video-audio.md usa narracao gravada' \
            'video-audio.md deixa gerar a narracao'
exige "$VA" 'R26' 'video-audio.md reconcilia voz sintetica com R26' \
            'video-audio.md deixa gerar voz por fora do AngatuCRM'
exige "$VA" 'anchor' 'video-audio.md alinha o efeito pelo impacto' \
            'video-audio.md posiciona SFX pelo inicio do arquivo -- o impacto chega atrasado'
exige "$VA" 'ENAMETOOLONG' 'video-audio.md mixa os efeitos num barramento' \
            'video-audio.md sem o barramento -- muitas camadas estouram a linha de comando'
exige "$VA" 'latency=1' 'video-audio.md masteriza sem atrasar o audio' \
            'video-audio.md sem latency=1 -- o alimiter atrasa o audio e a sincronia quebra'
exige "$VA" 'LUFS' 'video-audio.md fixa o alvo de loudness' \
            'video-audio.md sem alvo de loudness -- cada video sai num volume'
exige "$VA" 'dBTP' 'video-audio.md limita o pico real' 'video-audio.md sem limite de pico real'

exige "$VK" 'reel/Dc1rntCBpNW' 'video-phonk.md traz o primeiro reel de referencia' \
            'video-phonk.md sem o primeiro reel de referencia do B2'
exige "$VK" 'reel/DdCid4ah2HP' 'video-phonk.md traz o segundo reel de referencia' \
            'video-phonk.md sem o segundo reel de referencia do B2'
exige "$VK" 'direction, not content' 'video-phonk.md trata a referencia como direcao' \
            'video-phonk.md deixa copiar a referencia'
exige "$VK" 'reel-analysis' 'video-phonk.md analisa o reel antes de produzir' \
            'video-phonk.md sem tools/reel-analysis.js'
exige "$VK" 'priming' 'video-phonk.md desconta o atraso do AAC na analise' \
            'video-phonk.md le a sincronia do reel com o audio atrasado pelo priming'
exige "$VK" 'image \+ auto zoom' 'video-phonk.md proibe foto com zoom automatico' \
            'video-phonk.md deixa o edit virar foto com zoom'
exige "$VK" 'three a second' 'video-phonk.md limita o flash' \
            'video-phonk.md sem o limite de flash -- risco fotossensivel'

exige "$VR" 'REVISAO\.md' 'video-review.md registra cada iteracao' 'video-review.md sem o registro'
exige "$VR" 'freezedetect' 'video-review.md separa parada planejada de quadro congelado' \
            'video-review.md nao detecta quadro congelado'
exige "$VR" 'ebur128' 'video-review.md mede o loudness do arquivo final' 'video-review.md nao mede o loudness'
exige "$VR" 'bt709' 'video-review.md confere a marcacao de cor na entrega' \
            'video-review.md entrega sem conferir a cor'
exige "$VR" 'three flashes' 'video-review.md limita flash por segundo' \
            'video-review.md sem o limite de flash -- risco fotossensivel'
exige "$VR" 'cannot hear' 'video-review.md poe o ouvido do usuario no laco' \
            'video-review.md finge que o agente ouve o video'
exige "$VR" '[Ss]top condition' 'video-review.md define quando o ciclo para' \
            'video-review.md sem condicao de parada -- o ciclo vira laco'
exige "$VR" '[Ee]scalat' 'video-review.md escala a falha repetida' \
            'video-review.md sem escalada -- repete a mesma correcao'
exige "$VR" 'Compiling does not finish' 'video-review.md recusa compilar como pronto' \
            'video-review.md aceita compilar ou o primeiro render como pronto'

# As ferramentas que os references mandam copiar precisam existir e compilar.
FERRAMENTAS='analyze-music.py analyze-sfx.py transcribe.py check-determinism.mjs check-plan.mjs master.mjs reel-analysis.js render.mjs review.mjs sfx-bus.mjs site-research.mjs'
AUSENTE=0
for F in $FERRAMENTAS; do
  if [ ! -f "tools/video/$F" ]; then
    falha "tools/video/$F ausente -- os references mandam copiar"
    AUSENTE=1
  fi
done
if [ "$AUSENTE" -eq 0 ]; then ok 'as onze ferramentas de video existem'; fi
if command -v node >/dev/null 2>&1; then
  QUEBRA=0
  for F in tools/video/*.mjs tools/video/*.js; do
    if ! node --check "$F" >/dev/null 2>&1; then falha "sintaxe quebrada: $F"; QUEBRA=1; fi
  done
  if [ "$QUEBRA" -eq 0 ]; then ok 'scripts Node de video compilam'; fi
else
  aviso 'node ausente: sintaxe dos scripts de video nao conferida'
fi
PYTHON=$(command -v python || command -v python3 || true)
if [ -n "$PYTHON" ]; then
  QUEBRA=0
  for F in tools/video/*.py; do
    if ! "$PYTHON" -c "import ast, sys; ast.parse(open(sys.argv[1], encoding='utf-8').read())" "$F" >/dev/null 2>&1; then
      falha "sintaxe quebrada: $F"; QUEBRA=1
    fi
  done
  if [ "$QUEBRA" -eq 0 ]; then ok 'scripts Python de video compilam'; fi
else
  aviso 'python ausente: sintaxe dos scripts de video nao conferida'
fi

# O hero da landing: as correcoes que a pratica pediu nao podem voltar atras.
LM=references/landing-motion.md
exige "$LM" 'video-production' 'landing-motion.md manda o video avulso para o modulo de video' \
            'landing-motion.md sem a fronteira com video-production.md'
exige "$LM" 'bt709' 'landing-motion.md marca a cor do video' \
            'landing-motion.md sem bt709 -- o Chrome recusa o WebM (PIPELINE_ERROR_DECODE)'
exige "$LM" 'PIPELINE_ERROR_DECODE' 'landing-motion.md registra o incidente do WebM' \
            'landing-motion.md esqueceu por que a cor e marcada'
exige "$LM" 'matchMedia' 'landing-motion.md escolhe a fonte por script' \
            'landing-motion.md sem o script de escolha da fonte'
exige "$LM" 'POSTER_FRAME' 'landing-motion.md tira o quadro do poster do dado' \
            'landing-motion.md sem o quadro do poster derivado'
exige "$LM" 'marca da Angatu' 'landing-motion.md pergunta pela marca da Angatu no hero' \
            'landing-motion.md sem a pergunta da marca'
if grep -qE '<source[^>]*media=' "$LM"; then
  falha 'landing-motion.md voltou ao <source media> -- quem pede menos movimento baixa o video'
else
  ok 'landing-motion.md sem <source media>'
fi
if grep -qE 'frame=[0-9]' "$LM"; then
  falha 'landing-motion.md voltou a digitar o quadro do poster'
else
  ok 'landing-motion.md sem quadro de poster digitado'
fi
if grep -qE 'APAGAR o workspace|library is deleted|workspace \*\*deleted' "$LM" \
   || grep -q 'studio is deleted' references/landing-seo-og.md; then
  falha 'landing-motion.md ou landing-seo-og.md voltou a mandar apagar o estudio'
else
  ok 'o estudio do hero fica, so o node_modules sai'
fi

# ---------------------------------------------------------------------------
# 7c. o padrao Java (R11, R12, R38, R39, R40)
#
# O padrao antigo pedia Javadoc em todo metodo publico e comentario em PT-BR, e
# os proprios exemplos da skill ensinavam isso. O agente copia o exemplo, nao o
# texto da regra -- entao o que se cobra aqui e o exemplo: um Javadoc por tipo de
# topo, so no cabecalho, com @author Angatu Sistemas, e nenhum portugues em
# comentario, Javadoc ou log de codigo Java. O texto do usuario final continua
# livre: literal de string nao entra na conta.
# ---------------------------------------------------------------------------
secao 'padrao Java (R11, R12, R38, R39, R40)'

JS_=references/java-standard.md
exige SKILL.md 'java-standard\.md' 'SKILL.md roteia o codigo Java para java-standard.md' \
               'SKILL.md sem rota para java-standard.md -- o padrao Java fica sem dono'
for REGRA in R38 R39 R40; do
  exige SKILL.md "^- \\*\\*$REGRA" "$REGRA definida no SKILL.md" "$REGRA ausente do SKILL.md"
done
exige SKILL.md 'Javadoc só no cabeçalho' 'bloco do CLAUDE.md resume o Javadoc so no cabecalho' \
               'bloco do CLAUDE.md ainda descreve o Javadoc antigo'
case "$DESCRICAO" in
  *"Java 25"*) ok 'description anuncia Java 25' ;;
  *)           falha 'description sem Java 25' ;;
esac
exige "$JS_" 'HttpResponseException' 'java-standard.md recusa por HttpResponseException' \
             'java-standard.md sem a recusa por HttpResponseException -- volta o try/catch em toda rota'
exige "$JS_" 'enable-preview' 'java-standard.md proibe recurso preview' \
             'java-standard.md sem a proibicao de preview'
exige "$JS_" 'annotationProcessorPaths' 'java-standard.md avisa do processador do Lombok no JDK 23+' \
             'java-standard.md sem annotationProcessorPaths -- Lombok para de compilar'
exige "$JS_" 'mapConcurrent' 'java-standard.md limita a concorrencia com virtual threads' \
             'java-standard.md sem concorrencia limitada'
exige "$JS_" 'one instance|instantiated once' 'java-standard.md avisa que a rota e compartilhada' \
             'java-standard.md nao avisa que uma instancia de Route atende todas as requisicoes'
exige references/backend-server.md 'Enable-Native-Access' 'backend-server.md libera o acesso nativo do sqlite-jdbc' \
             'backend-server.md sem Enable-Native-Access -- o Java 24+ avisa a cada partida'
exige references/deploy-coolify.md 'UseCompactObjectHeaders' 'deploy-coolify.md liga os cabecalhos compactos' \
             'deploy-coolify.md sem UseCompactObjectHeaders'
exige references/deploy-coolify.md 'UnsupportedClassVersionError' 'deploy-coolify.md cobre o JDK 21 da imagem do Playwright' \
             'deploy-coolify.md sem o JDK 25 na imagem do Playwright -- o conteiner nao sobe'

ANTIGO=$(grep -rnE 'eclipse-temurin[:-](1[0-9]|2[0-4])([^0-9]|$)|<maven\.compiler\.(release|source|target)>(1[0-9]|2[0-4])<' \
           SKILL.md references/ 2>/dev/null || true)
if [ -n "$ANTIGO" ]; then
  falha 'alvo de compilacao ou imagem anterior ao Java 25'
  printf '%s\n' "$ANTIGO" | sed 's/^/        /'
else
  ok 'imagens e alvo de compilacao no Java 25'
fi

PREVIEW=$(grep -rln -- '--enable-preview' SKILL.md references/ 2>/dev/null \
            | grep -vE '(SKILL|java-standard)\.md$' || true)
if [ -n "$PREVIEW" ]; then
  falha "--enable-preview fora da regra que o proibe: $PREVIEW"
else
  ok '--enable-preview so aparece para ser proibido'
fi

REGRA_VELHA=$(grep -rniE 'Javadoc (in|em) (PT-BR|Portuguese|portugu)|comments (always |in )?(PT-BR|Portuguese)|Javadoc on every public|every public class and method carries Javadoc' \
                SKILL.md references/ 2>/dev/null || true)
if [ -n "$REGRA_VELHA" ]; then
  falha 'regra antiga de Javadoc ou comentario em portugues sobrando'
  printf '%s\n' "$REGRA_VELHA" | sed 's/^/        /'
else
  ok 'nenhum resto da regra antiga de Javadoc em PT-BR'
fi

if [ -n "$PYTHON" ]; then
  if JAVA_PROBLEMAS=$("$PYTHON" - . <<'PY'
import pathlib
import re
import sys

root = pathlib.Path(sys.argv[1])
files = [root / "SKILL.md"] + sorted((root / "references").glob("*.md"))
TYPE_DECL = re.compile(r"^(?:(?:public|protected|private|abstract|final|sealed|non-sealed|static|strictfp)\s+)*"
                       r"(?:class|interface|enum|record|@interface)\s+[A-Z]\w*")
ANNOTATION = re.compile(r"^@\w+(?:\(.*\))?\s*$")
PORTUGUESE = re.compile(r"[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]"
                        r"|\b(?:nao|nunca|sempre|quando|isso|tambem|entao|porque|voce|aqui|depois|pedidos?"
                        r"|usuarios?|servidor|iniciado|sucesso|erro|falha|senha|arquivo|invalid[oa]"
                        r"|obrigatori[oa]|nenhum|nenhuma|ausente|recusando)\b", re.I)
LOG_CALL = re.compile(r'Console\.(?:log|info|warn|error|debug)\(\s*"((?:[^"\\]|\\.)*)"')
QUOTED = re.compile(r'"[^"\n]*"')


def tokens(src):
    found, i, n, line, line_start = [], 0, len(src), 1, 0
    while i < n:
        if src[i] == "\n":
            line, line_start, i = line + 1, i + 1, i + 1
        elif src.startswith("//", i):
            end = src.find("\n", i)
            end = n if end < 0 else end
            found.append(("line", line, i - line_start, src[i + 2:end]))
            i = end
        elif src.startswith("/*", i) or src.startswith('"""', i):
            block = src.startswith("/*", i)
            end = src.find("*/" if block else '"""', i + 2 if block else i + 3)
            end = n if end < 0 else end + (2 if block else 3)
            kind = ("doc" if src.startswith("/**", i) and not src.startswith("/**/", i) else "block") if block else "string"
            found.append((kind, line, i - line_start, src[i:end]))
            if src.count("\n", i, end):
                line += src.count("\n", i, end)
                line_start = src.rfind("\n", i, end) + 1
            i = end
        elif src[i] in "\"'":
            quote, end = src[i], i + 1
            while end < n and src[end] not in (quote, "\n"):
                end += 2 if src[end] == "\\" else 1
            i = end + 1
        else:
            i += 1
    return found


problems = []
for path in files:
    rel = path.relative_to(root).as_posix()
    lines = path.read_text(encoding="utf-8").splitlines()
    blocks, inside = [], False
    for number, text in enumerate(lines, 1):
        if not inside and re.match(r"^\s*```java\s*$", text):
            inside, body, first = True, [], number + 1
        elif inside and re.match(r"^\s*```\s*$", text):
            inside = False
            blocks.append((first, body))
        elif inside:
            body.append(text)
    for first, body in blocks:
        src = "\n".join(body)
        found = tokens(src)
        where = lambda line: f"{rel}:{first + line - 1}"
        header_ends = set()
        for kind, line, column, text in found:
            if kind == "doc":
                end = line + text.count("\n")
                if column != 0:
                    problems.append(f"{where(line)} Javadoc fora do cabecalho da classe")
                    continue
                header_ends.add(end)
                after = end + 1
                while after <= len(body) and ANNOTATION.match(body[after - 1]):
                    after += 1
                if after > len(body) or not TYPE_DECL.match(body[after - 1]):
                    problems.append(f"{where(line)} Javadoc que nao antecede um tipo de topo")
                if "@author Angatu Sistemas" not in text:
                    problems.append(f"{where(line)} Javadoc sem @author Angatu Sistemas")
                tags = set(re.findall(r"(?m)^\s*\*?\s*(@\w+)", text)) - {"@author"}
                if tags:
                    problems.append(f"{where(line)} Javadoc com tag alem de @author: {', '.join(sorted(tags))}")
                if PORTUGUESE.search(QUOTED.sub("", text)):
                    problems.append(f"{where(line)} Javadoc em portugues")
            elif kind in ("line", "block") and PORTUGUESE.search(QUOTED.sub("", text)):
                problems.append(f"{where(line)} comentario em portugues")
        for number, text in enumerate(body, 1):
            if TYPE_DECL.match(text):
                above = number - 1
                while above >= 1 and ANNOTATION.match(body[above - 1]):
                    above -= 1
                if above not in header_ends:
                    problems.append(f"{where(number)} tipo de topo sem Javadoc de cabecalho")
        for match in LOG_CALL.finditer(src):
            if PORTUGUESE.search(match.group(1)):
                problems.append(f"{where(src.count(chr(10), 0, match.start()) + 1)} log em portugues")

print("\n".join(problems))
sys.exit(1 if problems else 0)
PY
  ); then
    ok 'exemplos Java: um Javadoc por tipo de topo, so no cabecalho, sem portugues em comentario ou log'
  else
    falha 'exemplo Java fora do padrao de R12'
    printf '%s\n' "$JAVA_PROBLEMAS" | sed 's/^/        /'
  fi
else
  aviso 'python ausente: exemplos Java nao conferidos'
fi

# ---------------------------------------------------------------------------
# 7d. the proposal module (R41, G6)
#
# Three ways it regresses without an error. A price, deadline or contract term
# filled in by the agent goes to a client as a commitment the owner never made.
# A client's name, logo or prices committed as an example lands in a public
# repository. And the build's protections (static fonts instead of Type3, no
# placeholder left in a delivered PDF) disappear in a "simplification" of the
# script, and the next PDF goes out with "[[R$ 000]]" on the price page.
# ---------------------------------------------------------------------------
secao 'proposal (R41, G6)'
PP=references/proposal.md
TP=tools/proposal

exige SKILL.md '^- \*\*R41' 'R41 defined in SKILL.md' 'R41 missing -- the proposal module has no rule'
exige SKILL.md 'proposal\.md' 'SKILL.md routes a proposal request' 'SKILL.md has no route to proposal.md'
exige SKILL.md 'R41 orçamento' 'CLAUDE.md block summarises R41' 'CLAUDE.md block without R41 -- the rule fades on compaction'
case "$DESCRICAO" in
  *orçamento*) ok 'description triggers on orçamento' ;;
  *)           falha 'description without the orçamento trigger -- a quote request does not load the skill' ;;
esac

exige "$PP" 'G6' 'proposal.md covers G6' 'proposal.md without G6'
exige "$PP" 'never invented' 'proposal.md forbids inventing a price' 'proposal.md lets a price be invented'
exige "$PP" 'text only' 'proposal.md keeps the cover text only' 'proposal.md lost the text-only cover'
exige "$PP" 'public' 'proposal.md keeps client data out of this public repository'             'proposal.md does not say the repository is public'
exige "$PP" 'Unsplash' 'proposal.md names the stock source' 'proposal.md without the photo source'
exige "$PP" 'plus\.unsplash\.com' 'proposal.md refuses Unsplash+ images' 'proposal.md lets a paid image in'
exige "$PP" 'picture-in-picture' 'proposal.md forbids a fake before/after split'             'proposal.md lets two subjects pass as one'
exige "$PP" 'virtual environment' 'proposal.md installs into a venv'             'proposal.md installs into the global interpreter -- it already broke a pinned numpy'
exige "$PP" 'Type3' 'proposal.md explains the static fonts' 'proposal.md without the Type3 trap'
exige "$PP" 'rdap\.registro\.br' 'proposal.md checks the client domain' 'proposal.md without the domain check'
exige "$PP" 'R17' 'proposal.md keeps the Angatu mark on every page' 'proposal.md without R17'

AUSENTE=0
for F in proposal.py crop.py template.html requirements.txt assets/angatu-lockup-white.png          assets/angatu-lockup-navy.png assets/bg-cover.svg assets/bg-engineering.svg          assets/photo-placeholder.svg assets/logo-placeholder.svg; do
  if [ ! -f "$TP/$F" ]; then falha "$TP/$F missing -- proposal.md points to it"; AUSENTE=1; fi
done
if [ "$AUSENTE" -eq 0 ]; then ok 'the proposal tools and assets exist'; fi

exige "$TP/proposal.py" 'Type3' 'proposal.py fails on Type3 fonts' 'proposal.py lost the Type3 check'
exige "$TP/proposal.py" 'placeholder' 'proposal.py refuses leftover placeholders'                         'proposal.py lost the placeholder check -- "[[R$ 000]]" reaches the client'
exige "$TP/template.html" 'data-id="cover"' 'template.html keeps the block ids' 'template.html without block ids'
exige "$TP/template.html" '\{\{page\}\}' 'template.html numbers its pages' 'template.html with typed page numbers'
exige "$TP/template.html" '\[\[Nome do cliente\]\]' 'template.html holds placeholders, not a client'                           'template.html without placeholders -- was a real proposal copied in?'
if grep -qE 'class="(pagina|cel|tela|rodape|sobretitulo)' "$TP/template.html"; then
  falha 'template.html carries Portuguese identifiers (R12)'
else
  ok 'template.html identifiers in English (R12)'
fi
if [ -n "${PYTHON:-}" ]; then
  QUEBRA=0
  for F in "$TP"/*.py; do
    if ! "$PYTHON" -c "import ast, sys; ast.parse(open(sys.argv[1], encoding='utf-8').read())" "$F" >/dev/null 2>&1; then
      falha "broken syntax: $F"; QUEBRA=1
    fi
  done
  if [ "$QUEBRA" -eq 0 ]; then ok 'proposal Python scripts compile'; fi
fi

# ---------------------------------------------------------------------------
# 7e. the companion skills (R42, R43)
#
# Both rules only work if the CLAUDE.md block names them: that block is what
# every project session reads, and a rule missing from it fades on the first
# compaction. And both have one silent way to break the house rules: caveman
# compressing what is persisted (a commit, the CLAUDE.md block), and Obsidian
# properties pushed above the AngatuLibrariesSkill block of the anchor files.
# ---------------------------------------------------------------------------
secao 'companion skills (R42, R43)'
CS=references/companion-skills.md

for REGRA in R42 R43; do
  exige SKILL.md "^- \\*\\*$REGRA" "$REGRA defined in SKILL.md" "$REGRA missing from SKILL.md"
done
exige SKILL.md 'companion-skills\.md' 'SKILL.md routes the companion skills' \
               'SKILL.md has no route to companion-skills.md'
BLOCO=$(awk '/AngatuLibrariesSkill:begin/,/AngatuLibrariesSkill:end/' SKILL.md)
for LINK in 'github.com/kepano/obsidian-skills' 'github.com/JuliusBrussee/caveman'; do
  case "$BLOCO" in
    *"$LINK"*) ok "CLAUDE.md block demands $LINK" ;;
    *)         falha "CLAUDE.md block without $LINK -- projects never hear of it" ;;
  esac
done
exige "$CS" '\.claude/skills' 'companion-skills.md installs the obsidian-skills in the project' \
            'companion-skills.md does not say where the obsidian-skills live'
exige "$CS" 'ls-remote' 'companion-skills.md checks the obsidian-skills version unasked' \
            'companion-skills.md without the version check -- the copy freezes'
exige "$CS" 'R1 wins' 'companion-skills.md keeps the R1 block above any property' \
            'companion-skills.md lets properties push the R1 block down'
exige "$CS" 'caveman-compress' 'companion-skills.md keeps caveman-compress off CLAUDE.md' \
            'companion-skills.md lets caveman-compress rewrite the R1 block'
exige "$CS" 'caveman-commit' 'companion-skills.md keeps the detailed R3 commit' \
            'companion-skills.md lets caveman-commit cut the R3 body'
exige "$CS" 'chat only' 'companion-skills.md limits caveman to the chat' \
            'companion-skills.md does not limit caveman to the chat -- product copy gets compressed'
exige references/deploy-coolify.md '^\.claude/$' '.dockerignore keeps .claude/ out of the image' \
            '.dockerignore ships .claude/ into the build context'
exige references/dead-code.md '\.claude/skills' 'dead-code.md protects the project skills' \
            'dead-code.md lets the project skills be swept as orphans'

# ---------------------------------------------------------------------------
# 7f. the command-execution module (R44)
#
# The module only works as the owner wrote it, so the check is on its exact
# lines: a paraphrase that drops "never claim that a build or test passed" or
# the 10-minute ceiling is the module quietly losing its teeth.
# ---------------------------------------------------------------------------
secao 'command execution (R44)'
CE=references/command-execution.md

exige SKILL.md '^- \*\*R44' 'R44 defined in SKILL.md' 'R44 missing from SKILL.md'
exige SKILL.md 'command-execution\.md' 'SKILL.md routes to the module' \
               'SKILL.md has no route to command-execution.md'
exige SKILL.md 'R44 logo depois deste bloco' 'CLAUDE.md block summarises R44' \
               'CLAUDE.md block without R44 -- projects never hear of the module'
FALTANDO=0
for LINHA in 'AngatuCommandExecution:begin' 'AngatuCommandExecution:end' '## Efficient Command Execution' \
             'Never run a full build or complete automated test suite after every code change.' \
             '`tail -f`' 'Do not intentionally run foreground commands for longer than 10 minutes.' \
             'Never claim that a build or test passed without checking its result.'; do
  if ! grep -qF -- "$LINHA" "$CE"; then falha "command-execution.md lost: $LINHA"; FALTANDO=1; fi
done
if [ "$FALTANDO" -eq 0 ]; then ok 'command-execution.md keeps the module intact'; fi

# The skill serves any agent: CLAUDE.md is the one anchor, and a per-vendor copy
# (GEMINI.md) is not to come back -- it was added once and removed by the owner.
if [ -e GEMINI.md ]; then
  falha 'GEMINI.md exists -- the skill is for any agent and anchors on CLAUDE.md only'
else
  ok 'no GEMINI.md: CLAUDE.md is the only anchor'
fi
if grep -nE 'GEMINI\.md' SKILL.md | grep -vq 'no .GEMINI\.md'; then
  falha 'SKILL.md tells projects to write a GEMINI.md'
else
  ok 'SKILL.md anchors projects on CLAUDE.md alone'
fi

# ---------------------------------------------------------------------------
# 8. o historico deste repositorio nao aponta para uma IA (R31)
#
# A verificacao vive aqui, e nao so no texto da regra, porque foi aqui que a
# regra falhou: o trailer de atribuicao entra por padrao da ferramenta e
# ninguem percebe ate alguem ler o log.
# ---------------------------------------------------------------------------
secao 'historico (R31)'

PADRAO_IA='co-authored-by|generated with|claude|anthropic|copilot|\bGPT\b|\bLLM\b'

# Conta os commits de um intervalo cuja mensagem aponta para uma IA.
# CLAUDE.md e a pasta .claude/ (onde R42 poe as skills do projeto) sao nomes, nao
# atribuicao: saem do texto antes da busca, como no comando de conventions.md.
conta_sujos() {
  git log --format='%H' "$1" 2>/dev/null \
    | while read -r SHA; do
        if git log -1 --format='%B' "$SHA" \
           | sed -e 's/CLAUDE\.md//g' -e 's#\.claude\(/[^[:space:]]*\)\{0,1\}##g' \
           | grep -qiE "$PADRAO_IA"; then printf '%s\n' "$SHA"; fi
      done | wc -l | tr -d ' '
}

if git rev-parse --git-dir >/dev/null 2>&1; then
  UPSTREAM=$(git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null || true)

  # 8a. o que ainda nao foi enviado — reescrever agora, sem custo para ninguem
  if [ -n "$UPSTREAM" ]; then
    LOCAIS=$(conta_sujos "$UPSTREAM..HEAD")
  else
    LOCAIS=$(conta_sujos HEAD)
  fi

  if [ "$LOCAIS" -gt 0 ]; then
    falha "$LOCAIS commit(s) nao enviado(s) com vestigio de IA — reescrever antes do push"
    printf '        ver conventions.md secao 3.1\n'
  else
    ok 'nenhum commit pendente com vestigio de IA'
  fi

  # 8b. o que ja esta no remoto — limpar exige force-push, e isso nao e decisao
  #     do agente. Avisa, nomeia e para por ai.
  if [ -n "$UPSTREAM" ]; then
    ENVIADOS=$(conta_sujos "$UPSTREAM")
    if [ "$ENVIADOS" -gt 0 ]; then
      aviso "$ENVIADOS commit(s) ja em $UPSTREAM com vestigio de IA"
      git log --format='%h %s' "$UPSTREAM" --grep='Co-Authored-By' --grep='Generated with' -i \
        2>/dev/null | head -n 10 | sed 's/^/        /'
      printf '        limpar exige force-push e reescreve historico de quem ja tem a branch:\n'
      printf '        decisao do dono do projeto, nunca iniciativa do agente\n'
    else
      ok "nenhum vestigio de IA em $UPSTREAM"
    fi
  fi

  RAMOS=$(git branch --all --format='%(refname:short)' 2>/dev/null | grep -iE 'claude|\bai\b|gpt' | wc -l | tr -d ' ')
  if [ "$RAMOS" -gt 0 ]; then
    falha "$RAMOS nome(s) de branch com vestigio de IA"
  else
    ok 'nenhum nome de branch com vestigio de IA'
  fi
else
  aviso 'fora de um repositorio git: verificacao de historico pulada'
fi

# ---------------------------------------------------------------------------
secao 'resultado'
if [ "$FALHAS" -eq 0 ]; then
  printf '  tudo passou\n\n'
  exit 0
fi
printf '  %s verificacao(oes) reprovada(s)\n\n' "$FALHAS"
exit 1
