import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthorizedCron } from '@/lib/cron';
import { dispatchNotification } from '@/server/notifications';

export const dynamic = 'force-dynamic';

/**
 * Executa o que foi agendado e chegou a hora.
 *
 * Conteudo agendado nao precisa de acao: o filtro de leitura do portal ja' exige
 * `publishedAt <= agora`, entao ele aparece sozinho. O que precisa de execucao sao
 * as notificacoes, que materializam a lista de destinatarios no momento do envio.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const now = new Date();

  const due = await prisma.notification.findMany({
    where: { sentAt: null, scheduledFor: { not: null, lte: now } },
    select: { id: true },
  });

  let recipients = 0;
  for (const notification of due) {
    const result = await dispatchNotification(notification.id);
    recipients += result.recipients;
  }

  const published = await prisma.content.count({
    where: { status: 'PUBLICADO', publishedAt: { lte: now } },
  });

  return NextResponse.json({
    ok: true,
    notificacoesDisparadas: due.length,
    destinatarios: recipients,
    conteudosPublicados: published,
  });
}
