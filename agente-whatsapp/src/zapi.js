import { config, urlZapi } from './config.js';

function cabecalhos() {
  return {
    'content-type': 'application/json',
    ...(config.zapi.clientToken ? { 'Client-Token': config.zapi.clientToken } : {}),
  };
}

/**
 * Aceita a entrada de quem pediu.
 *
 * O endpoint aceita um lote de numeros, mas o agente chama um a um: o pedido
 * de cada pessoa e' decidido por conta propria, e aprovar em lote misturaria
 * quem pode com quem nao pode.
 */
export async function aprovarEntrada({ grupoId, telefone }) {
  const resposta = await fetch(urlZapi('/approve-participant'), {
    method: 'POST',
    headers: cabecalhos(),
    body: JSON.stringify({ groupId: grupoId, phones: [telefone] }),
    signal: AbortSignal.timeout(config.tempoLimiteMs),
  });

  const texto = await resposta.text();
  if (!resposta.ok) {
    throw new Error(`z-api respondeu ${resposta.status}: ${texto.slice(0, 200)}`);
  }
  return texto;
}
