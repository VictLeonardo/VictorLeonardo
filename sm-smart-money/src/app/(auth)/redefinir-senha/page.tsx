import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetPasswordForm } from './reset-form';

export const metadata: Metadata = { title: 'Redefinir senha' };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-text-1">Link inválido</h1>
        <p className="text-sm text-text-2">
          Este endereço não contem um token de redefinição. Peca um novo link.
        </p>
        <Link href="/esqueci-senha" className="inline-block text-sm text-brand-strong hover:underline">
          Pedir novo link
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold text-text-1">Criar nova senha</h1>
        <p className="text-sm text-text-2">
          Escolha uma senha com ao menos 10 caracteres, incluindo maiuscula, minuscula e número.
        </p>
      </div>
      <ResetPasswordForm token={token} />
    </div>
  );
}
