import { z } from 'zod';

/**
 * O LinkedIn e' obrigatorio no perfil de todo membro: e' o que da' lastro
 * profissional a quem aparece no diretorio da comunidade. Por isso nao basta
 * aceitar qualquer endereco -- um site pessoal ou uma pagina de empresa no
 * lugar do perfil esvaziaria a exigencia.
 *
 * O que se aceita e' o perfil pessoal (`/in/...`, ou o antigo `/pub/...`), em
 * qualquer subdominio do LinkedIn, com ou sem `https://` na frente. O que sai
 * e' sempre a mesma forma limpa, sem parametro de rastreio nem barra no fim:
 * dois membros que colam o mesmo perfil de lugares diferentes ficam iguais.
 */
export function normalizarLinkedin(valor: string): string | null {
  const bruto = valor.trim();
  if (!bruto) return null;

  // Quem copia da barra do navegador traz o esquema; quem digita, nao.
  const comEsquema = /^https?:\/\//i.test(bruto) ? bruto : `https://${bruto}`;

  let url: URL;
  try {
    url = new URL(comEsquema);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) return null;

  const partes = url.pathname.split('/').filter(Boolean);
  if (partes.length < 2) return null;
  const [secao, identificador] = partes;
  if (secao.toLowerCase() !== 'in' && secao.toLowerCase() !== 'pub') return null;
  if (!identificador) return null;

  // Fora o parametro de rastreio que vem no "copiar link" do app, e a barra
  // final: o mesmo perfil nao deve render dois valores diferentes.
  return `https://${host}/${secao.toLowerCase()}/${partes.slice(1).join('/')}`;
}

const MOTIVO = 'Informe o endereço do perfil (linkedin.com/in/...)';

/** Obrigatorio: perfil do membro, no proprio cadastro e na tela de pendencia. */
export const linkedinObrigatorio = z
  .string({ required_error: 'Informe seu LinkedIn', invalid_type_error: MOTIVO })
  .trim()
  .min(1, 'Informe seu LinkedIn')
  .transform((valor, ctx) => {
    const limpo = normalizarLinkedin(valor);
    if (!limpo) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: MOTIVO });
      return z.NEVER;
    }
    return limpo;
  });

/**
 * Opcional: o admin cadastra membro sem ter o LinkedIn em maos, e o proprio
 * membro preenche na primeira entrada. Vazio limpa o campo; preenchido passa
 * pela mesma conferencia.
 */
export const linkedinOpcional = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((valor, ctx) => {
    if (valor === null || valor === undefined || valor.trim() === '') return null;
    const limpo = normalizarLinkedin(valor);
    if (!limpo) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: MOTIVO });
      return z.NEVER;
    }
    return limpo;
  });
