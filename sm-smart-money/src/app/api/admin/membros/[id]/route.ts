import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Tier } from '@prisma/client';
import { isTier } from '@/lib/domain';
import { prisma } from '@/lib/prisma';
import { getSessionUser, revokeAllSessions } from '@/lib/auth/session';
import { recordAudit } from '@/lib/audit';
import { normalizePhone } from '@/lib/utils';
import { fromLocalInput } from '@/lib/datetime';
import { emailEmUso } from '@/server/members';
import { stripe } from '@/lib/stripe';
import { stripeConfigured } from '@/lib/env';

const schema = z.object({
  name: z.string().trim().min(3).max(120).optional(),
  // O e-mail e' identidade de login, chave unica e canal de contato. Editavel
  // porque membro troca de e-mail, e ate' agora isso so' se resolvia no banco.
  email: z.string().trim().toLowerCase().email('E-mail inválido').max(160).optional(),
  // Veio da planilha da migracao e pode estar errado. Chega como "2026-09-16".
  joinedAt: z.string().trim().optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  jobTitle: z.string().trim().max(120).optional().or(z.literal('')),
  company: z.string().trim().max(120).optional().or(z.literal('')),
  plan: z.enum(['PADRAO', 'COM_DESCONTO', 'CORTESIA']).optional(),
  status: z.enum(['ATIVO', 'CANCELADO', 'PENDENTE']).optional(),
  tier: z.custom<Tier>(isTier, { message: 'Tier inválido' }).optional(),
  isPartner: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getSessionUser();
  if (admin?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { id } = await params;
  const current = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, status: true, plan: true, stripeCustomerId: true },
  });
  if (!current) return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 });

  const data = parsed.data;
  const novoEmail = data.email && data.email !== current.email ? data.email : null;

  if (novoEmail) {
    const conflito = await emailEmUso(novoEmail, id);
    if (conflito) return NextResponse.json({ error: conflito }, { status: 409 });

    // O Stripe precisa mudar junto, e antes. O webhook de checkout encontra a
    // conta pelo e-mail que o Stripe informa: deixar os dois divergentes faria a
    // proxima cobranca criar uma conta duplicada em vez de reconhecer esta.
    //
    // Falhar aqui aborta a edicao inteira de proposito. Melhor o admin tentar de
    // novo do que os dois lados ficarem fora de sincronia sem ninguem perceber.
    if (current.stripeCustomerId && stripeConfigured) {
      try {
        await stripe().customers.update(current.stripeCustomerId, { email: novoEmail });
      } catch (error) {
        console.error('[membro] falha ao atualizar e-mail no Stripe', error);
        return NextResponse.json(
          { error: 'Não foi possível atualizar o e-mail no Stripe. Nada foi alterado.' },
          { status: 502 },
        );
      }
    }
  }
  const becomingCanceled = data.status === 'CANCELADO' && current.status !== 'CANCELADO';
  const beingReactivated = data.status === 'ATIVO' && current.status === 'CANCELADO';

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(data.name ? { name: data.name } : {}),
      ...(novoEmail ? { email: novoEmail } : {}),
      ...(data.joinedAt ? { joinedAt: fromLocalInput(data.joinedAt) } : {}),
      ...(data.phone !== undefined ? { phone: data.phone ? normalizePhone(data.phone) : null } : {}),
      ...(data.jobTitle !== undefined ? { jobTitle: data.jobTitle || null } : {}),
      ...(data.company !== undefined ? { company: data.company || null } : {}),
      ...(data.plan ? { plan: data.plan } : {}),
      ...(data.tier ? { tier: data.tier } : {}),
      ...(data.isPartner !== undefined ? { isPartner: data.isPartner } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(becomingCanceled ? { canceledAt: new Date() } : {}),
      ...(beingReactivated ? { canceledAt: null } : {}),
    },
    select: { id: true, name: true, status: true, plan: true },
  });

  // Cancelar corta o acesso agora: sem revogar, o access token valeria ate expirar.
  if (becomingCanceled) await revokeAllSessions(id);

  await recordAudit({
    actor: admin,
    action: becomingCanceled
      ? 'membro.cancelar'
      : beingReactivated
        ? 'membro.reativar'
        : 'membro.atualizar',
    entity: 'user',
    entityId: id,
    metadata: {
      antes: { status: current.status, plan: current.plan, ...(novoEmail ? { email: current.email } : {}) },
      depois: { status: updated.status, plan: updated.plan, ...(novoEmail ? { email: novoEmail } : {}) },
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getSessionUser();
  if (admin?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
  }

  const { id } = await params;
  if (id === admin.id) {
    return NextResponse.json({ error: 'Você não pode excluir a própria conta' }, { status: 400 });
  }

  const member = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!member) return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 });

  await prisma.user.delete({ where: { id } });

  // O audit log sobrevive a exclusao: actorId aponta para o admin, e o nome do
  // membro removido fica registrado no metadata.
  await recordAudit({
    actor: admin,
    action: 'membro.excluir',
    entity: 'user',
    entityId: id,
    metadata: { nome: member.name, email: member.email },
  });

  return NextResponse.json({ ok: true });
}
