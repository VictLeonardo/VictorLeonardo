import 'server-only';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { renderEmail, sendMail } from '@/lib/mail';

/**
 * Convites de ativacao de perfil publico (G06). O disparo em massa da plataforma
 * atual acontece sem confirmacao e sem registro; aqui cada lote ganha um `batchId`
 * e cada destinatario deixa uma linha em EmailLog com sucesso ou erro.
 */

export const INVITE_TEMPLATE = 'convite-perfil';

export async function pendingProfileMembers() {
  return prisma.user.findMany({
    where: {
      role: 'MEMBER',
      status: 'ATIVO',
      OR: [{ profile: { is: null } }, { profile: { isPublic: false } }],
    },
    select: {
      id: true,
      name: true,
      email: true,
      jobTitle: true,
      profile: { select: { slug: true, isPublic: true, inviteSentAt: true } },
    },
    orderBy: { name: 'asc' },
  });
}

export function renderInvite(member: { name: string; slug: string | null }) {
  const url = member.slug
    ? `${env.NEXT_PUBLIC_APP_URL}/${member.slug}`
    : env.NEXT_PUBLIC_APP_URL;

  return {
    subject: 'Ative seu perfil de Membro Estratégico',
    html: renderEmail({
      title: 'Seu perfil público está reservado',
      intro: `Ola, ${member.name.split(' ')[0]}. Cada membro da SM Smart Money tem um endereco proprio na comunidade — o seu ja' esta reservado.`,
      body: `<p>Ative o perfil para aparecer no diretório de membros e compartilhar seu cartao digital.</p>
             <p style="margin-top:12px;font-size:13px;color:#8a8474">Seu endereço: <strong>${url}</strong></p>`,
      ctaLabel: 'Ativar meu perfil',
      ctaUrl: `${env.NEXT_PUBLIC_APP_URL}/perfil`,
    }),
  };
}

export async function sendInvites(userIds: string[]) {
  const batchId = randomUUID();
  const members = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, profile: { select: { id: true, slug: true } } },
  });

  let sent = 0;
  let failed = 0;

  for (const member of members) {
    const email = renderInvite({ name: member.name, slug: member.profile?.slug ?? null });
    const result = await sendMail({
      to: member.email,
      userId: member.id,
      template: INVITE_TEMPLATE,
      subject: email.subject,
      html: email.html,
      batchId,
    });

    if (result.ok) {
      sent += 1;
      if (member.profile) {
        await prisma.profile.update({
          where: { id: member.profile.id },
          data: { inviteSentAt: new Date() },
        });
      }
    } else {
      failed += 1;
    }
  }

  return { batchId, sent, failed, total: members.length };
}

/** Historico de disparos, agrupado por lote. */
export async function inviteHistory(take = 10) {
  const logs = await prisma.emailLog.findMany({
    where: { template: INVITE_TEMPLATE, batchId: { not: null } },
    orderBy: { sentAt: 'desc' },
    take: 500,
    select: { batchId: true, to: true, status: true, sentAt: true, error: true },
  });

  const batches = new Map<
    string,
    { batchId: string; sentAt: Date; total: number; ok: number; failed: number; recipients: typeof logs }
  >();

  for (const log of logs) {
    const key = log.batchId!;
    const existing = batches.get(key) ?? {
      batchId: key,
      sentAt: log.sentAt,
      total: 0,
      ok: 0,
      failed: 0,
      recipients: [] as typeof logs,
    };
    existing.total += 1;
    if (log.status === 'ENVIADO') existing.ok += 1;
    else existing.failed += 1;
    if (log.sentAt > existing.sentAt) existing.sentAt = log.sentAt;
    existing.recipients.push(log);
    batches.set(key, existing);
  }

  return [...batches.values()].sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime()).slice(0, take);
}
