/**
 * Tudo que o agente precisa saber, vindo do ambiente.
 *
 * Falta de configuracao mata o processo na partida, de proposito: um agente que
 * sobe sem o segredo da plataforma ficaria recebendo pedidos de entrada e
 * jogando todos fora, sem ninguem perceber ate' alguem reclamar que nao entrou.
 */
function obrigatorio(nome) {
  const valor = process.env[nome];
  if (!valor) {
    console.error(`[config] falta a variavel ${nome}`);
    process.exit(1);
  }
  return valor;
}

export const config = {
  porta: Number(process.env.PORTA ?? 8080),

  // A plataforma na Vercel: quem decide se o numero pode entrar.
  plataformaUrl: obrigatorio('PLATAFORMA_URL').replace(/\/+$/, ''),
  plataformaSegredo: obrigatorio('AGENTE_SECRET'),

  // A Z-API: por onde o pedido chega e por onde a aprovacao sai.
  zapi: {
    // Trocavel para apontar a um proxy ou a um duble em teste; o padrao e' o
    // endereco de verdade.
    base: (process.env.ZAPI_BASE_URL ?? 'https://api.z-api.io').replace(/\/+$/, ''),
    instancia: obrigatorio('ZAPI_INSTANCE_ID'),
    token: obrigatorio('ZAPI_TOKEN'),
    clientToken: process.env.ZAPI_CLIENT_TOKEN || null,
  },

  // Segredo que a Z-API devolve na URL do webhook, para ninguem mais conseguir
  // mandar pedidos falsos de entrada. Opcional porque a Z-API nao assina o
  // corpo; sem ele, a porta fica aberta a quem descobrir o endereco.
  webhookSegredo: process.env.WEBHOOK_SEGREDO || null,

  // So' este grupo e' atendido. Sem a trava, um pedido em qualquer outro grupo
  // da mesma instancia entraria na mesma regra.
  grupoId: obrigatorio('ZAPI_GRUPO_ID'),

  tempoLimiteMs: Number(process.env.TEMPO_LIMITE_MS ?? 15000),
  arquivoDeEventos: process.env.ARQUIVO_DE_EVENTOS ?? './eventos.jsonl',
};

export function urlZapi(caminho) {
  const { base, instancia, token } = config.zapi;
  return `${base}/instances/${instancia}/token/${token}${caminho}`;
}
