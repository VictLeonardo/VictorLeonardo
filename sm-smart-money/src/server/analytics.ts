import 'server-only';
import { prisma } from '@/lib/prisma';
import { PLAN_MONTHLY_VALUE } from '@/lib/domain';

/**
 * Consultas do dashboard analitico do admin (G03). Substituem os 4 numeros
 * estaticos da plataforma atual por serie historica, churn e engajamento.
 */

export type PeriodKey = '7d' | '30d' | '90d' | '12m' | 'custom';

export function resolvePeriod(
  key: PeriodKey,
  custom?: { from?: string; to?: string },
): { from: Date; to: Date; label: string } {
  const to = custom?.to ? new Date(custom.to) : new Date();
  if (key === 'custom' && custom?.from) {
    return { from: new Date(custom.from), to, label: 'Período personalizado' };
  }

  const days = key === '7d' ? 7 : key === '30d' ? 30 : key === '90d' ? 90 : 365;
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  const label =
    key === '7d'
      ? 'Últimos 7 dias'
      : key === '30d'
        ? 'Últimos 30 dias'
        : key === '90d'
          ? 'Últimos 90 dias'
          : 'Últimos 12 meses';
  return { from, to, label };
}

export async function memberKpis() {
  const [total, ativos, cancelados, pendentes, planos] = await Promise.all([
    prisma.user.count({ where: { role: 'MEMBER' } }),
    prisma.user.count({ where: { role: 'MEMBER', status: 'ATIVO' } }),
    prisma.user.count({ where: { role: 'MEMBER', status: 'CANCELADO' } }),
    prisma.user.count({ where: { role: 'MEMBER', status: 'PENDENTE' } }),
    prisma.user.groupBy({
      by: ['plan'],
      where: { role: 'MEMBER', status: 'ATIVO' },
      _count: { _all: true },
    }),
  ]);

  // MRR estimado: soma do valor de tabela de cada plano ativo. Cortesia vale 0.
  const mrr = planos.reduce(
    (sum, row) => sum + PLAN_MONTHLY_VALUE[row.plan] * row._count._all,
    0,
  );

  return { total, ativos, cancelados, pendentes, mrr, planos };
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-');
  const names = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${names[Number(month) - 1]}/${year.slice(2)}`;
}

function lastMonths(count: number): string[] {
  const keys: string[] = [];
  const cursor = new Date();
  cursor.setUTCDate(1);
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - i, 1));
    keys.push(monthKey(d));
  }
  return keys;
}

/**
 * Novos membros e cancelamentos mes a mes. Agrupar em memoria (e nao com
 * `date_trunc` no SQL) mantem o codigo independente de dialeto e o volume aqui e'
 * de centenas de linhas, nao de milhoes.
 */
export async function growthSeries(months = 12) {
  const keys = lastMonths(months);
  const start = new Date(`${keys[0]}-01T00:00:00.000Z`);

  const [joined, canceled] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'MEMBER', joinedAt: { gte: start } },
      select: { joinedAt: true },
    }),
    prisma.user.findMany({
      where: { role: 'MEMBER', canceledAt: { gte: start } },
      select: { canceledAt: true },
    }),
  ]);

  const joinedBy = new Map<string, number>();
  for (const row of joined) {
    const key = monthKey(row.joinedAt);
    joinedBy.set(key, (joinedBy.get(key) ?? 0) + 1);
  }

  const canceledBy = new Map<string, number>();
  for (const row of canceled) {
    if (!row.canceledAt) continue;
    const key = monthKey(row.canceledAt);
    canceledBy.set(key, (canceledBy.get(key) ?? 0) + 1);
  }

  // Base de cada mes = membros que entraram antes dele e ainda nao haviam saido.
  const totalBefore = await prisma.user.count({
    where: { role: 'MEMBER', joinedAt: { lt: start } },
  });

  let running = totalBefore;
  const growth = keys.map((key) => {
    running += joinedBy.get(key) ?? 0;
    return { key, label: monthLabel(key), value: joinedBy.get(key) ?? 0, base: running };
  });

  const churn = keys.map((key, index) => {
    const cancels = canceledBy.get(key) ?? 0;
    const base = growth[index].base || 1;
    const rate = (cancels / base) * 100;
    return {
      key,
      label: monthLabel(key),
      value: cancels,
      rate,
      hint: `${rate.toFixed(1)}% da base de ${base}`,
    };
  });

  const totalCancels = churn.reduce((sum, m) => sum + m.value, 0);
  const averageBase = growth.reduce((sum, m) => sum + m.base, 0) / (growth.length || 1);
  const averageChurnRate = averageBase > 0 ? (totalCancels / months / averageBase) * 100 : 0;

  return { growth, churn, averageChurnRate };
}

/** Visualizacoes por secao do portal no periodo. */
export async function engagementBySection(from: Date, to: Date) {
  const views = await prisma.contentView.findMany({
    where: { viewedAt: { gte: from, lte: to } },
    select: { content: { select: { type: true } } },
  });

  const labels: Record<string, string> = {
    ARTIGO: 'Conteúdo Exclusivo',
    VIDEO: 'Vídeos',
    PODCAST: 'Podcasts',
    ANALISE: 'Análises de Mercado',
    EBOOK: 'E-books',
  };

  const counts = new Map<string, number>();
  for (const view of views) {
    const label = labels[view.content.type] ?? view.content.type;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return Object.values(labels)
    .map((label) => ({ label, value: counts.get(label) ?? 0 }))
    .sort((a, b) => b.value - a.value);
}

export async function journeyStats() {
  const [activeMembers, completedMembers, submissions] = await Promise.all([
    prisma.user.count({ where: { role: 'MEMBER', status: 'ATIVO' } }),
    prisma.journeySubmission
      .findMany({
        where: { completedAt: { not: null } },
        select: { userId: true },
        distinct: ['userId'],
      })
      .then((rows) => rows.length),
    prisma.journeySubmission.findMany({
      where: { completedAt: { not: null } },
      select: { overallScore: true, categoryScores: true },
    }),
  ]);

  const averageScore =
    submissions.length > 0
      ? Math.round(
          submissions.reduce((sum, s) => sum + (s.overallScore ?? 0), 0) / submissions.length,
        )
      : 0;

  const categoryTotals = new Map<string, { sum: number; count: number }>();
  for (const submission of submissions) {
    const scores = (submission.categoryScores ?? {}) as Record<string, number>;
    for (const [category, value] of Object.entries(scores)) {
      const current = categoryTotals.get(category) ?? { sum: 0, count: 0 };
      current.sum += value;
      current.count += 1;
      categoryTotals.set(category, current);
    }
  }

  const completionRate = activeMembers > 0 ? (completedMembers / activeMembers) * 100 : 0;

  return {
    activeMembers,
    completedMembers,
    completionRate,
    averageScore,
    totalSubmissions: submissions.length,
    categoryAverages: [...categoryTotals.entries()].map(([category, { sum, count }]) => ({
      category,
      average: Math.round(sum / count),
    })),
  };
}

export async function profileStats() {
  const [totalMembers, withProfile, active] = await Promise.all([
    prisma.user.count({ where: { role: 'MEMBER' } }),
    prisma.profile.count({ where: { user: { role: 'MEMBER' } } }),
    prisma.profile.count({ where: { isPublic: true, user: { role: 'MEMBER' } } }),
  ]);

  return {
    totalMembers,
    withProfile,
    active,
    pending: withProfile - active,
    activationRate: totalMembers > 0 ? (active / totalMembers) * 100 : 0,
  };
}

/** Conteudos mais vistos no periodo — alimenta a tabela do dashboard. */
export async function topContent(from: Date, to: Date, take = 8) {
  const grouped = await prisma.contentView.groupBy({
    by: ['contentId'],
    where: { viewedAt: { gte: from, lte: to } },
    _count: { _all: true },
    orderBy: { _count: { contentId: 'desc' } },
    take,
  });

  if (grouped.length === 0) return [];

  const contents = await prisma.content.findMany({
    where: { id: { in: grouped.map((g) => g.contentId) } },
    select: { id: true, title: true, type: true, slug: true },
  });
  const byId = new Map(contents.map((c) => [c.id, c]));

  return grouped.flatMap((row) => {
    const content = byId.get(row.contentId);
    return content ? [{ ...content, views: row._count._all }] : [];
  });
}
