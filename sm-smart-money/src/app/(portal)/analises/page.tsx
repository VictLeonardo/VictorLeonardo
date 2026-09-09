import type { Metadata } from 'next';
import Link from 'next/link';
import { BarChart3 } from 'lucide-react';
import { requireActiveMember } from '@/lib/auth/guards';
import { categoriesInUse, listContent, viewedIdsFor } from '@/server/content';
import { FilterBar } from '@/components/portal/filter-bar';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Análises de Mercado' };
export const dynamic = 'force-dynamic';

/** Uma analise publicada nos ultimos 10 dias recebe o selo "NOVO". */
const NEW_WINDOW_DAYS = 10;

/**
 * O corte fica fora do corpo do componente: ler o relogio durante a renderizacao
 * torna o resultado nao deterministico para o mesmo conjunto de props.
 */
function newContentThreshold(): number {
  return Date.now() - NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; q?: string }>;
}) {
  const user = await requireActiveMember('/analises');
  const params = await searchParams;

  const newThreshold = newContentThreshold();

  const [{ items }, categories] = await Promise.all([
    listContent({ user, types: ['ANALISE'], category: params.categoria, search: params.q, take: 48 }),
    categoriesInUse(['ANALISE'], user),
  ]);

  const viewed = await viewedIdsFor(
    user.id,
    items.map((i) => i.id),
  );

  return (
    <div className="space-y-7">
      <SectionHeader
        eyebrow="Research"
        title="Análises de Mercado"
        description="Relatórios periodicos sobre macro, renda variável, fundos, câmbio e tributação."
      >
        <FilterBar
          basePath="/analises"
          searchParam="q"
          searchPlaceholder="Buscar análise"
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
          icon={BarChart3}
          title="Nenhuma análise encontrada"
          description="Ajuste os filtros para ver outros relatórios."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const isNew = item.publishedAt ? item.publishedAt.getTime() > newThreshold : false;
            return (
              <li key={item.id}>
                <article className="group relative flex flex-col gap-3 rounded-lg border border-line bg-surface p-5 shadow-card transition-shadow hover:shadow-pop sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="neutral">{item.category}</Badge>
                      {isNew ? <Badge tone="positive">Novo</Badge> : null}
                      {item.visibility === 'VIP' ? <Badge tone="brand">VIP</Badge> : null}
                      {viewed.has(item.id) ? <Badge tone="neutral">Lido</Badge> : null}
                    </div>
                    <h2 className="mt-2 text-lg font-semibold leading-snug text-text-1">
                      <Link href={`/analises/${item.slug}`} className="after:absolute after:inset-0">
                        {item.title}
                      </Link>
                    </h2>
                    {item.excerpt ? (
                      <p className="mt-1 line-clamp-2 text-sm text-text-2">{item.excerpt}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-text-3">
                      {item.authorName ? `${item.authorName} · ` : ''}
                      {formatDate(item.publishedAt)}
                    </p>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
