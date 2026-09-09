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
