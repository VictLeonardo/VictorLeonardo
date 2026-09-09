import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guards';
import {
  engagementBySection,
  growthSeries,
  journeyStats,
  memberKpis,
  profileStats,
  resolvePeriod,
  topContent,
  type PeriodKey,
} from '@/server/analytics';
import { getWahaStatus } from '@/lib/waha';
import { StatTile } from '@/components/charts/stat-tile';
import { AreaChart } from '@/components/charts/area-chart';
import { ColumnChart } from '@/components/charts/column-chart';
import { BarList } from '@/components/charts/bar-list';
import { PeriodFilter } from '@/components/admin/period-filter';
import { WahaStatusChip } from '@/components/admin/waha-status-chip';
import { SectionHeader } from '@/components/ui/section-header';
import { Card, CardContent } from '@/components/ui/card';
import { CONTENT_TYPE_LABELS, JOURNEY_CATEGORY_LABELS } from '@/lib/domain';
import { formatCurrency } from '@/lib/utils';
import type { JourneyCategory } from '@prisma/client';

export const metadata: Metadata = { title: 'Dashboard admin' };
export const dynamic = 'force-dynamic';

const PERIODS: PeriodKey[] = ['7d', '30d', '90d', '12m', 'custom'];

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; de?: string; ate?: string }>;
}) {
  await requireAdmin('/admin');
  const params = await searchParams;
  const periodKey = PERIODS.includes(params.periodo as PeriodKey)
    ? (params.periodo as PeriodKey)
    : '30d';
  const period = resolvePeriod(periodKey, { from: params.de, to: params.ate });

  const [kpis, series, engagement, journey, profiles, waha, top] = await Promise.all([
    memberKpis(),
    growthSeries(12),
    engagementBySection(period.from, period.to),
    journeyStats(),
    profileStats(),
    getWahaStatus(),
    topContent(period.from, period.to),
  ]);

  const lastMonthGrowth = series.growth.at(-1)?.value ?? 0;
  const previousMonthGrowth = series.growth.at(-2)?.value ?? 0;
  const totalViews = engagement.reduce((sum, e) => sum + e.value, 0);

  return (
    <div className="space-y-7">
      <SectionHeader
        eyebrow="Visão geral"
        title="Dashboard"
        description={`Métricas da comunidade. Engajamento e conteúdo referentes a: ${period.label.toLowerCase()}.`}
        actions={<WahaStatusChip status={waha} />}
      >
        <PeriodFilter value={periodKey} />
      </SectionHeader>

      <section aria-label="Indicadores principais" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Total de membros" value={String(kpis.total)} hint={`${kpis.pendentes} pendentes`} />
        <StatTile
          label="Ativos"
          value={String(kpis.ativos)}
          delta={lastMonthGrowth - previousMonthGrowth}
          deltaLabel="novos vs. mês anterior"
          goodDirection="up"
        />
        <StatTile
          label="Cancelados"
          value={String(kpis.cancelados)}
          hint={`Churn médio ${series.averageChurnRate.toFixed(1)}% ao mês`}
        />
        <StatTile
          label="MRR estimado"
          value={formatCurrency(kpis.mrr)}
          hint="Soma do valor de tabela dos planos ativos"
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <AreaChart
          title="Novos membros por mês"
          subtitle="Últimos 12 meses"
          data={series.growth.map((m) => ({
            label: m.label,
            value: m.value,
            hint: `Base ao fim do mês: ${m.base}`,
          }))}
          valueLabel="Novos membros"
        />

        <ColumnChart
          title="Cancelamentos por mês"
          subtitle={`Churn médio de ${series.averageChurnRate.toFixed(1)}% ao mês. A taxa aparece no tooltip e na tabela — nunca como segundo eixo.`}
          data={series.churn.map((m) => ({ label: m.label, value: m.value, hint: m.hint }))}
          valueLabel="Cancelamentos"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <BarList
          title="Engajamento por seção"
          subtitle={`${totalViews} visualizações no período`}
          data={engagement}
          valueLabel="Visualizacoes"
        />

        <BarList
          title="Média por dimensão do diagnóstico"
          subtitle={`${journey.totalSubmissions} diagnósticos concluidos`}
          data={journey.categoryAverages.map((c) => ({
            label: JOURNEY_CATEGORY_LABELS[c.category as JourneyCategory] ?? c.category,
            value: c.average,
          }))}
          valueLabel="Nota média"
        />
      </div>

      <section aria-label="Adocao" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatTile
          label="Smart Money Journey"
          value={`${journey.completionRate.toFixed(0)}%`}
          hint={`${journey.completedMembers} de ${journey.activeMembers} membros ativos concluiram`}
          meter={{ value: journey.completionRate, tone: 'brand' }}
        />
        <StatTile
          label="Perfis públicos ativos"
          value={`${profiles.activationRate.toFixed(0)}%`}
          hint={`${profiles.active} ativos · ${profiles.pending} pendentes`}
          meter={{ value: profiles.activationRate, tone: 'brand' }}
        />
        <StatTile
          label="Score médio da comunidade"
          value={String(journey.averageScore)}
          hint="Smart Money Score médio dos diagnósticos concluidos"
          meter={{ value: journey.averageScore, tone: 'brand' }}
        />
      </section>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-text-1">Conteúdos mais vistos</h2>
            <Link href="/admin/conteudo" className="text-xs text-brand-strong hover:underline">
              Gerenciar conteúdo
            </Link>
          </div>

          {top.length === 0 ? (
            <p className="mt-4 text-sm text-text-2">Nenhuma visualização registrada no período.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="text-xs text-text-3">
                  <tr>
                    <th scope="col" className="border-b border-line py-2 pr-4 font-medium">
                      Título
                    </th>
                    <th scope="col" className="border-b border-line py-2 pr-4 font-medium">
                      Tipo
                    </th>
                    <th scope="col" className="border-b border-line py-2 text-right font-medium">
                      Views
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {top.map((item) => (
                    <tr key={item.id}>
                      <td className="border-b border-line py-2.5 pr-4 text-text-1">{item.title}</td>
                      <td className="border-b border-line py-2.5 pr-4 text-text-2">
                        {CONTENT_TYPE_LABELS[item.type]}
                      </td>
                      <td className="border-b border-line py-2.5 text-right font-medium tabular-nums text-text-1">
                        {item.views}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
