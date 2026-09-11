import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { env, stripeConfigured } from '@/lib/env';
import { stripe } from '@/lib/stripe';
import {
  aoConcluirCheckout,
  aoMudarAssinatura,
  aoRegistrarFatura,
  soltarEvento,
  travarEvento,
} from '@/server/subscriptions';

export const dynamic = 'force-dynamic';
// O corpo precisa chegar byte a byte como o Stripe enviou: a assinatura e'
// calculada sobre ele. Qualquer parse antes da verificacao invalida a conferencia.
export const runtime = 'nodejs';

/**
 * Unico lugar que escreve o estado de assinatura no banco.
 *
 * Nenhuma tela grava "assinatura ativa" a partir do retorno do checkout: aquilo
 * chega pelo navegador do visitante e nao e' prova de pagamento. Aqui a prova e'
 * a assinatura criptografica do Stripe sobre o corpo da requisicao.
 */
export async function POST(request: Request) {
  if (!stripeConfigured) {
    return NextResponse.json({ error: 'Cobrança não configurada' }, { status: 503 });
  }

  const assinaturaDoHeader = request.headers.get('stripe-signature');
  if (!assinaturaDoHeader) {
    return NextResponse.json({ error: 'Sem assinatura' }, { status: 400 });
  }

  const corpo = await request.text();

  let evento: Stripe.Event;
  try {
    evento = stripe().webhooks.constructEvent(
      corpo,
      assinaturaDoHeader,
      env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (error) {
    // Assinatura invalida e' tentativa de forjar evento, nao defeito nosso.
    console.warn('[stripe] assinatura de webhook invalida', error);
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 400 });
  }

  // A trava vem antes de qualquer efeito. O Stripe reentrega o que nao respondeu
  // 200, e uma reentrega de encerramento fora de ordem cancelaria uma assinatura
  // recem-retomada.
  const inedito = await travarEvento(evento);
  if (!inedito) {
    return NextResponse.json({ ok: true, repetido: true });
  }

  try {
    switch (evento.type) {
      case 'checkout.session.completed':
        await aoConcluirCheckout(evento.data.object);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await aoMudarAssinatura(evento.data.object);
        break;

      case 'invoice.paid':
      case 'invoice.payment_failed':
        await aoRegistrarFatura(evento.data.object);
        break;

      default:
        // Os demais eventos sao ignorados de proposito. Responder 200 evita que
        // o Stripe fique reentregando o que a plataforma nao usa.
        break;
    }
  } catch (error) {
    // A trava e' solta para a reentrega do Stripe poder tentar de novo. Mante-la
    // apos uma falha transitoria perderia o evento de vez, porque a reentrega
    // seria descartada como repetida.
    await soltarEvento(evento.id);
    console.error(`[stripe] falha ao tratar ${evento.type} (${evento.id})`, error);
    return NextResponse.json({ error: 'Falha ao processar' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
