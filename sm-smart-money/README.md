# SM Smart Money — Plataforma da comunidade

Portal privado de membros, sistema de perfis públicos e painel administrativo da
comunidade de inteligência financeira SM Smart Money. Substitui a plataforma atual
(smboard.com.br), cujo admin é uma página única com 4 KPIs estáticos e uma tabela
somente leitura.

## Stack

| Camada | Escolha |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript estrito |
| Estilo | Tailwind CSS sobre tokens CSS próprios, com dark mode |
| Banco | PostgreSQL 18 + Prisma |
| Auth | JWT de acesso (`jose`) + refresh token opaco rotacionado, em cookies httpOnly |
| E-mail | Nodemailer / Zoho SMTP |
| WhatsApp | WAHA (WhatsApp HTTP API) |
| Editor | Tiptap (CMS integrado ao admin) |

## Subir localmente

Um comando, com a aplicação em modo produção, banco e WhatsApp:

```bash
./scripts/local-up.sh
```

O script confere se o Docker está rodando, gera o `.env` com um `AUTH_SECRET`
novo, sobe os serviços e popula com dados de exemplo se o banco estiver vazio.
Rodar de novo apenas reconstrói: o `.env` existente nunca é sobrescrito e o seed
não repete em banco com dados.

As migrations rodam num serviço próprio, `migrate`, que aplica o que estiver
pendente e sai. O app só sobe depois que ele termina bem, então nunca serve
contra um schema desatualizado. A imagem que atende o tráfego não carrega a CLI
do Prisma nem as dependências de desenvolvimento.

Ao terminar, a plataforma responde em `http://localhost:3000`.

**Máquina com outros projetos.** As portas 3000 e 5432 costumam estar disputadas.
O script avisa antes de subir se alguma estiver ocupada e aceita outras:

```bash
APP_PORT=3010 POSTGRES_PORT=5433 WAHA_PORT=3011 ./scripts/local-up.sh
```

A escolha fica gravada no `.env`, então os comandos seguintes de `docker compose`
usam as mesmas portas sem precisar repetir as variáveis.

| Comando | O que faz |
|---|---|
| `docker compose logs -f app` | acompanha os logs da aplicação |
| `docker compose down` | para tudo, preservando o banco |
| `docker compose down -v` | para tudo e apaga o banco |
| `docker compose --profile seed run --rm seed` | recria os dados de exemplo, apagando os atuais |
| `docker compose run --rm migrate` | aplica migrations pendentes sem reiniciar o app |

### Sem Docker

Precisa de um PostgreSQL acessível:

```bash
cp .env.example .env          # preencha DATABASE_URL e AUTH_SECRET
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

### Credenciais do seed

Todas as contas de demonstração usam a senha `SmartMoney2026`. O próprio
`npm run db:seed` imprime esta lista ao terminar, já com os e-mails da execução.

| Perfil | E-mail | Para ver |
|---|---|---|
| Admin | `admin@smboard.com.br` | painel completo |
| Membro VIP | `ricardo-duarte@exemplo.com.br` | conteúdo VIP liberado |
| Membro padrão | `ana-paula-klein@exemplo.com.br` | conteúdo VIP bloqueado |
| Cancelado | `juliana-yamamoto@exemplo.com.br` | tela de reativação |
| Pendente | `henrique-zanetti@exemplo.com.br` | tela de cadastro em análise |

`npm run typecheck`, `npm run lint` e `npm run build` passam limpos.

## Assinatura e cobrança

Cartão de crédito, mensal, com cancelamento pelo próprio membro. A cobrança
inteira vive no Stripe; a plataforma guarda só o espelho do que decide acesso.

### O caminho de entrada

O convite fecha o painel de marca da tela de login e leva direto ao checkout do
Stripe. Não há formulário intermediário e nenhum dado de cartão passa pela
plataforma.

A conta do membro **não** nasce no clique: ela nasce no webhook, depois do
pagamento aprovado. Criar antes deixaria uma conta órfã a cada checkout
abandonado, e abriria cadastro público sem cobrança. Assim que a conta nasce, o
membro recebe o mesmo e-mail de definição de senha que o convite do admin usa.

### Cancelar sem perder o que já foi pago

Quem cancela **continua ativo até o fim do período pago**. O clique só agenda o
encerramento no Stripe; quem vira o status é o webhook de fim de ciclo. Enquanto
isso a tela mostra a data de término e um botão para retomar.

| Evento | `status` do membro | `subscriptionStatus` |
|---|---|---|
| checkout aprovado | ATIVO | ATIVA |
| cancelamento agendado | ATIVO | ATIVA |
| retomada antes do fim | ATIVO | ATIVA |
| cartão recusado, Stripe tentando | ATIVO | INADIMPLENTE |
| tentativas esgotadas | CANCELADO | CANCELADA |

Inadimplente mantém o acesso de propósito: derrubar alguém por uma falha de
cartão que pode ser temporária custa mais do que os poucos dias de tolerância.
Quem corta é o Stripe, quando as retentativas acabam.

Trocar cartão e baixar fatura ficam no portal do Stripe. Reconstruir isso aqui
significaria receber número de cartão na plataforma, o que muda a exigência de
conformidade sem ganho para quem usa.

### Por que existe uma tabela de eventos

O Stripe reentrega tudo que não respondeu 200, e não garante ordem. Sem a trava
de idempotência, uma reentrega atrasada de encerramento cancelaria uma assinatura
que o membro acabou de retomar. A trava é solta quando o tratamento falha, para a
reentrega poder tentar de novo: perder um evento é pior do que reprocessá-lo.

### O que configurar no Stripe

Um preço recorrente em reais, e um endpoint de webhook apontando para
`https://SEU_DOMINIO/api/stripe/webhook` inscrito nestes eventos:

```
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed
```

As três variáveis correspondentes estão no `.env.example`. Sem elas a plataforma
roda inteira, apenas sem o caminho de assinatura.

## Publicar numa VPS

Um comando, depois de preencher o `.env`:

```bash
./scripts/vps-up.sh
```

Antes de rodar, três coisas precisam estar prontas:

1. Docker com Compose v2 instalado e ativo na VPS.
2. O domínio de `APP_DOMAIN` apontando para o IP da máquina. O certificado é
   validado pela porta 80, então sem DNS não há HTTPS.
3. As portas 80 e 443 liberadas no firewall, e **só** elas.

O script confere as variáveis obrigatórias, recusa segredos curtos demais,
constrói as imagens, aplica as migrations, sobe a stack e no fim verifica duas
coisas que valem mais do que a configuração no papel: se algum serviço além do
proxy ficou publicando porta, e se a WAHA de fato recusa uma chamada sem chave.

### Os três arquivos do Compose

| Arquivo | Quando entra | O que faz |
|---|---|---|
| `docker-compose.yml` | sempre | define os serviços, sem publicar nenhuma porta |
| `docker-compose.override.yml` | `docker compose` sem `-f` | publica app, banco e WAHA no host, para desenvolvimento |
| `docker-compose.prod.yml` | `-f` explícito | acrescenta proxy com HTTPS, agendador e a chave da WAHA |

A base não publica porta nenhuma de propósito. Numa máquina com IP público,
publicar o Postgres é deixá-lo aberto para a internet, e passar `-f` explícito
no deploy é o que impede o override de desenvolvimento de entrar junto.

Em produção só o proxy aparece de fora, em 80 e 443. Banco, WAHA, aplicação e
agendador existem apenas dentro da rede do Compose.

### O agendador

Na Vercel as rotinas vinham do `vercel.json` e rodavam uma vez por dia, limite do
plano gratuito. Na VPS um container próprio cuida disso, e a frequência passa a
ser a que faz sentido:

| Rotina | Frequência | Por quê |
|---|---|---|
| notificações agendadas | de hora em hora | o agendamento fica pontual |
| saúde da WAHA | a cada 15 minutos | o alerta só sai na queda, então não repete |
| backup do banco | 3h15 da manhã | fora do horário de uso |

Os dumps ficam em `backups/`, comprimidos, e o expurgo respeita
`BACKUP_RETENTION_DAYS`. O dump e a compressão são passos separados de propósito:
num pipe, o status que sobra é o do `gzip`, e um `pg_dump` interrompido no meio
deixaria um arquivo íntegro e truncado, com cara de backup bom.

Para acompanhar:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f scheduler
```

### Restaurar um backup

```bash
gunzip -c backups/sm-AAAAMMDD-HHMMSS.sql.gz | \
  docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  exec -T postgres psql -U postgres -d sm_smart_money
```

### O que ainda falta para a operação real

O deploy sobe a plataforma, mas duas integrações continuam pendentes de dados que
só você tem:

- **SMTP da Zoho.** Sem `SMTP_PASSWORD` preenchido, convite e redefinição de
  senha vão para o log em vez do e-mail, e nenhum membro consegue completar o
  primeiro acesso.
- **Número do WhatsApp.** Depois do deploy, abra `/admin/whatsapp` e leia o QR
  Code. A sessão fica no volume da WAHA e sobrevive a reinício.

## Publicar na Vercel

A Vercel compila o Next por conta própria e não usa o Docker. Ela hospeda a
aplicação, mas não banco nem processo sempre ligado, então a configuração tem
três partes.

**1. Banco.** Crie um PostgreSQL gerenciado, por exemplo no Neon ou no Supabase.
Guarde as duas strings de conexão que eles oferecem, a com pool e a direta. O
Prisma usa a com pool na aplicação e a direta nas migrations, que falham contra
uma conexão com pool. Num Postgres comum, sem pool, repita a mesma string nas
duas variáveis.

**2. Projeto.** Importe o repositório na Vercel. A aplicação fica na raiz, então
não é preciso ajustar o Root Directory. A Vercel detecta o Next sozinha.

**3. Variáveis de ambiente.** No mínimo:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | a string de conexão da aplicação, a com pool se houver |
| `DIRECT_DATABASE_URL` | a conexão direta, usada pelas migrations |
| `AUTH_SECRET` | gere com `openssl rand -base64 48` |
| `NEXT_PUBLIC_APP_URL` | a URL do projeto, depois o domínio próprio |
| `CRON_SECRET` | gere com `openssl rand -hex 24` |

As de SMTP entram quando você quiser envio real de e-mail. Sem elas, as mensagens
ficam registradas no log e no histórico, sem sair.

O deploy roda o script `vercel-build`, que aplica as migrations antes de compilar.
O `build` comum fica reservado ao Docker, que não tem banco no momento da imagem.

### Primeiro administrador

O seed não serve para produção: ele limpa as tabelas. Para criar o acesso inicial
sem tocar em mais nada:

```bash
DATABASE_URL="<string do banco>" \
ADMIN_NAME="Seu Nome" \
ADMIN_EMAIL="voce@dominio.com.br" \
ADMIN_PASSWORD="<senha forte>" \
npm run db:create-admin
```

Rodar de novo com o mesmo e-mail promove a conta existente e troca a senha.

### Explorar com dados simulados e depois carregar os reais

O seed existe para conhecer a plataforma cheia e para apresentá-la. Ele apaga
todas as tabelas antes de popular, então só roda numa base cujas contas vieram
dele próprio. Numa base com dados reais ele interrompe e explica o caminho, em
vez de destruir.

O que ele cria:

| Área | Volume |
|---|---|
| Membros | 36, sendo 29 ativos, 5 cancelados e 2 pendentes |
| Conteúdo | 66 peças: 21 artigos, 15 análises, 12 vídeos, 9 podcasts, 9 e-books |
| Palestras | 14, entre agendadas e realizadas, com 6 palestrantes |
| Comunidade | 18 tópicos e 87 respostas |
| Diagnósticos | 28 Smart Money Journey concluídos |
| Histórico | 12 meses de entradas e cancelamentos, 225 visualizações |
| Operação | 25 registros de auditoria, 38 e-mails e 18 mensagens de WhatsApp |

O ciclo completo:

```bash
npm run db:seed                              # carrega a simulação
CONFIRMAR=SIM INCLUIR_ADMINS=1 npm run db:clean   # limpa tudo
npm run db:create-admin                      # recria só o seu acesso
```

Sem `CONFIRMAR`, o `db:clean` apenas mostra o que existe e não apaga nada.

Sem `INCLUIR_ADMINS`, ele preserva os administradores. Isso protege quem está
limpando de se trancar para fora, mas na virada para produção use a variável:
o seed cria um administrador de demonstração com senha pública, e ele
sobreviveria à limpeza comum.

| Comando | Efeito |
|---|---|
| `npm run db:clean` | mostra os totais, não apaga |
| `CONFIRMAR=SIM npm run db:clean` | apaga tudo, mantém administradores |
| `CONFIRMAR=SIM INCLUIR_ADMINS=1 npm run db:clean` | apaga tudo, inclusive administradores |
| `SEED_FORCE=1 npm run db:seed` | popula ignorando a proteção |

### O que não funciona na Vercel

A integração com WhatsApp. A WAHA mantém uma sessão do WhatsApp Web aberta e
precisa de disco e processo contínuo, coisas que a Vercel não oferece. O painel
mostra a integração como não configurada e os disparos ficam só no log. Todo o
resto da plataforma funciona.

As rotinas agendadas em `vercel.json` estão diárias, o limite dos planos
gratuitos. Em plano pago dá para deixá-las de hora em hora, o que deixa as
notificações agendadas mais pontuais.

### Do local para um domínio

Nada no código está preso a um endereço: `NEXT_PUBLIC_APP_URL` alimenta os links
dos e-mails, as meta tags de compartilhamento e o endereço de perfil mostrado ao
membro. Apontar para um subdomínio é trocar essa variável e o DNS.

Dois pontos merecem atenção na virada:

- **HTTPS não é opcional.** Os cookies de sessão são marcados como `secure` fora
  de desenvolvimento, então sem certificado o login não completa.
- **A WAHA não roda em serverless.** Ela mantém uma sessão do WhatsApp Web aberta,
  com disco persistente, e precisa de um container de pé.

## Como o acesso é decidido

`plan`, `status` e `tier` são três dimensões independentes. A plataforma atual
mistura "Cortesia" (comercial), "Ativo" (assinatura) e "VIP" (acesso) num rótulo
só; aqui cada um tem sua coluna e o badge público é derivado.

| Coluna | Valores | Decide |
|---|---|---|
| `plan` | PADRAO · COM_DESCONTO · CORTESIA | a relação comercial e o MRR estimado |
| `status` | ATIVO · CANCELADO · PENDENTE | se o conteúdo abre |
| `tier` | PADRAO · VIP | se o conteúdo marcado como VIP abre |
| `isPartner` | boolean | o selo "SM PARTNER" no perfil público |

Regras aplicadas:

- **Não autenticado** — apenas `/login` e os perfis públicos `/{slug}`.
- **Cancelado** — redirecionado para `/reativar`; o perfil público continua no ar.
- **Pendente** — redirecionado para `/primeiro-acesso`.
- **VIP** — enxerga conteúdos e tópicos marcados como VIP; os demais recebem 404.
- **Admin** — todas as rotas de membro mais `/admin/*`.

O roteamento por papel roda em `src/proxy.ts` (o antigo `middleware.ts`), no edge:
ele valida a assinatura do token sem tocar no banco. Quando o access token expira
e o refresh ainda vale, o usuário é levado a `/api/auth/refresh`, que rotaciona os
tokens no runtime Node e o devolve à rota original.

Cancelar um membro revoga as sessões na hora — sem isso o token continuaria valendo
até expirar.

## Lacunas da plataforma atual, e onde foram resolvidas

| # | Lacuna | Onde |
|---|---|---|
| G01 | Conteúdo gerenciado fora do sistema | CMS em `/admin/conteudo`, com editor rich text, agendamento e visibilidade |
| G02 | Tabela de membros somente leitura | CRUD completo + `/admin/membros/{id}` com diagnóstico, atividade e comunicações |
| G03 | 4 números estáticos | `/admin` com crescimento, churn, engajamento e adesão, filtrável por período |
| G04 | Diagnósticos invisíveis | `/admin/diagnosticos`: agregado, média por dimensão e resultado individual |
| G05 | Sem filtros e sem paginação | Filtros por plano, status, perfil e data + ordenação + paginação server-side (25/página) |
| G06 | Disparo em massa sem confirmação | Seleção explícita, prévia do e-mail, confirmação e histórico por destinatário |
| G07 | Perfil privado retornava 404 | Página "perfil em breve" mantendo a URL e o link já compartilhado |
| G08 | Perfil público raso | Bio, especialidades, localização, LinkedIn, site, WhatsApp opcional, cartão digital com QR Code |
| G09 | Comunidade só no WhatsApp | Fórum por categoria + mural de oportunidades + diretório de membros |
| G10 | Sem notificações internas | Sino com badge, histórico e composição segmentada no admin |
| G11 | Sem rastreabilidade | `AuditLog` append-only com autor, ação, entidade e IP, visível em `/admin/auditoria` |
| G12 | Queda da WAHA passava despercebida | `/api/cron/waha-health` alerta por e-mail na transição para offline |
| G13 | Admin não usável no celular | Gaveta de navegação, cards no lugar da tabela e KPIs responsivos |

## Decisões que valem registro

**Um único modelo `Content`** cobre artigo, vídeo, podcast, análise e e-book, com
campos opcionais por tipo. O CMS fica uniforme e uma nova seção não exige migration.

**A pontuação do Journey é recalculada no servidor** a partir das opções salvas no
banco. O cliente envia apenas o índice escolhido — enviar o `score` deixaria o
membro definir o próprio resultado.

**Os destinatários de uma notificação são materializados no disparo.** Mudar o plano
de um membro depois não reescreve quem recebeu o quê.

**Agendamento de conteúdo não precisa de job.** O filtro de leitura do portal exige
`publishedAt <= agora`, então o conteúdo aparece sozinho na hora marcada. O cron
serve às notificações, que precisam materializar a lista.

**Os gráficos são SVG escritos à mão**, sem biblioteca: as cores saem dos tokens CSS
e trocam de tema sem re-render, e o peso de JS no dashboard conta para o LCP.
Nenhum gráfico usa eixo duplo — contagem e taxa de churn são apresentadas
separadamente, porque alinhar duas escalas num mesmo plano inventa correlação.
A cor de série no tema claro é `#9a7a42`, não o dourado de marca: medido, o
dourado puro fica em 2,24:1 sobre a superfície clara, abaixo do piso de 3:1.

**Sem SMTP ou WAHA configurados, nada quebra.** O envio vai para o console e o log
registra a tentativa, então o fluxo completo — incluindo o histórico de disparos —
é exercitável em desenvolvimento.

## Rotinas agendadas

```
GET /api/cron/waha-health    # health check da instância + alerta na queda
GET /api/cron/agendamentos   # dispara notificações agendadas que venceram
```

As duas aceitam o header `x-cron-secret` ou `Authorization: Bearer`, este último
o formato que a Vercel Cron envia. Quem as chama depende do ambiente: na Vercel,
os `crons` do `vercel.json`; na VPS, o container `scheduler`. O segredo vai
sempre em header e nunca na URL, que apareceria no log de acesso do proxy.

## Estrutura

```
├── vercel.json                  framework, região e rotinas agendadas
├── Dockerfile                   imagem de produção (multi-stage)
├── docker-compose.yml           serviços, sem publicar porta
├── docker-compose.override.yml  portas no host, só em desenvolvimento
├── docker-compose.prod.yml      proxy com HTTPS, agendador e chave da WAHA
├── deploy/                      Caddyfile, imagem e scripts do agendador
├── scripts/local-up.sh          sobe a stack local com um comando
├── scripts/vps-up.sh            sobe a stack na VPS e confere a exposição
└── src/
    ├── proxy.ts                roteamento por papel (edge)
    ├── app/
    │   ├── (auth)/             login, recuperação e redefinição de senha
    │   ├── (portal)/           área do membro, com sidebar e bottom nav
    │   ├── (account)/          conta cancelada ou pendente
    │   ├── admin/              painel administrativo
    │   ├── [slug]/             perfil público
    │   └── api/                auth, portal, admin e cron
    ├── components/{ui,portal,admin,charts}/
    ├── lib/                    auth, domínio, e-mail, WAHA, auditoria, tokens
    └── server/                 consultas por área (membros, conteúdo, analytics…)
```

## Fases

**Fase 1 e 2 estão implementadas**: autenticação completa, dashboard do membro,
todas as seções de conteúdo, Smart Money Journey com visão administrativa, perfis
públicos, CMS integrado, analytics, notificações in-app e WAHA com alertas.

**Da fase 3** foram entregues o fórum, o diretório de membros, os perfis públicos
enriquecidos e o cartão digital com QR Code. Ficam fora: mensagens diretas entre
membros e o app mobile dedicado.

## Ponto em aberto

`npm audit` reporta uma vulnerabilidade alta em `deepmerge-ts`, alcançada por
`@prisma/config`. O pacote `prisma` entra na árvore de produção porque
`@prisma/client` depende dele. Não há versão do Prisma sem esse aviso hoje: a
linha 7.x troca o problema por outro (`mysql2`). O impacto se restringe ao
carregador de configuração da CLI, que não é alcançável em runtime pela aplicação.
