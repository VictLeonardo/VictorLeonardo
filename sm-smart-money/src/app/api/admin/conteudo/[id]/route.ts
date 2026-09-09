import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth/session';
import { recordAudit } from '@/lib/audit';
import { contentDataFrom, contentSchema, uniqueContentSlug } from '../route';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getSessionUser();
  if (admin?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
  }

  const parsed = contentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { id } = await params;
  const existing = await prisma.content.findUnique({
    where: { id },
    select: { id: true, slug: true, status: true, publishedAt: true },
  });
  if (!existing) return NextResponse.json({ error: 'Conteúdo não encontrado' }, { status: 404 });

  const slug = await uniqueContentSlug(parsed.data.title, parsed.data.slug || existing.slug, id);
  const data = contentDataFrom(parsed.data, slug, admin.id);

  // Republicar nao reescreve a data original de publicacao.
  if (existing.publishedAt && parsed.data.status === 'PUBLICADO' && !parsed.data.scheduledFor) {
    data.publishedAt = existing.publishedAt;
  }

  await prisma.content.update({ where: { id }, data });

  await recordAudit({
    actor: admin,
    action:
      parsed.data.status === 'ARQUIVADO'
        ? 'conteudo.arquivar'
        : existing.status !== 'PUBLICADO' && parsed.data.status === 'PUBLICADO'
          ? 'conteudo.publicar'
          : 'conteudo.atualizar',
    entity: 'content',
    entityId: id,
    metadata: { title: parsed.data.title, status: parsed.data.status },
  });

  return NextResponse.json({ ok: true, slug });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getSessionUser();
  if (admin?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
  }

  const { id } = await params;
  const content = await prisma.content.findUnique({
    where: { id },
    select: { title: true, type: true },
  });
  if (!content) return NextResponse.json({ error: 'Conteúdo não encontrado' }, { status: 404 });

  await prisma.content.delete({ where: { id } });

  await recordAudit({
    actor: admin,
    action: 'conteudo.excluir',
    entity: 'content',
    entityId: id,
    metadata: { title: content.title, type: content.type },
  });

  return NextResponse.json({ ok: true });
}
