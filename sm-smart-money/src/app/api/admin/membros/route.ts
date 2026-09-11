import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth/session';
import { recordAudit } from '@/lib/audit';
import { ensureProfile } from '@/server/profile';
import { sendWelcomeEmail } from '@/server/welcome';
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
    return NextResponse.json({ error: 'Já existe um membro com este e-mail' }, { status: 409 });
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

  // O primeiro acesso e' um link de definicao de senha, nunca uma senha por
  // e-mail. O mesmo caminho serve ao checkout do Stripe.
  if (data.sendWelcome) {
    await sendWelcomeEmail(user);
  }

  return NextResponse.json({ ok: true, id: user.id });
}
