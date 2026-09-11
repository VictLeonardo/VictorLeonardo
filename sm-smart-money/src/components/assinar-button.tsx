'use client';

import * as React from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Botao que leva ao checkout do Stripe.
 *
 * Ele nao e' um link: a URL do checkout e' criada na hora, por sessao, e tem
 * validade. Um href fixo apontaria para uma sessao velha na segunda visita.
 *
 * Nenhum dado de cartao passa por aqui. O visitante sai da plataforma e o
 * pagamento acontece no ambiente do Stripe.
 */
export function AssinarButton({
  className,
  eyebrow = 'Ainda não é membro?',
  texto = 'Se você ainda não é membro do VIP Lounge,',
  chamada = 'clique aqui e assine agora',
  variant = 'painel',
}: {
  className?: string;
  eyebrow?: string;
  texto?: string;
  chamada?: string;
  variant?: 'painel' | 'solido';
}) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function assinar() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/assinatura/checkout', { method: 'POST' });
      const payload = await res.json();

      if (!res.ok || !payload.url) {
        setError(payload.error ?? 'Não foi possível abrir o pagamento.');
        setPending(false);
        return;
      }
      // O estado de espera continua ligado: a ida ao Stripe leva um instante, e
      // um botao que volta ao normal convida a um segundo clique.
      window.location.href = payload.url;
    } catch {
      setError('Falha de conexão. Tente novamente.');
      setPending(false);
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <button
        type="button"
        onClick={() => void assinar()}
        disabled={pending}
        className={cn(
          'group flex w-full items-center justify-between gap-4 rounded-lg px-5 py-4 text-left transition-colors',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
          'disabled:cursor-progress disabled:opacity-70',
          variant === 'painel'
            ? 'border border-brand-hairline bg-brand-hairline/40 hover:border-brand/50 hover:bg-brand-hairline/70'
            : 'bg-brand text-brand-contrast hover:bg-brand/90',
        )}
      >
        <span className="flex flex-col gap-1">
          <span
            className={cn(
              'text-[10px] font-semibold uppercase tracking-[0.16em]',
              variant === 'painel' ? 'text-brand-ink-muted' : 'text-brand-ink-muted',
            )}
          >
            {eyebrow}
          </span>
          <span
            className={cn(
              'text-sm leading-snug',
              variant === 'painel' ? 'text-brand-ink-muted' : 'text-brand-contrast',
            )}
          >
            {texto}{' '}
            <span className="font-semibold underline underline-offset-4">{chamada}</span>.
          </span>
        </span>
        {pending ? (
          <Loader2 className="size-5 shrink-0 animate-spin text-brand" aria-hidden="true" />
        ) : (
          <ArrowRight
            className={cn(
              'size-5 shrink-0 transition-transform group-hover:translate-x-0.5',
              variant === 'painel' ? 'text-brand' : 'text-brand-contrast',
            )}
            aria-hidden="true"
          />
        )}
      </button>

      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
