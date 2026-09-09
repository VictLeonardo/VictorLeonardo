import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth/session';
import { recordAudit } from '@/lib/audit';
import { dispatchNotification } from '@/server/notifications';

/** Dispara agora uma notificacao criada como rascunho ou agendada. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getSessionUser();
  if (admin?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
  }

  const { id } = await params;
  const notification = await prisma.notification.findUnique({
    where: { id },
    select: { id: true, title: true, sentAt: true },
  });
  if (!notification) {
    return NextResponse.json({ error: 'Notificação não encontrada' }, { status: 404 });
  }
  if (notification.sentAt) {
    return NextResponse.json({ error: 'Esta notificação já foi disparada' }, { status: 409 });
  }

  const result = await dispatchNotification(id);

  await recordAudit({
    actor: admin,
    action: 'notificacao.disparar',
    entity: 'notification',
    entityId: id,
    metadata: { title: notification.title, destinatarios: result.recipients },
  });

  return NextResponse.json({ ok: true, recipients: result.recipients });
}
