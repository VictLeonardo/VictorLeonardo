'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Base dos graficos do painel admin.
 *
 * Sao SVG escritos a mao, sem biblioteca de charts, por tres motivos: as cores
 * precisam sair dos tokens CSS (e portanto trocar de tema sem re-render), o peso
 * de JS no dashboard importa para o LCP, e os graficos aqui sao poucos e simples.
 *
 * Regras seguidas em todos eles:
 *  - uma unica serie por grafico, sempre no mesmo tom (--color-chart-1). Nunca um
 *    degrade por valor: o comprimento da barra ja' codifica a magnitude.
 *  - nenhum grafico de eixo duplo. Contagem e taxa viram graficos/tiles separados.
 *  - grade e eixos em hairline solido, recessivos.
 *  - todo grafico tem um par em tabela (`<details>`), entao nenhum valor depende
 *    exclusivamente do tooltip ou da cor.
 */

export function useChartWidth<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null);
  const [width, setWidth] = React.useState(640);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width;
      if (next && next > 0) setWidth(next);
    });
    observer.observe(node);
    setWidth(node.clientWidth || 640);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const rawStep = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(Math.round(v * 1000) / 1000);
  if (ticks.length === 1) ticks.push(step);
  return ticks;
}

export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1).replace('.0', '')}k`;
  return new Intl.NumberFormat('pt-BR').format(value);
}

export function ChartFrame({
  title,
  subtitle,
  action,
  children,
  table,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  table: { head: string[]; rows: (string | number)[][] };
  className?: string;
}) {
  return (
    <figure
      className={cn('rounded-lg border border-line bg-surface p-5 shadow-card', className)}
    >
      <figcaption className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-text-1">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-text-2">{subtitle}</p> : null}
        </div>
        {action}
      </figcaption>
      {children}
      <details className="mt-4 border-t border-line pt-3">
        <summary className="cursor-pointer text-xs text-text-2 hover:text-text-1">
          Ver dados em tabela
        </summary>
        <div className="mt-3 max-h-64 overflow-auto">
          <table className="w-full text-left text-xs tabular-nums">
            <thead className="text-text-3">
              <tr>
                {table.head.map((h) => (
                  <th key={h} scope="col" className="border-b border-line py-1.5 pr-4 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-text-2">
              {table.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} className="border-b border-line py-1.5 pr-4">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

export function ChartTooltip({
  x,
  y,
  width,
  children,
}: {
  x: number;
  y: number;
  width: number;
  children: React.ReactNode;
}) {
  // Vira para a esquerda perto da borda direita para nao sair do card.
  const flip = x > width - 150;
  return (
    <div
      className="pointer-events-none absolute z-10 min-w-32 rounded-md border border-line bg-surface-raised px-2.5 py-2 text-xs shadow-pop"
      style={{
        left: flip ? undefined : x + 12,
        right: flip ? width - x + 12 : undefined,
        top: Math.max(4, y - 12),
      }}
    >
      {children}
    </div>
  );
}
