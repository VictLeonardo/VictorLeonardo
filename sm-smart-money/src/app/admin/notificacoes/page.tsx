import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/guards';
import { prisma } from '@/lib/prisma';
import { pendingProfileMembers, inviteHistory } from '@/server/invites';
import { pendingFirstAccessMembers, firstAccessHistory } from '@/server/first-access';
import { DIAS_DE_VALIDADE } from '@/server/welcome';
import { SectionHeader } from '@/components/ui/section-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NotificationComposer } from '@/components/admin/notification-composer';
import { DispatchPanel } from '@/components/admin/dispatch-panel';
import { KeyRound, MailPlus } from 'lucide-react';
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

  const [notifications, semPerfil, historicoPerfil, semAcesso, historicoAcesso] = await Promise.all([
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
    pendingFirstAccessMembers(),
    firstAccessHistory(),
  ]);

  // O historico chega igual dos dois lados; so' a serializacao das datas muda.
  const emLote = (lotes: Awaited<ReturnType<typeof inviteHistory>>) =>
    lotes.map((lote) => ({ ...lote, sentAt: lote.sentAt.toISOString() }));

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Comunicação"
        title="Notificações e convites"
        description="Avisos in-app, primeiro acesso de quem ainda não tem senha e convites de perfil público."
      />

      <div className="grid gap-5 xl:grid-cols-2 xl:items-start">
        <NotificationComposer />

        <div className="space-y-5">
          <DispatchPanel
            titulo="Primeiro acesso"
            icone={<KeyRound className="size-4 text-brand-strong" aria-hidden="true" />}
            endpoint="/api/admin/primeiro-acesso"
            acao="Enviar primeiro acesso"
            substantivo={{ singular: 'e-mail', plural: 'e-mails' }}
            vazio="Todos os membros ativos já definiram senha."
            confirmacao={`Cada membro selecionado recebe um link de definição de senha válido por ${DIAS_DE_VALIDADE} dias. O resultado por destinatário fica registrado no histórico.`}
            previa={{
              assunto: 'Bem-vindo à SM Smart Money',
              corpo: `Olá, [primeiro nome]. Você agora faz parte da comunidade SM Smart Money. Defina sua senha pelo botão abaixo e comece pelo diagnóstico Smart Money Journey. O link vale por ${DIAS_DE_VALIDADE} dias.`,
              cta: 'Definir minha senha',
            }}
            destinatarios={semAcesso.map((m) => ({
              id: m.id,
              name: m.name,
              email: m.email,
              nota: m.ultimoEnvio ? `Último envio: ${formatDate(m.ultimoEnvio, true)}` : null,
            }))}
            historico={emLote(historicoAcesso)}
          />

          <DispatchPanel
            titulo="Convites de perfil público"
            icone={<MailPlus className="size-4 text-brand-strong" aria-hidden="true" />}
            endpoint="/api/admin/convites"
            acao="Disparar convites"
            substantivo={{ singular: 'convite', plural: 'convites' }}
            vazio="Todos os membros ativos já tem perfil público ativado."
            confirmacao="Cada membro selecionado recebe o e-mail abaixo. O resultado por destinatário fica registrado no histórico."
            previa={{
              assunto: 'Ative seu perfil de Membro Estratégico',
              corpo:
                'Olá, [primeiro nome]. Cada membro da SM Smart Money tem um endereço próprio na comunidade — o seu já está reservado. Ative o perfil para aparecer no diretório de membros e compartilhar seu cartão digital.',
              cta: 'Ativar meu perfil',
            }}
            destinatarios={semPerfil.map((m) => ({
              id: m.id,
              name: m.name,
              email: m.email,
              nota: m.profile?.inviteSentAt
                ? `Último convite: ${formatDate(m.profile.inviteSentAt)}`
                : null,
            }))}
            historico={emLote(historicoPerfil)}
          />
        </div>
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
