'use client';

import * as React from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';

export function ForgotPasswordForm() {
  const [sent, setSent] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const data = new FormData(event.currentTarget);
    await fetch('/api/auth/esqueci-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.get('email') }),
    }).catch(() => null);
    setPending(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex items-start gap-3 rounded-md border border-line bg-surface p-4">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-positive" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-text-1">Pedido registrado</p>
          <p className="text-sm text-text-2">
            Se o e-mail informado pertencer a um membro, o link de redefinição chega em instantes.
            Ele vale por 1 hora.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="E-mail" htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        Enviar link de recuperacao
      </Button>
    </form>
  );
}
