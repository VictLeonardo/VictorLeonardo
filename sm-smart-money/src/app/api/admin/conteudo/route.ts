import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth/session';
import { recordAudit } from '@/lib/audit';
import { readingMinutes, slugify } from '@/lib/utils';

export const contentSchema = z.object({
  type: z.enum(['ARTIGO', 'VIDEO', 'PODCAST', 'ANALISE', 'EBOOK']),
  title: z.string().trim().min(4, 'Título muito curto').max(200),
  slug: z.string().trim().max(120).optional().or(z.literal('')),
  excerpt: z.string().trim().max(400).optional().or(z.literal('')),
  body: z.string().optional().or(z.literal('')),
  coverUrl: z.string().trim().url().optional().or(z.literal('')),
  category: z.string().trim().min(2, 'Escolha uma categoria').max(60),
  status: z.enum(['RASCUNHO', 'PUBLICADO', 'ARQUIVADO']),
  visibility: z.enum(['TODOS', 'VIP']),
  publishedAt: z.string().optional().or(z.literal('')),
  scheduledFor: z.string().optional().or(z.literal('')),
  authorName: z.string().trim().max(120).optional().or(z.literal('')),
  mediaUrl: z.string().trim().url().optional().or(z.literal('')),
  durationSecs: z.coerce.number().int().min(0).optional(),
  transcript: z.string().optional().or(z.literal('')),
  fileUrl: z.string().trim().url().optional().or(z.literal('')),
  pageCount: z.coerce.number().int().min(0).optional(),
  seriesName: z.string().trim().max(120).optional().or(z.literal('')),
  episodeNumber: z.coerce.number().int().min(0).optional(),
});

const nn = (v: string | undefined) => (v && v.length > 0 ? v : null);

/** Garante slug unico dentro de Content. */
export async function uniqueContentSlug(title: string, custom?: string, ignoreId?: string) {
  const base = slugify(custom || title) || 'conteudo';
  let candidate = base;
  let suffix = 1;

  for (;;) {
    const existing = await prisma.content.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === ignoreId) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

export function contentDataFrom(data: z.infer<typeof contentSchema>, slug: string, authorId: string) {
  const scheduled = nn(data.scheduledFor);

  // Agendar significa publicar no futuro: o status vira PUBLICADO, mas a data de
  // publicacao a frente mantem o conteudo invisivel no portal ate a hora certa.
  const publishedAt =
    data.status === 'PUBLICADO'
      ? scheduled
        ? new Date(scheduled)
        : data.publishedAt
          ? new Date(data.publishedAt)
          : new Date()
      : null;

  return {
    type: data.type,
    slug,
    title: data.title,
    excerpt: nn(data.excerpt),
    body: nn(data.body),
    coverUrl: nn(data.coverUrl),
    category: data.category,
    status: data.status,
    visibility: data.visibility,
    publishedAt,
    scheduledFor: scheduled ? new Date(scheduled) : null,
    authorName: nn(data.authorName),
    authorId,
    readingMinutes: data.type === 'ARTIGO' && data.body ? readingMinutes(data.body) : null,
    mediaUrl: nn(data.mediaUrl),
    durationSecs: data.durationSecs || null,
    transcript: nn(data.transcript),
    fileUrl: nn(data.fileUrl),
    pageCount: data.pageCount || null,
    seriesName: nn(data.seriesName),
    episodeNumber: data.episodeNumber || null,
  };
}

export async function POST(request: Request) {
  const admin = await getSessionUser();
  if (admin?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
  }

  const parsed = contentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const slug = await uniqueContentSlug(parsed.data.title, parsed.data.slug);
  const content = await prisma.content.create({
    data: contentDataFrom(parsed.data, slug, admin.id),
    select: { id: true, slug: true, status: true },
  });

  await recordAudit({
    actor: admin,
    action: parsed.data.status === 'PUBLICADO' ? 'conteudo.publicar' : 'conteudo.criar',
    entity: 'content',
    entityId: content.id,
    metadata: { title: parsed.data.title, type: parsed.data.type, status: content.status },
  });

  return NextResponse.json({ ok: true, id: content.id, slug: content.slug });
}
