'use client';

import * as React from 'react';
import {
  ChartFrame,
  ChartTooltip,
  formatCompact,
  niceTicks,
  useChartWidth,
} from './primitives';
import type { SeriesPoint } from './area-chart';

const HEIGHT = 220;
const PAD = { top: 16, right: 12, bottom: 30, left: 40 };
const MAX_BAR = 24;
const GAP = 2;

/**
 * Colunas de serie unica (cancelamentos por mes). A taxa percentual do periodo
 * aparece no tooltip e nos KPIs — nunca como segundo eixo, que inventaria uma
 * correlacao entre escalas diferentes.
 */
export function ColumnChart({
  title,
  subtitle,
  data,
  valueLabel,
  action,
}: {
  title: string;
  subtitle?: string;
  data: SeriesPoint[];
  valueLabel: string;
  action?: React.ReactNode;
}) {
  const { ref, width } = useChartWidth<HTMLDivElement>();
  const [hover, setHover] = React.useState<number | null>(null);

  const plotWidth = Math.max(120, width - PAD.left - PAD.right);
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const maxValue = Math.max(1, ...data.map((d) => d.value));
  const ticks = niceTicks(maxValue);
  const domainMax = ticks[ticks.length - 1];

  const band = data.length > 0 ? plotWidth / data.length : plotWidth;
  const barWidth = Math.min(MAX_BAR, Math.max(6, band - GAP * 2 - 6));
  const barX = (i: number) => PAD.left + band * i + (band - barWidth) / 2;
  const y = (v: number) => PAD.top + plotHeight - (v / domainMax) * plotHeight;

  const labelStride = Math.ceil(data.length / (width < 420 ? 4 : 6));
  const peakIndex = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
  const active = hover !== null ? data[hover] : null;

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      action={action}
      table={{
        head: ['Período', valueLabel, 'Detalhe'],
        rows: data.map((d) => [d.label, d.value, d.hint ?? '—']),
      }}
    >
      <div ref={ref} className="relative">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`${title}. ${valueLabel} por período.`}
          className="block overflow-visible"
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={PAD.left + plotWidth}
                y1={y(tick)}
                y2={y(tick)}
                stroke="var(--color-chart-grid)"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={y(tick) + 3.5}
                textAnchor="end"
                className="fill-[var(--color-text-2)] text-[10px] tabular-nums"
              >
                {formatCompact(tick)}
              </text>
            </g>
          ))}

          {data.map((d, i) => {
            const height = Math.max(d.value > 0 ? 2 : 0, plotHeight - (y(d.value) - PAD.top));
            return (
              <g key={d.label}>
                <rect
                  x={barX(i)}
                  y={PAD.top + plotHeight - height}
                  width={barWidth}
                  height={height}
                  rx={4}
                  fill="var(--color-chart-1)"
                  opacity={hover === null || hover === i ? 1 : 0.55}
                />
                {/* Canto inferior reto: a barra nasce da linha de base. */}
                <rect
                  x={barX(i)}
                  y={PAD.top + plotHeight - Math.min(height, 4)}
                  width={barWidth}
                  height={Math.min(height, 4)}
                  fill="var(--color-chart-1)"
                  opacity={hover === null || hover === i ? 1 : 0.55}
                />
                <rect
                  x={PAD.left + band * i}
                  y={PAD.top}
                  width={band}
                  height={plotHeight}
                  fill="transparent"
                  onPointerEnter={() => setHover(i)}
                  onPointerLeave={() => setHover(null)}
                />
              </g>
            );
          })}

          {/* Rotulo direto so no pico — nunca um numero em cada coluna. */}
          {data[peakIndex] && data[peakIndex].value > 0 ? (
            <text
              x={barX(peakIndex) + barWidth / 2}
              y={y(data[peakIndex].value) - 7}
              textAnchor="middle"
              className="fill-[var(--color-text-1)] text-[10px] font-semibold tabular-nums"
            >
              {formatCompact(data[peakIndex].value)}
            </text>
          ) : null}

          {data.map((d, i) =>
            i % labelStride === 0 || i === data.length - 1 ? (
              <text
                key={d.label}
                x={barX(i) + barWidth / 2}
                y={HEIGHT - 10}
                textAnchor="middle"
                className="fill-[var(--color-text-2)] text-[10px]"
              >
                {d.label}
              </text>
            ) : null,
          )}
        </svg>

        {active ? (
          <ChartTooltip x={barX(hover as number) + barWidth / 2} y={y(active.value)} width={width}>
            <p className="font-medium text-text-1">{active.label}</p>
            <p className="mt-0.5 text-text-2">
              <span className="tabular-nums text-text-1">{formatCompact(active.value)}</span>{' '}
              {valueLabel.toLowerCase()}
            </p>
            {active.hint ? <p className="mt-0.5 text-text-3">{active.hint}</p> : null}
          </ChartTooltip>
        ) : null}
      </div>
    </ChartFrame>
  );
}
