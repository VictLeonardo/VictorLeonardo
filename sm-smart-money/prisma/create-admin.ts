import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { passwordSchema } from '../src/lib/auth/password';
import { profileSlugFromName } from '../src/lib/utils';

/**
 * Cria o primeiro administrador de um ambiente, ou promove alguem que ja exista.
 *
 * O seed nao serve para isso: ele limpa as tabelas e popula dados de exemplo.
 * Este comando so escreve o usuario informado e nao toca em mais nada, entao
 * pode rodar com seguranca num banco de producao ja em uso.
 *
 *   ADMIN_NAME="Victor Leonardo" \
 *   ADMIN_EMAIL="victor@dominio.com.br" \
 *   ADMIN_PASSWORD="..." \
 *   npm run db:create-admin
 */

const prisma = new PrismaClient();

async function uniqueSlug(name: string, ignoreUserId?: string): Promise<string> {
  const base = profileSlugFromName(name) || 'admin';
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

async function main() {
  const name = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new Error(
      'Informe ADMIN_NAME, ADMIN_EMAIL e ADMIN_PASSWORD.\n' +
        '  Exemplo: ADMIN_NAME="Seu Nome" ADMIN_EMAIL="voce@dominio.com" ADMIN_PASSWORD="..." npm run db:create-admin',
    );
  }

  const senha = passwordSchema.safeParse(password);
  if (!senha.success) {
    throw new Error(`Senha fraca: ${senha.error.issues.map((i) => i.message).join('; ')}`);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existente = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });

  const user = existente
    ? await prisma.user.update({
        where: { id: existente.id },
        data: { name, passwordHash, role: 'ADMIN', status: 'ATIVO' },
        select: { id: true, email: true },
      })
    : await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: 'ADMIN',
          status: 'ATIVO',
          plan: 'CORTESIA',
          tier: 'VIP',
        },
        select: { id: true, email: true },
      });

  // O perfil nasce inativo: quem decide publicar e' o proprio dono.
  const perfil = await prisma.profile.findUnique({ where: { userId: user.id } });
  if (!perfil) {
    await prisma.profile.create({
      data: { userId: user.id, slug: await uniqueSlug(name, user.id) },
    });
  }

  console.log(existente ? `Promovido a admin: ${user.email}` : `Admin criado: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
