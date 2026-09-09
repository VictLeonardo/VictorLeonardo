import { NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { renderEmail, sendMail } from '@/lib/mail';
import { createOpaqueToken } from '@/lib/auth/tokens';

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Informe um e-mail valido' }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });

  // Responde igual existindo ou nao o e-mail — nao expor quem e' membro.
  if (user) {
    const token = createOpaqueToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: token.hash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const link = `${env.NEXT_PUBLIC_APP_URL}/redefinir-senha?token=${token.raw}`;
    await sendMail({
      to: email,
      userId: user.id,
      template: 'reset-senha',
      subject: 'Redefinição de senha · SM Smart Money',
      html: renderEmail({
        title: 'Redefinir sua senha',
        intro: `Ola, ${user.name.split(' ')[0]}. Recebemos um pedido para redefinir a senha da sua conta na comunidade.`,
        body: '<p>O link abaixo vale por 1 hora e so pode ser usado uma vez.</p>',
        ctaLabel: 'Criar nova senha',
        ctaUrl: link,
        footnote: 'Se você não pediu esta alteração, ignore este e-mail — nada muda.',
      }),
    });
  }

  return NextResponse.json({ ok: true });
}
