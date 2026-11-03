import { config } from './config.js';

/**
 * Le' um corpo do webhook "Ao receber" da Z-API e diz se ali tem um pedido de
 * entrada no nosso grupo.
 *
 * A Z-API nao tem webhook proprio de grupo: o evento chega junto das mensagens,
 * marcado pelo campo `notification`. Entao quase tudo que chega aqui nao
 * interessa, e separar isso bem e' o que evita o agente reagir a uma conversa
 * qualquer como se fosse um pedido.
 */
export function lerPedido(corpo) {
  if (!corpo || typeof corpo !== 'object') return null;
  if (corpo.notification !== 'MEMBERSHIP_APPROVAL_REQUEST') return null;
  if (corpo.isGroup !== true) return null;

  // So' o grupo configurado. A instancia pode estar em varios.
  if (normalizarGrupo(corpo.phone) !== normalizarGrupo(config.grupoId)) return null;

  // `notificationParameters` traz os numeros que pediram. Vem em lote quando
  // alguem que nao e' admin adiciona varias pessoas de uma vez.
  const numeros = Array.isArray(corpo.notificationParameters)
    ? corpo.notificationParameters.filter((n) => typeof n === 'string' && n.trim())
    : [];
  if (numeros.length === 0) return null;

  return {
    grupoId: corpo.phone,
    numeros: [...new Set(numeros.map((n) => n.trim()))],
    metodo: typeof corpo.requestMethod === 'string' ? corpo.requestMethod : null,
    messageId: typeof corpo.messageId === 'string' ? corpo.messageId : null,
  };
}

/** O id do grupo aparece ora com o sufixo "-group", ora sem. */
function normalizarGrupo(valor) {
  return String(valor ?? '')
    .trim()
    .replace(/-group$/i, '')
    .replace(/@g\.us$/i, '');
}
