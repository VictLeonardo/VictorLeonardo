import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth/session';
import { recordAudit } from '@/lib/audit';
import { renderEmail, sendMail } from '@/lib/mail';
import { sendWhatsappMessage } from '@/lib/waha';
import { createOpaqueToken } from '@/lib/auth/tokens';
import { env } from '@/lib/env';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('reset-senha') }),
  z.object({
    action: z.literal('email'),
    subject: z.string().trim().min(3).max(160),
    message: z.string().trim().min(10).max(4000),
  }),
  z.object({ action: z.literal('whatsapp'), message: z.string().trim().min(2).max(1000) }),
]);

/** Acoes pontuais sobre um membro, todas registradas no audit log. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getSessionUser();
  if (admin?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { id } = await params;
  const member = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, phone: true },
  });
  if (!member) return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 });

  const body = parsed.data;

  if (body.action === 'reset-senha') {
    const token = createOpaqueToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: member.id,
        tokenHash: token.hash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const link = `${env.NEXT_PUBLIC_APP_URL}/redefinir-senha?token=${token.raw}`;
    await sendMail({
      to: member.email,
      userId: member.id,
      template: 'reset-senha-admin',
      subject: 'Redefinição de senha · SM Smart Money',
      html: renderEmail({
        title: 'Redefinir sua senha',
        intro: `Ola, ${member.name.split(' ')[0]}. A equipe SM gerou um link para voce criar uma nova senha.`,
        body: '<p>O link vale por 24 horas e so pode ser usado uma vez.</p>',
        ctaLabel: 'Criar nova senha',
        ctaUrl: link,
      }),
    });

    await recordAudit({
      actor: admin,
      action: 'membro.reset_senha',
      entity: 'user',
      entityId: member.id,
      metadata: { email: member.email },
    });

    // O link volta para a tela para o admin repassar por outro canal se preciso.
    return NextResponse.json({ ok: true, link });
  }

  if (body.action === 'email') {
    const result = await sendMail({
      to: member.email,
      userId: member.id,
      template: 'manual',
      subject: body.subject,
      html: renderEmail({
        title: body.subject,
        intro: `Ola, ${member.name.split(' ')[0]}.`,
        body: `<p>${body.message.replace(/\n/g, '<br />')}</p>`,
      }),
    });

    await recordAudit({
      actor: admin,
      action: 'membro.email_manual',
      entity: 'user',
      entityId: member.id,
      metadata: { subject: body.subject, enviado: result.ok },
    });

    return result.ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: result.error }, { status: 502 });
  }

  if (!member.phone) {
    return NextResponse.json({ error: 'Membro sem WhatsApp cadastrado' }, { status: 400 });
  }

  const result = await sendWhatsappMessage({
    phone: member.phone,
    message: body.message,
    kind: 'manual',
    userId: member.id,
  });

  await recordAudit({
    actor: admin,
    action: 'whatsapp.mensagem',
    entity: 'user',
    entityId: member.id,
    metadata: { enviado: result.ok },
  });

  return result.ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: result.error ?? 'Falha no envio' }, { status: 502 });
}
