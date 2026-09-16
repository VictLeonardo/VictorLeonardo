import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, revokeAllSessions } from '@/lib/auth/session';
import { recordAudit } from '@/lib/audit';

/**
 * Rebaixa um administrador a membro.
 *
 * Uma unica trava basta para a plataforma nunca ficar sem quem a administre:
 * ninguem rebaixa a propria conta. Como so' administrador chega aqui, e o alvo
 * nunca e' quem pede, sempre sobra pelo menos um -- o proprio autor da acao.
 *
 * Um contador de administradores restantes chegou a existir aqui e foi retirado:
 * era inalcancavel, e uma guarda que nunca dispara faz alguem confiar numa
 * protecao que nao existe.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getSessionUser();
  if (admin?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
  }

  const { id } = await params;

  if (id === admin.id) {
    return NextResponse.json(
      { error: 'Você não pode rebaixar a própria conta. Peça a outro administrador.' },
      { status: 400 },
    );
  }

  const alvo = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!alvo || alvo.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Administrador não encontrado' }, { status: 404 });
  }

  await prisma.user.update({ where: { id }, data: { role: 'MEMBER' } });
  await revokeAllSessions(id);

  await recordAudit({
    actor: admin,
    action: 'admin.rebaixar',
    entity: 'user',
    entityId: id,
    metadata: { nome: alvo.name, email: alvo.email },
  });

  return NextResponse.json({ ok: true });
}
