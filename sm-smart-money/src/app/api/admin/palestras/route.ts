import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth/session';
import { recordAudit } from '@/lib/audit';
import { slugify } from '@/lib/utils';

export const lectureSchema = z.object({
  title: z.string().trim().min(4, 'Título muito curto').max(200),
  slug: z.string().trim().max(120).optional().or(z.literal('')),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  coverUrl: z.string().trim().url().optional().or(z.literal('')),
  theme: z.string().trim().min(2, 'Informe o tema').max(60),
  startsAt: z.string().min(4, 'Informe data e hora'),
  durationMin: z.coerce.number().int().min(5).max(600),
  liveUrl: z.string().trim().url().optional().or(z.literal('')),
  recordingUrl: z.string().trim().url().optional().or(z.literal('')),
  status: z.enum(['RASCUNHO', 'PUBLICADO', 'ARQUIVADO']),
  visibility: z.enum(['TODOS', 'VIP']),
  speakerName: z.string().trim().max(120).optional().or(z.literal('')),
  speakerJobTitle: z.string().trim().max(120).optional().or(z.literal('')),
  speakerBio: z.string().trim().max(1000).optional().or(z.literal('')),
  speakerAvatarUrl: z.string().trim().url().optional().or(z.literal('')),
});

const nn = (v: string | undefined) => (v && v.length > 0 ? v : null);

export async function uniqueLectureSlug(title: string, custom?: string, ignoreId?: string) {
  const base = slugify(custom || title) || 'palestra';
  let candidate = base;
  let suffix = 1;

  for (;;) {
    const existing = await prisma.lecture.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === ignoreId) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

/**
 * O speaker e' reaproveitado quando ja' existe alguem com o mesmo nome — evita
 * duplicar a ficha do palestrante a cada nova sessao dele.
 */
export async function resolveSpeaker(data: z.infer<typeof lectureSchema>) {
  if (!data.speakerName) return null;

  const existing = await prisma.speaker.findFirst({
    where: { name: data.speakerName },
    select: { id: true },
  });

  if (existing) {
    await prisma.speaker.update({
      where: { id: existing.id },
      data: {
        jobTitle: nn(data.speakerJobTitle),
        bio: nn(data.speakerBio),
        avatarUrl: nn(data.speakerAvatarUrl),
      },
    });
    return existing.id;
  }

  const created = await prisma.speaker.create({
    data: {
      name: data.speakerName,
      jobTitle: nn(data.speakerJobTitle),
      bio: nn(data.speakerBio),
      avatarUrl: nn(data.speakerAvatarUrl),
    },
    select: { id: true },
  });
  return created.id;
}

export function lectureDataFrom(data: z.infer<typeof lectureSchema>, slug: string, speakerId: string | null) {
  return {
    slug,
    title: data.title,
    description: nn(data.description),
    coverUrl: nn(data.coverUrl),
    theme: data.theme,
    startsAt: new Date(data.startsAt),
    durationMin: data.durationMin,
    liveUrl: nn(data.liveUrl),
    recordingUrl: nn(data.recordingUrl),
    status: data.status,
    visibility: data.visibility,
    speakerId,
  };
}

export async function POST(request: Request) {
  const admin = await getSessionUser();
  if (admin?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
  }

  const parsed = lectureSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const slug = await uniqueLectureSlug(parsed.data.title, parsed.data.slug);
  const speakerId = await resolveSpeaker(parsed.data);
  const lecture = await prisma.lecture.create({
    data: lectureDataFrom(parsed.data, slug, speakerId),
    select: { id: true },
  });

  await recordAudit({
    actor: admin,
    action: 'palestra.criar',
    entity: 'lecture',
    entityId: lecture.id,
    metadata: { title: parsed.data.title, startsAt: parsed.data.startsAt },
  });

  return NextResponse.json({ ok: true, id: lecture.id });
}
