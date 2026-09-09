import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  REMEMBER_COOKIE,
  type AccessClaims,
  accessMaxAge,
  createOpaqueToken,
  hashToken,
  refreshMaxAge,
  signAccessToken,
  verifyAccessToken,
} from './tokens';

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: 'MEMBER' | 'ADMIN';
  status: 'ATIVO' | 'CANCELADO' | 'PENDENTE';
  plan: 'PADRAO' | 'COM_DESCONTO' | 'CORTESIA';
  tier: 'PADRAO' | 'VIP';
  isPartner: boolean;
  jobTitle: string | null;
  avatarUrl: string | null;
  profileSlug: string | null;
  profilePublic: boolean;
};

const cookieBase = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

/**
 * Carrega o usuario da sessao a partir do access token e confere o estado atual
 * no banco: um membro cancelado pelo admin perde acesso na proxima requisicao,
 * sem esperar o token expirar.
 *
 * `cache` deduplica a consulta dentro de uma mesma renderizacao — layout, pagina
 * e componentes aninhados compartilham um unico SELECT.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  const claims = await verifyAccessToken(token);
  if (!claims) return null;

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      plan: true,
      tier: true,
      isPartner: true,
      jobTitle: true,
      profile: { select: { slug: true, isPublic: true, avatarUrl: true } },
    },
  });
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    plan: user.plan,
    tier: user.tier,
    isPartner: user.isPartner,
    jobTitle: user.jobTitle,
    avatarUrl: user.profile?.avatarUrl ?? null,
    profileSlug: user.profile?.slug ?? null,
    profilePublic: user.profile?.isPublic ?? false,
  };
});

export function claimsFromUser(user: {
  id: string;
  email: string;
  name: string;
  role: 'MEMBER' | 'ADMIN';
  status: 'ATIVO' | 'CANCELADO' | 'PENDENTE';
  tier: 'PADRAO' | 'VIP';
}): AccessClaims {
  return {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    tier: user.tier,
  };
}

/** Emite access + refresh e grava o hash do refresh. Usado no login e no refresh. */
export async function issueSession(
  claims: AccessClaims,
  options: { remember: boolean; userAgent?: string | null },
) {
  const store = await cookies();
  const access = await signAccessToken(claims);
  const refresh = createOpaqueToken();
  const maxAge = refreshMaxAge(options.remember);

  await prisma.refreshToken.create({
    data: {
      userId: claims.sub,
      tokenHash: refresh.hash,
      expiresAt: new Date(Date.now() + maxAge * 1000),
      userAgent: options.userAgent?.slice(0, 200) ?? null,
    },
  });

  store.set(ACCESS_COOKIE, access, { ...cookieBase, maxAge: accessMaxAge() });
  store.set(REFRESH_COOKIE, refresh.raw, { ...cookieBase, maxAge });
  store.set(REMEMBER_COOKIE, options.remember ? '1' : '0', { ...cookieBase, maxAge });
}

/**
 * Rotaciona o refresh token: o antigo e' revogado no mesmo instante em que o novo
 * e' emitido, entao um token roubado deixa de valer assim que o dono usa o dele.
 */
export async function rotateSession(): Promise<boolean> {
  const store = await cookies();
  const raw = store.get(REFRESH_COOKIE)?.value;
  if (!raw) return false;

  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(raw) },
    include: {
      user: {
        select: { id: true, email: true, name: true, role: true, status: true, tier: true },
      },
    },
  });

  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) return false;

  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });

  const remember = store.get(REMEMBER_COOKIE)?.value === '1';
  await issueSession(claimsFromUser(existing.user), {
    remember,
    userAgent: existing.userAgent,
  });
  return true;
}

export async function destroySession() {
  const store = await cookies();
  const raw = store.get(REFRESH_COOKIE)?.value;
  if (raw) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(raw), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
  store.delete(REMEMBER_COOKIE);
}

/** Revoga todas as sessoes de um usuario — usado ao cancelar ou resetar senha. */
export async function revokeAllSessions(userId: string) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
