import { NextResponse } from 'next/server';
import { stripeConfigured } from '@/lib/env';
import { getSessionUser } from '@/lib/auth/session';
import { AssinaturaJaExiste, criarCheckoutDeAssinatura } from '@/server/subscriptions';

export const dynamic = 'force-dynamic';

/**
 * Abre o checkout do Stripe. Serve tanto a quem ainda nao e' membro, vindo do
 * convite na tela de login, quanto a quem cancelou e quer voltar.
 *
 * A rota nao aceita corpo. O e-mail vem da sessao, quando existe, ou o proprio
 * Stripe coleta na tela de pagamento. Aceitar um e-mail do cliente permitiria
 * abrir um checkout preso ao cadastro de outra pessoa.
 *
 * Nenhuma conta nasce aqui: quem cria e' o webhook, depois do pagamento
 * aprovado. Criar antes deixaria conta orfa a cada checkout abandonado.
 */
export async function POST() {
  if (!stripeConfigured) {
    return NextResponse.json(
      { error: 'A assinatura online ainda não está disponível. Fale com a equipe SM.' },
      { status: 503 },
    );
  }

  const session = await getSessionUser();

  try {
    const { url } = await criarCheckoutDeAssinatura({ email: session?.email });
    return NextResponse.json({ ok: true, url });
  } catch (error) {
    if (error instanceof AssinaturaJaExiste) {
      return NextResponse.json(
        { error: 'Este e-mail já tem acesso à comunidade. Entre pelo login.' },
        { status: 409 },
      );
    }
    console.error('[checkout]', error);
    return NextResponse.json(
      { error: 'Não foi possível abrir o pagamento. Tente novamente.' },
      { status: 502 },
    );
  }
}
