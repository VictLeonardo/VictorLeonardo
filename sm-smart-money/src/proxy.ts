import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE, verifyAccessToken } from '@/lib/auth/tokens';

/**
 * Camada de roteamento por role (Next 16 chama este arquivo de "proxy"; era o
 * antigo middleware). Roda no edge, entao nao toca no banco: valida a assinatura
 * do access token e decide o destino.
 *
 * Quando o access expira mas o refresh ainda existe, redireciona para
 * /api/auth/refresh, que rotaciona os tokens no runtime Node e devolve o usuario
 * a rota original — a sessao se renova sem o membro perceber.
 */

const PORTAL_PREFIXES = [
  '/dashboard',
  '/palestras',
  '/conteudo',
  '/midia',
  '/analises',
  '/journey',
  '/ebooks',
  '/comunidade',
  '/perfil',
  '/notificacoes',
  '/assinatura',
];

const PUBLIC_PREFIXES = [
  '/login',
  '/esqueci-senha',
  '/redefinir-senha',
  // Entrada de quem ainda nao e' membro, e o retorno do checkout. A conferencia
  // publica vem antes da de portal, entao /assinatura/sucesso escapa da regra
  // que protege /assinatura.
  '/assinar',
  '/assinatura/sucesso',
  '/api/auth',
  '/api/cron',
  // O Stripe chama sem cookie nenhum; a prova e' a assinatura do corpo.
  '/api/stripe',
  // As rotas de assinatura conferem a sessao por conta propria e respondem 401.
  // Deixar o proxy redirecionar devolveria HTML de login para um fetch.
  '/api/assinatura',
  '/_next',
  '/favicon',
  '/icon',
  '/opengraph-image',
  '/robots.txt',
  '/sitemap.xml',
];

function isPortalPath(pathname: string) {
  return PORTAL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/');
  const isProtected =
    isAdminPath ||
    isPortalPath(pathname) ||
    pathname === '/reativar' ||
    pathname === '/primeiro-acesso';

  if (!isProtected) {
    // Rotas restantes sao perfis publicos /{slug} — resolvidos na propria pagina.
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const claims = accessToken ? await verifyAccessToken(accessToken) : null;

  if (!claims) {
    const hasRefresh = Boolean(request.cookies.get(REFRESH_COOKIE)?.value);
    if (hasRefresh) {
      const url = new URL('/api/auth/refresh', request.url);
      url.searchParams.set('next', `${pathname}${search}`);
      return NextResponse.redirect(url);
    }
    const login = new URL('/login', request.url);
    login.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  if (isAdminPath && claims.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (claims.role !== 'ADMIN' && claims.status === 'CANCELADO' && pathname !== '/reativar') {
    return NextResponse.redirect(new URL('/reativar', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|ico|webp|woff2?)$).*)'],
};
