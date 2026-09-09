import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Download } from 'lucide-react';
import { requireActiveMember } from '@/lib/auth/guards';
import { getContentBySlug, recordView } from '@/server/content';
import { PdfViewer } from '@/components/portal/media-player';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShareButton } from '@/components/portal/share-button';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const user = await requireActiveMember();
  const content = await getContentBySlug(slug, user);
  return { title: content?.title ?? 'Análise' };
}

export default async function AnalysisDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireActiveMember(`/analises/${slug}`);
  const content = await getContentBySlug(slug, user);
  if (!content || content.type !== 'ANALISE') notFound();

  await recordView(user.id, content.id);

  return (
    <article className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/analises"
        className="inline-flex items-center gap-1.5 text-sm text-text-2 transition-colors hover:text-text-1"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Análises de Mercado
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{content.category}</Badge>
          {content.visibility === 'VIP' ? <Badge tone="brand">VIP</Badge> : null}
        </div>
        <h1 className="font-display text-3xl leading-tight text-text-1">{content.title}</h1>
        {content.excerpt ? <p className="text-text-2">{content.excerpt}</p> : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-line py-3">
          <p className="text-sm text-text-2">
            {content.authorName ? `${content.authorName} · ` : ''}
            {formatDate(content.publishedAt)}
          </p>
          <div className="flex items-center gap-2">
            {content.fileUrl ? (
              <Button asChild variant="secondary" size="sm">
                <a href={content.fileUrl} download target="_blank" rel="noreferrer">
                  <Download className="size-4" aria-hidden="true" />
                  Baixar PDF
                </a>
              </Button>
            ) : null}
            <ShareButton path={`/analises/${content.slug}`} />
          </div>
        </div>
      </header>

      {content.fileUrl ? (
        <PdfViewer url={content.fileUrl} title={content.title} />
      ) : content.body ? (
        // HTML produzido pelo editor do painel admin.
        <div className="prose-sm-money" dangerouslySetInnerHTML={{ __html: content.body }} />
      ) : (
        <p className="text-sm text-text-2">Relatório ainda não disponibilizado.</p>
      )}
    </article>
  );
}
