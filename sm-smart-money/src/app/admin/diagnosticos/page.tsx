import type { Metadata } from 'next';
import Link from 'next/link';
import type { JourneyCategory } from '@prisma/client';
import { Compass } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/guards';
import { prisma } from '@/lib/prisma';
import { journeyStats } from '@/server/analytics';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState } from '@/components/ui/empty-state';
import { StatTile } from '@/components/charts/stat-tile';
import { BarList } from '@/components/charts/bar-list';
import { Card, CardContent } from '@/components/ui/card';
import { MemberAvatar } from '@/components/ui/avatar';
import { JOURNEY_CATEGORY_LABELS, JOURNEY_CATEGORY_ORDER } from '@/lib/domain';
import { BAND_LABELS, bandFor } from '@/lib/journey/scoring';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Diagnósticos' };
export const dynamic = 'force-dynamic';

/**
 * Visao agregada e individual do Smart Money Journey (G04). Na plataforma atual os
 * resultados sao invisiveis para o admin.
 */
export default async function AdminJourneyPage() {
  await requireAdmin('/admin/diagnosticos');

  const [stats, submissions] = await Promise.all([
    journeyStats(),
    prisma.journeySubmission.findMany({
      where: { completedAt: { not: null } },
      orderBy: { completedAt: 'desc' },
      take: 60,
      select: {
        id: true,
        completedAt: true,
        overallScore: true,
        categoryScores: true,
        user: {
          select: {
            id: true,
            name: true,
            jobTitle: true,
            profile: { select: { avatarUrl: true } },
          },
        },
      },
    }),
  ]);

  const pending = stats.activeMembers - stats.completedMembers;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Diagnóstico"
        title="Smart Money Journey"
        description="Adesão da comunidade, médias por dimensão e o resultado individual de cada membro."
      />

      <section aria-label="Indicadores do diagnóstico" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Taxa de conclusão"
          value={`${stats.completionRate.toFixed(0)}%`}
          hint={`${stats.completedMembers} de ${stats.activeMembers} membros ativos`}
          meter={{ value: stats.completionRate, tone: 'brand' }}
        />
        <StatTile label="Diagnósticos concluídos" value={String(stats.totalSubmissions)} />
        <StatTile
          label="Score médio"
          value={String(stats.averageScore)}
          hint={BAND_LABELS[bandFor(stats.averageScore)]}
          meter={{ value: stats.averageScore, tone: 'brand' }}
        />
        <StatTile label="Membros pendentes" value={String(Math.max(0, pending))} />
      </section>

      {stats.categoryAverages.length > 0 ? (
        <BarList
          title="Média da comunidade por dimensão"
          subtitle="Escala de 0 a 100. Dimensões com nota baixa indicam onde a curadoria pode focar."
          data={JOURNEY_CATEGORY_ORDER.flatMap((category) => {
            const found = stats.categoryAverages.find((c) => c.category === category);
            return found
              ? [{ label: JOURNEY_CATEGORY_LABELS[category], value: found.average }]
              : [];
          })}
          valueLabel="Nota média"
        />
      ) : null}

      <Card>
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold text-text-1">Resultados individuais</h2>

          {submissions.length === 0 ? (
            <EmptyState
              icon={Compass}
              title="Nenhum diagnóstico concluído"
              description="Assim que os membros completarem o Smart Money Journey, os resultados aparecem aqui."
              className="mt-4"
            />
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs text-text-3">
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Membro
                    </th>
                    <th scope="col" className="py-2 pr-4 text-right font-medium">
                      Score
                    </th>
                    {JOURNEY_CATEGORY_ORDER.map((category) => (
                      <th key={category} scope="col" className="py-2 pr-3 text-right font-medium">
                        {JOURNEY_CATEGORY_LABELS[category].split(' ')[0]}
                      </th>
                    ))}
                    <th scope="col" className="py-2 text-right font-medium">
                      Conclusão
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => {
                    const scores = (submission.categoryScores ?? {}) as Record<string, number>;
                    return (
                      <tr key={submission.id} className="border-b border-line last:border-0">
                        <td className="py-2.5 pr-4">
                          <Link
                            href={`/admin/membros/${submission.user.id}`}
                            className="flex items-center gap-2.5 group"
                          >
                            <MemberAvatar
                              name={submission.user.name}
                              src={submission.user.profile?.avatarUrl}
                              size={28}
                            />
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-text-1 group-hover:text-brand-strong">
                                {submission.user.name}
                              </span>
                              <span className="block truncate text-xs text-text-3">
                                {submission.user.jobTitle ?? '—'}
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="py-2.5 pr-4 text-right font-semibold tabular-nums text-text-1">
                          {submission.overallScore}
                        </td>
                        {JOURNEY_CATEGORY_ORDER.map((category: JourneyCategory) => (
                          <td key={category} className="py-2.5 pr-3 text-right tabular-nums text-text-2">
                            {scores[category] ?? '—'}
                          </td>
                        ))}
                        <td className="py-2.5 text-right tabular-nums text-text-2">
                          {formatDate(submission.completedAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
