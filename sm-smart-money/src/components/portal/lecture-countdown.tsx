'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Contagem regressiva ate a palestra. Renderiza vazio no servidor e preenche apos
 * montar — o horario do cliente nao pode divergir do HTML gerado no servidor.
 */
export function LectureCountdown({
  startsAt,
  className,
}: {
  startsAt: string;
  className?: string;
}) {
  const target = React.useMemo(() => new Date(startsAt).getTime(), [startsAt]);
  const [remaining, setRemaining] = React.useState<number | null>(null);

  React.useEffect(() => {
    const tick = () => setRemaining(target - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (remaining === null) {
    return <div className={cn('h-14', className)} aria-hidden="true" />;
  }

  if (remaining <= 0) {
    return (
      <p className={cn('text-sm font-medium text-positive', className)}>
        A transmissão já comecou.
      </p>
    );
  }

  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);

  const parts = [
    { value: days, label: 'dias' },
    { value: hours, label: 'horas' },
    { value: minutes, label: 'min' },
    { value: seconds, label: 'seg' },
  ];

  return (
    <div className={cn('flex gap-2', className)}>
      {parts.map((part) => (
        <div
          key={part.label}
          className="min-w-14 rounded-md border border-line bg-surface-sunken px-2.5 py-2 text-center"
        >
          <p className="text-lg font-semibold leading-none tabular-nums text-text-1">
            {String(part.value).padStart(2, '0')}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wide text-text-3">{part.label}</p>
        </div>
      ))}
    </div>
  );
}
