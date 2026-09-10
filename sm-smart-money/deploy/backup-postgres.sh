#!/bin/sh
# Dump diario do banco, comprimido, com expurgo por idade.
set -eu
. /etc/cron-env

destino=/backups
dias="${BACKUP_RETENTION_DAYS:-14}"
carimbo=$(date '+%Y%m%d-%H%M%S')
final="${destino}/sm-${carimbo}.sql.gz"
bruto="${destino}/.sm-${carimbo}.sql"

mkdir -p "$destino"
trap 'rm -f "$bruto"' EXIT

# O dump e a compressao sao dois passos, e nao um pipe, porque num pipe o status
# que sobra e' o do gzip: um pg_dump interrompido no meio deixaria um arquivo
# comprimido intacto e truncado, com cara de backup bom.
if ! pg_dump -h postgres -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-sm_smart_money}" > "$bruto"; then
  echo "[$(date '+%F %T')] backup FALHOU no pg_dump"
  exit 1
fi

gzip -9 -c "$bruto" > "${final}.parcial"
mv "${final}.parcial" "$final"

echo "[$(date '+%F %T')] backup ok: $(basename "$final") ($(du -h "$final" | cut -f1))"

# Expurgo. O -mtime conta dias inteiros, entao +14 apaga o que tem mais de 15.
find "$destino" -name 'sm-*.sql.gz' -type f -mtime "+${dias}" -print -delete
