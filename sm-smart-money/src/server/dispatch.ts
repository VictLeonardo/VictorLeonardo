import 'server-only';
import { prisma } from '@/lib/prisma';

/**
 * Historico de disparos em lote, agrupado por `batchId`.
 *
 * Vive fora de `invites.ts` porque a plataforma tem mais de um tipo de disparo
 * em massa -- convite de perfil e primeiro acesso -- e todos respondem a mesma
 * pergunta: quem recebeu, quando, e o que falhou. Uma copia por tipo divergiria
 * na primeira correcao.
 */

export type LoteDeDisparo = {
  batchId: string;
  sentAt: Date;
  total: number;
  ok: number;
  failed: number;
  recipients: { to: string; status: string; error: string | null }[];
};

export async function batchHistory(template: string, take = 10): Promise<LoteDeDisparo[]> {
  const logs = await prisma.emailLog.findMany({
    where: { template, batchId: { not: null } },
    orderBy: { sentAt: 'desc' },
    take: 500,
    select: { batchId: true, to: true, status: true, sentAt: true, error: true },
  });

  const lotes = new Map<string, LoteDeDisparo>();

  for (const log of logs) {
    const chave = log.batchId!;
    const lote = lotes.get(chave) ?? {
      batchId: chave,
      sentAt: log.sentAt,
      total: 0,
      ok: 0,
      failed: 0,
      recipients: [],
    };

    lote.total += 1;
    if (log.status === 'ENVIADO') lote.ok += 1;
    else lote.failed += 1;
    // O lote leva a hora do ultimo envio: e' quando ele de fato terminou.
    if (log.sentAt > lote.sentAt) lote.sentAt = log.sentAt;
    lote.recipients.push({ to: log.to, status: log.status, error: log.error });

    lotes.set(chave, lote);
  }

  return [...lotes.values()]
    .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())
    .slice(0, take);
}
