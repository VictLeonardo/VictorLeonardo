import 'server-only';
import Stripe from 'stripe';
import { env, stripeConfigured } from '@/lib/env';
import type { SubscriptionStatus } from '@prisma/client';

/**
 * Cliente do Stripe e traducao entre o vocabulario dele e o do dominio.
 *
 * A cobranca e' inteira do Stripe: preco, cartao, retentativa, fatura. A
 * plataforma guarda so' o espelho do que importa para decidir acesso, e quem
 * escreve esse espelho e' o webhook, nunca uma resposta de tela. Uma pagina de
 * sucesso que gravasse "assinatura ativa" acreditaria no navegador do visitante.
 */

let cliente: Stripe | null = null;

export function stripe(): Stripe {
  if (!stripeConfigured) {
    throw new Error('Cobranca nao configurada: faltam variaveis do Stripe.');
  }
  if (!cliente) {
    // Sem `apiVersion` explicito de proposito: o SDK usa a versao para a qual os
    // proprios tipos foram gerados, e o package-lock prende a versao do SDK.
    // Escrever a data aqui a' mao so' criaria um segundo lugar para divergir.
    cliente = new Stripe(env.STRIPE_SECRET_KEY!, {
      appInfo: { name: 'SM Smart Money' },
      maxNetworkRetries: 2,
    });
  }
  return cliente;
}

/**
 * Preco mensal do plano padrao, em reais, lido do proprio Stripe.
 *
 * O valor da comunidade vive no Stripe, nao no codigo -- e' o mesmo motivo pelo
 * qual `STRIPE_PRICE_PADRAO` guarda o id do preco e nao o numero. Uma tabela
 * fixa aqui envelhece calada: foi assim que o dashboard passou a estimar R$ 497
 * por membro enquanto a cobranca real era R$ 37,90.
 *
 * O resultado fica em cache por uma hora. O MRR e' uma estimativa de tela, nao
 * vale uma chamada ao Stripe a cada carregamento do painel, e um reajuste
 * aparece no maximo uma hora depois.
 */
let precoEmCache: { valor: number; expiraEm: number } | null = null;

export async function precoMensalPadrao(): Promise<number | null> {
  if (!stripeConfigured) return null;
  if (precoEmCache && precoEmCache.expiraEm > Date.now()) return precoEmCache.valor;

  try {
    const preco = await stripe().prices.retrieve(env.STRIPE_PRICE_PADRAO!);
    // `unit_amount` vem em centavos e e' nulo em preco graduado, que a
    // comunidade nao usa. Sem numero confiavel, melhor devolver nada do que
    // devolver zero e fazer o MRR sumir do painel.
    if (typeof preco.unit_amount !== 'number') return null;

    const valor = preco.unit_amount / 100;
    precoEmCache = { valor, expiraEm: Date.now() + 60 * 60 * 1000 };
    return valor;
  } catch {
    // Um soluco do Stripe nao pode derrubar o dashboard inteiro. Vale mais o
    // ultimo valor conhecido, mesmo vencido, do que uma pagina de erro.
    return precoEmCache?.valor ?? null;
  }
}

/**
 * Traduz o estado do Stripe para o enum do dominio.
 *
 * `trialing` conta como ativa porque durante o teste o acesso existe.
 * `incomplete_expired` cai em cancelada: a assinatura nunca chegou a valer.
 */
export function traduzStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'ATIVA';
    case 'past_due':
    case 'unpaid':
      return 'INADIMPLENTE';
    case 'canceled':
    case 'incomplete_expired':
      return 'CANCELADA';
    case 'incomplete':
    case 'paused':
    default:
      return 'INCOMPLETA';
  }
}

/**
 * A assinatura ainda da' acesso?
 *
 * Inadimplente continua dando: enquanto o Stripe tenta de novo, derrubar o
 * acesso por uma falha de cartao que pode ser temporaria custa mais do que os
 * poucos dias de tolerancia. Quando as tentativas esgotam, o Stripe cancela e o
 * webhook derruba o acesso ai'.
 */
export function assinaturaDaAcesso(status: SubscriptionStatus | null): boolean {
  return status === 'ATIVA' || status === 'INADIMPLENTE';
}

/** Fim do periodo ja' pago, em Date, a partir do campo em segundos do Stripe. */
export function fimDoPeriodo(assinatura: Stripe.Subscription): Date | null {
  // O campo mudou de lugar entre versoes da API: hoje vive no item, antes vivia
  // na assinatura. Ler os dois evita um null silencioso que faria a tela dizer
  // que o acesso termina hoje.
  const item = assinatura.items?.data?.[0] as { current_period_end?: number } | undefined;
  const segundos =
    item?.current_period_end ??
    (assinatura as unknown as { current_period_end?: number }).current_period_end;

  return typeof segundos === 'number' ? new Date(segundos * 1000) : null;
}

/** Id da assinatura a partir de um campo que o Stripe entrega expandido ou nao. */
export function idDe(valor: string | { id: string } | null | undefined): string | null {
  if (!valor) return null;
  return typeof valor === 'string' ? valor : valor.id;
}
