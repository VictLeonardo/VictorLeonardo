import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Tile de KPI. Um numero unico e' um tile, nunca um grafico de uma barra.
 * O valor usa algarismos proporcionais (nada de tabular em numero grande).
 */
export function StatTile({
  label,
  value,
  delta,
  deltaLabel,
  goodDirection = 'up',
  hint,
  meter,
  className,
}: {
  label: string;
  value: string;
  delta?: number;
  deltaLabel?: string;
  goodDirection?: 'up' | 'down' | 'neutral';
  hint?: string;
  meter?: { value: number; max?: number; tone?: 'brand' | 'positive' | 'warning' | 'danger' };
  className?: string;
}) {
  const direction = delta === undefined ? null : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const isGood =
    direction === null || direction === 'flat' || goodDirection === 'neutral'
      ? null
      : direction === goodDirection;

  const DeltaIcon = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus;

  return (
    <div className={cn('rounded-lg border border-line bg-surface p-4 shadow-card', className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-text-3">{label}</p>
      <p className="mt-1.5 text-3xl font-semibold leading-none text-text-1">{value}</p>

      {direction ? (
        <p
          className={cn(
            'mt-2 inline-flex items-center gap-1 text-xs font-medium',
            isGood === null ? 'text-text-2' : isGood ? 'text-positive' : 'text-danger',
          )}
        >
          <DeltaIcon className="size-3.5" aria-hidden="true" />
          <span className="tabular-nums">
            {delta! > 0 ? '+' : ''}
            {delta}
          </span>
          {deltaLabel ? <span className="font-normal text-text-3">{deltaLabel}</span> : null}
        </p>
      ) : null}

      {meter ? (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, (meter.value / (meter.max ?? 100)) * 100)}%`,
              backgroundColor:
                meter.tone === 'positive'
                  ? 'var(--color-positive)'
                  : meter.tone === 'warning'
                    ? 'var(--color-warning)'
                    : meter.tone === 'danger'
                      ? 'var(--color-danger)'
                      : 'var(--color-chart-1)',
            }}
          />
        </div>
      ) : null}

      {hint ? <p className="mt-2 text-xs text-text-2">{hint}</p> : null}
    </div>
  );
}
