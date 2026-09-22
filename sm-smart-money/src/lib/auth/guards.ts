import 'server-only';
import { redirect } from 'next/navigation';
import type { Visibility } from '@prisma/client';
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

/**
 * As visibilidades que este membro alcanca.
 *
 * `TODOS` vale para os dois niveis; as demais valem so' para o nivel homonimo,
 * como a matriz de telas trata cada tier em separado. Nao ha' hierarquia: um
 * membro Academy nao ve' o que foi marcado "apenas VIP", e vice-versa. Quem
 * quiser alcançar os dois marca `TODOS`.
 */
export function visibilidadesDe(user: SessionUser | null): Visibility[] {
  if (!user) return ['TODOS'];
  if (user.role === 'ADMIN') return ['TODOS', 'VIP', 'ACADEMY'];
  return ['TODOS', user.tier];
}

/** Se este membro alcanca um conteudo com esta visibilidade. */
export function podeVer(user: SessionUser | null, visibility: Visibility): boolean {
  return visibilidadesDe(user).includes(visibility);
}

/** Filtro de visibilidade aplicado em toda consulta de conteudo do portal. */
export function visibilityFilter(user: SessionUser | null) {
  const alcance = visibilidadesDe(user);
  // O admin alcanca tudo: filtrar seria pedir ao banco uma condicao sempre
  // verdadeira.
  return alcance.length === 3 ? undefined : { visibility: { in: alcance } };
}

/**
 * Se este membro alcanca o que era restrito ao nivel de cima.
 *
 * O topico do forum guarda a restricao num booleano, nao numa visibilidade, e
 * o nivel de cima e' o Academy desde a troca cruzada dos niveis -- antes se
 * chamava VIP, e por isso a coluna no banco ainda se chama `isVip`.
 */
export function podeVerRestrito(user: SessionUser | null): boolean {
  if (!user) return false;
  return user.role === 'ADMIN' || user.tier === 'ACADEMY';
}
