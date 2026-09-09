import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/guards';
import { prisma } from '@/lib/prisma';
import { pendingProfileMembers, inviteHistory } from '@/server/invites';
import { SectionHeader } from '@/components/ui/section-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NotificationComposer } from '@/components/admin/notification-composer';
import { InvitePanel } from '@/components/admin/invite-panel';
import { PLAN_LABELS } from '@/lib/domain';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Notificações' };
export const dynamic = 'force-dynamic';

const AUDIENCE_LABEL = {
  TODOS: 'Todos os membros ativos',
  POR_PLANO: 'Segmento por plano',
  VIP: 'Somente VIP',
};

export default async function AdminNotificationsPage() {
  await requireAdmin('/admin/notificacoes');

  const [notifications, pending, history] = await Promise.all([
    prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: {
        id: true,
        title: true,
        body: true,
        audience: true,
        planFilter: true,
        scheduledFor: true,
        sentAt: true,
        createdAt: true,
        _count: { select: { recipients: true } },
      },
    }),
    pendingProfileMembers(),
    inviteHistory(),
  ]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Comunicação"
        title="Notificações e convites"
        description="Avisos in-app para os membros e convites de ativação de perfil público."
      />

      <div className="grid gap-5 xl:grid-cols-2 xl:items-start">
        <NotificationComposer />

        <InvitePanel
          members={pending.map((m) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            jobTitle: m.jobTitle,
            slug: m.profile?.slug ?? null,
            inviteSentAt: m.profile?.inviteSentAt?.toISOString() ?? null,
          }))}
          history={history.map((batch) => ({
            batchId: batch.batchId,
            sentAt: batch.sentAt.toISOString(),
            total: batch.total,
            ok: batch.ok,
            failed: batch.failed,
            recipients: batch.recipients.map((r) => ({
              to: r.to,
              status: r.status,
              error: r.error,
            })),
          }))}
        />
      </div>

      <Card>
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold text-text-1">Notificações criadas</h2>

          {notifications.length === 0 ? (
            <p className="mt-3 text-sm text-text-2">Nenhuma notificação criada até agora.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs text-text-3">
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Título
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Público
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Status
                    </th>
                    <th scope="col" className="py-2 pr-4 text-right font-medium">
                      Destinatários
                    </th>
                    <th scope="col" className="py-2 text-right font-medium">
                      Data
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.map((item) => (
                    <tr key={item.id} className="border-b border-line last:border-0">
                      <td className="py-2.5 pr-4">
                        <p className="font-medium text-text-1">{item.title}</p>
                        <p className="line-clamp-1 text-xs text-text-3">{item.body}</p>
                      </td>
                      <td className="py-2.5 pr-4 text-text-2">
                        {AUDIENCE_LABEL[item.audience]}
                        {item.planFilter ? ` · ${PLAN_LABELS[item.planFilter]}` : ''}
                      </td>
                      <td className="py-2.5 pr-4">
                        {item.sentAt ? (
                          <Badge tone="positive">Enviada</Badge>
                        ) : item.scheduledFor ? (
                          <Badge tone="info">Agendada</Badge>
                        ) : (
                          <Badge tone="warning">Rascunho</Badge>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-text-2">
                        {item._count.recipients}
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-text-2">
                        {formatDate(item.sentAt ?? item.scheduledFor ?? item.createdAt, true)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
