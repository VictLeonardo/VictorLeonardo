import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth/session';
import { recordAudit } from '@/lib/audit';
import { ensureProfile } from '@/server/profile';
import { renderEmail, sendMail } from '@/lib/mail';
import { createOpaqueToken } from '@/lib/auth/tokens';
import { env } from '@/lib/env';
import { normalizePhone } from '@/lib/utils';

const schema = z.object({
  name: z.string().trim().min(3, 'Informe o nome completo').max(120),
  email: z.string().trim().email('E-mail inválido'),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  jobTitle: z.string().trim().max(120).optional().or(z.literal('')),
  company: z.string().trim().max(120).optional().or(z.literal('')),
  plan: z.enum(['PADRAO', 'COM_DESCONTO', 'CORTESIA']),
  status: z.enum(['ATIVO', 'CANCELADO', 'PENDENTE']).default('ATIVO'),
  tier: z.enum(['PADRAO', 'VIP']).default('PADRAO'),
  isPartner: z.boolean().default(false),
  sendWelcome: z.boolean().default(true),
});

export async function POST(request: Request) {
  const admin = await getSessionUser();
  if (admin?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const data = parsed.data;
  const email = data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ error: 'Ja existe um membro com este e-mail' }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email,
      phone: data.phone ? normalizePhone(data.phone) : null,
      jobTitle: data.jobTitle || null,
      company: data.company || null,
      plan: data.plan,
      status: data.status,
      tier: data.tier,
      isPartner: data.isPartner,
    },
    select: { id: true, name: true, email: true },
  });

  // O perfil (inativo) nasce junto do membro para o slug ja' existir no cadastro.
  await ensureProfile(user.id, user.name);

  await recordAudit({
    actor: admin,
    action: 'membro.criar',
    entity: 'user',
    entityId: user.id,
    metadata: { email: user.email, plan: data.plan, status: data.status },
  });

  if (data.sendWelcome) {
    // O primeiro acesso e' um link de definicao de senha — nunca uma senha por e-mail.
    const token = createOpaqueToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: token.hash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await sendMail({
      to: user.email,
      userId: user.id,
      template: 'boas-vindas',
      subject: 'Bem-vindo a SM Smart Money',
      html: renderEmail({
        title: 'Seu acesso está pronto',
        intro: `Ola, ${user.name.split(' ')[0]}. Voce agora faz parte da comunidade SM Smart Money.`,
        body: '<p>Defina sua senha pelo botao abaixo e comece pelo diagnóstico Smart Money Journey. O link vale por 7 dias.</p>',
        ctaLabel: 'Definir minha senha',
        ctaUrl: `${env.NEXT_PUBLIC_APP_URL}/redefinir-senha?token=${token.raw}`,
      }),
    });
  }

  return NextResponse.json({ ok: true, id: user.id });
}
