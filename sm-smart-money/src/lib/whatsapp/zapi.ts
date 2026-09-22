import 'server-only';
import { env } from '@/lib/env';
import { comTimeout, motivo, type ProvedorWhatsapp, type Resultado } from './tipos';

/**
 * Cliente do Z-API.
 *
 * Servico brasileiro, hospedado por eles. A instancia e o token vao na propria
 * URL; o terceiro segredo, o Client-Token da conta, vai no cabecalho. Os tres
 * sao credenciais -- vivem em variavel de ambiente, nunca no repositorio.
 */

function base(): string {
  return `https://api.z-api.io/instances/${env.ZAPI_INSTANCE_ID}/token/${env.ZAPI_TOKEN}`;
}

async function chamar(caminho: string, init?: RequestInit): Promise<Response> {
  return comTimeout(`${base()}${caminho}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(env.ZAPI_CLIENT_TOKEN ? { 'Client-Token': env.ZAPI_CLIENT_TOKEN } : {}),
      ...(init?.headers ?? {}),
    },
  });
}

export const zapi: ProvedorWhatsapp = {
  nome: 'zapi',

  async status() {
    try {
      const res = await chamar('/status');
      if (!res.ok) {
        return { configured: true, connected: false, state: 'ERRO', phone: null, detail: `HTTP ${res.status}` };
      }
      const dados = (await res.json()) as {
        connected?: boolean;
        error?: string;
        smartphoneConnected?: boolean;
      };

      // O Z-API responde em booleanos, nao num estado nomeado como a WAHA.
      // Traduzimos para os mesmos rotulos que o painel ja' sabe mostrar.
      //
      // `smartphoneConnected` nao tem equivalente na WAHA e vale distinguir: a
      // sessao pode estar de pe' com o celular do Julio sem internet, e ai' o
      // conserto e' o telefone dele, nao a instancia.
      const state = dados.connected
        ? 'WORKING'
        : dados.smartphoneConnected === false
          ? 'CELULAR_OFFLINE'
          : /qr/i.test(dados.error ?? '')
            ? 'SCAN_QR_CODE'
            : 'FAILED';

      return {
        configured: true,
        connected: Boolean(dados.connected),
        state,
        // O /status nao devolve o numero; quem devolve e' /device, e uma
        // consulta a mais em toda visita ao painel nao paga esse dado.
        phone: null,
        detail: dados.error || undefined,
      };
    } catch (erro) {
      return { configured: true, connected: false, state: 'INACESSIVEL', phone: null, detail: motivo(erro) };
    }
  },

  async qrCode() {
    try {
      const res = await chamar('/qr-code/image');
      if (!res.ok) return null;
      // Vem como JSON com a imagem em base64 ja' pronta para <img src>.
      const dados = (await res.json()) as { value?: string };
      if (!dados.value) return null;
      return dados.value.startsWith('data:') ? dados.value : `data:image/png;base64,${dados.value}`;
    } catch {
      return null;
    }
  },

  async reiniciar() {
    return acao('/restart');
  },

  async desconectar() {
    return acao('/disconnect');
  },

  async enviarTexto(telefone, mensagem) {
    try {
      const res = await chamar('/send-text', {
        method: 'POST',
        body: JSON.stringify({ phone: telefone, message: mensagem }),
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      return { ok: true };
    } catch (erro) {
      return { ok: false, error: motivo(erro) };
    }
  },

};

/** Reiniciar e desconectar sao GET no Z-API, ao contrario do que o verbo sugere. */
async function acao(caminho: string): Promise<Resultado> {
  try {
    const res = await chamar(caminho);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true };
  } catch (erro) {
    return { ok: false, error: motivo(erro) };
  }
}
