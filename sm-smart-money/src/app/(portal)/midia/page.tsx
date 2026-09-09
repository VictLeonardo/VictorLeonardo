import type { Metadata } from 'next';
import { Library } from 'lucide-react';
import { requireActiveMember } from '@/lib/auth/guards';
import { categoriesInUse, listContent, viewedIdsFor } from '@/server/content';
import { ContentCard } from '@/components/portal/content-card';
import { FilterBar } from '@/components/portal/filter-bar';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDuration } from '@/lib/utils';
import { MediaTabs } from '@/components/portal/media-tabs';

export const metadata: Metadata = { title: 'Vídeos & Podcasts' };
export const dynamic = 'force-dynamic';

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; categoria?: string; q?: string }>;
}) {
  const user = await requireActiveMember('/midia');
  const params = await searchParams;
  const type = params.tipo === 'podcasts' ? 'PODCAST' : 'VIDEO';

  const [{ items }, categories] = await Promise.all([
    listContent({
      user,
      types: [type],
      category: params.categoria,
      search: params.q,
      take: 48,
    }),
    categoriesInUse(['VIDEO', 'PODCAST'], user),
  ]);

  const viewed = await viewedIdsFor(
    user.id,
    items.map((i) => i.id),
  );

  return (
    <div className="space-y-7">
      <SectionHeader
        eyebrow="Biblioteca"
        title="Vídeos & Podcasts"
        description="Sessões gravadas, entrevistas e episodios para acompanhar no ritmo que couber na sua agenda."
      >
        <div className="flex flex-col gap-4">
          <MediaTabs active={params.tipo === 'podcasts' ? 'podcasts' : 'videos'} />
          <FilterBar
            basePath="/midia"
            searchParam="q"
            searchPlaceholder="Buscar por título"
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
        </div>
      </SectionHeader>

      {items.length === 0 ? (
        <EmptyState
          icon={Library}
          title={type === 'VIDEO' ? 'Nenhum vídeo encontrado' : 'Nenhum podcast encontrado'}
          description="Ajuste os filtros ou volte em breve."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ContentCard
              key={item.id}
              item={{
                ...item,
                viewed: viewed.has(item.id),
                meta: item.durationSecs ? formatDuration(item.durationSecs) : null,
              }}
              href={`/midia/${item.slug}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
