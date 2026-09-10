#!/bin/sh
# Chama uma rota de cron da aplicacao com o segredo em header.
#
# O segredo vai em header e nunca na URL: a URL apareceria no log de acesso do
# proxy e no historico do shell.
set -eu
. /etc/cron-env

rota="${1:?uso: chamar-cron <agendamentos|waha-health>}"
base="${APP_INTERNAL_URL:-http://app:3000}"
corpo=$(mktemp)
trap 'rm -f "$corpo"' EXIT

status=$(curl -sS -m 120 -o "$corpo" -w '%{http_code}' \
  -H "x-cron-secret: ${CRON_SECRET}" \
  "${base}/api/cron/${rota}") || {
  echo "[$(date '+%F %T')] ${rota}: nao consegui falar com a aplicacao"
  exit 1
}

echo "[$(date '+%F %T')] ${rota}: HTTP ${status} $(head -c 300 "$corpo")"
[ "$status" = "200" ]
