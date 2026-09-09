import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { isAuthorizedCron } from '@/lib/cron';
import { getWahaStatus, WAHA_STATE_LABELS } from '@/lib/waha';
import { renderEmail, sendMail } from '@/lib/mail';

export const dynamic = 'force-dynamic';

/**
 * Health check periodico da instancia WAHA (G12). Hoje o admin so descobre que a
 * instancia caiu quando abre o painel.
 *
 * O alerta e' enviado apenas na transicao de "no ar" para "fora do ar": enquanto
 * seguir offline, o cron continua registrando mas nao repete o e-mail a cada
 * execucao.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const status = await getWahaStatus();

  if (!status.configured) {
    return NextResponse.json({ ok: true, skipped: 'WAHA não configurada' });
  }

  const previous = await prisma.wahaHealthCheck.findFirst({ orderBy: { checkedAt: 'desc' } });
  const justWentDown = !status.connected && (previous?.connected ?? true);

  let alertSent = false;
  if (justWentDown && env.ADMIN_ALERT_EMAIL) {
    const result = await sendMail({
      to: env.ADMIN_ALERT_EMAIL,
      template: 'alerta-waha',
      subject: '[Alerta] Instância WhatsApp desconectada',
      html: renderEmail({
        title: 'A instância WAHA caiu',
        intro: `O health check detectou a instancia fora do ar. Estado atual: ${
          WAHA_STATE_LABELS[status.state] ?? status.state
        }.`,
        body: status.detail ? `<p>Detalhe técnico: ${status.detail}</p>` : undefined,
        ctaLabel: 'Abrir painel do WhatsApp',
        ctaUrl: `${env.NEXT_PUBLIC_APP_URL}/admin/whatsapp`,
        footnote: 'Alerta automático da plataforma SM Smart Money.',
      }),
    });
    alertSent = result.ok;
  }

  await prisma.wahaHealthCheck.create({
    data: {
      connected: status.connected,
      state: status.state,
      detail: status.detail ?? null,
      alertSent,
    },
  });

  return NextResponse.json({
    ok: true,
    connected: status.connected,
    state: status.state,
    alertSent,
  });
}
