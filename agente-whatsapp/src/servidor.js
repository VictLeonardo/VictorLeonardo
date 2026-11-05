import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { config, exigirGrupo } from './config.js';
import { lerPedido } from './pedido.js';
import { perguntarSePodeEntrar } from './plataforma.js';
import { aprovarEntrada } from './zapi.js';
import { anotar } from './registro.js';

exigirGrupo();

const TENTATIVAS = 4;
const ESPERA_MS = [1000, 4000, 15000];

/**
 * Agente do grupo do WhatsApp.
 *
 * A Z-API avisa, por webhook, que alguem pediu entrada no grupo. O agente
 * pergunta a plataforma se aquele telefone e' de um membro ativo e, sendo,
 * aprova. Quem nao casa fica esperando um humano -- ver `decidirEntrada` na
 * plataforma para o porque de nao recusar sozinho.
 */
const servidor = createServer((req, res) => {
  if (req.method === 'GET' && caminhoDe(req) === '/saude') {
    return responder(res, 200, { ok: true, grupo: config.grupoId });
  }
  if (req.method !== 'POST' || caminhoDe(req) !== '/webhook') {
    return responder(res, 404, { erro: 'nao encontrado' });
  }
  if (!segredoConfere(req)) {
    return responder(res, 401, { erro: 'nao autorizado' });
  }

  lerCorpo(req)
    .then(async (corpo) => {
      const pedido = lerPedido(corpo);

      // Responder rapido importa: a Z-API reenvia -- e chega a desligar o
      // webhook -- quando a resposta demora. O trabalho segue depois disso.
      responder(res, 200, { recebido: true, pedido: Boolean(pedido) });

      if (!pedido) return;
      await anotar('pedido-recebido', {
        grupoId: pedido.grupoId,
        numeros: pedido.numeros,
        metodo: pedido.metodo,
        messageId: pedido.messageId,
      });
      for (const telefone of pedido.numeros) {
        await atender({ telefone, grupoId: pedido.grupoId, metodo: pedido.metodo });
      }
    })
    .catch(async (erro) => {
      await anotar('corpo-ilegivel', { erro: erro.message });
      if (!res.writableEnded) responder(res, 400, { erro: 'corpo ilegivel' });
    });
});

/** Um pedido, do comeco ao fim, com repeticao em caso de falha passageira. */
async function atender({ telefone, grupoId, metodo }) {
  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    try {
      const decisao = await perguntarSePodeEntrar({ telefone, grupoId, metodo });

      if (decisao.decisao !== 'aprovar') {
        await anotar('aguardando', { telefone, motivo: decisao.motivo });
        return;
      }

      await aprovarEntrada({ grupoId, telefone });
      await anotar('aprovado', { telefone, membro: decisao.membro?.nome ?? null });
      return;
    } catch (erro) {
      const ultima = tentativa === TENTATIVAS || erro.permanente === true;
      await anotar(ultima ? 'falhou' : 'vou-tentar-de-novo', {
        telefone,
        tentativa,
        erro: erro.message,
        ...(erro.permanente ? { permanente: true } : {}),
      });
      // Sem pendentes para consultar na Z-API, desistir aqui apaga o pedido:
      // a linha "falhou" no diario e' o unico rastro que sobra dele.
      if (ultima) return;
      await espera(ESPERA_MS[tentativa - 1] ?? 15000);
    }
  }
}

function caminhoDe(req) {
  return new URL(req.url, 'http://agente').pathname.replace(/\/+$/, '') || '/';
}

/**
 * O segredo vem na URL do webhook, porque a Z-API nao assina o corpo nem
 * permite cabecalho proprio. Comparacao em tempo constante pelo mesmo motivo
 * de sempre: o tempo de resposta nao pode entregar o segredo.
 */
function segredoConfere(req) {
  if (!config.webhookSegredo) return true;
  const enviado = Buffer.from(new URL(req.url, 'http://agente').searchParams.get('s') ?? '');
  const esperado = Buffer.from(config.webhookSegredo);
  return enviado.length === esperado.length && timingSafeEqual(enviado, esperado);
}

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    const pedacos = [];
    let total = 0;
    req.on('data', (d) => {
      total += d.length;
      // Um corpo gigante nao e' pedido de entrada; e' alguem tentando derrubar.
      if (total > 1_000_000) return reject(new Error('corpo grande demais'));
      pedacos.push(d);
    });
    req.on('error', reject);
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(pedacos).toString('utf8') || '{}'));
      } catch (erro) {
        reject(erro);
      }
    });
  });
}

function responder(res, status, corpo) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(corpo));
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

servidor.listen(config.porta, config.endereco, () => {
  console.log(
    JSON.stringify({
      quando: new Date().toISOString(),
      tipo: 'no-ar',
      endereco: config.endereco,
      porta: config.porta,
      grupo: config.grupoId,
      segredoDeWebhook: Boolean(config.webhookSegredo),
    }),
  );
});

export { servidor, atender };
