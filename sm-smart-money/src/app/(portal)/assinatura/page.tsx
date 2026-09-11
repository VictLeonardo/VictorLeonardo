import type { Metadata } from 'next';
import { CreditCard } from 'lucide-react';
import { requireActiveMember } from '@/lib/auth/guards';
import { prisma } from '@/lib/prisma';
import { stripeConfigured } from '@/lib/env';
import { resumoDaAssinatura } from '@/server/subscriptions';
import { SectionHeader } from '@/components/ui/section-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { SubscriptionPanel } from '@/components/portal/subscription-panel';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Minha assinatura' };
export const dynamic = 'force-dynamic';

const ROTULO_DE_STATUS: Record<string, string> = {
  ATIVA: 'Ativa',
  INADIMPLENTE: 'Pagamento pendente',
  CANCELADA: 'Cancelada',
  INCOMPLETA: 'Incompleta',
  SEM_ASSINATURA: 'Sem cobrança automática',
};

/** Em centavos, como o Stripe entrega. */
function formatCentavos(valor: number, moeda: string): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: moeda.toUpperCase(),
  }).format(valor / 100);
}

export default async function AssinaturaPage() {
  const session = await requireActiveMember('/assinatura');
  const resumo = await resumoDaAssinatura(session.id);

  const cobrancas = await prisma.payment.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: 'desc' },
    take: 12,
  });

  return (
    <div className="space-y-7">
      <SectionHeader
        eyebrow="Conta"
        title="Minha assinatura"
        description="Situação da cobrança, cartão e histórico de pagamentos."
      />

      <Card className="space-y-5 p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-3">
              Situação
            </p>
            <p className="mt-1 font-display text-2xl text-text-1">
              {ROTULO_DE_STATUS[resumo.status] ?? resumo.status}
            </p>
          </div>
          {resumo.fimDoPeriodo ? (
            <p className="text-sm text-text-2">
              {resumo.cancelamentoAgendado ? 'Acesso até' : 'Próxima cobrança em'}{' '}
              <strong className="font-medium text-text-1">{formatDate(resumo.fimDoPeriodo)}</strong>
            </p>
          ) : null}
        </div>

        {resumo.configurada ? (
          <SubscriptionPanel resumo={resumo} />
        ) : (
          <p className="text-sm leading-relaxed text-text-2">
            Sua participação não passa por cobrança automática nesta plataforma. Para mudar a forma
            de pagamento, fale com a equipe SM Smart Money.
          </p>
        )}
      </Card>

      {stripeConfigured ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl text-text-1">Histórico de cobrança</h2>

          {cobrancas.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="Nenhuma cobrança registrada"
              description="As faturas aparecem aqui assim que o primeiro pagamento for processado."
            />
          ) : (
            <Card className="divide-y divide-line p-0">
              {cobrancas.map((cobranca) => (
                <div
                  key={cobranca.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-1">
                      {formatCentavos(cobranca.amountCents, cobranca.currency)}
                    </p>
                    <p className="text-xs text-text-3">
                      {formatDate(cobranca.paidAt ?? cobranca.createdAt)}
                      {cobranca.description ? ` · ${cobranca.description}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={
                        cobranca.status === 'paid'
                          ? 'text-xs font-medium text-positive'
                          : 'text-xs font-medium text-danger'
                      }
                    >
                      {cobranca.status === 'paid' ? 'Pago' : 'Não pago'}
                    </span>
                    {cobranca.invoiceUrl ? (
                      <a
                        href={cobranca.invoiceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-brand-strong hover:underline"
                      >
                        Ver fatura
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </Card>
          )}
        </section>
      ) : null}
    </div>
  );
}
