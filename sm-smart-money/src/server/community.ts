import 'server-only';
import type { Prisma, TopicCategory } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { SessionUser } from '@/lib/auth/session';
import { canSeeVip } from '@/lib/auth/guards';

const topicSelect = {
  id: true,
  title: true,
  body: true,
  category: true,
  isVip: true,
  pinned: true,
  closed: true,
  createdAt: true,
  author: {
    select: {
      id: true,
      name: true,
      jobTitle: true,
      company: true,
      profile: { select: { slug: true, isPublic: true, avatarUrl: true } },
    },
  },
  _count: { select: { replies: true } },
} satisfies Prisma.TopicSelect;

export type TopicRow = Prisma.TopicGetPayload<{ select: typeof topicSelect }>;

export async function listTopics(params: {
  user: SessionUser;
  category?: TopicCategory;
  search?: string;
  take?: number;
}) {
  return prisma.topic.findMany({
    where: {
      ...(canSeeVip(params.user) ? {} : { isVip: false }),
      ...(params.category ? { category: params.category } : {}),
      ...(params.search
        ? {
            OR: [
              { title: { contains: params.search, mode: 'insensitive' } },
              { body: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    select: topicSelect,
    // Fixados primeiro, depois os mais recentes.
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    take: params.take ?? 30,
  });
}

export async function getTopic(id: string, user: SessionUser) {
  const topic = await prisma.topic.findUnique({
    where: { id },
    select: {
      ...topicSelect,
      replies: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          body: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              name: true,
              jobTitle: true,
              profile: { select: { slug: true, isPublic: true, avatarUrl: true } },
            },
          },
        },
      },
    },
  });

  if (!topic) return null;
  if (topic.isVip && !canSeeVip(user)) return null;
  return topic;
}

/**
 * Diretorio de membros. Lista apenas membros ativos; o link para o perfil publico
 * so aparece quando o proprio membro ativou o perfil.
 */
export async function listDirectory(params: { search?: string; specialty?: string; take?: number }) {
  return prisma.user.findMany({
    where: {
      role: 'MEMBER',
      status: 'ATIVO',
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { jobTitle: { contains: params.search, mode: 'insensitive' } },
              { company: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(params.specialty ? { profile: { specialties: { has: params.specialty } } } : {}),
    },
    select: {
      id: true,
      name: true,
      jobTitle: true,
      company: true,
      tier: true,
      isPartner: true,
      profile: {
        select: { slug: true, isPublic: true, avatarUrl: true, city: true, state: true, specialties: true },
      },
    },
    orderBy: { name: 'asc' },
    take: params.take ?? 100,
  });
}

/** Especialidades declaradas pelos membros, para alimentar o filtro. */
export async function specialtiesInUse(): Promise<string[]> {
  const rows = await prisma.profile.findMany({
    where: { user: { status: 'ATIVO' } },
    select: { specialties: true },
  });
  return [...new Set(rows.flatMap((r) => r.specialties))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
