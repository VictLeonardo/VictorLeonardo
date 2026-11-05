# VPS da Hostinger, do zero

Procedimento completo para subir o agente do grupo numa VPS nova. Cada parte
termina num **conferir** — se ele não der o resultado descrito, pare ali, porque
o passo seguinte vai falhar de um jeito mais difícil de entender.

Marcação: **hPanel** é no painel da Hostinger, no navegador. **VPS** é dentro
da máquina, por SSH. **Vercel**, **Cloudflare** e **Z-API** são os painéis
desses serviços.

> Se você se trancar fora da máquina em qualquer passo, o hPanel tem um
> terminal no navegador que entra como root sem passar pelo SSH. É a saída de
> emergência — vale conhecer antes de precisar.

---

## Parte A — criar a VPS (hPanel)

1. Crie a VPS escolhendo:

   - **Sistema**: Ubuntu 24.04 LTS, a imagem **limpa**. Não escolha template
     com painel (CyberPanel, Plesk, aaPanel, Docker pré-montado): esses tomam
     as portas 80 e 443 para si e vão brigar com o nginx que instalamos na
     Parte E.
   - **Local**: São Paulo, se houver. Encurta o caminho até os membros e até a
     Z-API.
   - O plano mais barato dá conta: o agente é um processo Node que fica
     parado esperando webhook.

2. Anote o **IP** e a **senha de root** que a Hostinger mostra.

3. Ainda no hPanel, se houver a opção de cadastrar **chave SSH**, cadastre
   agora — poupa o passo de senha mais adiante.

4. **Firewall do hPanel**: a Hostinger tem um firewall próprio, na rede, que é
   *separado* do firewall da máquina. É a pegadinha mais comum: você libera
   tudo no `ufw` e o tráfego nem chega. Se você ativar o firewall do hPanel,
   libere **22 (SSH)**, **80 (HTTP)** e **443 (HTTPS)**. Se deixar desativado,
   quem protege é o `ufw` da Parte B.

**Conferir** — do seu computador:

```bash
ping -c 3 <IP-DA-VPS>
```

---

## Parte B — primeiro acesso e proteção (VPS)

5. Entre e troque a senha:

```bash
ssh root@<IP-DA-VPS>
passwd
apt-get update && apt-get upgrade -y
```

6. Crie seu usuário administrador e leve sua chave SSH para ele:

```bash
adduser victor                      # escolha uma senha
usermod -aG sudo victor
rsync --archive --chown=victor:victor ~/.ssh /home/victor   # se já usa chave em root
```

Se ainda não usa chave, gere no **seu computador** (não na VPS) e instale:

```bash
# no seu computador
ssh-keygen -t ed25519 -C "victor@smpartner"
ssh-copy-id victor@<IP-DA-VPS>
```

7. **Sem fechar esta sessão**, abra um **segundo terminal** e confirme que o
   usuário novo entra e tem sudo:

```bash
ssh victor@<IP-DA-VPS>
sudo -v
```

Só siga quando isso funcionar. É o que separa "endurecer o SSH" de "perder a
máquina".

8. Agora desligue login de root e senha no SSH.

**Não edite o `/etc/ssh/sshd_config` direto.** O arquivo começa com
`Include /etc/ssh/sshd_config.d/*.conf`, e o OpenSSH usa o **primeiro** valor
que lê para cada diretiva. Imagens de VPS costumam trazer um
`50-cloud-init.conf` ali com `PasswordAuthentication yes` — lido antes, ele
ganha, e a sua linha no arquivo principal é lida e ignorada. O resultado é o
pior possível: você acredita que desligou senha e ela continua ligada.

A forma que funciona é um arquivo que seja lido **antes** dos outros, e o
`00-` no nome é o que garante isso:

```bash
sudo tee /etc/ssh/sshd_config.d/00-sm-hardening.conf >/dev/null <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
EOF
sudo sshd -t                        # valida a sintaxe ANTES de reiniciar
sudo systemctl restart ssh
```

`KbdInteractiveAuthentication` entra porque é outro caminho para senha: sem
ele, desligar `PasswordAuthentication` não fecha a porta toda.

`sshd -t` existe para isso: erro de digitação aí, sem o teste, derruba o SSH
e só o terminal do navegador salva.

**Confira o que está em vigor, não o que está escrito** — é a única checagem
que vale, justamente por causa da precedência dos arquivos incluídos:

```bash
sudo sshd -T | grep -E '^(permitrootlogin|passwordauthentication|kbdinteractiveauthentication)'
```

As três têm de responder `no`. Se alguma vier `yes`, veja quem está ganhando:

```bash
ls /etc/ssh/sshd_config.d/
```

9. Firewall da máquina — **libere o SSH antes de ativar**:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status verbose
```

A porta do agente (8080) **não** entra na lista: ele escuta só em `127.0.0.1`,
e quem atende a internet é o nginx.

10. Atualizações de segurança automáticas, que é barato e evita esquecimento:

```bash
sudo apt-get install -y unattended-upgrades fail2ban
sudo systemctl enable --now fail2ban
```

**Conferir**:

```bash
sudo ufw status | grep -E '22|80|443'
sudo systemctl is-active fail2ban
```

---

## Parte C — DNS do subdomínio (Cloudflare)

11. Crie um registro **A** apontando `agente.smpartner.com.br` para o IP da
    VPS, com o proxy **desligado** (nuvem cinza). O certbot precisa alcançar a
    máquina direto para validar o certificado.

    Depois de emitir o certificado você pode religar o proxy, mas então
    configure SSL como **Full (strict)**. Em Flexible, a perna
    Cloudflare→VPS volta a ser HTTP puro — e o nosso segredo de webhook viaja
    na URL.

**Conferir** — a resposta tem de ser o IP da VPS:

```bash
dig +short agente.smpartner.com.br
```

---

## Parte D — o agente (VPS)

12. Traga o código para a VPS. São oito arquivos pequenos, e copiar do seu
    computador é melhor que clonar: a VPS não precisa de credencial do
    repositório para nada.

    **[MAC]** — do diretório onde você tem o repositório:

```bash
scp -r agente-whatsapp victor@<IP-DA-VPS>:/tmp/agente-whatsapp
```

    **[VPS]**:

```bash
sudo mkdir -p /opt/sm
sudo mv /tmp/agente-whatsapp /opt/sm/repo-agente
cd /opt/sm/repo-agente
sudo ./deploy/instalar.sh
```

    Se preferir clonar na VPS, **atenção ao branch**: o agente com o
    instalador, a checagem de admin e o aviso do Omni está no branch de
    trabalho, não no `main`.

```bash
sudo git clone -b claude/sm-smart-money-platform-unyv60 <URL-DO-REPOSITORIO> /opt/sm/repo
cd /opt/sm/repo/agente-whatsapp
sudo ./deploy/instalar.sh
```

O instalador faz a parte mecânica: instala o Node (se faltar), cria o usuário
de sistema `sm`, copia o código para `/opt/sm/agente-whatsapp` como somente
leitura, escreve `/etc/sm-agente.env` já com `AGENTE_SECRET` e
`WEBHOOK_SEGREDO` sorteados, e instala o serviço com o caminho real do Node
resolvido. Pode rodar de novo quantas vezes quiser: ele **não** sobrescreve o
arquivo de segredos.

Ele termina listando o que falta. Não inicia o serviço enquanto houver
`PREENCHER`.

13. Preencha o resto:

```bash
sudo nano /etc/sm-agente.env
```

| Variável | De onde vem |
|---|---|
| `PLATAFORMA_URL` | endereço da plataforma, com `https://` e sem barra no fim |
| `ZAPI_INSTANCE_ID`, `ZAPI_TOKEN` | painel da Z-API, na instância |
| `ZAPI_CLIENT_TOKEN` | painel da Z-API, em Segurança (token da conta) |
| `ZAPI_GRUPO_ID` | passo 15 — deixe `PREENCHER` por enquanto |
| `AGENTE_SECRET` | já sorteado — **copie para a Vercel** |
| `WEBHOOK_SEGREDO` | já sorteado — vai na URL do webhook, passo 18 |

**Não defina `ZAPI_BASE_URL`.** O padrão é `https://api.z-api.io`, e é lá que
os endpoints de grupo existem. O endereço do Omni
(`zapi.omni.z-api.io`) **não serve** os endpoints que o agente precisa:
medido com credencial falsa, só `/send-text` responde "instance not found"
(rota existe); `/status`, `/device`, `/groups`, `/group-metadata` e
`/approve-participant` respondem "404 page not found". A camada de
compatibilidade do Omni roda sobre a API oficial da Meta, e a documentação
dela avisa que só atende canal WhatsApp Oficial.

Se a conta tiver sido migrada para o Omni no painel, isso por si não muda nada
aqui — o que importa é qual base ainda serve a instância. O `npm run grupos`
do passo 15 responde: se ele lista os grupos sem você definir
`ZAPI_BASE_URL`, a API clássica está servindo e o agente funciona. Se parar de
servir algum dia, a aprovação automática precisa ser repensada, não
reconfigurada — vale perguntar ao suporte da Z-API se o `approve-participant`
vai existir no Omni.

14. **Vercel**: cadastre `AGENTE_SECRET` nas variáveis do projeto com o mesmo
    valor, e faça redeploy. Na plataforma essa variável é *opcional*: faltando
    lá, a rota do agente responde **401 a tudo**.

15. Descubra o id do grupo e cole no arquivo:

```bash
cd /opt/sm/agente-whatsapp
set -a; . /etc/sm-agente.env; set +a
npm run grupos
```

Só lê — não entra em grupo, não aprova ninguém.

16. **Z-API / WhatsApp**: no grupo, ligue **"Aprovar novos participantes"**, e
    confirme que o número conectado à Z-API é **administrador** do grupo. Sem
    isso a aprovação não acontece, e não acontece em silêncio.

17. Confira a corrente inteira e suba:

```bash
set -a; . /etc/sm-agente.env; set +a
npm run verificar
sudo systemctl start sm-agente
curl localhost:8080/saude
```

**Conferir** — todos os itens do `verificar` em `ok`. A saída não contém
nenhum valor de segredo, só se está presente e se funciona: pode colar em
qualquer lugar, inclusive aqui na conversa.

---

## Parte E — HTTPS (VPS)

18. nginx na frente, com o bloco já pronto no repositório:

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo cp /opt/sm/agente-whatsapp/deploy/nginx-agente.conf /etc/nginx/sites-available/agente
sudo sed -i 's/agente.SEU-DOMINIO/agente.smpartner.com.br/' /etc/nginx/sites-available/agente
sudo ln -sf /etc/nginx/sites-available/agente /etc/nginx/sites-enabled/agente
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d agente.smpartner.com.br
```

O `certbot --nginx` acrescenta o bloco 443 e o redirect sozinho, e já deixa a
renovação agendada.

**Conferir** — tem de responder `401` (a rota existe e está exigindo o
segredo), e **não** 404 nem erro de certificado:

```bash
curl -i -X POST https://agente.smpartner.com.br/webhook -d '{}'
```

---

## Parte F — webhook e teste real

19. **Z-API**: aponte o webhook **"Ao receber"** para:

```
https://agente.smpartner.com.br/webhook?s=<WEBHOOK_SEGREDO>
```

20. Teste com um número que **é** membro ativo. Deixe o log aberto na VPS:

```bash
sudo journalctl -u sm-agente -f
```

Peça entrada no grupo pelo link do convite. Deve sair `pedido-recebido` e, em
seguida, `aprovado`. Se sair `falhou`, a linha traz a resposta da Z-API — é ela
que diz o motivo.

**Conferir** — a decisão também aparece na plataforma, em Admin → Auditoria.

---

## Se algo der errado

| Sintoma | Onde olhar |
|---|---|
| SSH não conecta | firewall do hPanel (porta 22) e o terminal do navegador |
| senha ainda aceita depois do passo 8 | `sudo sshd -T` mostra o que vale; outro arquivo em `sshd_config.d/` está sendo lido antes |
| `verificar` diz que a plataforma recusou o segredo | `AGENTE_SECRET` difere entre VPS e Vercel, ou falta na Vercel |
| `verificar` diz que a instância não está conectada | Z-API: reconectar o número |
| `verificar` reprova "número conectado é admin" | promova o número a admin do grupo |
| `verificar` reprova "grupo pede aprovação" | ligue "Aprovar novos participantes" no grupo |
| webhook responde 404 | `nginx -t`, e confira se o caminho é exatamente `/webhook` |
| webhook responde 401 vindo da Z-API | o `?s=` da URL não bate com `WEBHOOK_SEGREDO` |
| nada chega | a Z-API desliga webhook que demora a responder; reative no painel |
| pedido perdido enquanto o agente estava fora | `grep pedido-recebido /var/log/sm-agente/eventos.jsonl` |

O serviço reinicia sozinho se o processo cair (`Restart=always`). Para ver o
estado: `systemctl status sm-agente`.
