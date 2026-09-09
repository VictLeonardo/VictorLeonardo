import 'server-only';
import { prisma } from '@/lib/prisma';
import { profileSlugFromName } from '@/lib/utils';

/**
 * Garante um slug unico. O primeiro membro chamado "Ana Souza" fica com
 * `ana-souza`; o segundo recebe `ana-souza-2`, e assim por diante.
 */
export async function uniqueSlug(name: string, ignoreUserId?: string): Promise<string> {
  const base = profileSlugFromName(name) || 'membro';
  let candidate = base;
  let suffix = 1;

  for (;;) {
    const existing = await prisma.profile.findUnique({
      where: { slug: candidate },
      select: { userId: true },
    });
    if (!existing || existing.userId === ignoreUserId) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

/** Cria o perfil (inativo) junto com o membro, para o slug ja' existir no cadastro. */
export async function ensureProfile(userId: string, name: string) {
  const existing = await prisma.profile.findUnique({ where: { userId } });
  if (existing) return existing;

  return prisma.profile.create({
    data: { userId, slug: await uniqueSlug(name, userId) },
  });
}

export async function getProfileBySlug(slug: string) {
  return prisma.profile.findUnique({
    where: { slug },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          jobTitle: true,
          company: true,
          phone: true,
          tier: true,
          isPartner: true,
          status: true,
          role: true,
        },
      },
    },
  });
}
