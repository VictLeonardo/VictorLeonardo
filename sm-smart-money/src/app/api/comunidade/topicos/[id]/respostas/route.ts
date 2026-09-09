import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth/session';
import { canSeeVip } from '@/lib/auth/guards';

const schema = z.object({ body: z.string().trim().min(2).max(5000) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.status !== 'ATIVO') {
    return NextResponse.json({ error: 'Acesso restrito a membros ativos' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Escreva uma resposta valida' }, { status: 400 });
  }

  const { id } = await params;
  const topic = await prisma.topic.findUnique({
    where: { id },
    select: { id: true, closed: true, isVip: true },
  });

  if (!topic) return NextResponse.json({ error: 'Tópico não encontrado' }, { status: 404 });
  if (topic.isVip && !canSeeVip(user)) {
    return NextResponse.json({ error: 'Tópico restrito' }, { status: 403 });
  }
  if (topic.closed) {
    return NextResponse.json({ error: 'Este tópico esta fechado' }, { status: 409 });
  }

  await prisma.topicReply.create({
    data: { topicId: topic.id, authorId: user.id, body: parsed.data.body },
  });

  return NextResponse.json({ ok: true });
}
