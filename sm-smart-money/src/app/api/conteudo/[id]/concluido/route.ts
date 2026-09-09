import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { markCompleted } from '@/server/content';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { completed?: boolean };
  await markCompleted(user.id, id, Boolean(body.completed));

  return NextResponse.json({ ok: true });
}
