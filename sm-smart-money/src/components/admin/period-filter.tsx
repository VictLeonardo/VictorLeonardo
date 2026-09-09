'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

const PRESETS = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: '12m', label: '12 meses' },
];

/**
 * Uma unica linha de filtro de periodo, acima de tudo o que ela controla — nunca
 * um filtro por card. Todos os graficos do dashboard leem a mesma fatia.
 */
export function PeriodFilter({ value }: { value: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [custom, setCustom] = React.useState(value === 'custom');

  function apply(next: Record<string, string | null>) {
    const search = new URLSearchParams(params.toString());
    for (const [key, val] of Object.entries(next)) {
      if (val) search.set(key, val);
      else search.delete(key);
    }
    router.push(`/admin?${search.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* No mobile a linha rola na horizontal em vez de quebrar os rotulos. */}
      <div
        role="radiogroup"
        aria-label="Período de análise"
        className="inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-md border border-line bg-surface-sunken p-1"
      >
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            role="radio"
            aria-checked={value === preset.value}
            onClick={() => {
              setCustom(false);
              apply({ periodo: preset.value, de: null, ate: null });
            }}
            className={cn(
              'whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-colors',
              value === preset.value
                ? 'bg-surface text-text-1 shadow-card'
                : 'text-text-2 hover:text-text-1',
            )}
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          role="radio"
          aria-checked={value === 'custom'}
          onClick={() => setCustom((v) => !v)}
          className={cn(
            'whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-colors',
            value === 'custom'
              ? 'bg-surface text-text-1 shadow-card'
              : 'text-text-2 hover:text-text-1',
          )}
        >
          Personalizado
        </button>
      </div>

      {custom ? (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            apply({
              periodo: 'custom',
              de: String(data.get('de') ?? ''),
              ate: String(data.get('ate') ?? ''),
            });
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-3">De</span>
            <Input type="date" name="de" defaultValue={params.get('de') ?? ''} className="w-40" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-3">Até</span>
            <Input type="date" name="ate" defaultValue={params.get('ate') ?? ''} className="w-40" />
          </label>
          <button
            type="submit"
            className="h-10 rounded-md border border-line-strong px-3 text-sm text-text-1 transition-colors hover:bg-surface-sunken"
          >
            Aplicar
          </button>
        </form>
      ) : null}
    </div>
  );
}
