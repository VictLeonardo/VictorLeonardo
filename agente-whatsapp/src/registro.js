import { appendFile } from 'node:fs/promises';
import { config } from './config.js';

/**
 * Diario do agente, em uma linha JSON por evento.
 *
 * Existe porque a Z-API nao tem como listar pedidos pendentes: se o agente
 * estiver fora do ar na hora, aquele pedido se perde e nao ha' de onde
 * recupera-lo. Gravar o corpo cru assim que chega e' o que permite reprocessar
 * depois, e e' tambem a unica forma de responder "esse pedido chegou?".
 *
 * Falha de escrita nao derruba o atendimento: perder a linha do diario e' ruim,
 * recusar o pedido por causa disso e' pior.
 */
export async function anotar(tipo, dados) {
  const linha = JSON.stringify({ quando: new Date().toISOString(), tipo, ...dados });
  console.log(linha);
  try {
    await appendFile(config.arquivoDeEventos, linha + '\n');
  } catch (erro) {
    console.error(`[registro] nao consegui gravar: ${erro.message}`);
  }
}
