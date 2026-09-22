import 'server-only';
import { whatsappConfigured, provedorWhatsapp } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { normalizePhone } from '@/lib/utils';
import type { ProvedorWhatsapp, StatusWhatsapp } from './tipos';
import { zapi } from './zapi';
import { waha } from './waha';

export type { StatusWhatsapp } from './tipos';

/** O provedor em uso, decidido pelas variaveis de ambiente. */
function provedor(): ProvedorWhatsapp | null {
  if (!whatsappConfigured) return null;
  return provedorWhatsapp === 'zapi' ? zapi : waha;
}

export const NOME_DO_PROVEDOR: Record<'waha' | 'zapi', string> = {
  waha: 'WAHA',
  zapi: 'Z-API',
};

export function nomeDoProvedorAtual(): string | null {
  return whatsappConfigured ? NOME_DO_PROVEDOR[provedorWhatsapp] : null;
}

export async function getWhatsappStatus(): Promise<StatusWhatsapp> {
  const p = provedor();
  if (!p) return { configured: false, connected: false, state: 'NAO_CONFIGURADA', phone: null };
  return p.status();
}

export async function getWhatsappQrCode(): Promise<string | null> {
  return provedor()?.qrCode() ?? null;
}

export async function restartWhatsappSession(): Promise<{ ok: boolean; error?: string }> {
  const p = provedor();
  if (!p) return { ok: false, error: 'WhatsApp não configurado' };
  return p.reiniciar();
}

export async function disconnectWhatsappSession(): Promise<{ ok: boolean; error?: string }> {
  const p = provedor();
  if (!p) return { ok: false, error: 'WhatsApp não configurado' };
  return p.desconectar();
}

/** Envia texto e registra em WhatsappLog, com sucesso ou falha. */
export async function sendWhatsappMessage(params: {
  phone: string;
  message: string;
  kind: string;
  userId?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const phone = normalizePhone(params.phone);
  const p = provedor();

  let ok = false;
  let error: string | undefined;

  if (!p) {
    error = 'WhatsApp não configurado';
    console.info(`[whatsapp:dry-run] ${params.kind} -> ${phone}: ${params.message.slice(0, 60)}`);
  } else {
    const r = await p.enviarTexto(phone, params.message);
    ok = r.ok;
    error = r.error;
  }

  await prisma.whatsappLog.create({
    data: {
      userId: params.userId ?? null,
      phone,
      kind: params.kind,
      message: params.message.slice(0, 2000),
      status: ok ? 'ENVIADO' : 'FALHOU',
      error: error ?? null,
    },
  });

  return ok ? { ok } : { ok, error };
}

export const WHATSAPP_STATE_LABELS: Record<string, string> = {
  WORKING: 'Conectada',
  STARTING: 'Iniciando',
  SCAN_QR_CODE: 'Aguardando QR Code',
  // So' o Z-API distingue este caso: a instancia esta' de pe', o celular e' que
  // esta' sem internet. O conserto e' o telefone, nao a instancia.
  CELULAR_OFFLINE: 'Celular sem internet',
  FAILED: 'Falhou',
  STOPPED: 'Parada',
  ERRO: 'Erro na API',
  INACESSIVEL: 'Inacessível',
  NAO_CONFIGURADA: 'Não configurada',
  DESCONHECIDO: 'Desconhecido',
};
