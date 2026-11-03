/**
 * Troca as variaveis de um template pelas do destinatario.
 *
 * As chaves sao as que o editor de templates anuncia na tela -- `{{nome}}`,
 * `{{primeiro_nome}}` e `{{link}}`. Variavel desconhecida fica como esta', em
 * vez de virar texto vazio: uma mensagem com `{{telefone}}` no meio denuncia o
 * erro de digitacao, enquanto um buraco silencioso sai para o cliente.
 */
export function preencherModelo(
  texto: string,
  valores: { nome: string; link?: string },
): string {
  const tabela: Record<string, string> = {
    nome: valores.nome,
    primeiro_nome: valores.nome.trim().split(/\s+/)[0] ?? valores.nome,
    ...(valores.link ? { link: valores.link } : {}),
  };

  return texto.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (original, chave: string) => {
    const valor = tabela[chave.toLowerCase()];
    return valor === undefined ? original : valor;
  });
}
