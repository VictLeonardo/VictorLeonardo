import 'server-only';
import { env } from '@/lib/env';
import { comTimeout, motivo, type ProvedorWhatsapp, type Resultado } from './tipos';

/**
 * Cliente da WAHA (WhatsApp HTTP API), auto-hospedada.
 *
 * Continua aqui inteira mesmo com o Z-API em uso: ela e' gratuita e o codigo ja'
 * estava escrito, entao quando houver VPS a volta custa uma variavel de
 * ambiente. Apagar agora seria jogar fora a alternativa.
 *
 * Nao expoe `aprovarNoGrupo`: a WAHA ganhou os endpoints de pedido de entrada
 * na 2026.8.2, e escrever contra eles sem uma instancia para testar seria
 * codigo nao verificado fingindo que funciona.
 */

async function chamar(caminho: string, init?: RequestInit): Promise<Response> {
  return comTimeout(`${env.WAHA_BASE_URL}${caminho}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(env.WAHA_API_KEY ? { 'X-Api-Key': env.WAHA_API_KEY } : {}),
      ...(init?.headers ?? {}),
    },
  });
}

export const waha: ProvedorWhatsapp = {
  nome: 'waha',

  async status() {
    try {
      const res = await chamar(`/api/sessions/${env.WAHA_SESSION}`);
      if (!res.ok) {
        return { configured: true, connected: false, state: 'ERRO', phone: null, detail: `HTTP ${res.status}` };
      }
      const dados = (await res.json()) as { status?: string; me?: { id?: string } };
      const state = dados.status ?? 'DESCONHECIDO';
      return {
        configured: true,
        connected: state === 'WORKING',
        state,
        phone: dados.me?.id ? dados.me.id.split('@')[0] : null,
      };
    } catch (erro) {
      return { configured: true, connected: false, state: 'INACESSIVEL', phone: null, detail: motivo(erro) };
    }
  },

  async qrCode() {
    try {
      const res = await chamar(`/api/${env.WAHA_SESSION}/auth/qr?format=image`);
      if (!res.ok) return null;
      const buffer = Buffer.from(await res.arrayBuffer());
      return `data:image/png;base64,${buffer.toString('base64')}`;
    } catch {
      return null;
    }
  },

  async reiniciar() {
    return acao('restart');
  },

  async desconectar() {
    return acao('stop');
  },

  async enviarTexto(telefone, mensagem) {
    try {
      const res = await chamar('/api/sendText', {
        method: 'POST',
        body: JSON.stringify({
          session: env.WAHA_SESSION,
          chatId: `${telefone}@c.us`,
          text: mensagem,
        }),
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      return { ok: true };
    } catch (erro) {
      return { ok: false, error: motivo(erro) };
    }
  },
};

async function acao(acaoNome: 'restart' | 'stop'): Promise<Resultado> {
  try {
    const res = await chamar(`/api/sessions/${env.WAHA_SESSION}/${acaoNome}`, { method: 'POST' });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true };
  } catch (erro) {
    return { ok: false, error: motivo(erro) };
  }
}
