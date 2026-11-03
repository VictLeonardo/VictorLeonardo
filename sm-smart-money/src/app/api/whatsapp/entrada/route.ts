import { NextResponse } from 'next/server';
import { z } from 'zod';
import { mensagemDeValidacao } from '@/lib/validacao';
import { ehAgenteAutorizado } from '@/lib/cron';
import { decidirEntrada } from '@/server/entrada-grupo';

export const dynamic = 'force-dynamic';

const schema = z.object({
  // Aceita qualquer texto curto de proposito: julgar se e' telefone e' de
  // `decidirEntrada`, que registra o motivo na auditoria. Recusar aqui faria o
  // pedido sumir sem deixar rastro de que chegou.
  telefone: z.string().trim().min(1).max(40),
  grupoId: z.string().trim().min(1).max(80),
  metodo: z.string().trim().max(40).nullish(),
});

/**
 * Pergunta do agente: "esse numero pediu entrada no grupo; deixo entrar?"
 *
 * A decisao mora aqui, e nao na VPS, para a regra de quem e' membro existir num
 * lugar so' e para a VPS nao precisar de credencial do banco. O agente guarda
 * apenas o segredo compartilhado.
 */
export async function POST(request: Request) {
  if (!ehAgenteAutorizado(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: mensagemDeValidacao(parsed.error) }, { status: 400 });
  }

  const decisao = await decidirEntrada({
    telefone: parsed.data.telefone,
    grupoId: parsed.data.grupoId,
    metodo: parsed.data.metodo ?? null,
  });

  return NextResponse.json(decisao);
}
