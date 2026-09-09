#!/usr/bin/env bash
# Sobe a plataforma em modo producao na maquina local.
#
# Idempotente: rodar de novo apenas reconstroi e reinicia. O .env existente
# nunca e' sobrescrito, entao segredos ja gerados sao preservados.
set -euo pipefail

cd "$(dirname "$0")/.."

# Portas publicadas no host. Em maquina com varios projetos, 3000 e 5432 sao as
# mais disputadas: sobrescreva na chamada, por exemplo
#   APP_PORT=3010 POSTGRES_PORT=5433 ./scripts/local-up.sh
APP_PORT="${APP_PORT:-3000}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
WAHA_PORT="${WAHA_PORT:-3001}"

info() { printf '\033[0;36m>\033[0m %s\n' "$1"; }
ok()   { printf '\033[0;32m✓\033[0m %s\n' "$1"; }
die()  { printf '\033[0;31m✗\033[0m %s\n' "$1" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || die "Docker nao encontrado. Instale o Docker Desktop ou o Docker Engine."
docker compose version >/dev/null 2>&1 || die "Docker Compose v2 nao encontrado. Atualize o Docker."
docker info >/dev/null 2>&1 || die "O Docker esta instalado mas nao esta rodando. Inicie o Docker e tente de novo."

# Falha cedo e com mensagem clara quando a porta ja esta tomada por outro
# projeto, em vez de deixar o Docker devolver um erro cru la na frente.
porta_ocupada() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
  else
    return 1
  fi
}

for par in "APP_PORT:$APP_PORT" "POSTGRES_PORT:$POSTGRES_PORT" "WAHA_PORT:$WAHA_PORT"; do
  nome="${par%%:*}"; valor="${par##*:}"
  if porta_ocupada "$valor" && ! docker compose ps --status running 2>/dev/null | grep -q .; then
    die "a porta ${valor} ja esta em uso por outro processo.
     Rode com outra porta, por exemplo:  ${nome}=$((valor + 10)) ./scripts/local-up.sh"
  fi
done

# ------------------------------------------------------------------ .env
if [ ! -f .env ]; then
  info "criando .env"

  # openssl e' o caminho normal; o node cobre quem nao tem openssl no PATH.
  if command -v openssl >/dev/null 2>&1; then
    SECRET="$(openssl rand -base64 48)"
  else
    SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('base64'))")"
  fi
  CRON="$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))" 2>/dev/null || echo "troque-este-segredo-$RANDOM")"

  cat > .env <<ENVEOF
# Gerado por scripts/local-up.sh. Ajuste a vontade.
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sm_smart_money?schema=public"
AUTH_SECRET="${SECRET}"
AUTH_ACCESS_MINUTES="15"
AUTH_REFRESH_DAYS="7"
AUTH_REMEMBER_DAYS="30"

# As portas ficam gravadas para o compose e a aplicacao concordarem tambem num
# `docker compose up` avulso, sem depender da variavel na linha de comando.
APP_PORT="${APP_PORT}"
POSTGRES_PORT="${POSTGRES_PORT}"
WAHA_PORT="${WAHA_PORT}"

NEXT_PUBLIC_APP_URL="http://localhost:${APP_PORT}"
NEXT_PUBLIC_COMMUNITY_NAME="SM Smart Money"
NEXT_PUBLIC_WHATSAPP_GROUP_URL=""

# Sem SMTP preenchido, os e-mails vao para o log do container e ficam
# registrados no historico. O fluxo completo continua exercitavel.
SMTP_HOST=""
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER=""
SMTP_PASSWORD=""
MAIL_FROM="SM Smart Money <contato@smboard.com.br>"
ADMIN_ALERT_EMAIL=""

WAHA_API_KEY=""
WAHA_SESSION="default"

CRON_SECRET="${CRON}"
ENVEOF
  ok ".env criado com AUTH_SECRET novo"
else
  ok ".env ja existe, mantido como esta"
fi

# ------------------------------------------------------------------ subir
info "construindo as imagens (a primeira vez leva alguns minutos)"
docker compose build app migrate

# O servico `migrate` aplica as migrations e sai; o app so sobe depois que ele
# termina bem, por conta do depends_on no compose.
info "subindo banco, migrations, aplicacao e WAHA"
docker compose up -d postgres waha app

# ------------------------------------------------------------------ esperar
info "aguardando a aplicacao responder"
for i in $(seq 1 60); do
  if curl -sf -o /dev/null "http://localhost:${APP_PORT}/login"; then
    ok "aplicacao no ar"
    break
  fi
  if [ "$i" = "60" ]; then
    docker compose logs --tail 40 app
    die "a aplicacao nao respondeu em 60s. Log acima."
  fi
  sleep 1
done

# ------------------------------------------------------------------ dados
if docker compose exec -T postgres psql -U postgres -d sm_smart_money -tAc \
     "SELECT COUNT(*) FROM \"User\"" 2>/dev/null | grep -qE '^[1-9]'; then
  ok "banco ja tem membros cadastrados, seed nao executado"
else
  info "banco vazio, populando com dados de exemplo"
  docker compose --profile seed run --rm seed
fi

echo
ok "pronto: http://localhost:${APP_PORT}"
echo
echo "  admin    admin@smboard.com.br        SmartMoney2026"
echo "  membro   ana-paula-klein@exemplo.com.br  SmartMoney2026"
echo
echo "  logs     docker compose logs -f app"
echo "  parar    docker compose down"
echo "  zerar    docker compose down -v     (apaga o banco)"
