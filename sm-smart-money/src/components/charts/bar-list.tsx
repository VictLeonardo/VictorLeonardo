'use client';

import { ChartFrame, formatCompact } from './primitives';

export type BarItem = { label: string; value: number; hint?: string };

/**
 * Barras horizontais para comparar magnitude entre categorias nominais (secoes do
 * portal, categorias do diagnostico). Todas na mesma cor: o comprimento ja' diz
 * quem e' maior, colorir por valor gastaria o canal de identidade a toa.
 */
export function BarList({
  title,
  subtitle,
  data,
  valueLabel,
  suffix = '',
  action,
}: {
  title: string;
  subtitle?: string;
  data: BarItem[];
  valueLabel: string;
  suffix?: string;
  action?: React.ReactNode;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      action={action}
      table={{
        head: ['Categoria', valueLabel],
        rows: data.map((d) => [d.label, `${d.value}${suffix}`]),
      }}
    >
      <ul className="space-y-3">
        {data.map((item) => (
          <li key={item.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm text-text-1">{item.label}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-text-1">
                {formatCompact(item.value)}
                {suffix}
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(2, (item.value / max) * 100)}%`,
                  backgroundColor: 'var(--color-chart-1)',
                }}
              />
            </div>
            {item.hint ? <p className="mt-1 text-xs text-text-3">{item.hint}</p> : null}
          </li>
        ))}
      </ul>
    </ChartFrame>
  );
}
