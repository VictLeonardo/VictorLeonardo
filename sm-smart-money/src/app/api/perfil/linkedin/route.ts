import { NextResponse } from 'next/server';
import { z } from 'zod';
import { linkedinObrigatorio } from '@/lib/linkedin';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth/session';
import { ensureProfile } from '@/server/profile';

const schema = z.object({ linkedinUrl: linkedinObrigatorio });

/**
 * Grava so' o LinkedIn.
 *
 * Existe separada de PUT /api/perfil porque a tela de pendencia tem um campo
 * so': aquela rota exige nome, visibilidade e o resto do perfil, e mandar tudo
 * isso de uma tela que nao mostra nada disso seria inventar valores em nome do
 * membro.
 */
export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    // Sem o nome do campo na frente: a tela tem um campo so', e "linkedinUrl:"
    // seria o nome interno dele vazando para quem esta' preenchendo.
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const profile = await ensureProfile(user.id, user.name);
  await prisma.profile.update({
    where: { id: profile.id },
    data: { linkedinUrl: parsed.data.linkedinUrl },
  });

  return NextResponse.json({ ok: true, linkedinUrl: parsed.data.linkedinUrl });
}
