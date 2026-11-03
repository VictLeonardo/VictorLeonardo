import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/env';

/**
 * Autenticacao das rotas de cron. Comparacao em tempo constante para o segredo
 * nao poder ser descoberto medindo o tempo de resposta.
 */
export function isAuthorizedCron(request: Request): boolean {
  if (!env.CRON_SECRET) return false;

  const header =
    request.headers.get('x-cron-secret') ??
    request.headers.get('authorization')?.replace(/^Bearer /i, '') ??
    '';

  const provided = Buffer.from(header);
  const expected = Buffer.from(env.CRON_SECRET);
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

/**
 * Autenticacao do agente que roda na VPS. Mesmo molde da do cron: comparacao em
 * tempo constante, para o segredo nao poder ser descoberto medindo a resposta.
 *
 * Sem `AGENTE_SECRET` configurado, nega -- um segredo ausente nunca pode valer
 * como "pode entrar".
 */
export function ehAgenteAutorizado(request: Request): boolean {
  if (!env.AGENTE_SECRET) return false;

  const cabecalho =
    request.headers.get('x-agente-secret') ??
    request.headers.get('authorization')?.replace(/^Bearer /i, '') ??
    '';

  const enviado = Buffer.from(cabecalho);
  const esperado = Buffer.from(env.AGENTE_SECRET);
  if (enviado.length !== esperado.length) return false;
  return timingSafeEqual(enviado, esperado);
}
