import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { MailCheck } from 'lucide-react';
import { requireUser } from '@/lib/auth/guards';
import { Logo } from '@/components/logo';
import { LogoutButton } from '@/components/portal/logout-button';

export const metadata: Metadata = { title: 'Primeiro acesso' };
export const dynamic = 'force-dynamic';

/** Membro cadastrado pelo admin porem ainda sem ativacao concluida. */
export default async function FirstAccessPage() {
  const user = await requireUser('/primeiro-acesso');
  if (user.status !== 'PENDENTE') redirect('/dashboard');

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center gap-6 text-center">
      <Logo />
      <MailCheck className="size-9 text-brand-strong" aria-hidden="true" />
      <div className="space-y-2">
        <h1 className="font-display text-3xl text-text-1">Cadastro em análise</h1>
        <p className="text-sm leading-relaxed text-text-2">
          Seu cadastro foi criado e está aguardando a liberação da equipe SM Smart Money. Assim que
          a assinatura for confirmada, todo o conteúdo da comunidade aparece aqui.
        </p>
      </div>
      <LogoutButton />
    </div>
  );
}
