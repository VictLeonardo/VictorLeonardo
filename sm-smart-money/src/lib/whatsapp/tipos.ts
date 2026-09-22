import 'server-only';

/**
 * A fronteira entre a plataforma e quem fala WhatsApp por ela.
 *
 * Existe porque nenhum provedor de WhatsApp e' oficial: todos dirigem uma conta
 * real pelo protocolo do WhatsApp Web, todos podem ser banidos, e trocar de
 * fornecedor e' uma possibilidade permanente, nao um acidente. Com a fronteira
 * aqui, trocar e' escrever um arquivo; sem ela, seria caçar chamadas em sete
 * lugares.
 */

export type StatusWhatsapp = {
  configured: boolean;
  connected: boolean;
  state: string;
  phone: string | null;
  detail?: string;
};

export type Resultado = { ok: boolean; error?: string };

export type ProvedorWhatsapp = {
  readonly nome: 'waha' | 'zapi';
  status(): Promise<StatusWhatsapp>;
  qrCode(): Promise<string | null>;
  reiniciar(): Promise<Resultado>;
  desconectar(): Promise<Resultado>;
  enviarTexto(telefone: string, mensagem: string): Promise<Resultado>;
  /**
   * Aprova quem pediu para entrar no grupo.
   *
   * Declarado e ainda sem implementacao: o Z-API tem o endpoint de aprovar, mas
   * nao avisa nem lista quem esta' pendente -- os webhooks dele sao quatro, e
   * nenhum e' de grupo. A WAHA tem os dois lados desde a 2026.8.2. Entra aqui
   * quando houver um caminho inteiro para testar, nao antes.
   */
  aprovarNoGrupo?(grupoId: string, telefones: string[]): Promise<Resultado>;
};

/** Uma instancia travada nao pode segurar o carregamento do painel admin. */
export const TIMEOUT_MS = 6000;

export async function comTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, cache: 'no-store', signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function motivo(erro: unknown): string {
  return erro instanceof Error ? erro.message : 'Falha na conexão';
}
