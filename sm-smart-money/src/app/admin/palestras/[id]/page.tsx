import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/guards';
import { prisma } from '@/lib/prisma';
import { SectionHeader } from '@/components/ui/section-header';
import { LectureForm } from '@/components/admin/lecture-form';
import { toLocalInput } from '@/lib/datetime';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const lecture = await prisma.lecture.findUnique({ where: { id }, select: { title: true } });
  return { title: lecture?.title ?? 'Palestra' };
}

export default async function EditLecturePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const lecture = await prisma.lecture.findUnique({ where: { id }, include: { speaker: true } });
  if (!lecture) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/palestras"
        className="inline-flex items-center gap-1.5 text-sm text-text-2 transition-colors hover:text-text-1"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Palestras
      </Link>

      <SectionHeader
        eyebrow="Agenda"
        title={lecture.title}
        actions={
          lecture.status === 'PUBLICADO' ? (
            <Link
              href={`/palestras/${lecture.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-3 py-2 text-sm text-text-1 transition-colors hover:bg-surface-sunken"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              Ver no portal
            </Link>
          ) : undefined
        }
      />

      <LectureForm
        initial={{
          id: lecture.id,
          title: lecture.title,
          slug: lecture.slug,
          description: lecture.description ?? '',
          coverUrl: lecture.coverUrl ?? '',
          theme: lecture.theme,
          startsAt: toLocalInput(lecture.startsAt),
          durationMin: String(lecture.durationMin),
          liveUrl: lecture.liveUrl ?? '',
          recordingUrl: lecture.recordingUrl ?? '',
          status: lecture.status,
          visibility: lecture.visibility,
          speakerName: lecture.speaker?.name ?? '',
          speakerJobTitle: lecture.speaker?.jobTitle ?? '',
          speakerBio: lecture.speaker?.bio ?? '',
          speakerAvatarUrl: lecture.speaker?.avatarUrl ?? '',
        }}
      />
    </div>
  );
}
