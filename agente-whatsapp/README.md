# Agente do grupo no WhatsApp

Aceita no grupo da comunidade quem já é membro ativo da plataforma.

A Z-API avisa, por webhook, que alguém pediu entrada. O agente pergunta à
plataforma se aquele telefone pertence a um membro ativo e, sendo, aprova pela
própria Z-API. Quem não casa fica esperando — o agente nunca recusa sozinho.

O ciclo fecha com a outra metade, que vive na plataforma: assim que o Stripe
confirma o pagamento, o novo membro recebe o link do convite por WhatsApp, com o
pedido de entrar usando o mesmo número. Esse número é o que o agente confere
aqui. A variável do link é `WHATSAPP_GRUPO_CONVITE`, nas variáveis do projeto na
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

Precisa de Node 20 ou mais novo. Não há dependências para instalar.

```bash
# na VPS, como o usuário que vai rodar o serviço
git clone <o repositório> /opt/sm
cd /opt/sm/agente-whatsapp
node --version        # 20+
```

### Variáveis

Crie `/etc/sm-agente.env` com permissão restrita (`chmod 600`), porque ele
guarda segredos:

```ini
PORTA=8080
PLATAFORMA_URL=https://<o endereço da plataforma>
AGENTE_SECRET=<o mesmo valor configurado na Vercel>
ZAPI_INSTANCE_ID=<id da instância>
ZAPI_TOKEN=<token da instância>
ZAPI_CLIENT_TOKEN=<token da conta, se estiver ativo>
ZAPI_GRUPO_ID=<id do grupo, ex.: 120363019502650977-group>
WEBHOOK_SEGREDO=<um valor aleatório que você escolhe>
ARQUIVO_DE_EVENTOS=/var/log/sm-agente/eventos.jsonl
```

Gere os dois segredos que são seus (`AGENTE_SECRET` e `WEBHOOK_SEGREDO`) com
`openssl rand -hex 32`. O `AGENTE_SECRET` tem de ser idêntico ao que está nas
variáveis do projeto na Vercel.

Falta de variável derruba o processo na partida, de propósito: um agente que
sobe sem o segredo ficaria recebendo pedidos e jogando todos fora.

### Serviço

`/etc/systemd/system/sm-agente.service`:

```ini
[Unit]
Description=Agente do grupo no WhatsApp (SM Smart Money)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=sm
WorkingDirectory=/opt/sm/agente-whatsapp
EnvironmentFile=/etc/sm-agente.env
ExecStart=/usr/bin/node src/servidor.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

# O processo não precisa de mais nada do sistema do que o próprio diretório.
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log/sm-agente

[Install]
WantedBy=multi-user.target
```

```bash
sudo mkdir -p /var/log/sm-agente && sudo chown sm:sm /var/log/sm-agente
sudo systemctl daemon-reload
sudo systemctl enable --now sm-agente
curl localhost:8080/saude
```

### Conferir antes de ligar

Com o arquivo de ambiente pronto, rode a verificação **antes** de apontar o
webhook. Ela confere a corrente inteira sem mexer em ninguém — a sonda de
aprovação usa um número impossível, então ninguém entra no grupo por causa dela:

```bash
cd /opt/sm/agente-whatsapp
set -a; . /etc/sm-agente.env; set +a
npm run verificar
```

A saída não contém nenhum valor de segredo, só se está presente e se funciona —
pode ser colada em qualquer lugar. Ela termina em erro enquanto houver item
pendente, então serve também de porta no deploy.

### Endereço público e webhook

O agente fala HTTP puro: quem termina o TLS é o nginx (ou o Caddy) da VPS,
apontando um subdomínio para `localhost:8080`. **Não exponha a porta direto** —
o webhook viaja pela internet e carrega número de telefone de gente.

Na Z-API, configure o webhook **"Ao receber"** para:

```
https://<seu subdomínio>/webhook?s=<WEBHOOK_SEGREDO>
```

O segredo vai na URL porque a Z-API não assina o corpo nem permite cabeçalho
próprio. Sem ele, qualquer um que descubra o endereço consegue mandar pedidos
falsos de entrada.

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
