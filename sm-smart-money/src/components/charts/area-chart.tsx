'use client';

import * as React from 'react';
import {
  ChartFrame,
  ChartTooltip,
  formatCompact,
  niceTicks,
  useChartWidth,
} from './primitives';

export type SeriesPoint = { label: string; value: number; hint?: string };

const HEIGHT = 220;
const PAD = { top: 16, right: 18, bottom: 30, left: 40 };

/**
 * Serie unica ao longo do tempo (crescimento de membros). Linha de 2px, area em
 * 10% de opacidade e rotulo direto apenas no ultimo ponto — o eixo carrega o resto.
 */
export function AreaChart({
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

  const x = (i: number) => PAD.left + (data.length <= 1 ? plotWidth / 2 : (i / (data.length - 1)) * plotWidth);
  const y = (v: number) => PAD.top + plotHeight - (v / domainMax) * plotHeight;

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d.value)}`).join(' ');
  const areaPath =
    data.length > 0
      ? `${linePath} L${x(data.length - 1)},${PAD.top + plotHeight} L${x(0)},${PAD.top + plotHeight} Z`
      : '';

  const last = data[data.length - 1];
  const active = hover !== null ? data[hover] : null;

  // Um rotulo a cada N meses para nao empilhar texto no eixo.
  const labelStride = Math.ceil(data.length / (width < 420 ? 4 : 6));

  const handleMove = (event: React.PointerEvent<SVGRectElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const relative = event.clientX - rect.left;
    const index = Math.round((relative / plotWidth) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, index)));
  };

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      action={action}
      table={{
        head: ['Período', valueLabel],
        rows: data.map((d) => [d.label, d.value]),
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

          <path d={areaPath} fill="var(--color-chart-1-wash)" />
          <path
            d={linePath}
            fill="none"
            stroke="var(--color-chart-1)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {data.map((d, i) =>
            i % labelStride === 0 || i === data.length - 1 ? (
              <text
                key={d.label}
                x={x(i)}
                y={HEIGHT - 10}
                textAnchor="middle"
                className="fill-[var(--color-text-2)] text-[10px]"
              >
                {d.label}
              </text>
            ) : null,
          )}

          {active ? (
            <line
              x1={x(hover as number)}
              x2={x(hover as number)}
              y1={PAD.top}
              y2={PAD.top + plotHeight}
              stroke="var(--color-line-strong)"
              strokeWidth={1}
            />
          ) : null}

          {/* Marcador do ultimo ponto com anel na cor da superficie. */}
          {last ? (
            <circle
              cx={x(data.length - 1)}
              cy={y(last.value)}
              r={4.5}
              fill="var(--color-chart-1)"
              stroke="var(--color-surface)"
              strokeWidth={2}
            />
          ) : null}

          {active ? (
            <circle
              cx={x(hover as number)}
              cy={y(active.value)}
              r={4.5}
              fill="var(--color-chart-1)"
              stroke="var(--color-surface)"
              strokeWidth={2}
            />
          ) : null}

          <rect
            x={PAD.left}
            y={PAD.top}
            width={plotWidth}
            height={plotHeight}
            fill="transparent"
            onPointerMove={handleMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>

        {active ? (
          <ChartTooltip x={x(hover as number)} y={y(active.value)} width={width}>
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
