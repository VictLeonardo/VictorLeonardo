import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Video } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/guards';
import { prisma } from '@/lib/prisma';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Palestras' };
export const dynamic = 'force-dynamic';

const STATUS_TONE = { RASCUNHO: 'warning', PUBLICADO: 'positive', ARQUIVADO: 'neutral' } as const;
const STATUS_LABEL = { RASCUNHO: 'Rascunho', PUBLICADO: 'Publicado', ARQUIVADO: 'Arquivado' };

export default async function AdminLecturesPage() {
  await requireAdmin('/admin/palestras');

  const lectures = await prisma.lecture.findMany({
    include: { speaker: { select: { name: true } } },
    orderBy: { startsAt: 'desc' },
    take: 100,
  });

  const now = new Date();

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Agenda"
        title="Palestras"
        description="Crie sessões, cadastre o speaker e publique a gravação depois do evento."
        actions={
          <Button asChild>
            <Link href="/admin/palestras/nova">
              <Plus className="size-4" aria-hidden="true" />
              Nova palestra
            </Link>
          </Button>
        }
      />

      {lectures.length === 0 ? (
        <EmptyState
          icon={Video}
          title="Nenhuma palestra cadastrada"
          description="Comece criando a próxima sessão da comunidade."
          action={
            <Button asChild variant="secondary">
              <Link href="/admin/palestras/nova">Nova palestra</Link>
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface shadow-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-text-3">
                <th scope="col" className="px-4 py-3 font-medium">
                  Título
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Speaker
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Tema
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Data
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {lectures.map((lecture) => (
                <tr
                  key={lecture.id}
                  className="border-b border-line transition-colors last:border-0 hover:bg-surface-sunken"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/palestras/${lecture.id}`}
                      className="font-medium text-text-1 hover:text-brand-strong"
                    >
                      {lecture.title}
                    </Link>
                    {lecture.visibility === 'VIP' ? (
                      <Badge tone="brand" className="ml-2">
                        VIP
                      </Badge>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-text-2">{lecture.speaker?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-text-2">{lecture.theme}</td>
                  <td className="px-4 py-3 tabular-nums text-text-2">
                    {formatDate(lecture.startsAt, true)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[lecture.status]}>{STATUS_LABEL[lecture.status]}</Badge>
                    {lecture.startsAt < now && !lecture.recordingUrl ? (
                      <Badge tone="warning" className="ml-1.5">
                        Sem gravação
                      </Badge>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
