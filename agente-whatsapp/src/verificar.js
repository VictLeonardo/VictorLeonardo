import { config, exigirGrupo, urlZapi } from './config.js';

/**
 * Confere a corrente inteira antes de confiar nela, sem mexer em ninguem.
 *
 * Roda na VPS com as credenciais de verdade e imprime um relatorio que pode ser
 * colado em qualquer lugar: nenhum valor de segredo aparece na saida, so' se
 * esta' presente e se funciona.
 */

exigirGrupo();

const linhas = [];
let falhas = 0;

/**
 * `ok` em tres estados: true passou, false reprovou, null nao deu para
 * confirmar. O terceiro existe porque parte da Z-API nao tem caminho publicado:
 * tratar "nao sei" como reprovado faria a verificacao mentir.
 */
function anota(item, ok, detalhe) {
  const marca = ok === true ? '  ok  ' : ok === null ? ' aviso' : ' FALHA';
  linhas.push(`${marca} ${item.padEnd(34)} ${detalhe ?? ''}`.trimEnd());
  if (ok === false) falhas++;
}

/**
 * Dois numeros sao a mesma linha?
 *
 * O WhatsApp devolve a mesma linha ora com o nono digito, ora sem
 * (5511987654321 e 551187654321). Comparar texto cru diria que o numero
 * conectado nao esta no grupo quando esta'. DDD mais os ultimos oito digitos
 * identificam a linha nos dois formatos.
 */
function mesmoNumero(a, b) {
  const chave = (bruto) => {
    const d = String(bruto ?? '').replace(/\D/g, '');
    const local = d.startsWith('55') && d.length > 11 ? d.slice(2) : d;
    if (local.length !== 10 && local.length !== 11) return null;
    return `${local.slice(0, 2)}${local.slice(-8)}`;
  };
  const x = chave(a);
  return x !== null && x === chave(b);
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
  //
  //    Medido em 2026-11 contra api.z-api.io com instancia falsa: /status,
  //    /device, /groups, /group-metadata e /approve-participant todos respondem
  //    "Instance not found" -- o roteador acha a rota e barra na instancia.
  //    Rota que nao existe responde "404 page not found", que e' o que o
  //    zapi.omni.z-api.io devolve para todos esses caminhos: o Omni nao serve
  //    o formato /instances/{id}/token/{token}/..., entao migrar para ele nao
  //    e' trocar ZAPI_BASE_URL, e' refazer o cliente.
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

  // 5. O numero conectado e' admin do grupo?
  //
  //    Sem ser admin, a aprovacao falha -- e falha calada: o pedido entra no
  //    diario como aprovado do lado do agente e ninguem entra no grupo. E' a
  //    pior falha possivel aqui, porque so' aparece quando um membro reclama.
  //    De passagem confere se o grupo esta' pedindo aprovacao: se nao estiver,
  //    nenhum pedido chega e o agente fica sem trabalho sem ninguem notar.
  try {
    const [aparelho, grupo] = await Promise.all([
      buscarJson(urlZapi('/device')),
      buscarJson(urlZapi(`/group-metadata/${encodeURIComponent(config.grupoId)}`)),
    ]);

    const meuNumero = aparelho.corpo?.phone;
    const participantes = Array.isArray(grupo.corpo?.participants) ? grupo.corpo.participants : null;

    if (!aparelho.ok || !meuNumero) {
      anota('número conectado é admin', null, `não li o número conectado (HTTP ${aparelho.status})`);
    } else if (!grupo.ok || !participantes) {
      anota(
        'número conectado é admin',
        null,
        grupo.status === 404
          ? 'group-metadata não existe neste caminho — confirme com um pedido real'
          : `não li o grupo (HTTP ${grupo.status})`,
      );
    } else {
      const eu = participantes.find((p) => mesmoNumero(p?.phone, meuNumero));
      if (!eu) {
        anota('número conectado é admin', false, `${meuNumero} não está no grupo`);
      } else {
        const admin = eu.isAdmin === true || eu.isSuperAdmin === true;
        anota(
          'número conectado é admin',
          admin,
          admin ? `${meuNumero} é admin` : `${meuNumero} está no grupo mas NÃO é admin — a aprovação vai falhar`,
        );
      }

      const pedeAprovacao = grupo.corpo.requireAdminApproval;
      anota(
        'grupo pede aprovação',
        pedeAprovacao === true ? true : pedeAprovacao === false ? false : null,
        pedeAprovacao === true
          ? 'ligado'
          : pedeAprovacao === false
            ? 'DESLIGADO — ninguém pede entrada, o agente não recebe nada'
            : 'não informado pela Z-API',
      );
    }
  } catch (erro) {
    anota('número conectado é admin', null, erro.message);
  }

  console.log(linhas.join('\n'));
  console.log(
    falhas === 0
      ? '\nTudo pronto: pode apontar o webhook da Z-API para esta máquina.\n'
      : `\n${falhas} item(ns) a resolver antes de ligar o webhook.\n`,
  );
  process.exit(falhas === 0 ? 0 : 1);
}

/** Le' um GET da Z-API sem deixar erro de formato derrubar a verificacao. */
async function buscarJson(url) {
  const r = await fetch(url, { headers: cabecalhos(), signal: AbortSignal.timeout(config.tempoLimiteMs) });
  const texto = await r.text();
  let corpo = null;
  try {
    corpo = JSON.parse(texto);
  } catch {
    // Resposta que nao e' JSON: o chamador decide o que dizer.
  }
  return { ok: r.ok, status: r.status, corpo };
}

function cabecalhos() {
  return {
    'content-type': 'application/json',
    ...(config.zapi.clientToken ? { 'Client-Token': config.zapi.clientToken } : {}),
  };
}

await verificar();
