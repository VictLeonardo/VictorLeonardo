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

  // Os dois niveis sao audiencias possiveis: com apenas VIP, o Academy ficaria
  // sem como ser avisado de nada que nao fosse para todo mundo.
  // Quem ainda nao vinculou o LinkedIn: o portao so' cobra quem acessa o
  // portal, entao quem nunca entra nunca ve' a tela de pendencia. Este publico
  // existe para alcançar essas pessoas sem incomodar quem ja' preencheu.
  // Perfil ausente conta junto com perfil de LinkedIn vazio.
  const semLinkedin = {
    role: 'MEMBER' as const,
    status: 'ATIVO' as const,
    OR: [{ profile: { is: null } }, { profile: { linkedinUrl: null } }],
  };

  const where =
    notification.audience === 'VIP' || notification.audience === 'ACADEMY'
      ? { role: 'MEMBER' as const, status: 'ATIVO' as const, tier: notification.audience }
      : notification.audience === 'SEM_LINKEDIN'
        ? semLinkedin
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
