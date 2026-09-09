import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth/session';
import { recordAudit } from '@/lib/audit';
import { dispatchNotification } from '@/server/notifications';

const schema = z.object({
  title: z.string().trim().min(4, 'Título muito curto').max(120),
  body: z.string().trim().min(10, 'Escreva a mensagem').max(1000),
  url: z.string().trim().max(300).optional().or(z.literal('')),
  audience: z.enum(['TODOS', 'POR_PLANO', 'VIP']),
  planFilter: z.enum(['PADRAO', 'COM_DESCONTO', 'CORTESIA']).optional(),
  scheduledFor: z.string().optional().or(z.literal('')),
  sendNow: z.boolean().default(false),
});

export async function POST(request: Request) {
  const admin = await getSessionUser();
  if (admin?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const data = parsed.data;
  if (data.audience === 'POR_PLANO' && !data.planFilter) {
    return NextResponse.json({ error: 'Escolha o plano do segmento' }, { status: 400 });
  }

  const notification = await prisma.notification.create({
    data: {
      title: data.title,
      body: data.body,
      url: data.url || null,
      audience: data.audience,
      planFilter: data.audience === 'POR_PLANO' ? data.planFilter : null,
      scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
      createdById: admin.id,
    },
    select: { id: true },
  });

  await recordAudit({
    actor: admin,
    action: 'notificacao.criar',
    entity: 'notification',
    entityId: notification.id,
    metadata: { title: data.title, audience: data.audience, agendada: Boolean(data.scheduledFor) },
  });

  // Agendadas ficam aguardando o cron; o envio imediato materializa agora.
  if (data.sendNow && !data.scheduledFor) {
    const result = await dispatchNotification(notification.id);
    await recordAudit({
      actor: admin,
      action: 'notificacao.disparar',
      entity: 'notification',
      entityId: notification.id,
      metadata: { destinatarios: result.recipients },
    });
    return NextResponse.json({ ok: true, id: notification.id, recipients: result.recipients });
  }

  return NextResponse.json({ ok: true, id: notification.id });
}
