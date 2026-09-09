import Link from 'next/link';
import type { ContentType } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { CONTENT_TYPE_LABELS } from '@/lib/domain';
import { cn, formatDate } from '@/lib/utils';

export type ContentCardData = {
  slug: string;
  type: ContentType;
  title: string;
  excerpt?: string | null;
  category: string;
  coverUrl?: string | null;
  publishedAt?: Date | null;
  visibility: 'TODOS' | 'VIP';
  meta?: string | null;
  viewed?: boolean;
};

/**
 * Card padrao de conteudo, usado no dashboard e em todas as secoes editoriais.
 * O selo VIP e' texto, não so' cor — a restricao precisa ser legivel sem depender
 * de percepcao cromatica.
 */
export function ContentCard({
  item,
  href,
  className,
}: {
  item: ContentCardData;
  href: string;
  className?: string;
}) {
  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-card transition-shadow hover:shadow-pop',
        className,
      )}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-sunken">
        {item.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- capas vem de storage externo variavel
          <img
            src={item.coverUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid size-full place-items-center bg-gradient-to-br from-brand-soft to-surface-sunken">
            <span className="font-display text-3xl text-brand-strong/50">SM</span>
          </div>
        )}
        {item.visibility === 'VIP' ? (
          <Badge tone="brand" className="absolute left-3 top-3 bg-surface/95">
            VIP
          </Badge>
        ) : null}
        {item.viewed ? (
          <Badge tone="neutral" className="absolute right-3 top-3 bg-surface/95">
            Visto
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-brand-strong">
          <span>{item.category}</span>
          <span aria-hidden="true" className="text-text-3">
            ·
          </span>
          <span className="text-text-3">{CONTENT_TYPE_LABELS[item.type]}</span>
        </div>

        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-text-1">
          {/* O link cobre o card inteiro sem aninhar interativos. */}
          <Link href={href} className="after:absolute after:inset-0">
            {item.title}
          </Link>
        </h3>

        {item.excerpt ? (
          <p className="line-clamp-2 text-sm text-text-2">{item.excerpt}</p>
        ) : null}

        <div className="mt-auto flex items-center gap-2 pt-2 text-xs text-text-3">
          <span>{formatDate(item.publishedAt)}</span>
          {item.meta ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{item.meta}</span>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}
