import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { recordAudit } from '@/lib/audit';
import { retomarAssinatura, SemAssinatura } from '@/server/subscriptions';

export const dynamic = 'force-dynamic';

/** Desfaz um cancelamento agendado, enquanto o periodo pago ainda corre. */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    await retomarAssinatura(user.id);

    await recordAudit({
      actor: user,
      action: 'assinatura.retomar',
      entity: 'user',
      entityId: user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SemAssinatura) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[assinatura:retomar]', error);
    return NextResponse.json(
      { error: 'Não foi possível retomar agora. Tente novamente.' },
      { status: 502 },
    );
  }
}
