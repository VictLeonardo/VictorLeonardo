import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { SessionUser } from '@/lib/auth/session';
import { canSeeVip } from '@/lib/auth/guards';
import { env } from '@/lib/env';
import { appHost } from '@/lib/utils';

export function lectureFilter(user: SessionUser | null): Prisma.LectureWhereInput {
  return {
    status: 'PUBLICADO',
    ...(canSeeVip(user) ? {} : { visibility: 'TODOS' }),
  };
}

const lectureInclude = {
  speaker: { select: { id: true, name: true, jobTitle: true, bio: true, avatarUrl: true } },
} satisfies Prisma.LectureInclude;

export type LectureRow = Prisma.LectureGetPayload<{ include: typeof lectureInclude }>;

export async function getNextLecture(user: SessionUser | null) {
  return prisma.lecture.findFirst({
    where: { ...lectureFilter(user), startsAt: { gte: new Date() } },
    include: lectureInclude,
    orderBy: { startsAt: 'asc' },
  });
}

export async function listLectures(user: SessionUser | null, scope: 'proximas' | 'realizadas' | 'todas', theme?: string) {
  const now = new Date();
  return prisma.lecture.findMany({
    where: {
      ...lectureFilter(user),
      ...(scope === 'proximas' ? { startsAt: { gte: now } } : {}),
      ...(scope === 'realizadas' ? { startsAt: { lt: now } } : {}),
      ...(theme ? { theme } : {}),
    },
    include: lectureInclude,
    orderBy: { startsAt: scope === 'realizadas' ? 'desc' : 'asc' },
  });
}

export async function getLectureBySlug(slug: string, user: SessionUser | null) {
  const lecture = await prisma.lecture.findUnique({ where: { slug }, include: lectureInclude });
  if (!lecture) return null;
  if (lecture.status !== 'PUBLICADO' && user?.role !== 'ADMIN') return null;
  if (lecture.visibility === 'VIP' && !canSeeVip(user)) return null;
  return lecture;
}

export async function lectureThemes(user: SessionUser | null) {
  const rows = await prisma.lecture.findMany({
    where: lectureFilter(user),
    select: { theme: true },
    distinct: ['theme'],
    orderBy: { theme: 'asc' },
  });
  return rows.map((r) => r.theme);
}

/**
 * Arquivo .ics para "adicionar ao calendário". Gerado no servidor para nao
 * depender de biblioteca no cliente.
 */
export function buildIcs(lecture: {
  title: string;
  description: string | null;
  startsAt: Date;
  durationMin: number;
  liveUrl: string | null;
  slug: string;
}): string {
  const stamp = (date: Date) => date.toISOString().replace(/[-:]|\.\d{3}/g, '');
  const end = new Date(lecture.startsAt.getTime() + lecture.durationMin * 60_000);
  const escape = (value: string) => value.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SM Smart Money//Palestras//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${lecture.slug}@${appHost(env.NEXT_PUBLIC_APP_URL)}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(lecture.startsAt)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(lecture.title)}`,
    `DESCRIPTION:${escape(lecture.description ?? 'Palestra da comunidade SM Smart Money')}`,
    ...(lecture.liveUrl ? [`URL:${lecture.liveUrl}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
