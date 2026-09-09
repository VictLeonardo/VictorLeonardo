import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { requireActiveMember } from '@/lib/auth/guards';
import { categoriesInUse, listContent, viewedIdsFor } from '@/server/content';
import { FilterBar } from '@/components/portal/filter-bar';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = { title: 'E-books' };
export const dynamic = 'force-dynamic';

export default async function EbooksPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; q?: string }>;
}) {
  const user = await requireActiveMember('/ebooks');
  const params = await searchParams;

  const [{ items }, categories] = await Promise.all([
    listContent({ user, types: ['EBOOK'], category: params.categoria, search: params.q, take: 48 }),
    categoriesInUse(['EBOOK'], user),
  ]);

  const read = await viewedIdsFor(
    user.id,
    items.map((i) => i.id),
  );

  return (
    <div className="space-y-7">
      <SectionHeader
        eyebrow="Biblioteca"
        title="E-books"
        description="Guias completos sobre planejamento, tributação, proteção patrimonial e sucessão."
      >
        <FilterBar
          basePath="/ebooks"
          searchParam="q"
          searchPlaceholder="Buscar e-book"
          groups={[
            {
              param: 'categoria',
              label: 'Tema',
              value: params.categoria ?? '',
              options: [
                { value: '', label: 'Todos' },
                ...categories.map((c) => ({ value: c, label: c })),
              ],
            },
          ]}
        />
      </SectionHeader>

      {items.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nenhum e-book encontrado"
          description="Ajuste os filtros para ver outros títulos."
        />
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <li key={item.id}>
              <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-card transition-shadow hover:shadow-pop">
                <div className="relative aspect-[3/4] bg-surface-sunken">
                  {item.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- capa vem de storage externo
                    <img
                      src={item.coverUrl}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="grid size-full place-items-center bg-gradient-to-br from-brand-soft to-surface-sunken p-4 text-center">
                      <span className="font-display text-lg leading-tight text-brand-strong/70">
                        {item.title}
                      </span>
                    </div>
                  )}
                  {item.visibility === 'VIP' ? (
                    <Badge tone="brand" className="absolute left-2 top-2 bg-surface/95">
                      VIP
                    </Badge>
                  ) : null}
                  {read.has(item.id) ? (
                    <Badge tone="neutral" className="absolute right-2 top-2 bg-surface/95">
                      Lido
                    </Badge>
                  ) : null}
                </div>

                <div className="flex flex-1 flex-col gap-1 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-brand-strong">
                    {item.category}
                  </p>
                  <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-text-1">
                    <Link href={`/ebooks/${item.slug}`} className="after:absolute after:inset-0">
                      {item.title}
                    </Link>
                  </h2>
                  <p className="mt-auto pt-2 text-xs text-text-3">
                    {item.authorName ?? 'SM Smart Money'}
                    {item.pageCount ? ` · ${item.pageCount} pag.` : ''}
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
