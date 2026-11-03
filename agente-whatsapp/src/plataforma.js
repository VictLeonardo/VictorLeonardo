import { config } from './config.js';

/**
 * Pergunta a plataforma se o numero pode entrar.
 *
 * Quem decide e' ela, nao o agente: a regra de quem e' membro vive num lugar
 * so', e a VPS nunca precisa da credencial do banco. Aqui so' trafega um
 * telefone e um segredo compartilhado.
 */
export async function perguntarSePodeEntrar({ telefone, grupoId, metodo }) {
  const resposta = await fetch(`${config.plataformaUrl}/api/whatsapp/entrada`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-agente-secret': config.plataformaSegredo,
    },
    body: JSON.stringify({ telefone, grupoId, metodo }),
    signal: AbortSignal.timeout(config.tempoLimiteMs),
  });

  const texto = await resposta.text();
  if (!resposta.ok) {
    const erro = new Error(`plataforma respondeu ${resposta.status}: ${texto.slice(0, 200)}`);
    // 4xx quer dizer "o pedido esta errado", e repetir o mesmo pedido errado
    // nunca passa a dar certo. 429 e' excecao: ali o pedido esta' certo, so'
    // chegou cedo demais.
    erro.permanente = resposta.status >= 400 && resposta.status < 500 && resposta.status !== 429;
    throw erro;
  }

  let corpo;
  try {
    corpo = JSON.parse(texto);
  } catch {
    throw new Error(`plataforma respondeu algo que nao e' JSON: ${texto.slice(0, 120)}`);
  }

  if (corpo.decisao !== 'aprovar' && corpo.decisao !== 'aguardar') {
    throw new Error(`decisao desconhecida: ${JSON.stringify(corpo).slice(0, 120)}`);
  }
  return corpo;
}
