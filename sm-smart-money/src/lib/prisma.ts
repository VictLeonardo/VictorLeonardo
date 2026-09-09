import { PrismaClient } from '@prisma/client';

/**
 * Em dev o hot reload recria modulos a cada troca de arquivo. Sem o cache no
 * globalThis cada reload abriria um novo pool de conexoes ate estourar o limite
 * do Postgres.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
