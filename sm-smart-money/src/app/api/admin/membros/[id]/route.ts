import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionUser, revokeAllSessions } from '@/lib/auth/session';
import { recordAudit } from '@/lib/audit';
import { normalizePhone } from '@/lib/utils';

const schema = z.object({
  name: z.string().trim().min(3).max(120).optional(),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  jobTitle: z.string().trim().max(120).optional().or(z.literal('')),
  company: z.string().trim().max(120).optional().or(z.literal('')),
  plan: z.enum(['PADRAO', 'COM_DESCONTO', 'CORTESIA']).optional(),
  status: z.enum(['ATIVO', 'CANCELADO', 'PENDENTE']).optional(),
  tier: z.enum(['PADRAO', 'VIP']).optional(),
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
    select: { id: true, name: true, status: true, plan: true },
  });
  if (!current) return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 });

  const data = parsed.data;
  const becomingCanceled = data.status === 'CANCELADO' && current.status !== 'CANCELADO';
  const beingReactivated = data.status === 'ATIVO' && current.status === 'CANCELADO';

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(data.name ? { name: data.name } : {}),
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
      antes: { status: current.status, plan: current.plan },
      depois: { status: updated.status, plan: updated.plan },
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
