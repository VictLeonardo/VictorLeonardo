#!/bin/sh
# Arranque do agendador.
#
# O crond do busybox nao garante que o ambiente do container chegue aos jobs, e
# os dois scripts precisam do segredo do cron e da senha do banco. A saida e'
# congelar as variaveis num arquivo que cada job carrega no inicio.
#
# So' as variaveis usadas entram no arquivo. Despejar o ambiente inteiro
# colocaria segredos sem relacao nenhuma com o agendador dentro dele.
set -eu

umask 077
: > /etc/cron-env

for nome in TZ CRON_SECRET APP_INTERNAL_URL POSTGRES_USER POSTGRES_DB PGPASSWORD BACKUP_RETENTION_DAYS; do
  eval "valor=\${$nome:-}"
  [ -n "$valor" ] || continue
  # Aspas simples dentro do valor viram '\'' para o arquivo continuar valido
  # com senhas de qualquer formato.
  escapado=$(printf '%s' "$valor" | sed "s/'/'\\\\''/g")
  printf "export %s='%s'\n" "$nome" "$escapado" >> /etc/cron-env
done

echo "[$(date '+%F %T')] agendador no ar; $(grep -c '^export' /etc/cron-env) variaveis carregadas"
exec crond -f -l 8
