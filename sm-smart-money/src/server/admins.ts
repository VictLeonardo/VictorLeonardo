import 'server-only';
import { prisma } from '@/lib/prisma';

/**
 * Contas com poder administrativo.
 *
 * Elas viviam fora do alcance da interface: a listagem de membros filtra
 * `role: 'MEMBER'`, entao quem administra a plataforma nao aparecia em tela
 * nenhuma. Nao dava para saber quantos existem, quem sao, nem revogar o acesso
 * de alguem que saiu da operacao sem abrir o banco.
 */

export type Administrador = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  lastLoginAt: Date | null;
};

export async function listarAdministradores(): Promise<Administrador[]> {
  return prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true, name: true, email: true, createdAt: true, lastLoginAt: true },
    orderBy: { name: 'asc' },
  });
}

/** Membros que podem virar administradores. O status aparece para quem escolhe. */
export async function membrosPromoviveis() {
  return prisma.user.findMany({
    where: { role: 'MEMBER' },
    select: { id: true, name: true, email: true, status: true },
    orderBy: { name: 'asc' },
  });
}
