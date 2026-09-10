# Agendador da VPS. Faz o que os `crons` do vercel.json faziam na Vercel, mais o
# backup do banco.
#
# A base e' a imagem do Postgres porque ela ja' traz o pg_dump na mesma versao do
# servidor: um dump feito por um cliente mais antigo falha contra um servidor
# mais novo. O curl entra para chamar as rotas de cron, que exigem header.
FROM postgres:18-alpine

RUN apk add --no-cache curl tzdata

COPY crontab /etc/crontabs/root
COPY entrypoint.sh /usr/local/bin/entrypoint
COPY chamar-cron.sh /usr/local/bin/chamar-cron
COPY backup-postgres.sh /usr/local/bin/backup-postgres
RUN chmod +x /usr/local/bin/entrypoint /usr/local/bin/chamar-cron /usr/local/bin/backup-postgres

# A imagem do Postgres tem um entrypoint que sobe um banco. Aqui ela e' usada so'
# como caixa de ferramentas, entao aquele entrypoint sai do caminho.
ENTRYPOINT ["/usr/local/bin/entrypoint"]
