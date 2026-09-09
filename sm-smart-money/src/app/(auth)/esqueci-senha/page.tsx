import type { Metadata } from 'next';
import Link from 'next/link';
import { ForgotPasswordForm } from './forgot-form';

export const metadata: Metadata = { title: 'Esqueci minha senha' };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-7">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold text-text-1">Recuperar acesso</h1>
        <p className="text-sm text-text-2">
          Informe o e-mail cadastrado. Se ele estiver na base, enviaremos um link para criar uma
          nova senha.
        </p>
      </div>
      <ForgotPasswordForm />
      <Link href="/login" className="inline-block text-sm text-brand-strong hover:underline">
        ← Voltar para o login
      </Link>
    </div>
  );
}
