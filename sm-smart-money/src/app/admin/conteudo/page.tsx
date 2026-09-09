import type { Metadata } from 'next';
import Link from 'next/link';
import type { ContentStatus, ContentType, Prisma } from '@prisma/client';
import { FileStack, Plus } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/guards';
import { prisma } from '@/lib/prisma';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FilterBar } from '@/components/portal/filter-bar';
import { CONTENT_TYPE_LABELS } from '@/lib/domain';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Conteúdo' };
export const dynamic = 'force-dynamic';

const TYPES: ContentType[] = ['ARTIGO', 'VIDEO', 'PODCAST', 'ANALISE', 'EBOOK'];
const STATUSES: ContentStatus[] = ['RASCUNHO', 'PUBLICADO', 'ARQUIVADO'];

const STATUS_TONE = { RASCUNHO: 'warning', PUBLICADO: 'positive', ARQUIVADO: 'neutral' } as const;
const STATUS_LABEL = { RASCUNHO: 'Rascunho', PUBLICADO: 'Publicado', ARQUIVADO: 'Arquivado' };

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; status?: string; q?: string }>;
}) {
  await requireAdmin('/admin/conteudo');
  const params = await searchParams;

  const where: Prisma.ContentWhereInput = {
    ...(TYPES.includes(params.tipo as ContentType) ? { type: params.tipo as ContentType } : {}),
    ...(STATUSES.includes(params.status as ContentStatus)
      ? { status: params.status as ContentStatus }
      : {}),
    ...(params.q ? { title: { contains: params.q, mode: 'insensitive' } } : {}),
  };

  const items = await prisma.content.findMany({
    where,
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      visibility: true,
      category: true,
      publishedAt: true,
      scheduledFor: true,
      updatedAt: true,
      _count: { select: { views: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });

  const now = new Date();

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="CMS"
        title="Conteúdo"
        description="Artigos, vídeos, podcasts, análises e e-books — tudo publicado a partir daqui."
        actions={
          <Button asChild>
            <Link href="/admin/conteudo/novo">
              <Plus className="size-4" aria-hidden="true" />
              Novo conteúdo
            </Link>
          </Button>
        }
      >
        <FilterBar
          basePath="/admin/conteudo"
          searchParam="q"
          searchPlaceholder="Buscar por título"
          groups={[
            {
              param: 'tipo',
              label: 'Tipo',
              value: params.tipo ?? '',
              options: [
                { value: '', label: 'Todos' },
                ...TYPES.map((t) => ({ value: t, label: CONTENT_TYPE_LABELS[t] })),
              ],
            },
            {
              param: 'status',
              label: 'Status',
              value: params.status ?? '',
              options: [
                { value: '', label: 'Todos' },
                ...STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] })),
              ],
            },
          ]}
        />
      </SectionHeader>

      {items.length === 0 ? (
        <EmptyState
          icon={FileStack}
          title="Nenhum conteúdo encontrado"
          description="Ajuste os filtros ou publique o primeiro conteúdo."
          action={
            <Button asChild variant="secondary">
              <Link href="/admin/conteudo/novo">Novo conteúdo</Link>
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface shadow-card">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-text-3">
                <th scope="col" className="px-4 py-3 font-medium">
                  Título
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Tipo
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Categoria
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Publicação
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Views
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const scheduled =
                  item.status === 'PUBLICADO' && item.publishedAt && item.publishedAt > now;
                return (
                  <tr
                    key={item.id}
                    className="border-b border-line transition-colors last:border-0 hover:bg-surface-sunken"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/conteudo/${item.id}`}
                        className="font-medium text-text-1 hover:text-brand-strong"
                      >
                        {item.title}
                      </Link>
                      {item.visibility === 'VIP' ? (
                        <Badge tone="brand" className="ml-2">
                          VIP
                        </Badge>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-text-2">{CONTENT_TYPE_LABELS[item.type]}</td>
                    <td className="px-4 py-3 text-text-2">{item.category}</td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</Badge>
                      {scheduled ? (
                        <Badge tone="info" className="ml-1.5">
                          Agendado
                        </Badge>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-text-2">
                      {formatDate(item.publishedAt, true)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-text-2">
                      {item._count.views}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
