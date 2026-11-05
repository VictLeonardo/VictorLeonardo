#!/usr/bin/env bash
#
# Instala o agente do grupo nesta maquina. Roda como root, do diretorio do
# agente, e pode rodar de novo quantas vezes quiser: nao sobrescreve o arquivo
# de segredos nem reinstala o que ja' esta no lugar.
#
#   sudo ./deploy/instalar.sh
#
# Faz a parte mecanica -- Node, usuario, diretorios, unit do systemd. A parte
# que exige decisao sua -- os segredos, o id do grupo, o nginx, o webhook --
# fica para depois, e o fim da execucao diz exatamente o que falta.
set -euo pipefail

AGENTE_DIR=/opt/sm/agente-whatsapp
ENV_FILE=/etc/sm-agente.env
UNIT=/etc/systemd/system/sm-agente.service
USUARIO=sm

digaFalha() { echo "ERRO: $*" >&2; exit 1; }
passo() { echo; echo "── $*"; }

[ "$(id -u)" = 0 ] || digaFalha "rode com sudo."
ORIGEM=$(cd "$(dirname "$0")/.." && pwd)
[ -f "$ORIGEM/src/servidor.js" ] || digaFalha "rode de dentro do diretorio do agente (achei $ORIGEM)."

passo "1/5  Node 20 ou mais novo"
# Node pode ja' existir por outro caminho; o que importa e' a versao e saber
# onde esta', porque o unit precisa do caminho absoluto.
if NODE_BIN=$(command -v node 2>/dev/null) && [ -n "$NODE_BIN" ] &&
   [ "$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)" -ge 20 ]; then
  echo "    ja' instalado: $NODE_BIN $(node --version)"
else
  echo "    instalando pela NodeSource..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
  NODE_BIN=$(command -v node) || digaFalha "node nao apareceu no PATH depois da instalacao."
  echo "    instalado: $NODE_BIN $(node --version)"
fi

passo "2/5  Usuario de sistema '$USUARIO'"
if id "$USUARIO" >/dev/null 2>&1; then
  echo "    ja' existe"
else
  useradd --system --create-home --home-dir "/home/$USUARIO" --shell /usr/sbin/nologin "$USUARIO"
  echo "    criado (sem shell de login)"
fi

passo "3/5  Codigo em $AGENTE_DIR"
mkdir -p "$(dirname "$AGENTE_DIR")"
rm -rf "${AGENTE_DIR:?}.novo"
cp -r "$ORIGEM" "$AGENTE_DIR.novo"
rm -rf "${AGENTE_DIR:?}.antigo"
[ -d "$AGENTE_DIR" ] && mv "$AGENTE_DIR" "$AGENTE_DIR.antigo"
mv "$AGENTE_DIR.novo" "$AGENTE_DIR"
rm -rf "${AGENTE_DIR:?}.antigo"
# O servico so' le'. Gravar, ele grava em /var/log/sm-agente, que o systemd cria.
chown -R root:root "$AGENTE_DIR"
chmod -R go-w "$AGENTE_DIR"
echo "    copiado de $ORIGEM (dono root, somente leitura para o servico)"

passo "4/5  Segredos em $ENV_FILE"
if [ -f "$ENV_FILE" ]; then
  echo "    ja' existe — nao toquei (seus segredos estao nele)"
else
  umask 027
  cat > "$ENV_FILE" <<ENV
# Preencha os PREENCHER e rode: systemctl restart sm-agente
PLATAFORMA_URL=PREENCHER
AGENTE_SECRET=$(openssl rand -hex 32)
ZAPI_INSTANCE_ID=PREENCHER
ZAPI_TOKEN=PREENCHER
ZAPI_CLIENT_TOKEN=PREENCHER
ZAPI_GRUPO_ID=PREENCHER
WEBHOOK_SEGREDO=$(openssl rand -hex 32)
ENV
  chown root:"$USUARIO" "$ENV_FILE"
  chmod 640 "$ENV_FILE"
  echo "    criado com AGENTE_SECRET e WEBHOOK_SEGREDO ja' sorteados"
fi

passo "5/5  Servico"
# O caminho do node vai resolvido para dentro do unit: NodeSource poe em
# /usr/bin/node, nvm e tarball nao, e um ExecStart errado so' aparece na hora
# de subir.
sed "s|^ExecStart=.*|ExecStart=$NODE_BIN src/servidor.js|" "$AGENTE_DIR/deploy/sm-agente.service" > "$UNIT"
chmod 644 "$UNIT"
echo "    $UNIT escrito com ExecStart=$NODE_BIN"
if systemctl daemon-reload 2>/dev/null; then
  systemctl enable sm-agente >/dev/null 2>&1 || true
  echo "    systemd recarregado, servico habilitado no boot"
else
  echo "    AVISO: systemd nao respondeu (daemon-reload falhou)."
  echo "           Numa VPS de verdade isto nao deve acontecer — investigue antes de seguir."
fi

FALTA=$(grep -c '=PREENCHER$' "$ENV_FILE" || true)
echo
echo "════════════════════════════════════════════════════════════════"
if [ "$FALTA" -gt 0 ]; then
  cat <<FIM
Instalado, e o servico NAO foi iniciado — faltam $FALTA valores.

  1. sudoedit $ENV_FILE
       PLATAFORMA_URL     endereco da plataforma (https://...)
       ZAPI_*             painel da Z-API
       AGENTE_SECRET      copie o valor sorteado para as variaveis da Vercel
       ZAPI_GRUPO_ID      deixe PREENCHER e descubra no passo 2

  2. cd $AGENTE_DIR && set -a && . $ENV_FILE && set +a && npm run grupos
       cole o id do grupo no $ENV_FILE

  3. npm run verificar        (tem de passar tudo antes de ligar o webhook)
  4. systemctl start sm-agente && curl localhost:8080/saude
FIM
else
  echo "Tudo preenchido. Conferir e subir:"
  echo
  echo "  cd $AGENTE_DIR && set -a && . $ENV_FILE && set +a && npm run verificar"
  echo "  systemctl restart sm-agente && curl localhost:8080/saude"
fi
echo "════════════════════════════════════════════════════════════════"
