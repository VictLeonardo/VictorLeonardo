'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { AssinarButton } from '@/components/assinar-button';

export function LoginForm({ next, podeAssinar }: { next?: string; podeAssinar: boolean }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const data = new FormData(event.currentTarget);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.get('email'),
          password: data.get('password'),
          remember: data.get('remember') === 'on',
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload.error ?? 'Não foi possível entrar');
        return;
      }
      const target = next && next.startsWith('/') && !next.startsWith('//') ? next : payload.redirectTo;
      router.replace(target);
      router.refresh();
    } catch {
      setError('Falha de conexão. Tente novamente.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-7">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold text-text-1">Acesse a comunidade</h1>
        <p className="text-sm text-text-2">Entre com o e-mail cadastrado na SM Smart Money.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="E-mail" htmlFor="email" required>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="voce@empresa.com.br"
          />
        </Field>

        <Field label="Senha" htmlFor="password" required>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute right-1 top-1 grid size-8 place-items-center rounded text-text-3 transition-colors hover:text-text-1"
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </Field>

        <div className="flex items-center justify-between">
          <label className="inline-flex items-center gap-2 text-sm text-text-2">
            <input
              type="checkbox"
              name="remember"
              className="size-4 rounded border-line-strong accent-[var(--color-brand-strong)]"
            />
            Lembrar de mim
          </label>
          <Link href="/esqueci-senha" className="text-sm text-brand-strong hover:underline">
            Esqueci minha senha
          </Link>
        </div>

        {error ? (
          <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {pending ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>

      {/* O convite so' aparece no mobile: no desktop ele ja' fecha o painel de
          marca, e repetir os dois na mesma tela dilui a chamada. */}
      {podeAssinar ? (
        <div className="border-t border-line pt-5 lg:hidden">
          <AssinarButton variant="solido" chamada="assine agora" />
        </div>
      ) : (
        <p className="text-xs leading-relaxed text-text-3">
          O acesso é exclusivo para membros da comunidade. Se você ainda não faz parte, fale com a
          equipe SM Smart Money.
        </p>
      )}
    </div>
  );
}
