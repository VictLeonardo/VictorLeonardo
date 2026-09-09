import 'server-only';
import type { MemberStatus, Plan, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * Listagem de membros do admin com filtros completos e paginacao no servidor (G05).
 * A plataforma atual carrega todos os registros de uma vez e so' aceita busca
 * textual; aqui cada filtro vira condicao SQL e a pagina traz 25 linhas.
 */

export const PAGE_SIZE = 25;

export type MemberFilters = {
  search?: string;
  plan?: Plan;
  status?: MemberStatus;
  profile?: 'ativo' | 'privado' | 'sem';
  from?: string;
  to?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
  page?: number;
};

const SORTABLE = ['name', 'email', 'plan', 'status', 'joinedAt', 'lastLoginAt'] as const;
type SortField = (typeof SORTABLE)[number];

export function buildMemberWhere(filters: MemberFilters): Prisma.UserWhereInput {
  const joinedAt: Prisma.DateTimeFilter = {};
  if (filters.from) joinedAt.gte = new Date(filters.from);
  if (filters.to) {
    // O filtro "ate" e' inclusivo: soma um dia para pegar o dia inteiro.
    const to = new Date(filters.to);
    to.setDate(to.getDate() + 1);
    joinedAt.lt = to;
  }

  // A busca por telefone so entra quando o termo tem digitos: `contains: ''`
  // casaria com todo mundo e anularia o filtro.
  const digits = filters.search?.replace(/\D/g, '') ?? '';

  return {
    role: 'MEMBER',
    ...(filters.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' as const } },
            { email: { contains: filters.search, mode: 'insensitive' as const } },
            ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
          ],
        }
      : {}),
    ...(filters.plan ? { plan: filters.plan } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(Object.keys(joinedAt).length > 0 ? { joinedAt } : {}),
    ...(filters.profile === 'ativo' ? { profile: { isPublic: true } } : {}),
    ...(filters.profile === 'privado' ? { profile: { isPublic: false } } : {}),
    ...(filters.profile === 'sem' ? { profile: { is: null } } : {}),
  };
}

export const memberRowSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  jobTitle: true,
  company: true,
  plan: true,
  status: true,
  tier: true,
  isPartner: true,
  joinedAt: true,
  lastLoginAt: true,
  profile: { select: { slug: true, isPublic: true, avatarUrl: true } },
} satisfies Prisma.UserSelect;

export type MemberRow = Prisma.UserGetPayload<{ select: typeof memberRowSelect }>;

export async function listMembers(filters: MemberFilters) {
  const where = buildMemberWhere(filters);
  const page = Math.max(1, filters.page ?? 1);
  const sort: SortField = SORTABLE.includes(filters.sort as SortField)
    ? (filters.sort as SortField)
    : 'joinedAt';
  const direction = filters.direction === 'asc' ? 'asc' : 'desc';

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: memberRowSelect,
      orderBy: { [sort]: direction },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total, page, pageSize: PAGE_SIZE, sort, direction: direction as 'asc' | 'desc' };
}

/** Mesma consulta sem paginacao — usada pela exportacao CSV. */
export async function exportMembers(filters: MemberFilters) {
  return prisma.user.findMany({
    where: buildMemberWhere(filters),
    select: memberRowSelect,
    orderBy: { name: 'asc' },
  });
}

export async function getMemberDetail(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      ...memberRowSelect,
      createdAt: true,
      canceledAt: true,
      profile: true,
      journeySubmissions: {
        where: { completedAt: { not: null } },
        orderBy: { completedAt: 'desc' },
        take: 3,
        select: { id: true, completedAt: true, overallScore: true, categoryScores: true },
      },
      emailLogs: {
        orderBy: { sentAt: 'desc' },
        take: 15,
        select: { id: true, subject: true, template: true, status: true, sentAt: true, error: true },
      },
      whatsappLogs: {
        orderBy: { sentAt: 'desc' },
        take: 10,
        select: { id: true, kind: true, message: true, status: true, sentAt: true },
      },
    },
  });
}

/** Secoes mais acessadas e ultimos conteudos vistos por um membro. */
export async function memberActivity(userId: string) {
  const [sections, recentViews, viewCount] = await Promise.all([
    prisma.activityLog.groupBy({
      by: ['section'],
      where: { userId },
      _count: { _all: true },
      orderBy: { _count: { section: 'desc' } },
      take: 6,
    }),
    prisma.contentView.findMany({
      where: { userId },
      orderBy: { viewedAt: 'desc' },
      take: 10,
      select: {
        viewedAt: true,
        completed: true,
        content: { select: { title: true, type: true, slug: true } },
      },
    }),
    prisma.contentView.count({ where: { userId } }),
  ]);

  return {
    sections: sections.map((s) => ({ label: s.section, value: s._count._all })),
    recentViews,
    viewCount,
  };
}

export function membersToCsv(rows: MemberRow[]): string {
  const header = [
    'Nome',
    'E-mail',
    'WhatsApp',
    'Cargo',
    'Empresa',
    'Plano',
    'Status',
    'Tier',
    'Data de entrada',
    'Último login',
    'Perfil público',
  ];

  // Escapa aspas duplicando-as, conforme RFC 4180.
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

  const lines = rows.map((row) =>
    [
      row.name,
      row.email,
      row.phone ?? '',
      row.jobTitle ?? '',
      row.company ?? '',
      row.plan,
      row.status,
      row.tier,
      row.joinedAt.toISOString().slice(0, 10),
      row.lastLoginAt ? row.lastLoginAt.toISOString().slice(0, 10) : '',
      row.profile ? (row.profile.isPublic ? 'Ativo' : 'Privado') : 'Sem perfil',
    ]
      .map(escape)
      .join(','),
  );

  // BOM para o Excel abrir acentos corretamente.
  return `﻿${[header.map(escape).join(','), ...lines].join('\r\n')}`;
}
