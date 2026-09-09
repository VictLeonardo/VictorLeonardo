import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword, passwordSchema } from '@/lib/auth/password';
import { hashToken } from '@/lib/auth/tokens';
import { revokeAllSessions } from '@/lib/auth/session';

const schema = z.object({
  token: z.string().min(10),
  password: passwordSchema,
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(parsed.data.token) },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  // Trocar a senha invalida sessoes antigas — inclusive a de quem tenha roubado o acesso.
  await revokeAllSessions(record.userId);

  return NextResponse.json({ ok: true });
}
