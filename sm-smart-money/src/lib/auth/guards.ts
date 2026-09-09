import 'server-only';
import { redirect } from 'next/navigation';
import { getSessionUser, type SessionUser } from './session';

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
