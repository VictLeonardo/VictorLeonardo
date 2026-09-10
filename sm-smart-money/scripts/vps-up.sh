#!/usr/bin/env bash
# Sobe a plataforma numa VPS, atras de HTTPS, com o banco e a WAHA fechados.
#
# Idempotente: rodar de novo reconstroi, reaplica as migrations e reinicia. O
# .env existente nunca e' sobrescrito.
#
#   ./scripts/vps-up.sh
#
# Pre-requisitos que o script confere antes de mexer em qualquer coisa:
#   - Docker com Compose v2, rodando
#   - .env preenchido (veja .env.example)
#   - o dominio de APP_DOMAIN ja' apontando para o IP desta maquina
set -euo pipefail

cd "$(dirname "$0")/.."

# O -f explicito e' o que impede o docker-compose.override.yml de entrar junto.
# Aquele arquivo publica Postgres e WAHA no host, e aqui o host tem IP publico.
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)

info() { printf '\033[0;36m>\033[0m %s\n' "$1"; }
ok()   { printf '\033[0;32m✓\033[0m %s\n' "$1"; }
aviso(){ printf '\033[0;33m!\033[0m %s\n' "$1"; }
die()  { printf '\033[0;31m✗\033[0m %s\n' "$1" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || die "Docker nao encontrado nesta maquina."
docker compose version >/dev/null 2>&1 || die "Docker Compose v2 nao encontrado. Atualize o Docker."
docker info >/dev/null 2>&1 || die "O Docker esta instalado mas nao esta rodando."

[ -f .env ] || die "nao existe .env aqui.
     Copie o modelo e preencha:   cp .env.example .env"

# ------------------------------------------------------------------ conferencia
# Le uma chave do .env sem dar source no arquivo: um valor com espaco ou aspas
# quebraria o shell, e o .env tem senhas.
ler_env() {
  sed -n "s/^$1=//p" .env | tail -1 | sed 's/^"//; s/"$//; s/^'\''//; s/'\''$//'
}

faltando=()
for chave in APP_DOMAIN ACME_EMAIL AUTH_SECRET CRON_SECRET POSTGRES_PASSWORD WAHA_API_KEY; do
  [ -n "$(ler_env "$chave")" ] || faltando+=("$chave")
done
if [ ${#faltando[@]} -gt 0 ]; then
  die "faltam variaveis no .env: ${faltando[*]}
     Sem elas o compose recusa subir, de proposito."
fi

dominio="$(ler_env APP_DOMAIN)"

# Um AUTH_SECRET curto derruba a validacao no boot da aplicacao; melhor avisar
# aqui do que descobrir no log do container.
auth_secret="$(ler_env AUTH_SECRET)"
[ "${#auth_secret}" -ge 32 ] || die "AUTH_SECRET tem ${#auth_secret} caracteres; o minimo e' 32.
     Gere um novo:   openssl rand -base64 48"

waha_key="$(ler_env WAHA_API_KEY)"
[ "${#waha_key}" -ge 24 ] || die "WAHA_API_KEY tem ${#waha_key} caracteres, curto demais.
     Ela protege a sessao de WhatsApp da comunidade. Gere:   openssl rand -hex 24"

# O certificado so' sai se o dominio ja' resolver para esta maquina. Falhar aqui
# poupa uma tentativa contra o limite de emissao da Let's Encrypt.
if command -v getent >/dev/null 2>&1; then
  if ! getent hosts "$dominio" >/dev/null 2>&1; then
    aviso "o dominio ${dominio} ainda nao resolve nesta maquina."
    aviso "o Caddy vai tentar o certificado mesmo assim e pode falhar."
  else
    ok "DNS de ${dominio} resolve"
  fi
fi

# ------------------------------------------------------------------ subida
info "construindo as imagens"
"${COMPOSE[@]}" build app migrate scheduler

info "subindo banco e WhatsApp"
"${COMPOSE[@]}" up -d postgres waha

info "aplicando as migrations"
"${COMPOSE[@]}" run --rm migrate

info "subindo aplicacao, proxy e agendador"
"${COMPOSE[@]}" up -d app caddy scheduler

info "esperando a aplicacao responder"
pronta=0
for _ in $(seq 1 60); do
  if "${COMPOSE[@]}" exec -T app curl -fsS http://127.0.0.1:3000/login >/dev/null 2>&1; then
    pronta=1; break
  fi
  sleep 2
done
[ "$pronta" = 1 ] || {
  "${COMPOSE[@]}" logs --tail 40 app
  die "a aplicacao nao respondeu. O log acima costuma dizer o motivo."
}
ok "aplicacao no ar"

# ------------------------------------------------------------------ verificacao
# Estas checagens existem porque a configuracao certa e a configuracao aplicada
# nem sempre sao a mesma coisa. Elas olham o que de fato subiu.
info "conferindo a exposicao da maquina"

publicadas="$("${COMPOSE[@]}" ps --format '{{.Service}} {{.Ports}}' 2>/dev/null | grep -v '^\s*$' || true)"
vazou=0
while IFS= read -r linha; do
  servico="${linha%% *}"
  portas="${linha#* }"
  case "$servico" in
    caddy) continue ;;
  esac
  # 0.0.0.0 ou :: no mapeamento significa aberto para fora.
  if printf '%s' "$portas" | grep -qE '(0\.0\.0\.0|\[::\]):[0-9]+->'; then
    aviso "${servico} esta publicando porta no host: ${portas}"
    vazou=1
  fi
done <<< "$publicadas"
[ "$vazou" = 0 ] && ok "so' o proxy publica porta; banco e WAHA ficaram internos"

info "conferindo se a WAHA exige chave"
sem_chave="$("${COMPOSE[@]}" exec -T app sh -c \
  'curl -s -o /dev/null -w "%{http_code}" -m 10 http://waha:3000/api/sessions' 2>/dev/null || echo erro)"
com_chave="$("${COMPOSE[@]}" exec -T app sh -c \
  "curl -s -o /dev/null -w '%{http_code}' -m 10 -H 'X-Api-Key: ${waha_key}' http://waha:3000/api/sessions" 2>/dev/null || echo erro)"

if [ "$sem_chave" = "401" ] || [ "$sem_chave" = "403" ]; then
  ok "a WAHA recusa chamada sem chave (HTTP ${sem_chave}) e aceita com chave (HTTP ${com_chave})"
else
  aviso "a WAHA respondeu HTTP ${sem_chave} para uma chamada SEM chave."
  aviso "esperado era 401 ou 403. Confira o nome da variavel de chave na versao"
  aviso "da imagem devlikeapro/waha que subiu e ajuste o docker-compose.prod.yml."
fi

echo
ok "no ar em https://${dominio}"
echo
echo "  logs        docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f app"
echo "  agendador   docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f scheduler"
echo "  backups     ls -lh backups/"
echo "  parar       docker compose -f docker-compose.yml -f docker-compose.prod.yml down"
echo
echo "  Primeiro administrador, se ainda nao existir:"
echo "    ADMIN_NAME='Seu Nome' ADMIN_EMAIL='voce@dominio.com.br' ADMIN_PASSWORD='...' \\"
echo "      docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm \\"
echo "      -e ADMIN_NAME -e ADMIN_EMAIL -e ADMIN_PASSWORD migrate npx tsx prisma/create-admin.ts"
