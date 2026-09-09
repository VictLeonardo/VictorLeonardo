import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth/session';
import { canSeeVip } from '@/lib/auth/guards';

const schema = z.object({
  title: z.string().trim().min(6, 'Título muito curto').max(160),
  body: z.string().trim().min(20, 'Descreva o tópico com pelo menos 20 caracteres').max(5000),
  category: z.enum(['INVESTIMENTOS', 'MERCADO', 'TRIBUTARIO', 'REDES', 'OPORTUNIDADES']),
  isVip: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.status !== 'ATIVO') {
    return NextResponse.json({ error: 'Acesso restrito a membros ativos' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const topic = await prisma.topic.create({
    data: {
      authorId: user.id,
      title: parsed.data.title,
      body: parsed.data.body,
      category: parsed.data.category,
      // Marcar como VIP so' faz sentido para quem enxerga o espaco VIP.
      isVip: parsed.data.isVip && canSeeVip(user),
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: topic.id });
}
