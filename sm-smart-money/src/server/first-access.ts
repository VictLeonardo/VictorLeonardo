import 'server-only';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { batchHistory } from '@/server/dispatch';
import { sendWelcomeEmail, WELCOME_TEMPLATE } from '@/server/welcome';

/**
 * Primeiro acesso dos membros que ainda nao definiram senha.
 *
 * Quem entra pelo checkout do Stripe recebe este e-mail no ato, disparado pelo
 * webhook. Quem veio da plataforma anterior entrou por importacao, sem senha e
 * sem e-mail nenhum -- de proposito, porque carregar dado e convidar gente sao
 * atos de peso diferente. Este modulo e' o segundo ato.
 *
 * O texto e o token de sete dias sao os mesmos do caminho do Stripe, via
 * `sendWelcomeEmail`. Um segundo texto de boas-vindas so' criaria duas versoes
 * da mesma promessa para manter em dia.
 */

export async function pendingFirstAccessMembers() {
  const membros = await prisma.user.findMany({
    // Sem senha e' o criterio real: a pessoa nunca conseguiu entrar. Cancelado
    // fica de fora -- convidar para um portal que nao abre e' pior que silencio.
    where: { role: 'MEMBER', status: 'ATIVO', passwordHash: null },
    select: { id: true, name: true, email: true, jobTitle: true, joinedAt: true },
    orderBy: { name: 'asc' },
  });

  if (membros.length === 0) return [];

  // Ultimo envio por membro, para o admin nao reenviar as cegas nem deixar
  // alguem de fora numa lista de dezenas.
  const envios = await prisma.emailLog.findMany({
    where: { template: WELCOME_TEMPLATE, userId: { in: membros.map((m) => m.id) } },
    orderBy: { sentAt: 'desc' },
    select: { userId: true, sentAt: true },
  });

  const ultimoEnvio = new Map<string, Date>();
  for (const envio of envios) {
    if (envio.userId && !ultimoEnvio.has(envio.userId)) {
      ultimoEnvio.set(envio.userId, envio.sentAt);
    }
  }

  return membros.map((m) => ({ ...m, ultimoEnvio: ultimoEnvio.get(m.id) ?? null }));
}

export async function sendFirstAccess(userIds: string[]) {
  const batchId = randomUUID();

  // O filtro de elegibilidade e' reaplicado aqui, e nao herdado da tela: uma
  // requisicao forjada nao pode mandar "bem-vindo, defina sua senha" para quem
  // ja' tem senha -- isso geraria um token de redefinicao que ninguem pediu.
  const membros = await prisma.user.findMany({
    where: { id: { in: userIds }, role: 'MEMBER', status: 'ATIVO', passwordHash: null },
    select: { id: true, name: true, email: true },
  });

  let sent = 0;
  let failed = 0;

  for (const membro of membros) {
    const resultado = await sendWelcomeEmail(membro, { batchId });
    if (resultado.ok) sent += 1;
    else failed += 1;
  }

  return { batchId, sent, failed, total: membros.length };
}

/**
 * Historico dos disparos em lote.
 *
 * So' aparece aqui o que teve `batchId`. Os envios individuais do webhook do
 * Stripe usam o mesmo texto, mas nao sao lote e nao poluem esta lista.
 */
export async function firstAccessHistory(take = 10) {
  return batchHistory(WELCOME_TEMPLATE, take);
}
