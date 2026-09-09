import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireActiveMember } from '@/lib/auth/guards';
import { getContentBySlug, recordView } from '@/server/content';
import { prisma } from '@/lib/prisma';
import { AudioPlayer, VideoPlayer } from '@/components/portal/media-player';
import { Badge } from '@/components/ui/badge';
import { ShareButton } from '@/components/portal/share-button';
import { WatchedToggle } from '@/components/portal/watched-toggle';
import { formatDate, formatDuration } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const user = await requireActiveMember();
  const content = await getContentBySlug(slug, user);
  return { title: content?.title ?? 'Mídia' };
}

export default async function MediaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireActiveMember(`/midia/${slug}`);
  const content = await getContentBySlug(slug, user);
  if (!content || (content.type !== 'VIDEO' && content.type !== 'PODCAST')) notFound();

  await recordView(user.id, content.id);

  const view = await prisma.contentView.findUnique({
    where: { userId_contentId: { userId: user.id, contentId: content.id } },
    select: { completed: true },
  });

  // Episodios da mesma serie viram a playlist do podcast.
  const playlist =
    content.type === 'PODCAST' && content.seriesName
      ? await prisma.content.findMany({
          where: {
            type: 'PODCAST',
            status: 'PUBLICADO',
            seriesName: content.seriesName,
            NOT: { id: content.id },
          },
          select: { id: true, slug: true, title: true, episodeNumber: true, durationSecs: true },
          orderBy: { episodeNumber: 'asc' },
          take: 20,
        })
      : [];

  return (
    <article className="mx-auto max-w-4xl space-y-6">
      <Link
        href={content.type === 'PODCAST' ? '/midia?tipo=podcasts' : '/midia'}
        className="inline-flex items-center gap-1.5 text-sm text-text-2 transition-colors hover:text-text-1"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {content.type === 'PODCAST' ? 'Podcasts' : 'Vídeos'}
      </Link>

      {content.mediaUrl ? (
        content.type === 'VIDEO' ? (
          <VideoPlayer url={content.mediaUrl} title={content.title} poster={content.coverUrl} />
        ) : (
          <AudioPlayer url={content.mediaUrl} title={content.title} />
        )
      ) : (
        <div className="rounded-lg border border-dashed border-line-strong bg-surface-sunken p-8 text-center text-sm text-text-2">
          Mídia ainda não disponibilizada.
        </div>
      )}

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{content.category}</Badge>
          {content.visibility === 'VIP' ? <Badge tone="brand">VIP</Badge> : null}
          {content.seriesName ? (
            <Badge tone="info">
              {content.seriesName}
              {content.episodeNumber ? ` · ep. ${content.episodeNumber}` : ''}
            </Badge>
          ) : null}
        </div>
        <h1 className="font-display text-3xl leading-tight text-text-1">{content.title}</h1>
        {content.excerpt ? <p className="text-text-2">{content.excerpt}</p> : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-line py-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-2">
            <span>{formatDate(content.publishedAt)}</span>
            {content.durationSecs ? <span>{formatDuration(content.durationSecs)}</span> : null}
          </div>
          <div className="flex items-center gap-2">
            <WatchedToggle contentId={content.id} initial={view?.completed ?? false} />
            <ShareButton path={`/midia/${content.slug}`} />
          </div>
        </div>
      </header>

      {playlist.length > 0 ? (
        <section aria-labelledby="playlist" className="rounded-lg border border-line bg-surface p-5">
          <h2 id="playlist" className="text-sm font-semibold text-text-1">
            Mais episodios de {content.seriesName}
          </h2>
          <ul className="mt-3 divide-y divide-[var(--color-line)]">
            {playlist.map((episode) => (
              <li key={episode.id}>
                <Link
                  href={`/midia/${episode.slug}`}
                  className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:text-brand-strong"
                >
                  <span className="min-w-0 text-sm text-text-1">
                    {episode.episodeNumber ? (
                      <span className="mr-2 tabular-nums text-text-3">
                        {String(episode.episodeNumber).padStart(2, '0')}
                      </span>
                    ) : null}
                    {episode.title}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-text-3">
                    {formatDuration(episode.durationSecs)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {content.transcript ? (
        <details className="rounded-lg border border-line bg-surface p-5">
          <summary className="cursor-pointer text-sm font-semibold text-text-1">
            Transcrição
          </summary>
          <div className="prose-sm-money mt-3 text-sm">{content.transcript}</div>
        </details>
      ) : null}
    </article>
  );
}
