import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Download } from 'lucide-react';
import { requireActiveMember } from '@/lib/auth/guards';
import { getContentBySlug, recordView } from '@/server/content';
import { prisma } from '@/lib/prisma';
import { PdfViewer } from '@/components/portal/media-player';
import { WatchedToggle } from '@/components/portal/watched-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const user = await requireActiveMember();
  const content = await getContentBySlug(slug, user);
  return { title: content?.title ?? 'E-book' };
}

export default async function EbookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireActiveMember(`/ebooks/${slug}`);
  const content = await getContentBySlug(slug, user);
  if (!content || content.type !== 'EBOOK') notFound();

  await recordView(user.id, content.id);
  const view = await prisma.contentView.findUnique({
    where: { userId_contentId: { userId: user.id, contentId: content.id } },
    select: { completed: true },
  });

  return (
    <article className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/ebooks"
        className="inline-flex items-center gap-1.5 text-sm text-text-2 transition-colors hover:text-text-1"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        E-books
      </Link>

      <header className="grid gap-5 sm:grid-cols-[160px_1fr]">
        <div className="aspect-[3/4] overflow-hidden rounded-lg border border-line bg-surface-sunken">
          {content.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- capa vem de storage externo
            <img src={content.coverUrl} alt="" className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center bg-gradient-to-br from-brand-soft to-surface-sunken p-3 text-center">
              <span className="font-display text-base leading-tight text-brand-strong/70">
                {content.title}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{content.category}</Badge>
            {content.visibility === 'VIP' ? <Badge tone="brand">VIP</Badge> : null}
          </div>
          <h1 className="font-display text-3xl leading-tight text-text-1">{content.title}</h1>
          <p className="text-sm text-text-2">
            {content.authorName ?? 'SM Smart Money'}
            {content.pageCount ? ` · ${content.pageCount} páginas` : ''}
          </p>
          {content.excerpt ? <p className="text-text-2">{content.excerpt}</p> : null}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {content.fileUrl ? (
              <Button asChild>
                <a href={content.fileUrl} download target="_blank" rel="noreferrer">
                  <Download className="size-4" aria-hidden="true" />
                  Baixar PDF completo
                </a>
              </Button>
            ) : null}
            <WatchedToggle
              contentId={content.id}
              initial={view?.completed ?? false}
              labels={{ on: 'Lido', off: 'Marcar como lido' }}
            />
          </div>
        </div>
      </header>

      {content.fileUrl ? (
        <section aria-labelledby="preview" className="space-y-2">
          <h2 id="preview" className="text-sm font-semibold text-text-1">
            Prévia
          </h2>
          <PdfViewer url={content.fileUrl} title={content.title} height="h-[60vh]" />
        </section>
      ) : (
        <p className="text-sm text-text-2">Arquivo ainda não disponibilizado.</p>
      )}
    </article>
  );
}
