import 'server-only';
import { redirect } from 'next/navigation';
import { getSessionUser, type SessionUser } from './session';
import { lerMatriz, podeAbrir, telasLiberadas } from '@/server/acesso';

/** Exige sessao valida. Sem sessao, volta ao login preservando o destino. */
export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect(returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : '/login');
  }
  return user;
}

/**
 * Exige membro com assinatura ativa. Cancelados sao levados para a pagina de
 * reativacao em vez de um 403 seco — eles continuam sendo clientes.
 */
export async function requireActiveMember(returnTo?: string): Promise<SessionUser> {
  const user = await requireUser(returnTo);
  if (user.role === 'ADMIN') return user;
  if (user.status === 'CANCELADO') redirect('/reativar');
  if (user.status === 'PENDENTE') redirect('/primeiro-acesso');
  return user;
}

/**
 * Exige membro ativo com tier que abre esta tela.
 *
 * Substitui `requireActiveMember` nas telas do portal. Recebe o mesmo caminho
 * que aquele ja' recebia, entao a troca e' de uma palavra por pagina.
 *
 * Quem nao pode cai na primeira tela que o tier dele abre, e nao num 403: o
 * membro nao fez nada de errado, so' pediu algo que o plano dele nao inclui.
 * Se nao abrir nenhuma, vai para o perfil, que a matriz nao governa -- assim
 * ninguem fica preso num redirecionamento que volta para si mesmo.
 */
export async function requireTela(href: string): Promise<SessionUser> {
  const user = await requireActiveMember(href);
  if (user.role === 'ADMIN') return user;

  const matriz = await lerMatriz();
  if (podeAbrir(matriz, href, user.tier)) return user;

  const [primeira] = telasLiberadas(matriz, user.tier);
  redirect(primeira ?? '/perfil');
}

export async function requireAdmin(returnTo?: string): Promise<SessionUser> {
  const user = await requireUser(returnTo);
  if (user.role !== 'ADMIN') redirect('/dashboard');
  return user;
}

/** Conteudo marcado como VIP so abre para tier VIP (admin ve tudo). */
export function canSeeVip(user: SessionUser | null): boolean {
  if (!user) return false;
  return user.role === 'ADMIN' || user.tier === 'VIP';
}

/** Filtro de visibilidade aplicado em toda consulta de conteudo do portal. */
export function visibilityFilter(user: SessionUser | null) {
  return canSeeVip(user) ? undefined : { visibility: 'TODOS' as const };
}
