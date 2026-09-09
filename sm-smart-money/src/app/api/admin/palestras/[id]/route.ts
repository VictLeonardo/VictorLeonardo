import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth/session';
import { recordAudit } from '@/lib/audit';
import { lectureDataFrom, lectureSchema, resolveSpeaker, uniqueLectureSlug } from '../route';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getSessionUser();
  if (admin?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
  }

  const parsed = lectureSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { id } = await params;
  const existing = await prisma.lecture.findUnique({ where: { id }, select: { slug: true } });
  if (!existing) return NextResponse.json({ error: 'Palestra não encontrada' }, { status: 404 });

  const slug = await uniqueLectureSlug(parsed.data.title, parsed.data.slug || existing.slug, id);
  const speakerId = await resolveSpeaker(parsed.data);

  await prisma.lecture.update({ where: { id }, data: lectureDataFrom(parsed.data, slug, speakerId) });

  await recordAudit({
    actor: admin,
    action: 'palestra.atualizar',
    entity: 'lecture',
    entityId: id,
    metadata: { title: parsed.data.title, status: parsed.data.status },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getSessionUser();
  if (admin?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
  }

  const { id } = await params;
  const lecture = await prisma.lecture.findUnique({ where: { id }, select: { title: true } });
  if (!lecture) return NextResponse.json({ error: 'Palestra não encontrada' }, { status: 404 });

  await prisma.lecture.delete({ where: { id } });

  await recordAudit({
    actor: admin,
    action: 'palestra.excluir',
    entity: 'lecture',
    entityId: id,
    metadata: { title: lecture.title },
  });

  return NextResponse.json({ ok: true });
}
