import 'server-only';
import { prisma } from '@/lib/prisma';

export async function countUnread(userId: string): Promise<number> {
  return prisma.notificationRecipient.count({
    where: { userId, readAt: null, notification: { sentAt: { not: null } } },
  });
}

export async function listNotifications(userId: string, limit = 30) {
  return prisma.notificationRecipient.findMany({
    where: { userId, notification: { sentAt: { not: null } } },
    orderBy: { notification: { sentAt: 'desc' } },
    take: limit,
    select: {
      id: true,
      readAt: true,
      notification: {
        select: { id: true, title: true, body: true, url: true, sentAt: true },
      },
    },
  });
}

/**
 * Materializa os destinatarios no momento do disparo. Guardar a lista (em vez de
 * calcular na leitura) preserva o publico historico: mudar o plano de um membro
 * depois nao reescreve quem recebeu o que.
 */
export async function dispatchNotification(notificationId: string) {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification || notification.sentAt) return { recipients: 0 };

  const where =
    notification.audience === 'VIP'
      ? { role: 'MEMBER' as const, status: 'ATIVO' as const, tier: 'VIP' as const }
      : notification.audience === 'POR_PLANO' && notification.planFilter
        ? { role: 'MEMBER' as const, status: 'ATIVO' as const, plan: notification.planFilter }
        : { role: 'MEMBER' as const, status: 'ATIVO' as const };

  const users = await prisma.user.findMany({ where, select: { id: true } });

  await prisma.$transaction([
    prisma.notificationRecipient.createMany({
      data: users.map((u) => ({ notificationId, userId: u.id })),
      skipDuplicates: true,
    }),
    prisma.notification.update({
      where: { id: notificationId },
      data: { sentAt: new Date() },
    }),
  ]);

  return { recipients: users.length };
}
