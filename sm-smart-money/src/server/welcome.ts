import 'server-only';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { renderEmail, sendMail, type MailResult } from '@/lib/mail';
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
export const WELCOME_TEMPLATE = 'boas-vindas';

/**
 * `batchId` agrupa o envio no historico quando ele faz parte de um disparo em
 * massa. O retorno deixou de ser vazio para o lote saber contar acerto e falha
 * sem reconsultar o EmailLog.
 */
export async function sendWelcomeEmail(
  member: { id: string; name: string; email: string },
  opts?: { batchId?: string },
): Promise<MailResult> {
  const token = createOpaqueToken();

  await prisma.passwordResetToken.create({
    data: {
      userId: member.id,
      tokenHash: token.hash,
      expiresAt: new Date(Date.now() + DIAS_DE_VALIDADE * 24 * 60 * 60 * 1000),
    },
  });

  return sendMail({
    to: member.email,
    userId: member.id,
    template: WELCOME_TEMPLATE,
    batchId: opts?.batchId,
    subject: 'Bem-vindo à SM Smart Money',
    html: renderEmail({
      title: 'Seu acesso está pronto',
      intro: `Olá, ${member.name.split(' ')[0]}. Você agora faz parte da comunidade SM Smart Money.`,
      body: `<p>Defina sua senha pelo botão abaixo e comece pelo diagnóstico Smart Money Journey. O link vale por ${DIAS_DE_VALIDADE} dias.</p>`,
      ctaLabel: 'Definir minha senha',
      ctaUrl: `${env.NEXT_PUBLIC_APP_URL}/redefinir-senha?token=${token.raw}`,
      // O grupo e' parte do que a assinatura entrega, e ate' agora so' aparecia
      // dentro do portal -- o membro precisava ja' ter entrado para encontrar o
      // que deveria receber junto com o acesso.
      ...(env.WHATSAPP_GROUP_URL
        ? {
            aside: {
              label: 'Entrar no grupo de WhatsApp',
              url: env.WHATSAPP_GROUP_URL,
              note: 'Notícias selecionadas e análises comentadas por Júlio Damião, no canal do dia a dia da comunidade.',
            },
          }
        : {}),
    }),
  });
}
