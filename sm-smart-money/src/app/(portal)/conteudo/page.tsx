import type { Metadata } from 'next';
import { FileText } from 'lucide-react';
import { requireActiveMember } from '@/lib/auth/guards';
import { categoriesInUse, listContent, viewedIdsFor } from '@/server/content';
import { ContentCard } from '@/components/portal/content-card';
import { FilterBar } from '@/components/portal/filter-bar';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/portal/pagination';

export const metadata: Metadata = { title: 'Conteúdo Exclusivo' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 12;

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; q?: string; pagina?: string }>;
}) {
  const user = await requireActiveMember('/conteudo');
  const params = await searchParams;
  const page = Math.max(1, Number(params.pagina ?? '1') || 1);

  const [{ items, total }, categories] = await Promise.all([
    listContent({
      user,
      types: ['ARTIGO'],
      category: params.categoria,
      search: params.q,
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    categoriesInUse(['ARTIGO'], user),
  ]);

  const viewed = await viewedIdsFor(
    user.id,
    items.map((i) => i.id),
  );

  return (
    <div className="space-y-7">
      <SectionHeader
        eyebrow="Editorial"
        title="Conteúdo Exclusivo"
        description="Artigos e análises escritos pela curadoria SM Smart Money e por especialistas convidados."
      >
        <FilterBar
          basePath="/conteudo"
          searchParam="q"
          searchPlaceholder="Buscar por título ou resumo"
          groups={[
            {
              param: 'categoria',
              label: 'Categoria',
              value: params.categoria ?? '',
              options: [
                { value: '', label: 'Todas' },
                ...categories.map((c) => ({ value: c, label: c })),
              ],
            },
          ]}
        />
      </SectionHeader>

      {items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum artigo encontrado"
          description="Tente outra categoria ou limpe a busca."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <ContentCard
                key={item.id}
                item={{
                  ...item,
                  viewed: viewed.has(item.id),
                  meta: item.readingMinutes ? `${item.readingMinutes} min de leitura` : null,
                }}
                href={`/conteudo/${item.slug}`}
              />
            ))}
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} />
        </>
      )}
    </div>
  );
}
