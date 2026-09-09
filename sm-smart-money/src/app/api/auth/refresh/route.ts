import { NextResponse } from 'next/server';
import { rotateSession } from '@/lib/auth/session';

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

  const rotated = await rotateSession();
  if (!rotated) {
    const login = new URL('/login', url.origin);
    login.searchParams.set('next', safeNext);
    return NextResponse.redirect(login);
  }

  return NextResponse.redirect(new URL(safeNext, url.origin));
}
