/**
 * Caminhos da aplicacao quando ela nao mora na raiz do dominio.
 *
 * O `basePath` do Next reescreve `<Link>`, a navegacao do router e os assets
 * que o proprio Next emite. Ele NAO reescreve caminho que o nosso codigo monta
 * como string: `fetch('/api/perfil')` sai do navegador exatamente assim e, com
 * a plataforma servida em `/viplounge`, cai em 404. O mesmo vale para a URL
 * que vai no QR Code do cartao digital.
 *
 * Regra do projeto: todo caminho absoluto montado a' mao passa por `rota()`.
 * `npm run checar-rotas` falha o build se aparecer um `fetch('/...')` cru.
 */

// Inlinado pelo next.config.mjs a partir de NEXT_PUBLIC_APP_URL. Fica '' quando
// a aplicacao esta na raiz, e aI' `rota()` devolve o caminho intacto.
const PREFIXO = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/+$/, '');

/** Prefixo em que a plataforma esta montada: `/viplounge` ou '' na raiz. */
export function prefixo(): string {
  return PREFIXO;
}

/**
 * Prefixa um caminho interno absoluto. Deixa passar intactos: caminho relativo,
 * URL absoluta, caminho protocol-relative (`//host`) e caminho que ja' carrega
 * o prefixo — assim chamar duas vezes nao duplica nada.
 */
export function rota(caminho: string): string {
  if (!PREFIXO || !caminho.startsWith('/') || caminho.startsWith('//')) {
    return caminho;
  }
  if (caminho === PREFIXO || caminho.startsWith(`${PREFIXO}/`)) {
    return caminho;
  }
  return `${PREFIXO}${caminho}`;
}

/**
 * URL absoluta de um caminho interno, para compartilhar com outra pessoa
 * (QR Code, share nativo, copiar link). Usa a origem da janela: o endereco
 * compartilhado e' o mesmo em que o membro esta navegando.
 */
export function urlAbsoluta(caminho: string): string {
  const origem = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origem}${rota(caminho)}`;
}
