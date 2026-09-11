import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LifeBuoy } from 'lucide-react';
import { requireUser } from '@/lib/auth/guards';
import { stripeConfigured } from '@/lib/env';
import { AssinarButton } from '@/components/assinar-button';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { LogoutButton } from '@/components/portal/logout-button';

export const metadata: Metadata = { title: 'Reativar assinatura' };
export const dynamic = 'force-dynamic';

/**
 * Destino de quem esta com a assinatura cancelada. O perfil publico continua no ar
 * (se ativo); apenas o conteudo da comunidade fica bloqueado.
 */
export default async function ReactivatePage() {
  const user = await requireUser('/reativar');
  if (user.status !== 'CANCELADO') redirect('/dashboard');

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center gap-6 text-center">
      <Logo />
      <LifeBuoy className="size-9 text-brand-strong" aria-hidden="true" />
      <div className="space-y-2">
        <h1 className="font-display text-3xl text-text-1">Sua assinatura está pausada</h1>
        <p className="text-sm leading-relaxed text-text-2">
          O acesso ao conteúdo da comunidade fica suspenso enquanto a assinatura estiver cancelada.
          Seu perfil público e seu histórico continuam preservados — basta reativar para voltar de
          onde parou.
        </p>
      </div>
      {/* Com cobranca no ar, reativar e' um checkout novo: o webhook devolve o
          acesso a' conta que ja' existe, com historico e perfil preservados. */}
      {stripeConfigured ? (
        <AssinarButton
          variant="solido"
          className="w-full max-w-sm text-left"
          eyebrow="Quer voltar?"
          texto="Seu histórico e seu perfil continuam guardados."
          chamada="reative sua assinatura"
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-2">
        {!stripeConfigured ? (
          <Button asChild>
            <a href="mailto:contato@smboard.com.br?subject=Reativar%20assinatura%20SM%20Smart%20Money">
              Falar com a equipe SM
            </a>
          </Button>
        ) : null}
        {user.profileSlug ? (
          <Button asChild variant="secondary">
            <Link href={`/${user.profileSlug}`}>Ver meu perfil público</Link>
          </Button>
        ) : null}
      </div>
      <LogoutButton />
    </div>
  );
}
