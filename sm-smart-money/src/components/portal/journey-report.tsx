'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowUpRight, RotateCcw, TrendingUp } from 'lucide-react';
import { BarList } from '@/components/charts/bar-list';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BAND_LABELS, type JourneyReport } from '@/lib/journey/scoring';
import { JOURNEY_CATEGORY_LABELS, JOURNEY_CATEGORY_ORDER } from '@/lib/domain';
import { formatDate } from '@/lib/utils';

/**
 * Relatorio do diagnostico. O Smart Money Score e' um numero unico e por isso
 * aparece como figura, nao como grafico; as notas por categoria viram barras
 * horizontais de serie unica.
 */
export function JourneyReportView({
  report,
  completedAt,
  history,
  retake,
}: {
  report: JourneyReport;
  completedAt: string;
  history: { id: string; completedAt: string; overallScore: number }[];
  retake: { allowed: boolean; daysRemaining: number };
}) {
  const previous = history[1];
  const delta = previous ? report.overallScore - previous.overallScore : null;

  const categoryData = JOURNEY_CATEGORY_ORDER.filter(
    (c) => typeof report.categoryScores[c] === 'number',
  ).map((c) => ({
    label: JOURNEY_CATEGORY_LABELS[c],
    value: report.categoryScores[c] as number,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-3">
              Smart Money Score
            </p>
            {/* Figura principal: sans, sem tabular-nums em numero grande. */}
            <p className="mt-1 font-sans text-6xl font-semibold leading-none text-text-1">
              {report.overallScore}
            </p>
            <p className="mt-2 text-sm font-medium text-brand-strong">
              {BAND_LABELS[report.band]}
            </p>
            {delta !== null ? (
              <p
                className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${
                  delta >= 0 ? 'text-positive' : 'text-danger'
                }`}
              >
                <TrendingUp className="size-3.5" aria-hidden="true" />
                {delta > 0 ? '+' : ''}
                {delta} vs. diagnóstico anterior
              </p>
            ) : null}
          </div>

          <div className="space-y-3 border-t border-line pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <p className="text-sm text-text-2">
              Concluído em {formatDate(completedAt)}. O relatório fica salvo no seu perfil e pode ser
              refeito a cada 90 dias para medir evolução.
            </p>
            {retake.allowed ? (
              <Button asChild variant="secondary" size="sm">
                <Link href="/journey?refazer=1">
                  <RotateCcw className="size-4" aria-hidden="true" />
                  Refazer diagnóstico
                </Link>
              </Button>
            ) : (
              <p className="text-xs text-text-3">
                Você poderá refazer em {retake.daysRemaining} dia
                {retake.daysRemaining === 1 ? '' : 's'}.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <BarList
        title="Nota por dimensão"
        subtitle="Escala de 0 a 100. Quanto maior, mais madura a dimensão."
        data={categoryData}
        valueLabel="Nota"
      />

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-text-1">
              <TrendingUp className="size-4 text-positive" aria-hidden="true" />
              Pontos fortes
            </h2>
            {report.strengths.length === 0 ? (
              <p className="mt-3 text-sm text-text-2">
                Nenhuma dimensão atingiu 70 pontos ainda. Os próximos passos abaixo mostram por onde
                começar.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {report.strengths.map((item) => (
                  <li key={item.category} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-text-1">{item.label}</span>
                    <span className="font-semibold tabular-nums text-positive">{item.score}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-text-1">
              <AlertTriangle className="size-4 text-warning" aria-hidden="true" />
              Pontos de atenção
            </h2>
            {report.attentionPoints.length === 0 ? (
              <p className="mt-3 text-sm text-text-2">
                Nenhuma dimensão ficou abaixo de 55 pontos. Sua base está equilibrada.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {report.attentionPoints.map((item) => (
                  <li key={item.category} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-text-1">{item.label}</span>
                    <span className="font-semibold tabular-nums text-warning">{item.score}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold text-text-1">Próximos passos recomendados</h2>
          <p className="mt-1 text-sm text-text-2">
            Priorizados pelas três dimensões com maior espaço de ganho.
          </p>
          <ol className="mt-4 space-y-4">
            {report.nextSteps.map((step, index) => (
              <li key={step.category} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand-strong"
                >
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-text-1">{step.label}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-text-2">{step.recommendation}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {history.length > 1 ? (
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-text-1">Histórico</h2>
            <ul className="mt-3 divide-y divide-[var(--color-line)]">
              {history.map((item) => (
                <li key={item.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-text-2">{formatDate(item.completedAt)}</span>
                  <span className="font-semibold tabular-nums text-text-1">
                    {item.overallScore}
                    <span className="font-normal text-text-3">/100</span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <p className="flex items-center gap-1.5 text-xs text-text-3">
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
        Quer aprofundar algum ponto? Leve a dúvida para a Comunidade VIP.
      </p>
    </div>
  );
}
