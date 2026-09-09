import { createHash, randomBytes } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '@/lib/env';

export const ACCESS_COOKIE = 'sm_access';
export const REFRESH_COOKIE = 'sm_refresh';
export const REMEMBER_COOKIE = 'sm_remember';

export type AccessClaims = {
  sub: string;
  email: string;
  name: string;
  role: 'MEMBER' | 'ADMIN';
  status: 'ATIVO' | 'CANCELADO' | 'PENDENTE';
  tier: 'PADRAO' | 'VIP';
};

const secret = new TextEncoder().encode(env.AUTH_SECRET);

export async function signAccessToken(claims: AccessClaims): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setIssuer('sm-smart-money')
    .setExpirationTime(`${env.AUTH_ACCESS_MINUTES}m`)
    .sign(secret);
}

/** Roda tambem no edge runtime (proxy.ts), por isso `jose` e nao `jsonwebtoken`. */
export async function verifyAccessToken(token: string): Promise<AccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { issuer: 'sm-smart-money' });
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ''),
      name: String(payload.name ?? ''),
      role: payload.role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
      status: (payload.status as AccessClaims['status']) ?? 'PENDENTE',
      tier: payload.tier === 'VIP' ? 'VIP' : 'PADRAO',
    };
  } catch {
    return null;
  }
}

/**
 * O refresh token e' um valor opaco: o cliente recebe o valor bruto no cookie e
 * o banco guarda apenas o SHA-256. Vazamento do banco nao permite autenticar.
 */
export function createOpaqueToken(): { raw: string; hash: string } {
  const raw = randomBytes(48).toString('base64url');
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export const accessMaxAge = () => env.AUTH_ACCESS_MINUTES * 60;
export const refreshMaxAge = (remember: boolean) =>
  (remember ? env.AUTH_REMEMBER_DAYS : env.AUTH_REFRESH_DAYS) * 24 * 60 * 60;
