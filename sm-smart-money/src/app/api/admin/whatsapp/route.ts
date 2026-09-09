import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth/session';
import { recordAudit } from '@/lib/audit';
import { getWahaQrCode, restartWahaSession, stopWahaSession } from '@/lib/waha';

const schema = z.object({ action: z.enum(['reiniciar', 'desconectar', 'qrcode']) });

export async function POST(request: Request) {
  const admin = await getSessionUser();
  if (admin?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  }

  if (parsed.data.action === 'qrcode') {
    const qr = await getWahaQrCode();
    return qr
      ? NextResponse.json({ ok: true, qr })
      : NextResponse.json({ error: 'QR Code indisponível no momento' }, { status: 502 });
  }

  const result =
    parsed.data.action === 'reiniciar' ? await restartWahaSession() : await stopWahaSession();

  await recordAudit({
    actor: admin,
    action: parsed.data.action === 'reiniciar' ? 'whatsapp.reiniciar' : 'whatsapp.desconectar',
    entity: 'waha',
    metadata: { sucesso: result.ok, erro: result.error ?? null },
  });

  return result.ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: result.error ?? 'Falha na operação' }, { status: 502 });
}
