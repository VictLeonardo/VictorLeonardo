import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth/session';
import { recordAudit } from '@/lib/audit';
import { sendInvites } from '@/server/invites';

const schema = z.object({ userIds: z.array(z.string()).min(1, 'Selecione ao menos um membro') });

export async function POST(request: Request) {
  const admin = await getSessionUser();
  if (admin?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const result = await sendInvites(parsed.data.userIds);

  await recordAudit({
    actor: admin,
    action: parsed.data.userIds.length > 1 ? 'perfil.convite_lote' : 'perfil.convite_enviar',
    entity: 'invite',
    entityId: result.batchId,
    metadata: { total: result.total, enviados: result.sent, falhas: result.failed },
  });

  return NextResponse.json({ ok: true, ...result });
}
