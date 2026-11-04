import { NextResponse } from 'next/server';
import { rotateSession } from '@/lib/auth/session';
import { rota } from '@/lib/rotas';

/**
 * Alvo do redirect emitido pelo proxy quando o access token expira e o refresh
 * ainda vale. Roda no runtime Node (precisa do banco) e devolve o usuario a rota
 * original — a renovacao e' invisivel para quem esta navegando.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get('next') ?? '/dashboard';

  // Aceita apenas caminhos internos: `next` vem da query string e um valor como
  // `//evil.com` viraria um open redirect.
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';

  // `next` vem do proxy, que le `request.nextUrl.pathname` — e esse pathname ja'
  // vem SEM o basePath. Montar o redirect sobre `url.origin` descartaria o
  // prefixo e jogaria a pessoa em /login em vez de /viplounge/login.
  const destino = rota(safeNext);

  const rotated = await rotateSession();
  if (!rotated) {
    const login = new URL(rota('/login'), url.origin);
    login.searchParams.set('next', safeNext);
    return NextResponse.redirect(login);
  }

  return NextResponse.redirect(new URL(destino, url.origin));
}
