import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { listNotifications } from '@/server/notifications';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const items = await listNotifications(user.id);
  return NextResponse.json({ items });
}

/** Marca todas como lidas. */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  await prisma.notificationRecipient.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
