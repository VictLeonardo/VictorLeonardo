import { z, type ZodError, type ZodTypeAny } from 'zod';

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

/**
 * Um campo que pode nao vir.
 *
 * Ausente, nulo e vazio dizem a mesma coisa -- "nao preenchi" -- e tem que
 * chegar no mesmo lugar. O padrao anterior, `.optional().or(z.literal(''))`,
 * aceitava os dois primeiros e recusava `null` com a mensagem mais inutil que o
 * Zod tem.
 *
 * E `null` chega com frequencia: e' o que `FormData.get` devolve para um campo
 * que nao esta' na tela, e e' o que um cliente escreve quando quer dizer
 * "vazio". Uma API que trata isso como erro culpa quem a chama por uma
 * distincao que ela mesma inventou.
 */
export function opcional<T extends ZodTypeAny>(schema: T) {
  return z.preprocess(
    (valor) => (valor === null || valor === '' ? undefined : valor),
    schema.optional(),
  );
}
