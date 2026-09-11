import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { recordAudit } from '@/lib/audit';
import { agendarCancelamento, SemAssinatura } from '@/server/subscriptions';

export const dynamic = 'force-dynamic';

/**
 * Cancelamento pelo proprio membro.
 *
 * O acesso nao cai aqui. O que a rota faz e' agendar o fim para o termino do
 * periodo ja' pago; o status so' muda quando o Stripe encerra de verdade e
 * avisa pelo webhook.
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const { fimDoPeriodo } = await agendarCancelamento(user.id);

    await recordAudit({
      actor: user,
      action: 'assinatura.cancelar',
      entity: 'user',
      entityId: user.id,
      metadata: { fimDoPeriodo: fimDoPeriodo?.toISOString() ?? null },
    });

    return NextResponse.json({ ok: true, fimDoPeriodo });
  } catch (error) {
    if (error instanceof SemAssinatura) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[assinatura:cancelar]', error);
    return NextResponse.json(
      { error: 'Não foi possível cancelar agora. Tente novamente.' },
      { status: 502 },
    );
  }
}
