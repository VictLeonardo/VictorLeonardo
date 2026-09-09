import 'server-only';
import type { ContentType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { SessionUser } from '@/lib/auth/session';
import { canSeeVip } from '@/lib/auth/guards';

/**
 * Filtro base de leitura do portal. Publicado, com data de publicacao ja' passada
 * (agendamentos futuros ficam invisiveis) e respeitando o tier do membro.
 */
export function publishedFilter(user: SessionUser | null): Prisma.ContentWhereInput {
  return {
    status: 'PUBLICADO',
    publishedAt: { lte: new Date() },
    ...(canSeeVip(user) ? {} : { visibility: 'TODOS' }),
  };
}

export const contentCardSelect = {
  id: true,
  slug: true,
  type: true,
  title: true,
  excerpt: true,
  category: true,
  coverUrl: true,
  publishedAt: true,
  visibility: true,
  readingMinutes: true,
  durationSecs: true,
  pageCount: true,
  authorName: true,
} satisfies Prisma.ContentSelect;

export type ContentCardRow = Prisma.ContentGetPayload<{ select: typeof contentCardSelect }>;

export async function listContent(params: {
  user: SessionUser | null;
  types: ContentType[];
  category?: string;
  search?: string;
  take?: number;
  skip?: number;
}) {
  const where: Prisma.ContentWhereInput = {
    ...publishedFilter(params.user),
    type: { in: params.types },
    ...(params.category ? { category: params.category } : {}),
    ...(params.search
      ? {
          OR: [
            { title: { contains: params.search, mode: 'insensitive' } },
            { excerpt: { contains: params.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.content.findMany({
      where,
      select: contentCardSelect,
      orderBy: { publishedAt: 'desc' },
      take: params.take ?? 24,
      skip: params.skip ?? 0,
    }),
    prisma.content.count({ where }),
  ]);

  return { items, total };
}

export async function getContentBySlug(slug: string, user: SessionUser | null) {
  const content = await prisma.content.findUnique({ where: { slug } });
  if (!content) return null;

  const isPublished = content.status === 'PUBLICADO' && content.publishedAt && content.publishedAt <= new Date();
  // Admin enxerga rascunho e agendado para conferir antes de publicar.
  if (!isPublished && user?.role !== 'ADMIN') return null;
  if (content.visibility === 'VIP' && !canSeeVip(user)) return null;

  return content;
}

/** Marca a visualizacao. Idempotente: reabrir nao infla a metrica de views. */
export async function recordView(userId: string, contentId: string) {
  await prisma.contentView.upsert({
    where: { userId_contentId: { userId, contentId } },
    create: { userId, contentId },
    update: { viewedAt: new Date() },
  });
}

export async function markCompleted(userId: string, contentId: string, completed: boolean) {
  await prisma.contentView.upsert({
    where: { userId_contentId: { userId, contentId } },
    create: { userId, contentId, completed },
    update: { completed },
  });
}

export async function viewedIdsFor(userId: string, contentIds: string[]): Promise<Set<string>> {
  if (contentIds.length === 0) return new Set();
  const rows = await prisma.contentView.findMany({
    where: { userId, contentId: { in: contentIds } },
    select: { contentId: true },
  });
  return new Set(rows.map((r) => r.contentId));
}

/** Categorias realmente em uso — evita filtro apontando para secao vazia. */
export async function categoriesInUse(types: ContentType[], user: SessionUser | null) {
  const rows = await prisma.content.findMany({
    where: { ...publishedFilter(user), type: { in: types } },
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  });
  return rows.map((r) => r.category);
}
