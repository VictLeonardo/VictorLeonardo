import 'server-only';
import { env, wahaConfigured } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { normalizePhone } from '@/lib/utils';

/**
 * Cliente da WAHA (WhatsApp HTTP API). Toda chamada tem timeout proprio: uma
 * instancia travada nao pode segurar o carregamento do dashboard admin.
 */

export type WahaStatus = {
  configured: boolean;
  connected: boolean;
  state: string;
  phone: string | null;
  detail?: string;
};

const TIMEOUT_MS = 6000;

async function wahaFetch(path: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${env.WAHA_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(env.WAHA_API_KEY ? { 'X-Api-Key': env.WAHA_API_KEY } : {}),
        ...(init?.headers ?? {}),
      },
      cache: 'no-store',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function getWahaStatus(): Promise<WahaStatus> {
  if (!wahaConfigured) {
    return { configured: false, connected: false, state: 'NAO_CONFIGURADA', phone: null };
  }
  try {
    const res = await wahaFetch(`/api/sessions/${env.WAHA_SESSION}`);
    if (!res.ok) {
      return {
        configured: true,
        connected: false,
        state: 'ERRO',
        phone: null,
        detail: `HTTP ${res.status}`,
      };
    }
    const data = (await res.json()) as {
      status?: string;
      me?: { id?: string; pushName?: string };
    };
    const state = data.status ?? 'DESCONHECIDO';
    return {
      configured: true,
      connected: state === 'WORKING',
      state,
      phone: data.me?.id ? data.me.id.split('@')[0] : null,
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      state: 'INACESSIVEL',
      phone: null,
      detail: error instanceof Error ? error.message : 'Falha na conexão',
    };
  }
}

export async function getWahaQrCode(): Promise<string | null> {
  if (!wahaConfigured) return null;
  try {
    const res = await wahaFetch(`/api/${env.WAHA_SESSION}/auth/qr?format=image`);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return `data:image/png;base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

export async function restartWahaSession(): Promise<{ ok: boolean; error?: string }> {
  return sessionAction('restart');
}

export async function stopWahaSession(): Promise<{ ok: boolean; error?: string }> {
  return sessionAction('stop');
}

async function sessionAction(action: 'restart' | 'stop') {
  if (!wahaConfigured) return { ok: false, error: 'WAHA não configurada' };
  try {
    const res = await wahaFetch(`/api/sessions/${env.WAHA_SESSION}/${action}`, { method: 'POST' });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Falha na conexão' };
  }
}

/** Envia texto e registra em WhatsappLog, com sucesso ou falha. */
export async function sendWhatsappMessage(params: {
  phone: string;
  message: string;
  kind: string;
  userId?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const phone = normalizePhone(params.phone);
  let ok = false;
  let error: string | undefined;

  if (!wahaConfigured) {
    error = 'WAHA não configurada';
    console.info(`[waha:dry-run] ${params.kind} -> ${phone}: ${params.message.slice(0, 60)}`);
  } else {
    try {
      const res = await wahaFetch('/api/sendText', {
        method: 'POST',
        body: JSON.stringify({
          session: env.WAHA_SESSION,
          chatId: `${phone}@c.us`,
          text: params.message,
        }),
      });
      ok = res.ok;
      if (!res.ok) error = `HTTP ${res.status}`;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Falha na conexão';
    }
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

export const WAHA_STATE_LABELS: Record<string, string> = {
  WORKING: 'Conectada',
  STARTING: 'Iniciando',
  SCAN_QR_CODE: 'Aguardando QR Code',
  FAILED: 'Falhou',
  STOPPED: 'Parada',
  ERRO: 'Erro na API',
  INACESSIVEL: 'Inacessível',
  NAO_CONFIGURADA: 'Não configurada',
  DESCONHECIDO: 'Desconhecido',
};
