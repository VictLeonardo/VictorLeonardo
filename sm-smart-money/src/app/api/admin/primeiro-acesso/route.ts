import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth/session';
import { recordAudit } from '@/lib/audit';
import { sendFirstAccess } from '@/server/first-access';

const schema = z.object({ userIds: z.array(z.string()).min(1, 'Selecione ao menos um membro') });

/**
 * Dispara o e-mail de primeiro acesso para os membros selecionados.
 *
 * Cada envio cria um token de definicao de senha valido por sete dias, entao a
 * rota fica restrita a admin e o filtro de quem pode receber e' reaplicado no
 * servidor, dentro de `sendFirstAccess`.
 */
export async function POST(request: Request) {
  const admin = await getSessionUser();
  if (admin?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const result = await sendFirstAccess(parsed.data.userIds);

  await recordAudit({
    actor: admin,
    action: result.total > 1 ? 'membro.primeiro_acesso_lote' : 'membro.primeiro_acesso',
    entity: 'invite',
    entityId: result.batchId,
    metadata: { total: result.total, enviados: result.sent, falhas: result.failed },
  });

  return NextResponse.json({ ok: true, ...result });
}
