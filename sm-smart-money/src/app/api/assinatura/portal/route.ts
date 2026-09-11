import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { criarSessaoDoPortal, SemAssinatura } from '@/server/subscriptions';

export const dynamic = 'force-dynamic';

/**
 * Abre o portal do Stripe, onde o membro troca o cartao e baixa as faturas.
 *
 * Cancelar tem tela propria aqui dentro; trocar cartao e ver fatura ficam la',
 * porque reconstruir isso significaria receber numero de cartao na plataforma,
 * o que muda a exigencia de conformidade sem ganho nenhum para o membro.
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const { url } = await criarSessaoDoPortal(user.id);
    return NextResponse.json({ ok: true, url });
  } catch (error) {
    if (error instanceof SemAssinatura) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[assinatura:portal]', error);
    return NextResponse.json(
      { error: 'Não foi possível abrir o portal de cobrança.' },
      { status: 502 },
    );
  }
}
