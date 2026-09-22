import 'server-only';
import { env, stripeConfigured } from '@/lib/env';
import { stripe } from '@/lib/stripe';

/**
 * O preco da assinatura, do jeito que o visitante le'.
 *
 * O valor vem do Stripe, nao daqui. Quem muda preco muda no painel do Stripe,
 * e uma copia no codigo viraria a segunda versao da verdade -- justamente a
 * que ninguem lembra de atualizar, e que passa a mentir na tela de login
 * enquanto o checkout cobra outro valor.
 *
 * Nada aqui pode derrubar a tela: se o Stripe nao responder, o preco some e o
 * botao continua convidando a assinar. Ninguem fica sem conseguir entrar na
 * plataforma porque a cobranca teve um soluco.
 */

export type PrecoDaAssinatura = string | null;

// A tela de login e' a mais visitada da plataforma e o preco muda uma vez por
// ano, se tanto. Sem memoria, cada visita somaria uma ida ao Stripe antes do
// primeiro byte -- e o visitante pagaria essa latencia so' para ler um numero
// que nao mudou.
const VALIDADE_OK = 60 * 60 * 1000;
// Falha vale menos tempo: se o Stripe caiu, nao adianta insistir a cada visita,
// mas tambem nao se pode esconder o preco por uma hora por causa de um erro de
// rede de um segundo.
const VALIDADE_ERRO = 60 * 1000;

let memoria: { valor: PrecoDaAssinatura; expira: number } | null = null;

/** Quanto, e de quanto em quanto tempo. */
function formatar(preco: {
  unit_amount: number | null;
  currency: string;
  recurring: { interval: string; interval_count: number } | null;
}): PrecoDaAssinatura {
  // Preco por faixa nao tem valor unico para mostrar: melhor nao mostrar nada
  // do que mostrar um numero que nao e' o que a pessoa vai pagar.
  if (preco.unit_amount === null) return null;

  const valor = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: preco.currency.toUpperCase(),
  }).format(preco.unit_amount / 100);

  if (!preco.recurring) return valor;

  const { interval, interval_count: quantos } = preco.recurring;
  const nome: Record<string, [string, string]> = {
    day: ['dia', 'dias'],
    week: ['semana', 'semanas'],
    month: ['mês', 'meses'],
    year: ['ano', 'anos'],
  };
  const periodo = nome[interval];
  if (!periodo) return valor;

  // "R$ 37,90/mes" no caso de sempre; "R$ 99,00 a cada 3 meses" quando o ciclo
  // nao for de uma unidade, porque "/3 meses" nao se le'.
  return quantos === 1 ? `${valor}/${periodo[0]}` : `${valor} a cada ${quantos} ${periodo[1]}`;
}

export async function precoDaAssinatura(): Promise<PrecoDaAssinatura> {
  if (!stripeConfigured || !env.STRIPE_PRICE_PADRAO) return null;

  const agora = Date.now();
  if (memoria && memoria.expira > agora) return memoria.valor;

  try {
    const preco = await stripe().prices.retrieve(env.STRIPE_PRICE_PADRAO);
    const valor = formatar(preco);
    memoria = { valor, expira: agora + VALIDADE_OK };
    return valor;
  } catch (error) {
    console.error('[preco] nao foi possivel ler o preco no Stripe', error);
    memoria = { valor: null, expira: agora + VALIDADE_ERRO };
    return null;
  }
}
