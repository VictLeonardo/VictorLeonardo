import type { Metadata } from 'next';
import type { Prisma } from '@prisma/client';
import { ScrollText } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/guards';
import { prisma } from '@/lib/prisma';
import { AUDIT_LABELS } from '@/lib/audit';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState } from '@/components/ui/empty-state';
import { FilterBar } from '@/components/portal/filter-bar';
import { Pagination } from '@/components/portal/pagination';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Auditoria' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 40;

const ENTITY_LABELS: Record<string, string> = {
  user: 'Membro',
  content: 'Conteúdo',
  lecture: 'Palestra',
  notification: 'Notificação',
  invite: 'Convite',
  waha: 'WhatsApp',
  setting: 'Configuração',
};

/** Registro imutavel de acoes administrativas (G11). Somente leitura. */
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; entidade?: string; pagina?: string }>;
}) {
  await requireAdmin('/admin/auditoria');
  const params = await searchParams;
  const page = Math.max(1, Number(params.pagina ?? '1') || 1);

  const where: Prisma.AuditLogWhereInput = {
    ...(params.entidade ? { entity: params.entidade } : {}),
    ...(params.q
      ? {
          OR: [
            { actorName: { contains: params.q, mode: 'insensitive' } },
            { action: { contains: params.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Segurança"
        title="Audit log"
        description="Quem fez o que, quando. Registro append-only: nenhuma rota da aplicação altera ou apaga estas linhas."
      >
        <FilterBar
          basePath="/admin/auditoria"
          searchParam="q"
          searchPlaceholder="Buscar por admin ou ação"
          groups={[
            {
              param: 'entidade',
              label: 'Entidade',
              value: params.entidade ?? '',
              options: [
                { value: '', label: 'Todas' },
                ...Object.entries(ENTITY_LABELS).map(([value, label]) => ({ value, label })),
              ],
            },
          ]}
        />
      </SectionHeader>

      {logs.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Nenhum registro encontrado"
          description="As ações administrativas aparecem aqui assim que acontecerem."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-line bg-surface shadow-card">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-text-3">
                  <th scope="col" className="px-4 py-3 font-medium">
                    Quando
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Admin
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Ação
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Entidade
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Detalhes
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    IP
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-line last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-text-2">
                      {formatDate(log.createdAt, true)}
                    </td>
                    <td className="px-4 py-3 text-text-1">{log.actorName}</td>
                    <td className="px-4 py-3">
                      <Badge tone={log.action.includes('excluir') ? 'danger' : 'neutral'}>
                        {AUDIT_LABELS[log.action] ?? log.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-text-2">
                      {ENTITY_LABELS[log.entity] ?? log.entity}
                    </td>
                    <td className="max-w-72 px-4 py-3">
                      <code className="block truncate font-mono text-xs text-text-3">
                        {JSON.stringify(log.metadata)}
                      </code>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-text-3">{log.ip ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} />
        </>
      )}
    </div>
  );
}
