import { config, urlZapi } from './config.js';

/**
 * Confere a corrente inteira antes de confiar nela, sem mexer em ninguem.
 *
 * Roda na VPS com as credenciais de verdade e imprime um relatorio que pode ser
 * colado em qualquer lugar: nenhum valor de segredo aparece na saida, so' se
 * esta' presente e se funciona.
 */

const linhas = [];
let falhas = 0;

function anota(item, ok, detalhe) {
  linhas.push(`${ok ? '  ok  ' : ' FALHA'} ${item.padEnd(34)} ${detalhe ?? ''}`.trimEnd());
  if (!ok) falhas++;
}

async function verificar() {
  console.log('\nVerificação do agente do grupo\n');

  // 1. Configuracao. O config.js ja' derruba o processo se faltar o obrigatorio,
  //    entao chegar aqui ja' prova as presencas; o que falta dizer e' o opcional.
  anota('variáveis obrigatórias', true, 'presentes');
  anota(
    'segredo do webhook',
    Boolean(config.webhookSegredo),
    config.webhookSegredo
      ? 'configurado'
      : 'AUSENTE — qualquer um que descobrir o endereço manda pedido falso',
  );
  anota('grupo atendido', true, config.grupoId);

  // 2. A plataforma aceita o segredo? Pergunta por um numero que nao existe de
  //    proposito: prova a autenticacao sem aprovar ninguem.
  try {
    const r = await fetch(`${config.plataformaUrl}/api/whatsapp/entrada`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-agente-secret': config.plataformaSegredo },
      body: JSON.stringify({
        telefone: '5500000000000',
        grupoId: config.grupoId,
        metodo: 'verificacao',
      }),
      signal: AbortSignal.timeout(config.tempoLimiteMs),
    });
    const corpo = await r.text();
    if (r.status === 401) {
      anota('plataforma aceita o segredo', false, 'recusou: AGENTE_SECRET não confere com a Vercel');
    } else if (!r.ok) {
      anota('plataforma responde', false, `HTTP ${r.status}: ${corpo.slice(0, 90)}`);
    } else {
      const decisao = JSON.parse(corpo).decisao;
      anota('plataforma aceita o segredo', decisao === 'aguardar', `respondeu "${decisao}"`);
    }
  } catch (erro) {
    anota('plataforma responde', false, erro.message);
  }

  // 3. A instancia do WhatsApp esta' de pe'?
  try {
    const r = await fetch(urlZapi('/status'), {
      headers: cabecalhos(),
      signal: AbortSignal.timeout(config.tempoLimiteMs),
    });
    const corpo = await r.json().catch(() => ({}));
    const conectado = corpo.connected === true;
    anota(
      'instância do WhatsApp',
      conectado,
      conectado ? 'conectada' : `não conectada: ${JSON.stringify(corpo).slice(0, 90)}`,
    );
  } catch (erro) {
    anota('instância do WhatsApp', false, erro.message);
  }

  // 4. O caminho de aprovacao existe mesmo?
  //
  //    A documentacao da Z-API nao publica o caminho dos endpoints de grupo; o
  //    que esta' no codigo segue a convencao dos que ja' funcionam aqui. Um 404
  //    diria que a convencao nao vale para este. A sonda usa um numero
  //    impossivel: o endpoint recusa, e ninguem entra no grupo por causa dela.
  try {
    const r = await fetch(urlZapi('/approve-participant'), {
      method: 'POST',
      headers: cabecalhos(),
      body: JSON.stringify({ groupId: config.grupoId, phones: ['0'] }),
      signal: AbortSignal.timeout(config.tempoLimiteMs),
    });
    const corpo = (await r.text()).slice(0, 110);
    anota(
      'caminho de aprovação existe',
      r.status !== 404 && r.status !== 405,
      r.status === 404
        ? 'ENDEREÇO ERRADO (404) — me avise, eu corrijo o caminho'
        : `HTTP ${r.status}: ${corpo}`,
    );
  } catch (erro) {
    anota('caminho de aprovação existe', false, erro.message);
  }

  console.log(linhas.join('\n'));
  console.log(
    falhas === 0
      ? '\nTudo pronto: pode apontar o webhook da Z-API para esta máquina.\n'
      : `\n${falhas} item(ns) a resolver antes de ligar o webhook.\n`,
  );
  process.exit(falhas === 0 ? 0 : 1);
}

function cabecalhos() {
  return {
    'content-type': 'application/json',
    ...(config.zapi.clientToken ? { 'Client-Token': config.zapi.clientToken } : {}),
  };
}

await verificar();
