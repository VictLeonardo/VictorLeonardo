# Agente do grupo no WhatsApp

Aceita no grupo da comunidade quem já é membro ativo da plataforma.

A Z-API avisa, por webhook, que alguém pediu entrada. O agente pergunta à
plataforma se aquele telefone pertence a um membro ativo e, sendo, aprova pela
própria Z-API. Quem não casa fica esperando — o agente nunca recusa sozinho.

O ciclo fecha com a outra metade, que vive na plataforma: assim que o Stripe
confirma o pagamento, o novo membro recebe o link do convite por WhatsApp, com o
pedido de entrar usando o mesmo número. Esse número é o que o agente confere
aqui. A variável do link é `WHATSAPP_GROUP_URL`, nas variáveis do projeto na
Vercel — não aqui na VPS.

## Por que ele existe fora da plataforma

A decisão de quem pode entrar mora na plataforma, não aqui. Este processo só
recebe o aviso, pergunta e executa: a VPS nunca guarda credencial do banco, e a
regra de "quem é membro" existe num lugar só.

## O que ele faz com cada pedido

| Situação | O que acontece |
|---|---|
| Telefone de membro **ativo** | aprovado na hora |
| Membro **cancelado** ou **pendente** | fica esperando, com o motivo registrado |
| Telefone que não está na base | fica esperando |
| Telefone ilegível | fica esperando |
| Mesmo número com dois cadastros | fica esperando — ninguém entra por ambiguidade |

Celular brasileiro casa com e sem o nono dígito: o WhatsApp entrega as duas
formas para a mesma linha, e recusar por causa disso barraria cliente pagante.

## Instalação na VPS

Ubuntu/Debian. Não há dependências npm para instalar — só Node 20+.

> **VPS nova, do zero?** `deploy/hostinger.md` tem o procedimento completo para
> uma VPS da Hostinger: criar a máquina, proteger o acesso, firewall, DNS,
> HTTPS e webhook, com um "conferir" em cada etapa. O que está aqui é a parte
> do agente, que esse roteiro também usa.

A parte mecânica desta seção está em `deploy/instalar.sh`, que pode rodar mais
de uma vez sem estragar nada:

```bash
sudo ./deploy/instalar.sh
```

Ele instala o Node se faltar, cria o usuário de sistema, copia o código como
somente leitura, sorteia `AGENTE_SECRET` e `WEBHOOK_SEGREDO`, e instala o
serviço com o caminho real do Node resolvido. Não sobrescreve
`/etc/sm-agente.env` se ele já existir, e não inicia o serviço enquanto
houver valor por preencher. O resto desta seção é o que ele faz, passo a
passo, para quem preferir na mão.

A ordem importa: o agente não sobe sem o id do grupo, e a verificação existe
para falhar **antes** de a Z-API começar a mandar pedidos de verdade.

### 1. Node, usuário e diretórios

O unit chama `/usr/bin/node`. O pacote oficial da NodeSource põe o binário
nesse caminho; nvm e tarball não. Confira com `command -v node` e ajuste o
`ExecStart` se der outro lugar.

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
command -v node && node --version        # /usr/bin/node, v22.x

sudo useradd --system --create-home --home-dir /home/sm --shell /usr/sbin/nologin sm
sudo mkdir -p /opt/sm
sudo git clone <o repositório> /opt/sm/repo
sudo cp -r /opt/sm/repo/agente-whatsapp /opt/sm/agente-whatsapp
sudo chown -R root:root /opt/sm/agente-whatsapp      # o serviço só lê
```

Não é preciso criar `/var/log/sm-agente`: o unit declara `LogsDirectory` e o
systemd cria no dono certo.

### 2. Variáveis

`/etc/sm-agente.env`, legível pelo serviço e por mais ninguém:

```ini
PLATAFORMA_URL=https://<o endereço da plataforma>
AGENTE_SECRET=<o mesmo valor configurado na Vercel>
ZAPI_INSTANCE_ID=<id da instância>
ZAPI_TOKEN=<token da instância>
ZAPI_CLIENT_TOKEN=<token da conta, se estiver ativo>
ZAPI_GRUPO_ID=<descoberto no passo 3>
WEBHOOK_SEGREDO=<um valor aleatório que você escolhe>
```

```bash
sudo chown root:sm /etc/sm-agente.env
sudo chmod 640 /etc/sm-agente.env    # o grupo sm lê, para rodar a verificação
```

Gere os dois segredos que são seus (`AGENTE_SECRET` e `WEBHOOK_SEGREDO`) com
`openssl rand -hex 32`. O `AGENTE_SECRET` tem de ser **idêntico** ao das
variáveis do projeto na Vercel; na plataforma ele é opcional, e faltando lá a
rota responde 401 a tudo — a verificação diz isso com essas palavras.

`PORTA` (8080) e `ESCUTAR_EM` (127.0.0.1) têm padrão e normalmente não entram
no arquivo. O agente escuta só no localhost de propósito: quem atende a
internet é o nginx. Para expor direto (túnel, outro proxy), defina
`ESCUTAR_EM=0.0.0.0` — e saiba que o segredo do webhook viaja na URL.

### 3. Descobrir o id do grupo

O valor não está em lugar óbvio no painel. Com as credenciais da Z-API já no
arquivo (sem o id ainda):

```bash
cd /opt/sm/agente-whatsapp
set -a; . /etc/sm-agente.env; set +a
npm run grupos
```

Lista os grupos da instância com a linha pronta para colar. Só lê — não entra
em grupo, não aprova ninguém.

### 4. Serviço

O unit está em `deploy/sm-agente.service`, versionado junto do código:

```bash
sudo cp /opt/sm/agente-whatsapp/deploy/sm-agente.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now sm-agente
systemctl status sm-agente --no-pager
curl localhost:8080/saude
```

### 5. Conferir antes de ligar o webhook

```bash
cd /opt/sm/agente-whatsapp
set -a; . /etc/sm-agente.env; set +a
npm run verificar
```

Confere a corrente inteira sem mexer em ninguém — a sonda de aprovação usa um
número impossível. Nenhum valor de segredo aparece na saída, só se está
presente e se funciona, então ela pode ser colada em qualquer lugar. Termina em
erro enquanto houver item pendente, e serve de porta no deploy.

Dois itens dela merecem atenção, porque falham calados em produção:

- **número conectado é admin** — sem ser administrador do grupo, a aprovação
  não acontece e ninguém percebe até um membro reclamar que não entrou.
- **grupo pede aprovação** — é o "Aprovar novos participantes" do grupo. Com
  ele desligado, ninguém pede entrada e o agente nunca recebe nada.

Se a Z-API não responder o `group-metadata`, esses dois saem como `aviso` em
vez de falha: a verificação não tem como confirmar, e dizer "reprovado" seria
mentir. Aí a prova é o teste real do passo 7.

### 6. Endereço público (HTTPS) e webhook

O agente fala HTTP puro no localhost. Quem termina TLS é o nginx, e isso não é
capricho: a Z-API não assina o corpo nem aceita cabeçalho próprio, então o
nosso segredo vai na query string. Em HTTP aberto ele viajaria em claro.

`deploy/nginx-agente.conf` já traz o bloco pronto — inclusive um formato de log
que **não** grava a query string, senão o segredo ficaria em texto puro no
disco a cada pedido.

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo cp /opt/sm/agente-whatsapp/deploy/nginx-agente.conf /etc/nginx/sites-available/agente
sudo sed -i 's/agente.SEU-DOMINIO/agente.seudominio.com.br/' /etc/nginx/sites-available/agente
sudo ln -sf /etc/nginx/sites-available/agente /etc/nginx/sites-enabled/agente
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d agente.seudominio.com.br
```

O DNS do subdomínio tem de apontar para o IP da VPS. Atrás do Cloudflare,
deixe o registro **sem proxy** (nuvem cinza) enquanto o certbot valida; depois
pode religar, mas então use Full (strict), porque com Flexible a perna
Cloudflare→VPS volta a ser HTTP puro.

Na Z-API, aponte o webhook **"Ao receber"** para:

```
https://agente.seudominio.com.br/webhook?s=<WEBHOOK_SEGREDO>
```

### 7. Teste real, com um número de verdade

A verificação cobre a corrente, mas só um pedido real prova que a aprovação
funciona — é ali que aparece, por exemplo, o número conectado não ser admin.

Com um número que **é** membro ativo, peça entrada no grupo pelo link do
convite e acompanhe:

```bash
journalctl -u sm-agente -f
```

Deve sair `pedido-recebido` e, em seguida, `aprovado`. Se sair `falhou`, a
linha traz a resposta da Z-API — é ela que diz o motivo.

## Acompanhamento

`/saude` responde o estado e o grupo atendido — serve de health check.

Cada evento vira uma linha JSON em `ARQUIVO_DE_EVENTOS` e no journal:

```bash
journalctl -u sm-agente -f
grep '"tipo":"falhou"' /var/log/sm-agente/eventos.jsonl
```

Os tipos são `pedido-recebido`, `aprovado`, `aguardando`,
`vou-tentar-de-novo`, `falhou` e `corpo-ilegivel`.

O diário existe por um motivo específico: **a Z-API não tem como listar pedidos
pendentes**. Se o agente estiver fora do ar na hora em que alguém pedir, aquele
pedido se perde e não há de onde recuperá-lo. Gravar o corpo cru assim que
chega é o que permite reprocessar depois, e é a única forma de responder
"esse pedido chegou?".

Toda decisão também fica na auditoria da plataforma, em Admin → Auditoria.
