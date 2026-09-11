import 'server-only';
import type Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { stripe, traduzStatus, fimDoPeriodo, idDe } from '@/lib/stripe';
import { ensureProfile } from '@/server/profile';
import { sendWelcomeEmail } from '@/server/welcome';

/**
 * Ponte entre o que o Stripe informa e o que a plataforma faz com isso.
 *
 * Uma regra atravessa este arquivo inteiro: quem cancela continua ATIVO ate o
 * fim do periodo pago. O clique no botao so' agenda o fim no Stripe; quem vira
 * o status e' o webhook de encerramento, quando o ciclo realmente acaba. Por
 * isso nenhuma funcao de cancelamento aqui toca em `status`.
 */

export type ResumoAssinatura = {
  configurada: boolean;
  status: 'ATIVA' | 'INADIMPLENTE' | 'CANCELADA' | 'INCOMPLETA' | 'SEM_ASSINATURA';
  cancelamentoAgendado: boolean;
  fimDoPeriodo: Date | null;
  temCartao: boolean;
};

/** O que a tela de assinatura do membro precisa saber. */
export async function resumoDaAssinatura(userId: string): Promise<ResumoAssinatura> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      subscriptionStatus: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
    },
  });

  return {
    configurada: Boolean(user?.stripeSubscriptionId),
    status: user?.subscriptionStatus ?? 'SEM_ASSINATURA',
    cancelamentoAgendado: user?.cancelAtPeriodEnd ?? false,
    fimDoPeriodo: user?.currentPeriodEnd ?? null,
    temCartao: Boolean(user?.stripeCustomerId),
  };
}

/**
 * Cria a sessao de checkout de um novo membro.
 *
 * A conta ainda nao existe neste ponto: quem a cria e' o webhook, depois do
 * pagamento aprovado. Criar antes deixaria contas orfas de todo checkout
 * abandonado, e abriria um cadastro publico sem cobranca.
 */
export async function criarCheckoutDeAssinatura(params: {
  email?: string;
  nome?: string;
}): Promise<{ url: string }> {
  const email = params.email?.trim().toLowerCase() || null;
  const nome = params.nome?.trim() || null;

  // Sem e-mail informado nao ha' o que consultar: quem chega pelo botao da tela
  // de login so' se identifica dentro do checkout.
  const existente = email
    ? await prisma.user.findUnique({
        where: { email },
        select: { id: true, status: true, stripeCustomerId: true },
      })
    : null;

  // Quem ja' e' membro ativo nao passa pelo checkout de novo; quem cancelou
  // passa, e o webhook reativa a conta que ja' existe em vez de duplicar.
  if (existente && existente.status === 'ATIVO') {
    throw new AssinaturaJaExiste();
  }

  const sessao = await stripe().checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: env.STRIPE_PRICE_PADRAO!, quantity: 1 }],
    customer: existente?.stripeCustomerId ?? undefined,
    customer_email: existente?.stripeCustomerId || !email ? undefined : email,
    // O que for conhecido viaja como metadado e o webhook recupera na criacao da
    // conta. O que nao for, o Stripe coleta e devolve em `customer_details`.
    metadata: { ...(nome ? { nome } : {}), ...(email ? { email } : {}) },
    allow_promotion_codes: true,
    success_url: `${env.NEXT_PUBLIC_APP_URL}/assinatura/sucesso`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/assinar`,
    locale: 'pt-BR',
  });

  if (!sessao.url) throw new Error('O Stripe nao devolveu a URL do checkout.');
  return { url: sessao.url };
}

export class AssinaturaJaExiste extends Error {
  constructor() {
    super('Este e-mail ja tem acesso ativo a comunidade.');
    this.name = 'AssinaturaJaExiste';
  }
}

/** Abre o portal do Stripe, onde o membro troca o cartao e ve as faturas. */
export async function criarSessaoDoPortal(userId: string): Promise<{ url: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });
  if (!user?.stripeCustomerId) throw new SemAssinatura();

  const sessao = await stripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${env.NEXT_PUBLIC_APP_URL}/assinatura`,
    locale: 'pt-BR',
  });
  return { url: sessao.url };
}

export class SemAssinatura extends Error {
  constructor() {
    super('Nao ha assinatura ativa nesta conta.');
    this.name = 'SemAssinatura';
  }
}

/**
 * Agenda o fim da assinatura para o fim do periodo ja' pago.
 *
 * `status` continua ATIVO de proposito. O membro pagou pelo mes inteiro e o
 * acesso vai ate o fim dele.
 */
export async function agendarCancelamento(userId: string): Promise<{ fimDoPeriodo: Date | null }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeSubscriptionId: true },
  });
  if (!user?.stripeSubscriptionId) throw new SemAssinatura();

  const assinatura = await stripe().subscriptions.update(user.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  const fim = fimDoPeriodo(assinatura);
  await prisma.user.update({
    where: { id: userId },
    data: { cancelAtPeriodEnd: true, currentPeriodEnd: fim },
  });

  return { fimDoPeriodo: fim };
}

/** Desfaz o cancelamento agendado, enquanto o periodo ainda nao acabou. */
export async function retomarAssinatura(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeSubscriptionId: true },
  });
  if (!user?.stripeSubscriptionId) throw new SemAssinatura();

  const assinatura = await stripe().subscriptions.update(user.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: fimDoPeriodo(assinatura),
      subscriptionStatus: traduzStatus(assinatura.status),
    },
  });
}

// --------------------------------------------------------------- webhooks

/**
 * Trava o evento, ou avisa que ele ja' passou por aqui.
 *
 * O Stripe reentrega tudo que nao respondeu 200 e nao garante ordem. Sem a
 * trava, uma reentrega de encerramento derrubaria uma assinatura que o membro
 * acabou de retomar. A escrita e' a propria trava: a chave primaria e' o id do
 * evento, entao de duas entregas simultaneas so' uma passa.
 */
export async function travarEvento(evento: Stripe.Event): Promise<boolean> {
  try {
    await prisma.stripeEvent.create({ data: { id: evento.id, type: evento.type } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Solta a trava quando o tratamento falhou.
 *
 * Sem isto, uma indisponibilidade momentanea do banco perderia o evento de vez:
 * a reentrega do Stripe bateria na trava e seria descartada como repetida. Os
 * tratadores sao idempotentes, entao reprocessar e' seguro; perder nao e'.
 */
export async function soltarEvento(eventoId: string): Promise<void> {
  await prisma.stripeEvent.delete({ where: { id: eventoId } }).catch(() => {
    // Se nem o delete passa, o banco esta fora. O log do webhook ja' registra.
  });
}

/**
 * Checkout concluido: e' aqui que o membro nasce.
 *
 * A conta e' criada sem senha e recebe o link de definicao, o mesmo fluxo do
 * convite feito pelo admin. Sem `passwordHash` ninguem entra, entao a conta
 * existir antes da senha nao abre acesso.
 */
export async function aoConcluirCheckout(sessao: Stripe.Checkout.Session): Promise<void> {
  const email = (sessao.customer_details?.email ?? sessao.metadata?.email ?? '')
    .trim()
    .toLowerCase();
  if (!email) return;

  const nome = (sessao.metadata?.nome || sessao.customer_details?.name || email.split('@')[0]).trim();
  const customerId = idDe(sessao.customer);
  const assinaturaId = idDe(sessao.subscription);

  const existente = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, status: true, passwordHash: true },
  });

  if (existente) {
    // Reativacao de quem ja' esteve na comunidade: o historico, o perfil publico
    // e o endereco dele continuam valendo.
    await prisma.user.update({
      where: { id: existente.id },
      data: {
        status: 'ATIVO',
        canceledAt: null,
        stripeCustomerId: customerId,
        stripeSubscriptionId: assinaturaId,
        subscriptionStatus: 'ATIVA',
        cancelAtPeriodEnd: false,
      },
    });

    // Quem nunca definiu senha recebe o link; quem ja' tem, entra com a dele.
    if (!existente.passwordHash) {
      await sendWelcomeEmail({ id: existente.id, name: existente.name, email });
    }
    return;
  }

  const criado = await prisma.user.create({
    data: {
      name: nome,
      email,
      role: 'MEMBER',
      status: 'ATIVO',
      plan: 'PADRAO',
      tier: 'PADRAO',
      stripeCustomerId: customerId,
      stripeSubscriptionId: assinaturaId,
      subscriptionStatus: 'ATIVA',
    },
    select: { id: true, name: true, email: true },
  });

  // O perfil (inativo) nasce junto do membro, como no cadastro pelo admin, para
  // o endereco publico dele ja' existir desde o primeiro dia.
  await ensureProfile(criado.id, criado.name);
  await sendWelcomeEmail(criado);
}

/** Estado da assinatura mudou no Stripe: espelha, e derruba o acesso no fim. */
export async function aoMudarAssinatura(assinatura: Stripe.Subscription): Promise<void> {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { stripeSubscriptionId: assinatura.id },
        { stripeCustomerId: idDe(assinatura.customer) ?? '__sem_customer__' },
      ],
    },
    select: { id: true, status: true },
  });
  if (!user) return;

  const status = traduzStatus(assinatura.status);
  const encerrou = status === 'CANCELADA';

  await prisma.user.update({
    where: { id: user.id },
    data: {
      stripeSubscriptionId: assinatura.id,
      stripeCustomerId: idDe(assinatura.customer) ?? undefined,
      subscriptionStatus: status,
      currentPeriodEnd: fimDoPeriodo(assinatura),
      cancelAtPeriodEnd: assinatura.cancel_at_period_end ?? false,
      // O acesso cai so' quando o Stripe encerra de verdade. Inadimplente segue
      // ativo enquanto as retentativas acontecem.
      ...(encerrou && user.status === 'ATIVO'
        ? { status: 'CANCELADO' as const, canceledAt: new Date() }
        : {}),
      // Uma reativacao pelo portal do Stripe devolve o acesso sem passar pelo
      // checkout, entao ela tambem precisa ser tratada aqui.
      ...(!encerrou && user.status === 'CANCELADO'
        ? { status: 'ATIVO' as const, canceledAt: null }
        : {}),
    },
  });
}

/** Fatura paga ou falha: entra no historico de cobranca. */
export async function aoRegistrarFatura(fatura: Stripe.Invoice): Promise<void> {
  const customerId = idDe(fatura.customer);
  if (!customerId) return;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  if (!user) return;

  const pago = fatura.status === 'paid';
  await prisma.payment.upsert({
    where: { stripeInvoice: fatura.id ?? `sem-id-${Date.now()}` },
    create: {
      userId: user.id,
      stripeInvoice: fatura.id ?? `sem-id-${Date.now()}`,
      amountCents: fatura.amount_paid || fatura.amount_due || 0,
      currency: fatura.currency ?? 'brl',
      status: fatura.status ?? 'desconhecido',
      description: fatura.number ?? null,
      invoiceUrl: fatura.hosted_invoice_url ?? null,
      paidAt: pago && fatura.status_transitions?.paid_at
        ? new Date(fatura.status_transitions.paid_at * 1000)
        : null,
    },
    update: {
      amountCents: fatura.amount_paid || fatura.amount_due || 0,
      status: fatura.status ?? 'desconhecido',
      invoiceUrl: fatura.hosted_invoice_url ?? null,
      paidAt: pago && fatura.status_transitions?.paid_at
        ? new Date(fatura.status_transitions.paid_at * 1000)
        : null,
    },
  });
}
