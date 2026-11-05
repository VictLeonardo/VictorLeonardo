# Variáveis na Vercel

O que preencher no projeto da plataforma, e onde achar cada valor. A fonte da
verdade é `src/lib/env.ts`; este arquivo é o recorte do que vai **na Vercel**
(o `.env.example` cobre também Docker, VPS e scripts).

Ao terminar, **faça redeploy**: variável nova não entra no deployment que já
está no ar.

## Obrigatórias — sem elas não sobe

| Variável | Onde achar |
|---|---|
| `DATABASE_URL` | Neon → projeto → Connection string (a **com pool**, host com `-pooler`) |
| `DIRECT_DATABASE_URL` | Neon → mesma tela → connection string **direta** (host **sem** `-pooler`) |
| `AUTH_SECRET` | você gera: `openssl rand -base64 48` (mínimo 32 caracteres) |
| `NEXT_PUBLIC_APP_URL` | o endereço público da plataforma, ex. `https://portal.smpartner.com.br` |

`DIRECT_DATABASE_URL` é a pegadinha: ela não passa pelo schema de validação,
então faltando ela o build quebra com erro do Prisma, não com a mensagem
amigável das outras. O `vercel-build` roda `prisma migrate deploy`, que a usa.

`NEXT_PUBLIC_APP_URL` também define **onde** a aplicação é servida: o caminho
dela vira o `basePath`. Para a plataforma na raiz do host, deixe **sem
caminho**. Só coloque `/viplounge` quando a migração de domínio acontecer.

## Pagamento — as três juntas, ou o caminho de assinatura some

| Variável | Onde achar |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys → Secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → o endpoint → Signing secret (`whsec_...`) |
| `STRIPE_PRICE_PADRAO` | Stripe → Products → o preço recorrente → ID (`price_...`) |

O endpoint do webhook aponta para `https://SEU_DOMINIO/api/stripe/webhook`,
com os eventos `checkout.session.completed`,
`customer.subscription.created/.updated/.deleted`, `invoice.paid` e
`invoice.payment_failed`.

Sem as três, a plataforma roda inteira — só sem assinatura.

## E-mail — precisa de HOST, USER e PASSWORD juntos

| Variável | Onde achar |
|---|---|
| `SMTP_HOST` | `smtp.resend.com` |
| `SMTP_USER` | a palavra `resend` (não é um endereço) |
| `SMTP_PASSWORD` | Resend → API Keys → a chave (`re_...`) |
| `SMTP_PORT` | `465` |
| `SMTP_SECURE` | `true` |
| `MAIL_FROM` | remetente num domínio **verificado** no Resend |
| `ADMIN_ALERT_EMAIL` | o endereço que recebe alertas operacionais |

Remetente fora de domínio verificado faz o Resend recusar envio a terceiros.

## WhatsApp

| Variável | Onde achar |
|---|---|
| `ZAPI_INSTANCE_ID` | painel Z-API → a instância → **editar** |
| `ZAPI_TOKEN` | mesma tela |
| `ZAPI_CLIENT_TOKEN` | painel Z-API → **Segurança** → "Token de Segurança da Conta" |
| `ZAPI_BASE_URL` | **deixe vazia** — o padrão é `api.z-api.io`, que é onde os endpoints de grupo existem |
| `WHATSAPP_GROUP_URL` | WhatsApp → o grupo → Convidar via link |
| `WHATSAPP_PROVIDER` | deixe vazia; só desempata se WAHA e Z-API estiverem configurados ao mesmo tempo |

O `ZAPI_CLIENT_TOKEN` é opcional **até ser ativado** no painel. Depois de
ativado, toda chamada sem ele é recusada — então a ordem segura é: pegar o
valor → pôr aqui → redeploy → só então ativar no painel.

Estas variáveis valem para a Z-API **clássica**. O Omni usa
`Authorization: Bearer` no lugar do Client-Token e não serve os endpoints de
grupo; ver `agente-whatsapp/README.md`.

## Segredos que você mesmo gera

| Variável | Como gerar | Para quê |
|---|---|---|
| `AGENTE_SECRET` | `openssl rand -hex 32` | o agente da VPS usa o mesmo valor; sem ele a rota recusa todo mundo |
| `CRON_SECRET` | `openssl rand -hex 32` | protege `/api/cron/*`; a Vercel envia como `Authorization: Bearer` nos crons |

## A Vercel preenche sozinha — não criar à mão

`BLOB_READ_WRITE_TOKEN`, `BLOB_STORE_ID` e `VERCEL_OIDC_TOKEN` aparecem ao
conectar um Blob ao projeto. `VERCEL_PROJECT_PRODUCTION_URL` já existe e serve
de rede de segurança se `NEXT_PUBLIC_APP_URL` faltar.

## Têm padrão — só mexa se quiser mudar

`AUTH_ACCESS_MINUTES` (15), `AUTH_REFRESH_DAYS` (7), `AUTH_REMEMBER_DAYS` (30),
`WAHA_SESSION` (`default`).

## NÃO vão para a Vercel

São de Docker, VPS ou scripts de linha de comando: `APP_PORT`,
`POSTGRES_PORT`, `WAHA_PORT`, `APP_DOMAIN`, `ACME_EMAIL`, `POSTGRES_PASSWORD`,
`TZ`, `BACKUP_RETENTION_DAYS`, `WAHA_BASE_URL`, `WAHA_API_KEY`, `ADMIN_EMAIL`,
`ADMIN_NAME`, `ADMIN_PASSWORD`, `SEED_FORCE`, `CONFIRMAR`, `INCLUIR_ADMINS`,
`INCLUIR_CONFIG`, `DOCKER_BUILD`.
