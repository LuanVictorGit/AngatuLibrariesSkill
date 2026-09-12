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

# ---------------------------------------------------------------------------
# 2. SKILL.md continua despachante, nao conteudo
#
# O corpo do SKILL.md e carregado de uma vez e e o primeiro a ser resumido pela
# compactacao. Quanto maior, mais cedo some da sessao — foi o sintoma "depois de
# um tempo o agente parece nao lembrar mais dela".
# ---------------------------------------------------------------------------
secao 'SKILL.md'

LINHAS=$(wc -l < SKILL.md | tr -d ' ')
if [ "$LINHAS" -gt 400 ]; then
  falha "SKILL.md com $LINHAS linhas (teto 400) — conteudo deve descer para references/"
else
  ok "SKILL.md com $LINHAS linhas (teto 400)"
fi

if grep -q 'angatu-skill:begin' SKILL.md && grep -q 'angatu-skill:end' SKILL.md; then
  ok 'bloco de persistencia do CLAUDE.md presente e delimitado'
else
  falha 'bloco angatu-skill:begin/end ausente do SKILL.md — R1 perde a ancora'
fi

for GATE in G1 G2 G3 G4; do
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
          | sort -u | grep -vE '^(SKILL|SKILL.old|MASTER|README|CLAUDE)\.md$' || true)

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

CV=references/conventions.md
exige "$CV" 'R31' 'conventions.md cita R31' 'conventions.md nao cita R31'
exige "$CV" 'Co-Authored-By' 'conventions.md nomeia o trailer proibido' \
                             'conventions.md nao nomeia Co-Authored-By'
exige "$CV" 'overrides the tool|vence qualquer instrucao' \
            'conventions.md diz que R31 vence a instrucao da ferramenta' \
            'conventions.md nao diz que R31 vence o padrao da ferramenta — e por isso que escapa'

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
# CLAUDE.md e nome de arquivo legitimo e sai do texto antes da busca.
conta_sujos() {
  git log --format='%H' "$1" 2>/dev/null \
    | while read -r SHA; do
        if git log -1 --format='%B' "$SHA" | sed 's/CLAUDE\.md//g' \
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
    printf '        ver conventions.md secao 5.1\n'
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
