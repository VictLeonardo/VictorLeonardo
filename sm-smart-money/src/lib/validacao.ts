import type { ZodError } from 'zod';

/**
 * A mensagem de um erro de validacao, dizendo em qual campo.
 *
 * O Zod descreve uma uniao mal preenchida apenas como "Invalid input". Uma tela
 * que devolve so' isso manda a pessoa adivinhar entre vinte campos qual deles
 * recusou -- e quando o campo nem esta' visivel, como acontece num formulario
 * que muda conforme o tipo, nao ha' o que adivinhar.
 */
export function mensagemDeValidacao(erro: ZodError): string {
  const problema = erro.issues[0];
  const campo = problema.path.filter((p) => typeof p === 'string').join('.');
  return campo ? `${campo}: ${problema.message}` : problema.message;
}
