import 'server-only';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { renderEmail, sendMail } from '@/lib/mail';
import { createOpaqueToken } from '@/lib/auth/tokens';

/**
 * E-mail de primeiro acesso.
 *
 * Existem duas portas de entrada na comunidade, o cadastro pelo admin e o
 * checkout do Stripe, e as duas terminam aqui. Manter um caminho unico garante
 * que o prazo do link, o texto e o registro no historico de disparos sejam os
 * mesmos, venha o membro de onde vier.
 *
 * A senha nunca viaja por e-mail: o que vai e' um link de definicao, de uso
 * unico, com validade de sete dias.
 */
export const DIAS_DE_VALIDADE = 7;

export async function sendWelcomeEmail(member: {
  id: string;
  name: string;
  email: string;
}): Promise<void> {
  const token = createOpaqueToken();

  await prisma.passwordResetToken.create({
    data: {
      userId: member.id,
      tokenHash: token.hash,
      expiresAt: new Date(Date.now() + DIAS_DE_VALIDADE * 24 * 60 * 60 * 1000),
    },
  });

  await sendMail({
    to: member.email,
    userId: member.id,
    template: 'boas-vindas',
    subject: 'Bem-vindo à SM Smart Money',
    html: renderEmail({
      title: 'Seu acesso está pronto',
      intro: `Olá, ${member.name.split(' ')[0]}. Você agora faz parte da comunidade SM Smart Money.`,
      body: `<p>Defina sua senha pelo botão abaixo e comece pelo diagnóstico Smart Money Journey. O link vale por ${DIAS_DE_VALIDADE} dias.</p>`,
      ctaLabel: 'Definir minha senha',
      ctaUrl: `${env.NEXT_PUBLIC_APP_URL}/redefinir-senha?token=${token.raw}`,
    }),
  });
}
