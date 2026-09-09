import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyPasswordConstantTime } from '@/lib/auth/password';
import { claimsFromUser, issueSession } from '@/lib/auth/session';

const schema = z.object({
  email: z.string().email('Informe um e-mail valido'),
  password: z.string().min(1, 'Informe a senha'),
  remember: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { email, password, remember } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      tier: true,
      passwordHash: true,
    },
  });

  // Mensagem unica e comparacao em tempo constante: a resposta nao revela se o
  // e-mail existe na base.
  const valid = await verifyPasswordConstantTime(password, user?.passwordHash ?? null);
  if (!user || !valid) {
    return NextResponse.json({ error: 'E-mail ou senha incorretos' }, { status: 401 });
  }

  await issueSession(claimsFromUser(user), {
    remember,
    userAgent: request.headers.get('user-agent'),
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return NextResponse.json({
    ok: true,
    redirectTo: user.role === 'ADMIN' ? '/admin' : user.status === 'CANCELADO' ? '/reativar' : '/dashboard',
  });
}
