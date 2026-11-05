import { config, urlZapi } from './config.js';

/**
 * Lista os grupos da instancia, para descobrir o `ZAPI_GRUPO_ID`.
 *
 * Existe porque o agente exige esse id para subir e nao tinha como oferece-lo:
 * quem instalava ficava preso entre um processo que morre sem o valor e nenhum
 * lugar obvio para busca-lo.
 *
 * So' le'. Nao entra, nao sai, nao aprova ninguem.
 */
const resposta = await fetch(urlZapi('/groups'), {
  headers: {
    'content-type': 'application/json',
    ...(config.zapi.clientToken ? { 'Client-Token': config.zapi.clientToken } : {}),
  },
  signal: AbortSignal.timeout(config.tempoLimiteMs),
}).catch((erro) => {
  console.error(`\nNao consegui falar com a Z-API: ${erro.message}\n`);
  process.exit(1);
});

const texto = await resposta.text();
if (!resposta.ok) {
  console.error(`\nA Z-API respondeu ${resposta.status}: ${texto.slice(0, 200)}\n`);
  process.exit(1);
}

let grupos;
try {
  grupos = JSON.parse(texto);
} catch {
  console.error(`\nResposta que nao e' JSON: ${texto.slice(0, 160)}\n`);
  process.exit(1);
}

// A Z-API ora devolve a lista direto, ora embrulhada; aceitar as duas evita
// quebrar numa diferenca de formato que nao muda nada para quem le'.
const lista = Array.isArray(grupos) ? grupos : (grupos.groups ?? grupos.data ?? []);
if (lista.length === 0) {
  console.log('\nNenhum grupo nesta instancia. Confira se o numero esta conectado.\n');
  process.exit(0);
}

console.log('\nGrupos desta instancia:\n');
for (const g of lista) {
  const id = g.phone ?? g.id ?? g.groupId ?? '(sem id)';
  const nome = g.name ?? g.subject ?? g.chatName ?? '(sem nome)';
  console.log(`  ${nome}`);
  console.log(`    ZAPI_GRUPO_ID="${id}"\n`);
}
console.log('Copie a linha do grupo da comunidade para o /etc/sm-agente.env.\n');
