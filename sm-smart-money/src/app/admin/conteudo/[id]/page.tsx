import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/guards';
import { prisma } from '@/lib/prisma';
import { SectionHeader } from '@/components/ui/section-header';
import { ContentForm } from '@/components/admin/content-form';
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_PATH } from '@/lib/domain';
import { toLocalInput } from '@/lib/datetime';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const content = await prisma.content.findUnique({ where: { id }, select: { title: true } });
  return { title: content?.title ?? 'Conteúdo' };
}

export default async function EditContentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const content = await prisma.content.findUnique({ where: { id } });
  if (!content) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/conteudo"
        className="inline-flex items-center gap-1.5 text-sm text-text-2 transition-colors hover:text-text-1"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Conteúdo
      </Link>

      <SectionHeader
        eyebrow={CONTENT_TYPE_LABELS[content.type]}
        title={content.title}
        actions={
          content.status === 'PUBLICADO' ? (
            <Link
              href={`${CONTENT_TYPE_PATH[content.type]}/${content.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-3 py-2 text-sm text-text-1 transition-colors hover:bg-surface-sunken"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              Ver no portal
            </Link>
          ) : undefined
        }
      />

      <ContentForm
        initial={{
          id: content.id,
          type: content.type,
          title: content.title,
          slug: content.slug,
          excerpt: content.excerpt ?? '',
          body: content.body ?? '',
          coverUrl: content.coverUrl ?? '',
          category: content.category,
          status: content.status,
          visibility: content.visibility,
          scheduledFor: toLocalInput(content.scheduledFor),
          authorName: content.authorName ?? '',
          mediaUrl: content.mediaUrl ?? '',
          durationSecs: content.durationSecs ? String(content.durationSecs) : '',
          transcript: content.transcript ?? '',
          fileUrl: content.fileUrl ?? '',
          pageCount: content.pageCount ? String(content.pageCount) : '',
          seriesName: content.seriesName ?? '',
          episodeNumber: content.episodeNumber ? String(content.episodeNumber) : '',
        }}
      />
    </div>
  );
}
