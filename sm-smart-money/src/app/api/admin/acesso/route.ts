import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Tier } from '@prisma/client';
import { getSessionUser } from '@/lib/auth/session';
import { recordAudit } from '@/lib/audit';
import { isTier } from '@/lib/domain';
import { gravarMatriz, TELAS, type MatrizDeAcesso } from '@/server/acesso';

const schema = z.object({
  matriz: z.record(z.string(), z.array(z.custom<Tier>(isTier))),
});

/** Grava quais telas do portal cada tier abre. */
export async function PUT(request: Request) {
  const admin = await getSessionUser();
  if (admin?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  const matriz = parsed.data.matriz as MatrizDeAcesso;

  // Uma tela sem nenhum tier some para todo mundo, e quem fez isso raramente
  // quis: o admin continua vendo a tela no menu dele e demora a perceber que a
  // comunidade inteira perdeu o acesso. Melhor recusar e dizer qual e'.
  const vazias = TELAS.filter((t) => (matriz[t.href] ?? []).length === 0);
  if (vazias.length > 0) {
    return NextResponse.json(
      {
        error: `Sem nenhum nível marcado, ${vazias.map((t) => t.label).join(' e ')} ${
          vazias.length > 1 ? 'desapareceriam' : 'desapareceria'
        } para todos os membros.`,
      },
      { status: 400 },
    );
  }

  await gravarMatriz(matriz);

  await recordAudit({
    actor: admin,
    action: 'configuracao.atualizar',
    entity: 'setting',
    entityId: 'acesso.telas',
    metadata: Object.fromEntries(TELAS.map((t) => [t.href, matriz[t.href] ?? []])),
  });

  return NextResponse.json({ ok: true });
}
