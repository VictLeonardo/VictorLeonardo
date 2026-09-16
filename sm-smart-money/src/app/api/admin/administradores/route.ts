import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionUser, revokeAllSessions } from '@/lib/auth/session';
import { recordAudit } from '@/lib/audit';

const schema = z.object({ userId: z.string().min(1, 'Selecione um membro') });

/**
 * Promove um membro a administrador.
 *
 * E' a acao de maior privilegio da plataforma: quem passa por aqui ganha acesso
 * a todos os dados de todos os membros, ao disparo em massa e a cobranca. Por
 * isso ela fica registrada na auditoria com quem promoveu e quem foi promovido.
 */
export async function POST(request: Request) {
  const admin = await getSessionUser();
  if (admin?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const alvo = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!alvo) return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 });
  if (alvo.role === 'ADMIN') {
    return NextResponse.json({ error: 'Esse membro já é administrador' }, { status: 409 });
  }

  await prisma.user.update({ where: { id: alvo.id }, data: { role: 'ADMIN' } });

  // A sessao dele carrega o papel antigo no token ate' expirar, e o roteador de
  // borda decide por ele. Revogar faz o acesso novo valer na hora, e nao daqui
  // a quinze minutos.
  await revokeAllSessions(alvo.id);

  await recordAudit({
    actor: admin,
    action: 'admin.promover',
    entity: 'user',
    entityId: alvo.id,
    metadata: { nome: alvo.name, email: alvo.email },
  });

  return NextResponse.json({ ok: true });
}
