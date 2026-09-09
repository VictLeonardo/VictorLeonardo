import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth/session';
import { recordAudit } from '@/lib/audit';

const schema = z.object({
  channel: z.enum(['EMAIL', 'WHATSAPP']),
  key: z.string().trim().min(2).max(60),
  name: z.string().trim().min(2).max(120),
  subject: z.string().trim().max(160).optional().or(z.literal('')),
  body: z.string().trim().min(5).max(8000),
});

/** Cria ou atualiza um template de mensagem. */
export async function PUT(request: Request) {
  const admin = await getSessionUser();
  if (admin?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const data = parsed.data;
  await prisma.messageTemplate.upsert({
    where: { channel_key: { channel: data.channel, key: data.key } },
    create: {
      channel: data.channel,
      key: data.key,
      name: data.name,
      subject: data.subject || null,
      body: data.body,
    },
    update: { name: data.name, subject: data.subject || null, body: data.body },
  });

  await recordAudit({
    actor: admin,
    action: 'template.atualizar',
    entity: 'setting',
    entityId: `${data.channel}:${data.key}`,
    metadata: { name: data.name },
  });

  return NextResponse.json({ ok: true });
}
