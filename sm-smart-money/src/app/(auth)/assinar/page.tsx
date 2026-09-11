import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { stripeConfigured } from '@/lib/env';
import { getSessionUser } from '@/lib/auth/session';
import { AssinarButton } from '@/components/assinar-button';

export const metadata: Metadata = { title: 'Assinar' };
export const dynamic = 'force-dynamic';

/**
 * Destino de quem chega pelo convite sem passar pelo botao do painel de marca,
 * por link direto ou por voltar do checkout sem concluir.
 */
export default async function AssinarPage() {
  // Quem ja' tem sessao nao passa por aqui.
  const user = await getSessionUser();
  if (user) redirect(user.role === 'ADMIN' ? '/admin' : '/dashboard');

  // Uma tela que promete um checkout inexistente e' pior do que nao existir.
  if (!stripeConfigured) redirect('/login');

  return (
    <div className="space-y-7">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold text-text-1">Entre para o VIP Lounge</h1>
        <p className="text-sm text-text-2">
          O pagamento é mensal, no cartão de crédito, e você cancela quando quiser pela própria
          plataforma.
        </p>
      </div>

      <AssinarButton
        variant="solido"
        eyebrow="Assinatura mensal"
        texto="Você vai para o ambiente de pagamento do Stripe."
        chamada="continuar"
      />

      <div className="flex items-start gap-2.5 rounded-md border border-line bg-surface-sunken px-3.5 py-3">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-strong" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-text-2">
          O pagamento acontece no ambiente do Stripe. Os dados do seu cartão não passam pela SM
          Smart Money.
        </p>
      </div>

      <p className="text-xs leading-relaxed text-text-3">
        Já é membro?{' '}
        <Link href="/login" className="text-brand-strong hover:underline">
          Entrar na comunidade
        </Link>
      </p>
    </div>
  );
}
