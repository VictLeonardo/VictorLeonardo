import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { BadgeCheck } from 'lucide-react';
import { requireUser } from '@/lib/auth/guards';
import { Logo } from '@/components/logo';
import { LogoutButton } from '@/components/portal/logout-button';
import { FormularioLinkedin } from '@/components/portal/formulario-linkedin';

export const metadata: Metadata = { title: 'Complete seu perfil' };
export const dynamic = 'force-dynamic';

/**
 * Cobranca do LinkedIn, obrigatorio em todo perfil.
 *
 * Fica fora do grupo (portal) pelo mesmo motivo que /reativar e
 * /primeiro-acesso: e' o layout do portal que manda para ca', e as duas coisas
 * no mesmo lugar dariam um laco de redirecionamento.
 */
export default async function CompletarPerfilPage() {
  const user = await requireUser('/completar-perfil');

  // Quem ja' informou -- ou e' admin, que a cobranca nao alcanca -- nao tem o
  // que fazer aqui.
  if (user.role === 'ADMIN' || user.linkedinUrl) redirect('/dashboard');
  if (user.status === 'CANCELADO') redirect('/reativar');
  if (user.status === 'PENDENTE') redirect('/primeiro-acesso');

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center gap-6">
      <Logo />
      <BadgeCheck className="size-9 text-brand-strong" aria-hidden="true" />
      <div className="space-y-2 text-center">
        <h1 className="font-display text-3xl text-text-1">Falta seu LinkedIn</h1>
        <p className="text-sm leading-relaxed text-text-2">
          O LinkedIn passou a ser obrigatório no perfil de todos os membros — é o que dá lastro
          profissional a quem aparece no diretório da comunidade. Informe o seu para continuar.
        </p>
      </div>

      <FormularioLinkedin />

      <p className="text-center text-xs text-text-3">
        Você pode revisar o restante do perfil depois, em Perfil.
      </p>
      <LogoutButton />
    </div>
  );
}
