import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock } from 'lucide-react';
import { requireActiveMember } from '@/lib/auth/guards';
import { getContentBySlug, recordView } from '@/server/content';
import { Badge } from '@/components/ui/badge';
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
  return { title: content?.title ?? 'Conteúdo' };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireActiveMember(`/conteudo/${slug}`);
  const content = await getContentBySlug(slug, user);
  if (!content || content.type !== 'ARTIGO') notFound();

  await recordView(user.id, content.id);

  return (
    <article className="mx-auto max-w-3xl space-y-7">
      <Link
        href="/conteudo"
        className="inline-flex items-center gap-1.5 text-sm text-text-2 transition-colors hover:text-text-1"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Conteúdo Exclusivo
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{content.category}</Badge>
          {content.visibility === 'VIP' ? <Badge tone="brand">VIP</Badge> : null}
        </div>
        <h1 className="font-display text-3xl leading-tight text-text-1 sm:text-4xl">
          {content.title}
        </h1>
        {content.excerpt ? (
          <p className="text-lg leading-relaxed text-text-2">{content.excerpt}</p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-line py-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-2">
            {content.authorName ? <span>{content.authorName}</span> : null}
            <span>{formatDate(content.publishedAt)}</span>
            {content.readingMinutes ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden="true" />
                {content.readingMinutes} min
              </span>
            ) : null}
          </div>
          <ShareButton path={`/conteudo/${content.slug}`} />
        </div>
      </header>

      {content.body ? (
        // O HTML vem do editor do painel admin, escrito por administradores
        // autenticados — nao e' entrada de usuario final.
        <div className="prose-sm-money" dangerouslySetInnerHTML={{ __html: content.body }} />
      ) : (
        <p className="text-sm text-text-2">Este conteúdo ainda não tem corpo publicado.</p>
      )}
    </article>
  );
}
